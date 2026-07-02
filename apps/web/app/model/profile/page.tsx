'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProfileSchema, type CreateProfileInput } from '@/lib/validations';
import { api, type ModelProfile } from '@/lib/api-client';
import { Check, AlertCircle, Loader2, X, Plus } from 'lucide-react';

const LABEL = 'mb-1.5 block font-body text-[11px] font-medium uppercase tracking-wide text-white/40';
const INPUT =
  'w-full rounded-lg border border-white/[0.08] bg-[#111]/80 px-3 py-2 font-body text-sm text-white placeholder:text-white/20 outline-none focus:border-[#d4af37]/50 transition-colors';
const SELECT = INPUT + ' cursor-pointer';

const BUST_TYPES = [
  { value: 'natural', label: 'Натуральная' },
  { value: 'silicone', label: 'Силикон' },
];
const BODY_TYPES = [
  { value: 'slim', label: 'Стройная' },
  { value: 'fit', label: 'Спортивная' },
  { value: 'curvy', label: 'Пышная' },
  { value: 'bbw', label: 'BBW' },
  { value: 'pear', label: 'Грушевидная' },
];
const TEMPERAMENTS = [
  { value: 'gentle', label: 'Нежный' },
  { value: 'active', label: 'Активный' },
  { value: 'adaptable', label: 'Адаптивный' },
];
const SEXUALITIES = [
  { value: 'active', label: 'Активная' },
  { value: 'passive', label: 'Пассивная' },
  { value: 'universal', label: 'Универсальная' },
];
const COMMON_LANGUAGES = ['Русский', 'English', 'Deutsch', 'Français', 'Español', 'Italiano', '中文', 'العربية'];

const VERIFICATION_LABEL: Record<string, string> = {
  pending: 'На проверке',
  video_required: 'Нужно видео',
  document_required: 'Нужен документ',
  verified: 'Верифицирована',
  rejected: 'Отказано',
};
const VERIFICATION_COLOR: Record<string, string> = {
  pending: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
  video_required: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  document_required: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  verified: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
  rejected: 'border-red-400/25 bg-red-400/10 text-red-300',
};

function TagInput({
  tags,
  onChange,
  placeholder,
  suggestions,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (val: string) => {
    const v = val.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-2.5 py-0.5 font-body text-xs text-[#d4af37]"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(tags.filter((x) => x !== t))}
                className="text-[#d4af37]/50 transition-colors hover:text-[#d4af37]"
                aria-label={`Удалить ${t}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(input);
            }
          }}
          placeholder={placeholder ?? 'Введите и нажмите Enter'}
          className={INPUT + ' flex-1'}
        />
        <button
          type="button"
          onClick={() => addTag(input)}
          disabled={!input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-white/40 transition-colors hover:border-[#d4af37]/40 hover:text-[#d4af37] disabled:opacity-30"
          aria-label="Добавить"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {suggestions && (
        <div className="flex flex-wrap gap-1">
          {suggestions.filter((s) => !tags.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange([...tags, s])}
              className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-body text-[11px] text-white/30 transition-colors hover:border-white/15 hover:text-white/60"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#141414]/80 p-5">
      <h2 className="font-display text-xs font-bold uppercase tracking-widest text-white/30">{title}</h2>
      {children}
    </section>
  );
}

export default function ModelProfilePage() {
  const [profile, setProfile] = useState<ModelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [psychotypeTags, setPsychotypeTags] = useState<string[]>([]);

  const [tagsDirty, setTagsDirty] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { isDirty } } = useForm<CreateProfileInput>({
    mode: 'onSubmit',
    resolver: zodResolver(createProfileSchema) as any,
  });

  const hasChanges = isDirty || tagsDirty;

  useEffect(() => {
    api.getMyModelProfile().then((p) => {
      setProfile(p);
      if (!p) return;
      setValue('displayName', p.displayName ?? '');
      setValue('biography', p.biography ?? '');
      setValue('rateHourly', p.rateHourly ? Number(p.rateHourly) : undefined);
      setValue('rateOvernight', p.rateOvernight ? Number(p.rateOvernight) : undefined);
      const a = p.physicalAttributes ?? {};
      if (a.age) setValue('physicalAttributes.age', a.age);
      if (a.height) setValue('physicalAttributes.height', a.height);
      if (a.weight) setValue('physicalAttributes.weight', a.weight);
      if (a.bustSize) setValue('physicalAttributes.bustSize', a.bustSize);
      if (a.bustType) setValue('physicalAttributes.bustType', a.bustType);
      if (a.bodyType) setValue('physicalAttributes.bodyType', a.bodyType as any);
      if (a.temperament) setValue('physicalAttributes.temperament', a.temperament);
      if (a.sexuality) setValue('physicalAttributes.sexuality', a.sexuality);
      if (a.hairColor) setValue('physicalAttributes.hairColor', a.hairColor);
      if (a.eyeColor) setValue('physicalAttributes.eyeColor', a.eyeColor);
      if (a.city) setValue('physicalAttributes.city', a.city);
      if (a.country) setValue('physicalAttributes.country', a.country);
      setValue('contactTelegram', p.contactTelegram ?? '');
      setValue('contactPhone', p.contactPhone ?? '');
      setValue('contactWhatsapp', p.contactWhatsapp ?? '');
      setLanguages(p.languages ?? []);
      setPsychotypeTags(p.psychotypeTags ?? []);
    }).finally(() => setLoading(false));
  }, [setValue]);

  const onSubmit = async (data: CreateProfileInput) => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const a = data.physicalAttributes ?? {};
      const attrs: Record<string, any> = {};
      if (a.age && Number(a.age) > 0) attrs.age = Number(a.age);
      if (a.height && Number(a.height) > 0) attrs.height = Number(a.height);
      if (a.weight && Number(a.weight) > 0) attrs.weight = Number(a.weight);
      if (a.bustSize && Number(a.bustSize) > 0) attrs.bustSize = Number(a.bustSize);
      if (a.bustType) attrs.bustType = a.bustType;
      if (a.bodyType) attrs.bodyType = a.bodyType;
      if (a.temperament) attrs.temperament = a.temperament;
      if (a.sexuality) attrs.sexuality = a.sexuality;
      if (a.hairColor?.trim()) attrs.hairColor = a.hairColor.trim();
      if (a.eyeColor?.trim()) attrs.eyeColor = a.eyeColor.trim();
      if (a.city?.trim()) attrs.city = a.city.trim();
      if (a.country?.trim()) attrs.country = a.country.trim();

      const updated = await api.updateMyModelProfile(profile.id, {
        displayName: data.displayName?.trim() || profile.displayName,
        biography: data.biography?.trim() || undefined,
        rateHourly: data.rateHourly ? String(data.rateHourly) : undefined,
        rateOvernight: data.rateOvernight ? String(data.rateOvernight) : undefined,
        physicalAttributes: Object.keys(attrs).length > 0 ? attrs : undefined,
        languages,
        psychotypeTags,
        contactTelegram: data.contactTelegram?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        contactWhatsapp: data.contactWhatsapp?.trim() || null,
      });
      setProfile(updated);
      reset(data);
      setTagsDirty(false);
    } catch (err: any) {
      setError(err.message ?? 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 font-body text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="font-body text-sm text-amber-200/80">
          <p className="font-medium">Анкета не привязана к аккаунту</p>
          <p className="mt-0.5 text-amber-200/50">Обратитесь к менеджеру — он создаст анкету и свяжет её с вашим аккаунтом.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Мой профиль</h1>
          <p className="mt-1 font-body text-sm text-white/35">Редактируйте анкету и нажмите «Сохранить».</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1 font-body text-xs font-medium ${VERIFICATION_COLOR[profile.verificationStatus] ?? VERIFICATION_COLOR.pending}`}>
            {VERIFICATION_LABEL[profile.verificationStatus] ?? profile.verificationStatus}
          </span>
          <span className={`rounded-full border px-3 py-1 font-body text-xs font-medium ${profile.isPublished ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-white/35'}`}>
            {profile.isPublished ? 'Опубликована' : 'Черновик'}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="flex-1 font-body text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Section title="Основная информация">
          <div>
            <label className={LABEL}>Имя / псевдоним</label>
            <input {...register('displayName')} className={INPUT} placeholder="Например: Анна" />
          </div>
          <div>
            <label className={LABEL}>Биография</label>
            <textarea
              {...register('biography')}
              rows={5}
              className={INPUT + ' resize-none'}
              placeholder="Расскажите о себе, своих интересах и о том, как вам нравится проводить время с клиентами…"
            />
          </div>
        </Section>

        <Section title="Расценки">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>За час (₽)</label>
              <input {...register('rateHourly')} type="number" min={0} className={INPUT} placeholder="5 000" />
            </div>
            <div>
              <label className={LABEL}>Ночь (₽)</label>
              <input {...register('rateOvernight')} type="number" min={0} className={INPUT} placeholder="25 000" />
            </div>
          </div>
        </Section>

        <Section title="Параметры">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Возраст</label>
              <input {...register('physicalAttributes.age', { valueAsNumber: true })} type="number" min={18} max={99} className={INPUT} placeholder="25" />
            </div>
            <div>
              <label className={LABEL}>Рост (см)</label>
              <input {...register('physicalAttributes.height', { valueAsNumber: true })} type="number" min={140} max={220} className={INPUT} placeholder="168" />
            </div>
            <div>
              <label className={LABEL}>Вес (кг)</label>
              <input {...register('physicalAttributes.weight', { valueAsNumber: true })} type="number" min={35} max={150} className={INPUT} placeholder="55" />
            </div>
            <div>
              <label className={LABEL}>Грудь (размер)</label>
              <input {...register('physicalAttributes.bustSize', { valueAsNumber: true })} type="number" min={1} max={10} className={INPUT} placeholder="3" />
            </div>
            <div>
              <label className={LABEL}>Тип груди</label>
              <select {...register('physicalAttributes.bustType')} className={SELECT}>
                <option value="">—</option>
                {BUST_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Фигура</label>
              <select {...register('physicalAttributes.bodyType')} className={SELECT}>
                <option value="">—</option>
                {BODY_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Темперамент</label>
              <select {...register('physicalAttributes.temperament')} className={SELECT}>
                <option value="">—</option>
                {TEMPERAMENTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Сексуальность</label>
              <select {...register('physicalAttributes.sexuality')} className={SELECT}>
                <option value="">—</option>
                {SEXUALITIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Цвет волос</label>
              <input {...register('physicalAttributes.hairColor')} className={INPUT} placeholder="Брюнетка" />
            </div>
            <div>
              <label className={LABEL}>Цвет глаз</label>
              <input {...register('physicalAttributes.eyeColor')} className={INPUT} placeholder="Карие" />
            </div>
            <div>
              <label className={LABEL}>Город</label>
              <input {...register('physicalAttributes.city')} className={INPUT} placeholder="Москва" />
            </div>
            <div>
              <label className={LABEL}>Страна</label>
              <input {...register('physicalAttributes.country')} className={INPUT} placeholder="Россия" />
            </div>
          </div>
        </Section>

        <Section title="Языки общения">
          <TagInput
            tags={languages}
            onChange={(v) => { setLanguages(v); setTagsDirty(true); }}
            placeholder="Язык (Enter)"
            suggestions={COMMON_LANGUAGES}
          />
        </Section>

        <Section title="Теги психотипа">
          <TagInput
            tags={psychotypeTags}
            onChange={(v) => { setPsychotypeTags(v); setTagsDirty(true); }}
            placeholder="Тег (Enter)"
          />
          <p className="font-body text-[11px] text-white/25">Описывают характер: спокойная, игривая, интеллектуальная…</p>
        </Section>

        <Section title="Контакты (после оплаты)">
          <p className="font-body text-[11px] text-white/25">Показываются клиенту только после успешной оплаты эскроу.</p>
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Telegram (@username или ссылка)</label>
              <input {...register('contactTelegram')} className={INPUT} placeholder="@username" />
            </div>
            <div>
              <label className={LABEL}>Телефон</label>
              <input {...register('contactPhone')} className={INPUT} placeholder="+7 900 000-00-00" />
            </div>
            <div>
              <label className={LABEL}>WhatsApp (если другой номер)</label>
              <input {...register('contactWhatsapp')} className={INPUT} placeholder="+7 900 000-00-00" />
            </div>
          </div>
        </Section>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-1.5 rounded px-5 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
              hasChanges
                ? 'bg-gradient-to-r from-[#d4af37] to-[#b8941f] text-black hover:shadow-lg'
                : 'border border-white/[0.08] bg-transparent text-gray-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {saving ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Сохранение
              </>
            ) : hasChanges ? (
              <>
                <div className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                Сохранить
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> Сохранено
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
