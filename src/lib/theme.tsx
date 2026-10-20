import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'logros:theme';

interface ThemeValue {
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function readStored(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(readStored);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', choice);
    }
    window.localStorage.setItem(STORAGE_KEY, choice);
  }, [choice]);

  const value = useMemo<ThemeValue>(() => ({ choice, setChoice }), [choice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme necesita estar dentro de <ThemeProvider>');
  return value;
}
