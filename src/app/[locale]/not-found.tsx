import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui';

export default function NotFound() {
  const t = useTranslations('NotFound');
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-foreground mb-2">{t('title')}</h1>
        <p className="text-xl text-muted-foreground mb-8">{t('message')}</p>
        <Link href="/" className={buttonVariants({ variant: 'button', tone: 'dark' })}>
          {t('back')}
        </Link>
      </div>
    </div>
  );
}
