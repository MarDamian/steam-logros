import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isSteamId64 } from '@shared/steamid';
import { GameCard } from '@/components/GameCard';
import { ErrorNotice } from '@/components/ErrorNotice';
import { ClientApiError } from '@/lib/api';
import { SkeletonGrid } from '@/components/Loading';
import { ShareButton } from '@/components/ShareButton';
import { useI18n } from '@/i18n';
import { useLibrary, useLibraryProgress, usePlayer } from '@/lib/queries';
import { LIBRARY_SORTS_NEEDING_PROGRESS, sortGames, type LibrarySort } from '@/lib/sorting';

export function Library() {
  const { steamid = '' } = useParams();
  const { t, formatNumber } = useI18n();
  const valid = isSteamId64(steamid);

  const player = usePlayer(valid ? steamid : null);
  const library = useLibrary(valid ? steamid : null);
  const progress = useLibraryProgress(valid ? steamid : null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<LibrarySort>('playtime');
  const [onlyWithAchievements, setOnlyWithAchievements] = useState(false);

  const onVisible = useCallback((appid: number) => progress.request([appid]), [progress]);

  const games = useMemo(() => library.data?.games ?? [], [library.data]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = games.filter((game) => {
      if (onlyWithAchievements && !game.hasStats) return false;
      return needle === '' || game.name.toLowerCase().includes(needle);
    });
    return sortGames(list, sort, progress.get);
    // progress.get se recrea al entrar cada lote: eso es lo que reordena la lista.
  }, [games, onlyWithAchievements, progress.get, search, sort]);

  if (!valid) {
    return <ErrorNotice error={new ClientApiError('BAD_REQUEST', 'SteamID64 inválido')} />;
  }

  return (
    <div className="stack">
      <header className="stack stack--tight">
        <div className="row">
          {player.data?.avatar ? (
            <img
              src={player.data.avatar}
              alt=""
              width={48}
              height={48}
              style={{ borderRadius: '50%', border: '1px solid var(--border)' }}
            />
          ) : null}
          <div>
            <h1 style={{ fontSize: '1.4rem' }}>{player.data?.personaName ?? t('library.heading')}</h1>
            {player.data ? (
              <p className="faint">
                <a href={player.data.profileUrl} target="_blank" rel="noreferrer noopener">
                  {player.data.profileUrl.replace('https://', '')}
                </a>
              </p>
            ) : null}
          </div>
          <span className="header__spacer" />
          <ShareButton path={`/u/${steamid}`} />
        </div>
      </header>

      {library.isError ? <ErrorNotice error={library.error} onRetry={() => void library.refetch()} /> : null}

      {library.isLoading ? <SkeletonGrid /> : null}

      {library.data ? (
        <>
          <div className="library-toolbar">
            <div className="field">
              <label className="field__label" htmlFor="buscar-juego">
                {t('library.searchLabel')}
              </label>
              <input
                id="buscar-juego"
                className="input"
                type="search"
                placeholder={t('library.searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="orden-biblioteca">
                {t('library.sortLabel')}
              </label>
              <select
                id="orden-biblioteca"
                className="select"
                value={sort}
                onChange={(event) => setSort(event.target.value as LibrarySort)}
              >
                <option value="playtime">{t('library.sort.playtime')}</option>
                <option value="name">{t('library.sort.name')}</option>
                <option value="completion">{t('library.sort.completion')}</option>
                <option value="closest">{t('library.sort.closest')}</option>
              </select>
            </div>

            <button
              type="button"
              className="btn"
              disabled={progress.isLoading}
              onClick={() => progress.request(filtered.filter((game) => game.hasStats).map((game) => game.appid))}
            >
              {progress.isLoading ? t('library.loadingProgress') : t('library.loadProgress')}
            </button>
          </div>

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label className="row" style={{ gap: '0.4rem' }}>
              <input
                type="checkbox"
                checked={onlyWithAchievements}
                onChange={(event) => setOnlyWithAchievements(event.target.checked)}
              />
              {t('library.onlyWithAchievements')}
            </label>
            <p className="faint" role="status">
              {t('library.count', { shown: formatNumber(filtered.length), total: formatNumber(games.length) })}
              {progress.pendingCount > 0 ? ` · ${t('library.loadingProgress')}` : ''}
            </p>
          </div>

          <p className="faint">
            {LIBRARY_SORTS_NEEDING_PROGRESS.has(sort) ? t('library.sortNeedsProgress') : t('library.progressHint')}
          </p>

          {filtered.length === 0 ? (
            <p className="empty">{games.length === 0 ? t('library.emptyLibrary') : t('library.empty')}</p>
          ) : (
            <ul className="game-grid">
              {filtered.map((game) => (
                <GameCard
                  key={game.appid}
                  game={game}
                  steamid={steamid}
                  progress={progress.get(game.appid)}
                  onVisible={onVisible}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
