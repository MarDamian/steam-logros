import { useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import type { Locale } from '@shared/types';
import { useI18n } from '@/i18n';
import { api } from '@/lib/api';
import { useSession } from '@/lib/queries';
import { useTheme, type ThemeChoice } from '@/lib/theme';

export function AppShell() {
  const { t, locale, setLocale } = useI18n();
  const { choice, setChoice } = useTheme();
  const { steamid } = useParams();
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const sessionSteamId = session.data?.authenticated ? session.data.steamid : null;

  async function logout(): Promise<void> {
    await api.logout();
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    void navigate('/');
  }

  return (
    <>
      <a className="skip-link" href="#contenido">
        {t('nav.home')}
      </a>

      <header className="header">
        <div className="container header__inner">
          <Link className="header__brand" to={steamid ? `/u/${steamid}` : '/'}>
            <span className="header__mark" aria-hidden="true">
              ★
            </span>
            {t('app.name')}
          </Link>

          <span className="header__spacer" />

          <div className="header__tools">
            {sessionSteamId && steamid !== sessionSteamId ? (
              <Link className="btn btn--small btn--ghost" to={`/u/${sessionSteamId}`}>
                {t('nav.myLibrary')}
              </Link>
            ) : null}

            {sessionSteamId ? (
              <button
                type="button"
                className="btn btn--small btn--ghost"
                onClick={() => {
                  void logout();
                }}
              >
                {t('nav.logout')}
              </button>
            ) : steamid ? (
              <Link className="btn btn--small btn--ghost" to="/">
                {t('nav.changeProfile')}
              </Link>
            ) : null}

            <label className="visually-hidden" htmlFor="selector-tema">
              {t('nav.theme')}
            </label>
            <select
              id="selector-tema"
              className="select btn--small"
              style={{ width: 'auto' }}
              value={choice}
              onChange={(event) => setChoice(event.target.value as ThemeChoice)}
            >
              <option value="system">{t('nav.theme.system')}</option>
              <option value="dark">{t('nav.theme.dark')}</option>
              <option value="light">{t('nav.theme.light')}</option>
            </select>

            <label className="visually-hidden" htmlFor="selector-idioma">
              {t('nav.language')}
            </label>
            <select
              id="selector-idioma"
              className="select btn--small"
              style={{ width: 'auto' }}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </header>

      <main id="contenido">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">{t('footer.disclaimer')}</div>
      </footer>
    </>
  );
}
