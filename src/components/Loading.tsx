import { useI18n } from '@/i18n';

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  const { t } = useI18n();
  return (
    <>
      <p className="visually-hidden" role="status">
        {t('loading.generic')}
      </p>
      <ul className="game-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="game-card">
            <div className="skeleton" style={{ aspectRatio: '460 / 215' }} />
            <div className="game-card__body">
              <div className="skeleton" style={{ height: '1.1rem', width: '70%' }} />
              <div className="skeleton" style={{ height: '0.5rem' }} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  const { t } = useI18n();
  return (
    <>
      <p className="visually-hidden" role="status">
        {t('loading.generic')}
      </p>
      <ul className="ach-list" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="ach">
            <div className="skeleton ach__icon" />
            <div className="ach__body">
              <div className="skeleton" style={{ height: '1rem', width: '45%' }} />
              <div className="skeleton" style={{ height: '0.85rem', width: '80%' }} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
