import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ACHIEVEMENT_TYPES,
  guideCoverage,
  mergeGuide,
  orderedChapters,
  pendingPointsOfNoReturn,
  type AchievementType,
} from '@shared/guide';
import { resolveGameTitle } from '@shared/gameTitle';
import { RARITY_TIERS, rarityTier, type RarityTier } from '@shared/rarity';
import { isSteamId64 } from '@shared/steamid';
import { AchievementRow } from '@/components/AchievementRow';
import { ErrorNotice } from '@/components/ErrorNotice';
import { SkeletonRows } from '@/components/Loading';
import { PointsOfNoReturn } from '@/components/PointsOfNoReturn';
import { ShareButton } from '@/components/ShareButton';
import { ProgressBar } from '@/components/Progress';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/es';
import { ClientApiError } from '@/lib/api';
import { errorCodeOf } from '@/lib/apiErrors';
import { useGuide, useGuideIndex } from '@/lib/guide';
import { isSomeoneElse } from '@/lib/profile';
import { useCurrentChapter, useNotes } from '@/lib/notes';
import { steamLanguageFor, useCachedLibrary, useCatalog, useProgress } from '@/lib/queries';
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

const TYPE_LABEL: Record<AchievementType, MessageKey> = {
  historia: 'guide.badge.historia',
  perdible: 'guide.badge.perdible',
  'cualquier-momento': 'guide.badge.cualquier-momento',
  'ng+': 'guide.badge.ng+',
  'sin-clasificar': 'guide.badge.sin-clasificar',
};

export function Game() {
  const { steamid = '', appid: appidParam = '' } = useParams();
  const { t, locale, formatNumber } = useI18n();
  const appid = Number(appidParam);
  const validSteamId = isSteamId64(steamid);
  const validAppId = Number.isInteger(appid) && appid > 0;

  const catalog = useCatalog(validAppId ? appid : 0, steamLanguageFor(locale));
  const progress = useProgress(validSteamId ? steamid : null, validAppId ? appid : 0);
  const library = useCachedLibrary(validSteamId ? steamid : null);
  const guideIndex = useGuideIndex();
  const guide = useGuide(validAppId ? appid : 0, guideIndex.data);
  const notes = useNotes(validAppId ? appid : 0);
  const [currentChapter, setCurrentChapter] = useCurrentChapter(validAppId ? appid : 0);

  const [state, setState] = useState<StateFilter>('all');
  const [rarity, setRarity] = useState<RarityTier | 'any'>('any');
  const [type, setType] = useState<AchievementType | 'any'>('any');
  const [chapterFilter, setChapterFilter] = useState('any');
  const [sort, setSort] = useState<AchievementSort>('easiest');
  const [search, setSearch] = useState('');

  const pack = guide.data ?? null;
  const hasGuide = pack !== null;

  // El gameName del esquema de Steam no siempre es el nombre del juego.
  const title = resolveGameTitle({
    libraryName: library.data?.games.find((game) => game.appid === appid)?.name,
    packName: pack?.game,
    catalogName: catalog.data?.gameName,
    appid,
  });

  const achievements = useMemo(() => {
    const unlocked = progress.data?.unlocked ?? {};
    const withProgress = (catalog.data?.achievements ?? []).map((achievement) => ({
      ...achievement,
      unlocked: achievement.apiName in unlocked,
      unlockTime: unlocked[achievement.apiName] ?? 0,
    }));
    return mergeGuide(withProgress, pack);
  }, [catalog.data, pack, progress.data]);

  const chapters = useMemo(() => orderedChapters(pack), [pack]);
  const coverage = useMemo(() => guideCoverage(achievements.length, pack), [achievements.length, pack]);

  const warnings = useMemo(() => {
    const unlockedNames = new Set(achievements.filter((a) => a.unlocked).map((a) => a.apiName));
    return pendingPointsOfNoReturn(pack, unlockedNames, currentChapter);
  }, [achievements, currentChapter, pack]);

  const nameOf = useMemo(() => {
    const names = new Map(achievements.map((a) => [a.apiName, a.displayName]));
    return (apiName: string) => names.get(apiName) ?? apiName;
  }, [achievements]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = achievements.filter((achievement) => {
      if (state === 'unlocked' && !achievement.unlocked) return false;
      if (state === 'locked' && achievement.unlocked) return false;
      if (rarity !== 'any' && rarityTier(achievement.globalPercent) !== rarity) return false;
      if (type !== 'any' && achievement.type !== type) return false;
      if (chapterFilter !== 'any' && achievement.guide?.chapter !== chapterFilter) return false;
      if (needle === '') return true;
      return (
        achievement.displayName.toLowerCase().includes(needle) ||
        achievement.description.toLowerCase().includes(needle) ||
        (achievement.guide?.how ?? '').toLowerCase().includes(needle)
      );
    });
    return sortAchievements(filtered, sort);
  }, [achievements, chapterFilter, rarity, search, sort, state, type]);

  if (!validSteamId || !validAppId) {
    return <ErrorNotice error={new ClientApiError('BAD_REQUEST', 'Dirección inválida')} />;
  }

  const total = achievements.length;
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const percent = total > 0 ? (unlockedCount / total) * 100 : 0;

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Link to={`/u/${steamid}`}>&larr; {t('game.back')}</Link>
        <ShareButton path={`/u/${steamid}/${appid}`} />
      </div>

      {isSomeoneElse(steamid) ? (
        <div className="notice notice--info">
          <p className="notice__title">{t('share.readOnlyTitle')}</p>
          <p className="muted">{t('share.readOnlyBody')}</p>
        </div>
      ) : null}

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
          <h1 style={{ fontSize: '1.5rem' }}>{title}</h1>
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
            {notes.count > 0 ? ` · ${t('notes.count', { cantidad: formatNumber(notes.count) })}` : ''}
          </p>
        </div>
      </section>

      {catalog.isError ? <ErrorNotice error={catalog.error} onRetry={() => void catalog.refetch()} /> : null}

      {progress.isError && errorCodeOf(progress.error) !== 'NO_STATS' ? (
        <ErrorNotice error={progress.error} onRetry={() => void progress.refetch()} />
      ) : null}

      <PointsOfNoReturn warnings={warnings} nameOf={nameOf} />

      {catalog.isLoading ? <SkeletonRows /> : null}

      {catalog.data ? (
        <>
          {hasGuide ? (
            <div className="notice notice--info">
              <p>
                {t('guide.coverage', {
                  clasificados: formatNumber(coverage.classified),
                  total: formatNumber(coverage.total),
                  perdibles: formatNumber(coverage.missable),
                })}
              </p>
              {coverage.classified < coverage.total ? <p className="faint">{t('guide.unclassified')}</p> : null}
              {pack?.note !== undefined ? <p className="faint">{pack.note}</p> : null}
              {pack?.source !== undefined ? (
                <p className="faint">
                  {pack.source.url !== undefined ? (
                    <a href={pack.source.url} target="_blank" rel="noreferrer noopener">
                      {t('guide.source', { fuente: pack.source.name })}
                    </a>
                  ) : (
                    t('guide.source', { fuente: pack.source.name })
                  )}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="faint">{t('guide.none')}</p>
          )}

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

            {hasGuide ? (
              <div className="library-toolbar">
                <div className="field">
                  <label className="field__label" htmlFor="filtro-tipo">
                    {t('guide.typeFilterLabel')}
                  </label>
                  <select
                    id="filtro-tipo"
                    className="select"
                    value={type}
                    onChange={(event) => setType(event.target.value as AchievementType | 'any')}
                  >
                    <option value="any">{t('guide.type.any')}</option>
                    {ACHIEVEMENT_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {t(TYPE_LABEL[option])}
                      </option>
                    ))}
                  </select>
                </div>

                {chapters.length > 0 ? (
                  <>
                    <div className="field">
                      <label className="field__label" htmlFor="filtro-capitulo">
                        {t('guide.chapterFilterLabel')}
                      </label>
                      <select
                        id="filtro-capitulo"
                        className="select"
                        value={chapterFilter}
                        onChange={(event) => setChapterFilter(event.target.value)}
                      >
                        <option value="any">{t('guide.chapter.any')}</option>
                        {chapters.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label className="field__label" htmlFor="capitulo-actual">
                        {t('guide.currentChapterLabel')}
                      </label>
                      <select
                        id="capitulo-actual"
                        className="select"
                        value={currentChapter ?? ''}
                        onChange={(event) => setCurrentChapter(event.target.value || null)}
                      >
                        <option value="">{t('guide.currentChapter.none')}</option>
                        {chapters.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="faint" role="status">
            {formatNumber(visible.length)} / {formatNumber(total)}
          </p>

          {visible.length === 0 ? (
            <p className="empty">{t('game.noResults')}</p>
          ) : (
            <ul className="ach-list" aria-label={t('game.listLabel')}>
              {visible.map((achievement) => (
                <AchievementRow
                  key={achievement.apiName}
                  achievement={achievement}
                  hasGuide={hasGuide}
                  note={notes.noteFor(achievement.apiName)}
                  onNoteChange={notes.setNote}
                  onToggleDone={notes.toggleDone}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
