import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TryOnProps = {
  isOpen: boolean;
  onClose: () => void;
  garmentImageUrl: string; // например /garments/women-dress.png
  category?: 'auto' | 'tops' | 'bottoms' | 'one-pieces';
  modelName?: 'tryon-v1.6' | 'tryon-v1.5' | 'tryon-staging';
  mode?: 'balanced' | 'quality' | 'performance';
  numSamples?: 1 | 2 | 3 | 4;
};

type RunResponse = { id?: string; error?: unknown };
type StatusResponse = {
  status: 'queued' | 'running' | 'completed' | 'failed';
  output?: string[];
  error?: { message?: string } | unknown;
};

const API_RUN = '/api/tryon/run';
const API_STATUS = (id: string) => `/api/tryon/status?id=${encodeURIComponent(id)}`;

const MAX_POLL_MS = 180_000;        // 3 мин
const BASE_POLL_INTERVAL = 2_000;   // 2c
const MAX_RUN_RETRIES = 2;

// ===================== utils =====================
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
const isDataUrl = (s: string) => /^data:image\//i.test(s);

/** даунскейл до max по длинной стороне + jpeg/png сохранение */
async function resizeToMax(file: File, max = 2000): Promise<File> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();

  const { width, height } = img;
  if (Math.max(width, height) <= max) {
    URL.revokeObjectURL(url);
    return file;
  }

  const aspect = width / height;
  const w = width >= height ? max : Math.round(max * aspect);
  const h = width >= height ? Math.round(max / aspect) : max;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const mime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  const blob: Blob = await new Promise(ok =>
    canvas.toBlob(b => ok(b!), mime, 0.95)
  );
  URL.revokeObjectURL(url);
  return new File([blob], file.name, { type: blob.type });
}

async function fileToBase64(file: File): Promise<string> {
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function fetchAsBase64(url: string): Promise<string> {
  const resp = await fetch(url, { cache: 'no-store' });
  const blob = await resp.blob();
  const ext =
    blob.type.includes('png') ? 'png'
      : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpeg'
      : 'png';

  const base64 = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  return base64.startsWith('data:') ? base64 : `data:image/${ext};base64,${base64}`;
}

// ===================== component =====================
export default function TryOnWidget({
  isOpen,
  onClose,
  garmentImageUrl,
  category = 'one-pieces',
  modelName = 'tryon-v1.6',
  mode = 'balanced',
  numSamples = 1,
}: TryOnProps) {
  // user image state
  const [userFile, setUserFile] = useState<File | null>(null);
  const [userPreview, setUserPreview] = useState<string | null>(null);

  // run/poll state
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // guard for concurrent polls
  const currentPredIdRef = useRef<string | null>(null);
  const abortedRef       = useRef<boolean>(false);

  // cleanup preview url on unmount/close
  useEffect(() => {
    return () => {
      if (userPreview) URL.revokeObjectURL(userPreview);
    };
  }, [userPreview]);

  // reset abort flag on open/close
  useEffect(() => {
    abortedRef.current = !isOpen;
    if (!isOpen) {
      setError(null);
      setStatus(null);
      setLoading(false);
      setResults([]);
      currentPredIdRef.current = null;
    }
  }, [isOpen]);

  const onPick = () => fileInputRef.current?.click();

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    try {
      const resized = await resizeToMax(f);
      setUserFile(resized);
      const url = URL.createObjectURL(resized);
      setUserPreview(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
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
      const url = URL.createObjectURL(resized);
      setUserPreview(prev => { if (prev) URL.revokeObjectURL(prev); return url; });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Не удалось загрузить файл');
    }
  }, []);

  const disabledRun = useMemo(
    () => !userFile || loading,
    [userFile, loading]
  );

  const runTryOn = useCallback(async () => {
    try {
      setError(null);
      setResults([]);
      if (!userFile) throw new Error('Загрузите фото');

      setLoading(true);
      setStatus('Подготавливаем изображения…');

      // 1) подготовка изображений
      const resized = await resizeToMax(userFile);
      const modelBase64 = await fileToBase64(resized);
      const garmentBase64 = isDataUrl(garmentImageUrl)
        ? garmentImageUrl
        : await fetchAsBase64(garmentImageUrl);

      // 2) /run (с авторетрай на 429)
      const payload = {
        model_name: modelName,
        inputs: {
          model_image: modelBase64,
          garment_image: garmentBase64,
          garment_photo_type: 'auto',
          category,
          mode,
          segmentation_free: true,
          seed: Math.floor(Math.random() * 1_000_000),
          num_samples: numSamples
        }
      };

      setStatus('Отправляем запрос…');

      let runResp: Response | null = null;
      for (let attempt = 0; attempt <= MAX_RUN_RETRIES; attempt++) {
        runResp = await fetch(API_RUN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (runResp.status !== 429) break;

        const retry = Number(runResp.headers.get('Retry-After')) || 15;
        setStatus(`Сервис занят. Ждём ${retry}s…`);
        await delay(retry * 1000);
      }

      if (!runResp!) throw new Error('Нет ответа от сервиса');

      if (!runResp.ok) {
        const txt = await runResp.text();
        throw new Error(`Run failed (${runResp.status}): ${txt}`);
      }

      const runJson: RunResponse = await runResp.json();
      const predId = runJson?.id;
      if (!predId) throw new Error('Не получили prediction id');
      currentPredIdRef.current = predId;

      // 3) poll /status
      setStatus('Генерация…');
      const startedAt = Date.now();
      let pollDelay = BASE_POLL_INTERVAL;

      while (!abortedRef.current && Date.now() - startedAt < MAX_POLL_MS) {
        const myId = currentPredIdRef.current;
        if (myId !== predId) {
          // запущен новый прогон — прекращаем этот
          return;
        }

        const st = await fetch(API_STATUS(predId), { method: 'GET' });

        if (st.status === 429) {
          const retry = Number(st.headers.get('Retry-After')) || 10;
          setStatus(`Лимит статусов, жду ~${retry}s…`);
          await delay(retry * 1000);
          // увеличим задержку, чтобы не упираться в лимит 50/10s
          pollDelay = Math.min(pollDelay + 1000, 10_000);
          continue;
        }

        if (!st.ok) {
          const txt = await st.text();
          throw new Error(`Status ${st.status}: ${txt}`);
        }

        const data: StatusResponse = await st.json();

        if (data.status === 'completed') {
          setResults(data.output || []);
          setStatus('Готово');
          setLoading(false);
          return;
        }
        if (data.status === 'failed') {
          const msg = (data.error as any)?.message || 'Prediction failed';
          throw new Error(msg);
        }

        setStatus(`Статус: ${data.status}…`);
        await delay(pollDelay);
      }

      if (!abortedRef.current) {
        throw new Error('Превышено время ожидания (3 минуты)');
      }
    } catch (e: any) {
      setLoading(false);
      setStatus(null);
      setError(e?.message || 'Ошибка запроса');
    }
  }, [userFile, garmentImageUrl, category, modelName, mode, numSamples]);

  if (!isOpen) return null;

  return (
    <dialog open className="tryon-modal" onClose={onClose}>
      <div className="tryon-modal__content">
        <button
          className="tryon-modal__close"
          onClick={() => { abortedRef.current = true; onClose(); }}
          aria-label="Закрыть"
        >
          ×
        </button>

        <div className="tryon-modal__title">
          Онлайн-примерка <span className="muted" style={{ marginLeft: 8, fontWeight: 500 }}>(FASHN)</span>
        </div>

        <div className="tryon-grid">
          {/* Левая колонка: загрузка фото */}
          <div
            className="tryon-drop"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            {userPreview ? (
              <div className="tryon-drop__preview">
                <img src={userPreview} alt="Ваше фото" />
                <div className="tryon-drop__actions">
                  <button
                    className="btn btn--ghost"
                    onClick={(e) => { e.stopPropagation(); setUserFile(null); setUserPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }}
                    disabled={loading}
                  >
                    Очистить
                  </button>
                  <button className="btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} disabled={loading}>
                    Заменить
                  </button>
                </div>
              </div>
            ) : (
              <div className="tryon-drop__placeholder">
                <div className="tryon-upload-icon">⤴</div>
                <div><strong>Загрузите своё фото</strong> или перетащите файл сюда</div>
                <div className="muted">Полный рост предпочтителен • JPG/PNG</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onChange} />
          </div>

          {/* Правая колонка: товар + управление */}
          <div className="tryon-product">
            <div className="tryon-product__image">
              <img src={garmentImageUrl} alt="Товар" />
            </div>

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
          <button
            className="btn btn--ghost"
            onClick={() => { abortedRef.current = true; onClose(); }}
            disabled={loading}
          >
            Закрыть
          </button>
        </div>
      </div>
    </dialog>
  );
}
