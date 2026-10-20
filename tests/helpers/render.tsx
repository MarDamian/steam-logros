import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { App } from '../../src/App';
import { I18nProvider } from '../../src/i18n';
import { ThemeProvider } from '../../src/lib/theme';

export function renderApp(route: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const tree: ReactNode = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={[route]}>
            <App />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  return render(tree);
}
