import React, { useCallback, useMemo, useRef, useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  garmentImageUrl: string; // картинка товара из каталога/модалки (например: /garments/women-dress.png)
};

// === helpers ===
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
async function resizeToMax(file: File, max = 2000): Promise<File> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();

  const { width, height } = img;
  if (Math.max(width, height) <= max) { URL.revokeObjectURL(url); return file; }

  const aspect = width / height;
  const w = width > height ? max : Math.round(max * aspect);
  const h = width > height ? Math.round(max / aspect) : max;

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), file.type || 'image/jpeg', 0.95)!);
  URL.revokeObjectURL(url);
  return new File([blob], file.name, { type: blob.type });
}
async function fetchAsBase64(url: string): Promise<string> {
  // грузим из public (/garments/...) и конвертим в dataURL
  const resp = await fetch(url, { cache: 'no-store' });
  const blob = await resp.blob();
  const ext = (blob.type.includes('png') ? 'png' : blob.type.includes('jpeg') ? 'jpeg' : 'png');
  const base64 = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  // гарантируем префикс data:image/*;base64,
  return base64.startsWith('data:') ? base64 : `data:image/${ext};base64,${base64}`;
}
const isDataUrl = (s: string) => s.startsWith('data:image/');

export default function TryOnWidget({ isOpen, onClose, garmentImageUrl }: Props) {
  const [userFile, setUserFile] = useState<File | null>(null);
  const [userPreview, setUserPreview] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('fashn_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = () => inputRef.current?.click();

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    try {
      const resized = await resizeToMax(f);
      setUserFile(resized);
      setUserPreview(URL.createObjectURL(resized));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить файл');
    }
  }, []);

  const onChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const resized = await resizeToMax(f);
      setUserFile(resized);
      setUserPreview(URL.createObjectURL(resized));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить файл');
    }
  }, []);

  const disabledRun = useMemo(() => !userFile || !apiKey || loading, [userFile, apiKey, loading]);

  const runTryOn = useCallback(async () => {
    try {
      setError(null);
      setResults([]);
      if (!apiKey) { setError('Введите API key'); return; }
      if (!userFile) { setError('Загрузите фото'); return; }

      localStorage.setItem('fashn_api_key', apiKey);
      setLoading(true);
      setStatus('Подготавливаем изображения…');

      // 1) подготовка изображений (user → base64, garment → base64)
      const resized = await resizeToMax(userFile);
      const modelBase64 = await fileToBase64(resized);

      const garmentBase64 = isDataUrl(garmentImageUrl)
        ? garmentImageUrl
        : await fetchAsBase64(garmentImageUrl);

      // 2) RUN
      setStatus('Отправляем запрос /v1/run…');
      const runResp = await fetch('https://api.fashn.ai/v1/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_name: 'tryon-v1.6',
          inputs: {
            model_image: modelBase64,
            garment_image: garmentBase64,
            garment_photo_type: 'auto',
            category: 'one-pieces',      // при платье — one-pieces; можно сделать маппинг по товару
            mode: 'balanced',
            segmentation_free: true,
            seed: Math.floor(Math.random() * 1_000_000),
            num_samples: 1
          }
        })
      });

      if (runResp.status === 401 || runResp.status === 403) {
        throw new Error('Unauthorized: проверьте API key');
      }
      if (runResp.status === 429) {
        throw new Error('Rate limit: попробуйте позже');
      }
      if (!runResp.ok) {
        const txt = await runResp.text();
        throw new Error(`Run failed: ${txt}`);
      }
      const runJson: any = await runResp.json();
      const predId = runJson?.id;
      if (!predId) throw new Error('Не получили prediction id');

      // 3) POLL
      // 3) POLL (надёжно, с анти-гонкой и хедером)
      setStatus(`Генерация… id=${predId}`);
      console.log('[FASHN] poll start, id =', predId);

      const pollStart = Date.now();
      const maxMs = 180_000;

      // анти-гонка: фиксируем "мой" id, чтобы не поймать старый результат
      const myPredId = predId;
      let lastStatus = 'starting';

      while (Date.now() - pollStart < maxMs) {
        await delay(2000);

        // если во время ожидания пользователь запустил новый run, выходим
        if (myPredId !== predId) {
          console.log('[FASHN] poll aborted: newer run started', { myPredId, current: predId });
          return;
        }

        const st = await fetch(`https://api.fashn.ai/v1/status/${myPredId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          },
          mode: 'cors',
          cache: 'no-store',
          referrerPolicy: 'strict-origin-when-cross-origin'
        });

        // Явно обрабатываем самые частые кейсы
        if (st.status === 401 || st.status === 403) {
          throw new Error('Unauthorized (401/403): заголовок Authorization не дошёл или ключ неверен.');
        }
        if (st.status === 404) {
          throw new Error(`404: prediction не найден. Проверь, что поллишь ровно тот id, который вернул /v1/run (${myPredId}).`);
        }

        if (!st.ok) {
          const txt = await st.text();
          throw new Error(`Status check failed ${st.status}: ${txt}`);
        }

        const data: any = await st.json();
        lastStatus = data?.status ?? lastStatus;

        if (data.status === 'completed') {
          const out: string[] = data.output || [];
          setResults(out);
          setStatus('Готово');
          setLoading(false);
          console.log('[FASHN] completed, results:', out);
          return;
        }
        if (data.status === 'failed') {
          throw new Error(data?.error?.message || 'Prediction failed');
        }

        setStatus(`Статус: ${lastStatus}… id=${myPredId}`);
      }

      throw new Error('Превышено время ожидания (3 минуты)');

    } catch (e: any) {
      setLoading(false);
      setStatus(null);
      setError(e?.message || 'Ошибка запроса');
    }
  }, [apiKey, userFile, garmentImageUrl]);

  if (!isOpen) return null;

  return (
    <dialog open className="tryon-modal" onClose={onClose}>
      <div className="tryon-modal__content">
        <button className="tryon-modal__close" onClick={onClose} aria-label="Закрыть">×</button>

        <div className="tryon-modal__title">
          Онлайн-примерка
          <span className="muted" style={{ marginLeft: 8, fontWeight: 500 }}>
            (FASHN API)
          </span>
        </div>

        <div className="tryon-grid">
          {/* Левая колонка — дропзона пользователя */}
          <div
            className="tryon-drop"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {userPreview ? (
              <div className="tryon-drop__preview">
                <img src={userPreview} alt="Ваше фото" />
                <div className="tryon-drop__actions">
                  <button
                    className="btn btn--ghost"
                    onClick={() => { setUserFile(null); setUserPreview(null); }}
                    disabled={loading}
                  >
                    Очистить
                  </button>
                  <button className="btn" onClick={() => inputRef.current?.click()} disabled={loading}>
                    Заменить
                  </button>
                </div>
              </div>
            ) : (
              <div className="tryon-drop__placeholder" onClick={() => inputRef.current?.click()}>
                <div className="tryon-upload-icon">⤴</div>
                <div><strong>Загрузите своё фото</strong> или перетащите файл сюда</div>
                <div className="muted">Полный рост предпочтителен · JPG/PNG</div>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onChange} />
          </div>

          {/* Правая колонка — товар + ключ + статус */}
          <div className="tryon-product">
            <div className="tryon-product__image">
              <img src={garmentImageUrl} alt="Товар" />
            </div>

            <label className="muted" style={{ fontSize: 12 }}>FASHN API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="fa_..."
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
                borderRadius: 10, outline: 'none'
              }}
              disabled={loading}
            />

            {status && (
              <div className="muted" style={{ textAlign: 'center' }}>
                {loading ? '⏳ ' : '✅ '}{status}
              </div>
            )}
            {error && <div className="tryon-error">{error}</div>}

            <button className="btn" onClick={runTryOn} disabled={disabledRun}>
              {loading ? 'Генерация…' : 'Примерить'}
            </button>
          </div>
        </div>

        {/* Результаты */}
        {!!results.length && (
          <div style={{ padding: '0 16px 16px' }}>
            <div className="tryon-results">
              {results.map((u, i) => (
                <div key={i} className="tryon-results__item">
                  <img src={u} alt={`result-${i}`} />
                  <a className="btn btn--ghost" href={u} target="_blank" rel="noreferrer">Открыть</a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="tryon-footer">
          <button className="btn btn--ghost" onClick={onClose} disabled={loading}>Закрыть</button>
        </div>
      </div>
    </dialog>
  );
}
