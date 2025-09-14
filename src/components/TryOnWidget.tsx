import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  USE_PROXY,
  FASHN_BASE,
  FASHN_API_KEY,
  MAX_POLL_MS,
  POLL_INTERVAL_MS,
  MAX_POLL_INTERVAL_MS,
  RUN_MAX_RETRIES,
} from '../config';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  garmentImageUrl: string;
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const isDataUrl = (s: string) => s.startsWith('data:image/');
const getRetryAfter = (res: Response, fallback = 15) =>
  Number(res.headers.get('Retry-After')) || fallback;

const ACTIVE_PRED_LS = 'fashn_active_prediction_id';

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

  const blob: Blob = await new Promise(res =>
    canvas.toBlob(b => res(b!), file.type || 'image/jpeg', 0.95)!
  );
  URL.revokeObjectURL(url);
  return new File([blob], file.name, { type: blob.type });
}

async function fetchAsBase64(url: string): Promise<string> {
  const resp = await fetch(url, { cache: 'no-store' });
  const blob = await resp.blob();
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('jpeg') ? 'jpeg' : 'png';
  const base64 = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  return base64.startsWith('data:') ? base64 : `data:image/${ext};base64,${base64}`;
}

// ————— API-вызовы в зависимости от режима —————
const runEndpoint = () => USE_PROXY ? '/api/tryon/run' : `${FASHN_BASE}/run`;
const statusEndpoint = (id: string) =>
  USE_PROXY ? `/api/tryon/status/${id}` : `${FASHN_BASE}/predictions/${id}`;

export default function TryOnWidget({ isOpen, onClose, garmentImageUrl }: Props) {
  const [userFile, setUserFile] = useState<File | null>(null);
  const [userPreview, setUserPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const closedRef = useRef(false);

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

  const disabledRun = useMemo(() => !userFile || loading, [userFile, loading]);

  // ——— helper: опрос одного prediction с уважением Retry-After и бэкоффом
  const pollPrediction = useCallback(async (predId: string) => {
    const start = Date.now();
    let interval = POLL_INTERVAL_MS;

    while (Date.now() - start < MAX_POLL_MS) {
      if (closedRef.current) throw new Error('Виджет закрыт пользователем');

      const st = await fetch(statusEndpoint(predId), {
        method: 'GET',
        headers: USE_PROXY
          ? {}
          : { 'Authorization': `Bearer ${FASHN_API_KEY}` },
        cache: 'no-store'
      });

      if (st.status === 429) {
        const wait = getRetryAfter(st, Math.ceil(interval/1000) || 10);
        setStatus(`Лимит статусов. Жду ~${wait} сек…`);
        await delay(wait * 1000);
        interval = Math.min(Math.max(interval * 1.5, POLL_INTERVAL_MS), MAX_POLL_INTERVAL_MS);
        continue;
      }

      if (!st.ok) {
        const txt = await st.text().catch(()=> '');
        throw new Error(`Status ${st.status}: ${txt}`);
      }

      const data: any = await st.json();
      if (data.status === 'completed') return data.output || [];
      if (data.status === 'failed')   throw new Error(data?.error?.message || 'Prediction failed');

      setStatus(`Статус: ${data.status}…`);
      await delay(interval);
      interval = Math.min(interval + 500, MAX_POLL_INTERVAL_MS);
    }
    throw new Error('Превышено время ожидания (3 минуты)');
  }, []);

  // ——— helper: /run с повторами на 429 (уважает Retry-After)
  const runOnce = useCallback(async (payload: any) => {
    for (let attempt = 1; attempt <= RUN_MAX_RETRIES; attempt++) {
      const resp = await fetch(runEndpoint(), {
        method: 'POST',
        headers: {
          ...(USE_PROXY ? {} : { 'Authorization': `Bearer ${FASHN_API_KEY}` }),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (resp.status === 429) {
        const wait = getRetryAfter(resp, 15);
        setStatus(`Сервис занят (run). Жду ~${wait} сек… [${attempt}/${RUN_MAX_RETRIES}]`);
        await delay(wait * 1000);
        continue;
      }

      if (!resp.ok) {
        const txt = await resp.text().catch(()=> '');
        throw new Error(`Run failed ${resp.status}: ${txt}`);
      }

      return await resp.json();
    }
    throw new Error('Сервис занят. Повторите позже.');
  }, []);

  const runTryOn = useCallback(async () => {
    try {
      closedRef.current = false;
      setError(null);
      setResults([]);
      if (!userFile) throw new Error('Загрузите фото');

      setLoading(true);
      setStatus('Подготавливаем изображения…');

      // 0) Проверка: не идёт ли уже предыдущее задание
      const existing = localStorage.getItem(ACTIVE_PRED_LS);
      if (existing) {
        setStatus('Обнаружен активный запуск — подключаюсь…');
        try {
          const out = await pollPrediction(existing);
          setResults(out);
          setStatus('Готово');
          setLoading(false);
          localStorage.removeItem(ACTIVE_PRED_LS);
          return;
        } catch {
          // если сломалось — сбрасываем «залежавшийся» id и продолжаем новый run
          localStorage.removeItem(ACTIVE_PRED_LS);
        }
      }

      // 1) подготовка изображений
      const resized = await resizeToMax(userFile);
      const modelBase64 = await fileToBase64(resized);
      const garmentBase64 = isDataUrl(garmentImageUrl)
        ? garmentImageUrl
        : await fetchAsBase64(garmentImageUrl);

      // 2) /run
      setStatus('Отправляем /run…');
      const runJson: any = await runOnce({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: modelBase64,
          garment_image: garmentBase64,
          garment_photo_type: 'auto',
          category: 'one-pieces',
          mode: 'balanced',
          segmentation_free: true,
          seed: Math.floor(Math.random() * 1_000_000),
          num_samples: 1
        }
      });

      const predId = runJson?.id;
      if (!predId) throw new Error('Не получили prediction id');

      // 3) сохраняем активный id и поллим
      localStorage.setItem(ACTIVE_PRED_LS, predId);
      setStatus('Генерация…');

      const out = await pollPrediction(predId);
      setResults(out);
      setStatus('Готово');
      setLoading(false);
      localStorage.removeItem(ACTIVE_PRED_LS);

    } catch (e: any) {
      setLoading(false);
      setStatus(null);
      setError(e?.message || 'Ошибка запроса');
    }
  }, [userFile, garmentImageUrl, pollPrediction, runOnce]);

  // При закрытии окна прекращаем любые ожидания
  const handleClose = () => {
    closedRef.current = true;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog open className="tryon-modal" onClose={handleClose}>
      <div className="tryon-modal__content">
        <button className="tryon-modal__close" onClick={handleClose} aria-label="Закрыть">×</button>

        <div className="tryon-modal__title">
          Онлайн-примерка <span className="muted" style={{ marginLeft: 8, fontWeight: 500 }}>(FASHN API)</span>
        </div>

        <div className="tryon-grid">
          {/* Левая колонка — загрузка фото */}
          <div
            className="tryon-drop"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={onPick}
          >
            {userPreview ? (
              <div className="tryon-drop__preview">
                <img src={userPreview} alt="Ваше фото" />
                <div className="tryon-drop__actions">
                  <button
                    className="btn btn--ghost"
                    onClick={(e) => { e.stopPropagation(); setUserFile(null); setUserPreview(null); }}
                    disabled={loading}
                  >
                    Очистить
                  </button>
                  <button className="btn" onClick={(e)=>{ e.stopPropagation(); onPick(); }} disabled={loading}>
                    Заменить
                  </button>
                </div>
              </div>
            ) : (
              <div className="tryon-drop__placeholder">
                <div className="tryon-upload-icon">⤴</div>
                <div><strong>Загрузите своё фото</strong> или перетащите файл сюда</div>
                <div className="muted">Полный рост предпочтителен · JPG/PNG</div>
              </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onChange} />
          </div>

          {/* Правая колонка — товар + статус */}
          <div className="tryon-product">
            <div className="tryon-product__image">
              <img src={garmentImageUrl} alt="Товар" />
            </div>

            {status && <div className="muted" style={{ textAlign: 'center' }}>
              {loading ? '⏳ ' : '✅ '}{status}
            </div>}
            {error && <div className="tryon-error">{error}</div>}

            <button className="btn" onClick={runTryOn} disabled={disabledRun}>
              {loading ? 'Генерация…' : 'Примерить'}
            </button>
          </div>
        </div>

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
          <button className="btn btn--ghost" onClick={handleClose} disabled={loading}>Закрыть</button>
        </div>
      </div>
    </dialog>
  );
}
