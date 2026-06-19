'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * NebesaJobsModal — кнопка «Хочешь работать у нас?» + попап-форма набора.
 * Поля: ФИО, контакты, сообщение (опц.) и несколько фото. По сабмиту шлёт
 * multipart на POST /v1/public/job-applications — бэк отправляет письмо с фото
 * на почту (cfg.mail.jobApplicationTo). Самодостаточный client-компонент:
 * рендерит и триггер-кнопку, и модалку. Стили — .nebesa-site .njm-* (nebesa.css).
 */

const MAX_PHOTOS = 8;
const TENANT_SLUG = 'nebesaspa';

/**
 * База для клиентского запроса к API.
 * - prod (любой домен): относительный same-origin путь — nginx проксирует
 *   `/v1/` (nebesaspa.com) и `/nas/v1/` (salonmassage.ru/nas) на API:5110.
 *   NEXT_PUBLIC_API_URL в root-сборке = http://127.0.0.1:5110 (для SSR) —
 *   из браузера недостижим, поэтому на проде его не используем.
 * - local dev: полный http://localhost:5110 (CORS), т.к. nginx-прокси нет.
 */
function apiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    }
  }
  return envUrl || 'http://localhost:5110';
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function NebesaJobsModal() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // блокируем прокрутку фона, пока открыт попап
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function reset() {
    setFullName('');
    setContact('');
    setMessage('');
    setFiles([]);
    setStatus('idle');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function close() {
    setOpen(false);
    // даём анимации/закрытию пройти, потом чистим
    setTimeout(reset, 200);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles(picked.slice(0, MAX_PHOTOS));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    if (fullName.trim().length < 2 || contact.trim().length < 3) {
      setError('Укажите имя и контакт для связи.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setError('');
    try {
      const form = new FormData();
      form.append('fullName', fullName.trim());
      form.append('contact', contact.trim());
      if (message.trim()) form.append('message', message.trim());
      form.append('tenantSlug', TENANT_SLUG);
      for (const f of files) form.append('photos', f);

      const res = await fetch(`${apiBase()}/v1/public/job-applications`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        let msg = `Ошибка отправки (${res.status})`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body?.message) msg = body.message;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку.');
      setStatus('error');
    }
  }

  return (
    <>
      <button type="button" className="btn btn-blue" onClick={() => setOpen(true)}>
        Хочешь работать у нас?
      </button>

      {open && (
        <div className="njm" role="dialog" aria-modal="true" aria-labelledby="njm-title" onClick={close}>
          <div className="njm-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="njm-close" aria-label="Закрыть" onClick={close}>
              ×
            </button>

            {status === 'sent' ? (
              <div className="njm-done">
                <h2 className="njm-title" id="njm-title">
                  Спасибо!
                </h2>
                <p className="njm-text">
                  Заявка отправлена. Мы свяжемся с вами по указанным контактам.
                </p>
                <button type="button" className="btn btn-blue" onClick={close}>
                  Закрыть
                </button>
              </div>
            ) : (
              <form className="njm-form" onSubmit={onSubmit}>
                <h2 className="njm-title" id="njm-title">
                  Хочешь работать у нас?
                </h2>
                <p className="njm-text">
                  Оставьте контакты и несколько фото — мы свяжемся с вами.
                </p>

                <label className="njm-label">
                  ФИО<span className="njm-req">*</span>
                  <input
                    className="njm-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Как вас зовут"
                    maxLength={200}
                    required
                  />
                </label>

                <label className="njm-label">
                  Контакты<span className="njm-req">*</span>
                  <input
                    className="njm-input"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Телефон, Telegram или WhatsApp"
                    maxLength={300}
                    required
                  />
                </label>

                <label className="njm-label">
                  О себе
                  <textarea
                    className="njm-input njm-textarea"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Коротко о себе (необязательно)"
                    maxLength={2000}
                    rows={3}
                  />
                </label>

                <label className="njm-label">
                  Фото (до {MAX_PHOTOS})
                  <input
                    ref={fileRef}
                    className="njm-file"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onPickFiles}
                  />
                </label>
                {files.length > 0 && (
                  <p className="njm-files">Выбрано фото: {files.length}</p>
                )}

                {status === 'error' && <p className="njm-error">{error}</p>}

                <div className="njm-actions">
                  <button type="submit" className="btn btn-blue" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={close}>
                    Отмена
                  </button>
                </div>
                <p className="njm-note">Нажимая «Отправить», вы соглашаетесь на обработку данных.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
