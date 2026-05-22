'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ContactFormFields from './ContactFormFields';

type Props = {
  buttonLabel: string;
  heading?: string;
  description?: string;
};

// Uses the native <dialog> element rather than a shadcn/Radix Dialog
// primitive — keeps Phase 5b dep-free. Native dialog supports showModal,
// the Escape key, and the backdrop pseudo-element out of the box.
export default function ContactFormDialog({ buttonLabel, heading, description }: Props) {
  const t = useTranslations('ContactForm');
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);

  function openDialog() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeDialog() {
    dialogRef.current?.close();
    setOpen(false);
  }

  // Sync the open state with native close events (ESC key, form method=dialog, etc.)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  // Lock body scroll while the dialog is open so mobile users don't scroll the page behind it.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center bg-brand text-brand-foreground font-semibold px-7 py-3.5 rounded-md hover:opacity-90 transition-opacity"
      >
        {buttonLabel}
        <ArrowRight className="ml-2 w-4 h-4" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="contact-form-dialog-title"
        className="
          m-0 p-0 max-w-none max-h-none w-full h-full
          sm:m-auto sm:w-[min(640px,calc(100vw-2rem))] sm:h-auto sm:max-h-[calc(100vh-2rem)]
          bg-background text-foreground rounded-none sm:rounded-lg shadow-2xl backdrop:bg-black/60
          open:flex open:flex-col
        "
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <div>
            {heading && (
              <h2 id="contact-form-dialog-title" className="text-2xl md:text-3xl font-bold tracking-tight">
                {heading}
              </h2>
            )}
            {description && <p className="mt-2 text-base text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label={t('close')}
            className="flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto">
          <ContactFormFields variant="dialog" onSuccess={() => { /* keep dialog open; success state shows inside */ }} />
        </div>
      </dialog>
    </>
  );
}
