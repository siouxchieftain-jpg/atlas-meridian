import { createRoot } from 'react-dom/client';
import { AriaLiveAnnouncer, FluentProvider, RendererProvider, createDOMRenderer } from '@fluentui/react-components';
import { atlasLightTheme } from './theme/atlasTheme';
import { mediaQueryOrder } from './theme/constants';
import { LanguageProvider } from './i18n/i18n';
import { App } from './App';
import { loadConfig } from './engine/forms';

const renderer = createDOMRenderer(document, {
  compareMediaQueries: (a, b) => mediaQueryOrder.indexOf(a) - mediaQueryOrder.indexOf(b),
});

loadConfig().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <RendererProvider renderer={renderer} targetDocument={document}>
      <FluentProvider theme={atlasLightTheme} style={{ minHeight: '100dvh', backgroundColor: 'transparent' }}>
        <AriaLiveAnnouncer>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </AriaLiveAnnouncer>
      </FluentProvider>
    </RendererProvider>,
  );
});
