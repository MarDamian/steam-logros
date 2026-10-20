import { useI18n } from '@/i18n';
import { ERROR_MESSAGE_KEYS, errorCodeOf } from '@/lib/apiErrors';

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const code = errorCodeOf(error);
  const isPrivate = code === 'PRIVATE_PROFILE';

  return (
    <div className={`notice ${isPrivate ? 'notice--warn' : 'notice--danger'}`} role="alert">
      <p className="notice__title">{t(ERROR_MESSAGE_KEYS[code])}</p>
      {isPrivate ? <PrivateProfileHelp /> : null}
      {onRetry ? (
        <div className="row">
          <button type="button" className="btn btn--small" onClick={onRetry}>
            {t('errors.retry')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function PrivateProfileHelp() {
  const { t } = useI18n();
  return (
    <div className="stack stack--tight">
      <p className="notice__title">{t('private.title')}</p>
      <ol className="muted" style={{ margin: 0, paddingLeft: '1.25rem' }}>
        <li>{t('private.step1')}</li>
        <li>{t('private.step2')}</li>
        <li>{t('private.step3')}</li>
        <li>{t('private.step4')}</li>
        <li>{t('private.step5')}</li>
      </ol>
      <p>
        <a href="https://steamcommunity.com/my/edit/settings" target="_blank" rel="noreferrer noopener">
          steamcommunity.com/my/edit/settings
        </a>
      </p>
    </div>
  );
}
