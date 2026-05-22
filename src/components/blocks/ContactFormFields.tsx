'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { submitContact } from '@/lib/actions/submit-contact';
import { cn } from '@/lib/utils';

type Props = {
  variant?: 'inline' | 'dialog';
  onSuccess?: () => void;
};

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactFormFields({ variant = 'inline', onSuccess }: Props) {
  const t = useTranslations('ContactForm');
  const locale = useLocale();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('submitting');
    setErrorMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await submitContact({
        name: String(formData.get('name') ?? ''),
        company: String(formData.get('company') ?? '') || undefined,
        email: String(formData.get('email') ?? ''),
        phone: String(formData.get('phone') ?? '') || undefined,
        message: String(formData.get('message') ?? ''),
        locale,
      });
      if (result.ok) {
        setStatus('success');
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage(result.error);
      }
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Submission failed');
    }
  }

  if (status === 'success') {
    return (
      <div role="status" className="flex flex-col items-center text-center gap-4 py-12">
        <CheckCircle2 className="w-14 h-14 text-brand" strokeWidth={1.5} aria-hidden />
        <p className="text-lg font-semibold">{t('successTitle')}</p>
        <p className="text-base text-muted-foreground max-w-sm">{t('successBody')}</p>
      </div>
    );
  }

  const inputClass = cn(
    'block w-full bg-background text-foreground border border-border px-4 py-3 text-base rounded-md',
    'placeholder:text-muted-foreground focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors'
  );
  const labelClass = 'block text-sm font-semibold mb-2';

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${variant}-name`} className={labelClass}>
            {t('name')}
          </label>
          <input
            id={`${variant}-name`}
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder={t('namePlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${variant}-company`} className={labelClass}>
            {t('company')}
          </label>
          <input
            id={`${variant}-company`}
            name="company"
            type="text"
            autoComplete="organization"
            placeholder={t('companyPlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${variant}-email`} className={labelClass}>
            {t('email')}
          </label>
          <input
            id={`${variant}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${variant}-phone`} className={labelClass}>
            {t('phone')}
          </label>
          <input
            id={`${variant}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t('phonePlaceholder')}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${variant}-message`} className={labelClass}>
          {t('message')}
        </label>
        <textarea
          id={`${variant}-message`}
          name="message"
          required
          rows={5}
          placeholder={t('messagePlaceholder')}
          className={cn(inputClass, 'resize-y min-h-32')}
        />
      </div>
      {status === 'error' && errorMessage && (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center justify-center gap-2 bg-brand text-brand-foreground font-semibold px-7 py-3.5 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        ) : (
          <Send className="w-5 h-5" aria-hidden />
        )}
        {t('send')}
      </button>
      <p className="text-xs text-muted-foreground">{t('privacyNote')}</p>
    </form>
  );
}
