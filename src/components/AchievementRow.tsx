import type { AchievementType, GuidedAchievement } from '@shared/guide';
import { rarityTier, type RarityTier } from '@shared/rarity';
import { useI18n } from '@/i18n';
import type { MessageKey } from '@/i18n/es';
import type { AchievementNote } from '@/lib/notes';

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

/** ng+ no sirve como sufijo de clase CSS. */
const TYPE_CLASS: Record<AchievementType, string> = {
  historia: 'historia',
  perdible: 'perdible',
  'cualquier-momento': 'cualquier-momento',
  'ng+': 'ngplus',
  'sin-clasificar': 'sin-clasificar',
};

interface Props {
  achievement: GuidedAchievement;
  /** Si el juego tiene paquete de guía: cambia qué tiene sentido mostrar. */
  hasGuide: boolean;
  note: AchievementNote;
  onNoteChange: (apiName: string, note: string) => void;
  onToggleDone: (apiName: string) => void;
}

export function AchievementRow({ achievement, hasGuide, note, onNoteChange, onToggleDone }: Props) {
  const { t, formatDate, formatNumber } = useI18n();
  const tier = rarityTier(achievement.globalPercent);
  const showHiddenHint = achievement.hidden && !achievement.unlocked && achievement.description === '';
  const guide = achievement.guide;
  const notesId = `notas-${achievement.apiName}`;

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
          {hasGuide ? (
            <span className={`badge badge--${TYPE_CLASS[achievement.type]}`}>{t(TYPE_LABEL[achievement.type])}</span>
          ) : null}
          {achievement.chapter ? <span className="pill">{achievement.chapter.name}</span> : null}
          {achievement.hidden ? <span className="pill">{t('game.hiddenLabel')}</span> : null}
          {note.done && !achievement.unlocked ? <span className="pill">{t('notes.doneBadge')}</span> : null}
          {achievement.unlocked ? (
            <span className="pill pill--done">
              {achievement.unlockTime > 0
                ? t('game.unlockedOn', { date: formatDate(achievement.unlockTime) })
                : t('game.unlockedNoDate')}
            </span>
          ) : null}
        </div>

        {guide && (guide.how !== undefined || guide.warning !== undefined) ? (
          <dl className="ach__guide">
            {guide.how !== undefined ? (
              <>
                <dt>{t('guide.how')}</dt>
                <dd>{guide.how}</dd>
              </>
            ) : null}
            {guide.warning !== undefined ? (
              <>
                <dt>{t('guide.warning')}</dt>
                <dd className="ach__warning">{guide.warning}</dd>
              </>
            ) : null}
          </dl>
        ) : null}

        <details className="ach__notes">
          <summary>
            {t('notes.summary')}
            {note.note !== '' ? ' ●' : ''}
          </summary>
          <label className="visually-hidden" htmlFor={notesId}>
            {t('notes.label')}
          </label>
          <textarea
            id={notesId}
            placeholder={t('notes.placeholder')}
            value={note.note}
            onChange={(event) => onNoteChange(achievement.apiName, event.target.value)}
          />
          <label className="row" style={{ gap: '0.4rem', marginTop: '0.3rem' }}>
            <input type="checkbox" checked={note.done} onChange={() => onToggleDone(achievement.apiName)} />
            {t('notes.done')}
          </label>
          <p className="faint">{t('notes.local')}</p>
        </details>
      </div>

      <div className="ach__side">
        {tier ? <span className={`rarity rarity--${tier}`}>{t(RARITY_LABEL[tier])}</span> : null}
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
