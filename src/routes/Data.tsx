import { useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import {
  applyBackup,
  backupFileName,
  buildBackup,
  clearLocalData,
  parseBackup,
  summarize,
  type BackupSummary,
  type ImportMode,
} from '@/lib/backup';

type Result =
  | { kind: 'importado'; summary: BackupSummary }
  | { kind: 'error'; message: string }
  | { kind: 'borrado'; count: number };

export function Data() {
  const { t, formatNumber } = useI18n();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>('mezclar');
  const [result, setResult] = useState<Result | null>(null);
  // Se recalcula a mano después de importar o borrar: lo que cuenta vive en
  // localStorage, no en el estado de React.
  const [stored, setStored] = useState<BackupSummary>(() => summarize(buildBackup()));
  const hasData = stored.games > 0;

  function onExport(): void {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(file: File): Promise<void> {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setResult({ kind: 'error', message: parsed.error });
      return;
    }
    setResult({ kind: 'importado', summary: applyBackup(parsed.backup, mode) });
    setStored(summarize(buildBackup()));
  }

  function onClear(): void {
    if (!window.confirm(t('data.clearConfirm'))) return;
    setResult({ kind: 'borrado', count: clearLocalData() });
    setStored(summarize(buildBackup()));
  }

  return (
    <div className="stack">
      <section className="stack stack--tight">
        <h1>{t('data.title')}</h1>
        <p className="muted">{t('data.intro')}</p>
      </section>

      <section className="card stack">
        <p role="status">
          {hasData
            ? t('data.stored', {
                juegos: formatNumber(stored.games),
                notas: formatNumber(stored.notes),
                capitulos: formatNumber(stored.chapters),
              })
            : t('data.nothing')}
        </p>

        <div className="row">
          <button type="button" className="btn btn--primary" onClick={onExport} disabled={!hasData}>
            {t('data.export')}
          </button>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="modo-importacion">
            {t('data.importMode')}
          </label>
          <select
            id="modo-importacion"
            className="select"
            value={mode}
            onChange={(event) => setMode(event.target.value as ImportMode)}
          >
            <option value="mezclar">{t('data.importMode.mezclar')}</option>
            <option value="reemplazar">{t('data.importMode.reemplazar')}</option>
          </select>
        </div>

        <div className="row">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            {t('data.import')}
          </button>
          <input
            ref={fileInput}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-label={t('data.import')}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void onImport(file);
            }}
          />
        </div>

        {result?.kind === 'importado' ? (
          <p className="notice notice--info" role="status">
            {t('data.imported', {
              juegos: formatNumber(result.summary.games),
              notas: formatNumber(result.summary.notes),
              capitulos: formatNumber(result.summary.chapters),
            })}
          </p>
        ) : null}
        {result?.kind === 'error' ? (
          <p className="notice notice--danger" role="alert">
            {t('data.importError', { motivo: result.message })}
          </p>
        ) : null}
        {result?.kind === 'borrado' ? (
          <p className="notice notice--info" role="status">
            {t('data.cleared', { cantidad: formatNumber(result.count) })}
          </p>
        ) : null}
      </section>

      <section className="card stack stack--tight">
        <p className="faint">{t('pwa.installHint')}</p>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={onClear} disabled={!hasData}>
            {t('data.clear')}
          </button>
        </div>
      </section>
    </div>
  );
}
