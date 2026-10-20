import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RARITY_TIERS, rarityTier, type RarityTier } from '@shared/rarity';
import { isSteamId64 } from '@shared/steamid';
import { AchievementRow, type AchievementView } from '@/components/AchievementRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { errorCodeOf } from '@/lib/apiErrors';
import { SkeletonRows } from '@/components/Loading';
import { ProgressBar } from '@/components/Progress';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/es';
import { ClientApiError } from '@/lib/api';
import { steamLanguageFor, useCatalog, useProgress } from '@/lib/queries';
import { sortAchievements, type AchievementSort } from '@/lib/sorting';
import { gameHeaderUrl, steamAchievementsUrl } from '@/lib/steamImages';

type StateFilter = 'all' | 'unlocked' | 'locked';

const RARITY_LABEL: Record<RarityTier, MessageKey> = {
  comun: 'rarity.comun',
  pocoComun: 'rarity.pocoComun',
  rara: 'rarity.rara',
  muyRara: 'rarity.muyRara',
  ultraRara: 'rarity.ultraRara',
};

export function Game() {
  const { steamid = '', appid: appidParam = '' } = useParams();
  const { t, locale, formatNumber } = useI18n();
  const appid = Number(appidParam);
  const validSteamId = isSteamId64(steamid);
  const validAppId = Number.isInteger(appid) && appid > 0;

  const catalog = useCatalog(validAppId ? appid : 0, steamLanguageFor(locale));
  const progress = useProgress(validSteamId ? steamid : null, validAppId ? appid : 0);

  const [state, setState] = useState<StateFilter>('all');
  const [rarity, setRarity] = useState<RarityTier | 'any'>('any');
  const [sort, setSort] = useState<AchievementSort>('easiest');
  const [search, setSearch] = useState('');

  const achievements = useMemo<AchievementView[]>(() => {
    const unlocked = progress.data?.unlocked ?? {};
    return (catalog.data?.achievements ?? []).map((achievement) => ({
      ...achievement,
      unlocked: achievement.apiName in unlocked,
      unlockTime: unlocked[achievement.apiName] ?? 0,
    }));
  }, [catalog.data, progress.data]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = achievements.filter((achievement) => {
      if (state === 'unlocked' && !achievement.unlocked) return false;
      if (state === 'locked' && achievement.unlocked) return false;
      if (rarity !== 'any' && rarityTier(achievement.globalPercent) !== rarity) return false;
      if (needle === '') return true;
      return (
        achievement.displayName.toLowerCase().includes(needle) ||
        achievement.description.toLowerCase().includes(needle)
      );
    });
    return sortAchievements(filtered, sort);
  }, [achievements, rarity, search, sort, state]);

  if (!validSteamId || !validAppId) {
    return <ErrorNotice error={new ClientApiError('BAD_REQUEST', 'Dirección inválida')} />;
  }

  const total = achievements.length;
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const percent = total > 0 ? (unlockedCount / total) * 100 : 0;
  const progressBlocked = progress.isError;

  return (
    <div className="stack">
      <p>
        <Link to={`/u/${steamid}`}>&larr; {t('game.back')}</Link>
      </p>

      <section className="game-hero">
        <img
          className="game-hero__art"
          src={gameHeaderUrl(appid)}
          alt=""
          width={460}
          height={215}
          decoding="async"
        />
        <div className="stack stack--tight">
          <h1 style={{ fontSize: '1.5rem' }}>{catalog.data?.gameName ?? `App ${appid}`}</h1>
          <div className="stats-row">
            <div className="stat">
              <p className="stat__value">{formatNumber(unlockedCount)}</p>
              <p className="stat__label">{t('game.stat.unlocked')}</p>
            </div>
            <div className="stat">
              <p className="stat__value">{formatNumber(total)}</p>
              <p className="stat__label">{t('game.stat.total')}</p>
            </div>
            <div className="stat">
              <p className="stat__value">
                {percent >= 100 && total > 0
                  ? t('game.stat.perfect')
                  : `${formatNumber(percent, { maximumFractionDigits: 1 })}%`}
              </p>
              <p className="stat__label">{t('game.stat.completion')}</p>
            </div>
          </div>
          <ProgressBar percent={percent} label={t('game.stat.completion')} />
          <p className="faint">
            <a href={steamAchievementsUrl(appid)} target="_blank" rel="noreferrer noopener">
              {t('game.openInSteam')}
            </a>
          </p>
        </div>
      </section>

      {catalog.isError ? <ErrorNotice error={catalog.error} onRetry={() => void catalog.refetch()} /> : null}

      {progressBlocked && errorCodeOf(progress.error) !== 'NO_STATS' ? (
        <ErrorNotice error={progress.error} onRetry={() => void progress.refetch()} />
      ) : null}

      {catalog.isLoading ? <SkeletonRows /> : null}

      {catalog.data ? (
        <>
          <div className="stack stack--tight">
            <div className="field">
              <label className="field__label" htmlFor="buscar-logro">
                {t('game.searchLabel')}
              </label>
              <input
                id="buscar-logro"
                className="input"
                type="search"
                placeholder={t('game.searchPlaceholder')}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <ul className="chips">
              {(['all', 'unlocked', 'locked'] as const).map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={state === option}
                    onClick={() => setState(option)}
                  >
                    {t(`game.state.${option}` as MessageKey)}
                  </button>
                </li>
              ))}
            </ul>

            <div className="library-toolbar">
              <div className="field">
                <label className="field__label" htmlFor="filtro-rareza">
                  {t('game.rarityFilterLabel')}
                </label>
                <select
                  id="filtro-rareza"
                  className="select"
                  value={rarity}
                  onChange={(event) => setRarity(event.target.value as RarityTier | 'any')}
                >
                  <option value="any">{t('game.rarity.any')}</option>
                  {RARITY_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {t(RARITY_LABEL[tier])}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="orden-logros">
                  {t('game.sortLabel')}
                </label>
                <select
                  id="orden-logros"
                  className="select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as AchievementSort)}
                >
                  <option value="easiest">{t('game.sort.easiest')}</option>
                  <option value="hardest">{t('game.sort.hardest')}</option>
                  <option value="recent">{t('game.sort.recent')}</option>
                  <option value="name">{t('game.sort.name')}</option>
                  <option value="default">{t('game.sort.default')}</option>
                </select>
              </div>
            </div>
          </div>

          <p className="faint" role="status">
            {formatNumber(visible.length)} / {formatNumber(total)}
          </p>

          {visible.length === 0 ? (
            <p className="empty">{t('game.noResults')}</p>
          ) : (
            <ul className="ach-list">
              {visible.map((achievement) => (
                <AchievementRow key={achievement.apiName} achievement={achievement} />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
