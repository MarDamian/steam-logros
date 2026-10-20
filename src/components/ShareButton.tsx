import { useState } from 'react';
import { useI18n } from '@/i18n';

/** Copia el enlace de esta vista. El enlace es público y de solo lectura. */
export function ShareButton({ path }: { path: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso de portapapeles (http, Safari viejo): al menos mostramos la URL.
      window.prompt(t('share.button'), url);
    }
  }

  return (
    <button
      type="button"
      className="btn btn--small"
      onClick={() => {
        void copy();
      }}
    >
      {copied ? `✓ ${t('share.copied')}` : t('share.button')}
    </button>
  );
}
