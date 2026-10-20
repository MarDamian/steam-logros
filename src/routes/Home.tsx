import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useConfig, useSession } from '@/lib/queries';
import { parseProfileInput } from '@shared/steamid';
import { ErrorNotice } from '@/components/ErrorNotice';

export function Home() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const config = useConfig();
  const session = useSession();
  const [searchParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const looksValid = parseProfileInput(input).kind !== 'invalid';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { steamid } = await api.resolve(input.trim());
      void navigate(`/u/${steamid}`);
    } catch (resolveError) {
      setError(resolveError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className="stack stack--tight">
        <h1>{t('home.heading')}</h1>
        <p className="muted">{t('home.intro')}</p>
      </section>

      {searchParams.get('login') === 'error' ? (
        <div className="notice notice--danger" role="alert">
          <p className="notice__title">{t('home.loginError')}</p>
          <p className="faint">{t('home.loginErrorReason', { motivo: searchParams.get('motivo') ?? '—' })}</p>
        </div>
      ) : null}

      {session.data?.authenticated ? (
        <div className="notice notice--info">
          <p className="notice__title">
            {t('home.sessionActive', { nombre: session.data.player?.personaName ?? session.data.steamid })}
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn--small btn--primary"
              onClick={() => {
                if (session.data.authenticated) void navigate(`/u/${session.data.steamid}`);
              }}
            >
              {t('home.goToMyLibrary')}
            </button>
          </div>
        </div>
      ) : null}

      {config.data?.mode === 'mock' ? (
        <div className="notice notice--info">
          <p className="notice__title">{t('home.mockTitle')}</p>
          <p className="muted">{t('home.mockBody')}</p>
        </div>
      ) : null}

      {!session.data?.authenticated ? (
        <section className="card stack stack--tight">
          <button
            type="button"
            className="btn btn--primary"
            disabled={!config.data?.loginEnabled}
            onClick={() => {
              // Es una navegación de verdad: el login de Steam es una redirección, no un fetch.
              window.location.href = api.loginStartPath;
            }}
          >
            {t('home.loginSteam')}
          </button>
          <p className="faint">
            {config.data && !config.data.loginEnabled ? t('home.loginDisabled') : t('home.loginOnlyIdentifies')}
          </p>
        </section>
      ) : null}

      {!session.data?.authenticated ? (
        <p className="muted" style={{ textAlign: 'center' }}>
          {t('home.or')}
        </p>
      ) : null}

      <form
        className="card stack"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="entrada-perfil">
            {t('home.inputLabel')}
          </label>
          <input
            id="entrada-perfil"
            className="input"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('home.inputPlaceholder')}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            aria-describedby="ayuda-entrada"
          />
          <p className="field__hint" id="ayuda-entrada">
            {t('home.inputHint')}
          </p>
        </div>

        {error ? <ErrorNotice error={error} /> : null}

        <div className="row">
          <button className="btn btn--primary" type="submit" disabled={busy || !looksValid}>
            {busy ? t('loading.generic') : t('home.submit')}
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => {
              const demo = config.data?.demoSteamId;
              if (demo) void navigate(`/u/${demo}`);
            }}
            disabled={!config.data}
          >
            {t('home.demo')}
          </button>
        </div>
        <p className="faint">{t('home.demoHint')}</p>
      </form>

      <section className="card stack stack--tight">
        <h2 style={{ fontSize: '1.05rem' }}>{t('home.privacyTitle')}</h2>
        <p className="muted">{t('home.privacyBody')}</p>
        <p className="faint">{t('home.noTracking')}</p>
      </section>
    </div>
  );
}
