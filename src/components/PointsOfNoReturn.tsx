import type { PointWarning } from '@shared/guide';
import { useI18n } from '@/i18n';

interface Props {
  warnings: PointWarning[];
  /** apiName -> nombre visible, para no mostrar códigos crudos. */
  nameOf: (apiName: string) => string;
}

/** El panel del que se trata todo esto: qué se pierde si avanzás. */
export function PointsOfNoReturn({ warnings, nameOf }: Props) {
  const { t, formatNumber } = useI18n();
  if (warnings.length === 0) return null;

  return (
    <section className="no-return" aria-labelledby="titulo-no-retorno">
      <div>
        <h2 className="no-return__title" id="titulo-no-retorno">
          {t('noReturn.title')}
        </h2>
        <p className="muted">{t('noReturn.intro')}</p>
      </div>

      {warnings.map(({ point, chapter, missing }) => (
        <div className="no-return__item" key={point.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{point.title}</strong>
            <span className="pill">
              {chapter ? `${chapter.name} · ` : ''}
              {t('noReturn.missing', { cantidad: formatNumber(missing.length) })}
            </span>
          </div>
          <p className="muted">{point.description}</p>
          <ul className="no-return__locks">
            {missing.map((apiName) => (
              <li key={apiName} className="pill">
                {nameOf(apiName)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
