import type { CatalogAchievement } from '@shared/types';
import { rarityTier } from '@shared/rarity';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/es';

export interface AchievementView extends CatalogAchievement {
  unlocked: boolean;
  unlockTime: number;
}

const RARITY_LABEL: Record<string, MessageKey> = {
  comun: 'rarity.comun',
  pocoComun: 'rarity.pocoComun',
  rara: 'rarity.rara',
  muyRara: 'rarity.muyRara',
  ultraRara: 'rarity.ultraRara',
};

export function AchievementRow({ achievement }: { achievement: AchievementView }) {
  const { t, formatDate, formatNumber } = useI18n();
  const tier = rarityTier(achievement.globalPercent);
  const showHiddenHint = achievement.hidden && !achievement.unlocked && achievement.description === '';

  return (
    <li className={`ach${achievement.unlocked ? ' ach--unlocked' : ''}`}>
      <img
        className={`ach__icon${achievement.unlocked ? '' : ' ach__icon--locked'}`}
        src={achievement.unlocked ? achievement.icon : achievement.iconGray || achievement.icon}
        alt=""
        loading="lazy"
        decoding="async"
        width={64}
        height={64}
      />

      <div className="ach__body">
        <p className="ach__name">{achievement.displayName}</p>
        <p className="ach__desc">{showHiddenHint ? t('game.hiddenDesc') : achievement.description}</p>
        <div className="ach__tags">
          {achievement.hidden ? <span className="pill">{t('game.hiddenLabel')}</span> : null}
          {achievement.unlocked ? (
            <span className="pill pill--done">
              {achievement.unlockTime > 0
                ? t('game.unlockedOn', { date: formatDate(achievement.unlockTime) })
                : t('game.unlockedNoDate')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="ach__side">
        {tier ? <span className={`rarity rarity--${tier}`}>{t(RARITY_LABEL[tier] as MessageKey)}</span> : null}
        <span className="faint">
          {achievement.globalPercent === null
            ? t('game.globalUnknown')
            : t('game.globalPercent', {
                percent: formatNumber(achievement.globalPercent, { maximumFractionDigits: 1 }),
              })}
        </span>
      </div>
    </li>
  );
}
