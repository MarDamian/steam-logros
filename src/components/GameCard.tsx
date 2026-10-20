import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { GameProgressSummary, LibraryGame } from '@shared/types';
import { useI18n } from '@/i18n';
import { gameHeaderUrl } from '@/lib/steamImages';
import { useInView } from '@/lib/useInView';
import { ProgressBar } from './Progress';

interface Props {
  game: LibraryGame;
  steamid: string;
  progress: GameProgressSummary | null;
  onVisible: (appid: number) => void;
}

export function GameCard({ game, steamid, progress, onVisible }: Props) {
  const { t, formatNumber } = useI18n();
  const [ref, inView] = useInView<HTMLLIElement>();

  // Solo pedimos el progreso de las tarjetas que la persona llega a ver.
  useEffect(() => {
    if (inView && game.hasStats && progress === null) onVisible(game.appid);
  }, [game.appid, game.hasStats, inView, onVisible, progress]);

  const counted = progress !== null && progress.total > 0 ? progress : null;
  const percent = counted ? (counted.unlocked / counted.total) * 100 : null;
  const hours = Math.round(game.playtimeMinutes / 60);

  return (
    <li className="game-card" ref={ref}>
      <Link className="game-card__link" to={`/u/${steamid}/${game.appid}`}>
        <img
          className="game-card__art"
          src={gameHeaderUrl(game.appid)}
          alt=""
          loading="lazy"
          decoding="async"
          width={460}
          height={215}
        />
        <div className="game-card__body">
          <h3 className="game-card__name">{game.name}</h3>

          {game.hasStats && counted !== null && percent !== null ? (
            <>
              <ProgressBar percent={percent} label={game.name} />
              <div className="game-card__meta">
                <span>
                  {formatNumber(counted.unlocked)} / {formatNumber(counted.total)}
                </span>
                <span className={percent >= 100 ? 'pill pill--done' : 'pill'}>
                  {percent >= 100 ? t('library.perfect') : `${formatNumber(percent, { maximumFractionDigits: 0 })}%`}
                </span>
              </div>
            </>
          ) : (
            <div className="game-card__meta">
              <span>{hours > 0 ? t('library.playtimeHours', { hours }) : t('library.playtimeNone')}</span>
              <span className="pill">
                {!game.hasStats
                  ? t('library.noStats')
                  : progress?.unavailable === 'NO_STATS'
                    ? t('library.noStats')
                    : t('library.notLoaded')}
              </span>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
