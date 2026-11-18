import { createRoot } from 'react-dom/client';
import { AriaLiveAnnouncer, FluentProvider, RendererProvider, createDOMRenderer } from '@fluentui/react-components';
import { atlasLightTheme } from './theme/atlasTheme';
import { mediaQueryOrder } from './theme/constants';
import { LanguageProvider } from './i18n/i18n';
import { App } from './App';
import { loadConfig } from './engine/forms';
import { navigate } from './router/router';
import { studyEntryPath } from './state/study';
import { startBrowse } from './state/persist';
import { BROWSE_PATH } from './study/browse';

const renderer = createDOMRenderer(document, {
  compareMediaQueries: (a, b) => mediaQueryOrder.indexOf(a) - mediaQueryOrder.indexOf(b),
});

// «Se deg rundt» (3.7): the tab opened at #/studie/se-rundt keeps its own storage and starts the study afresh.
if (window.location.hash.startsWith(BROWSE_PATH)) {
  startBrowse();
  window.history.replaceState(null, '', `${window.location.pathname}#/studie`);
}

loadConfig().finally(() => {
  // The study link in a browser that holds a session opens the welcome back first (decision 11). After the
  // configuration: a session belongs to its round, and the round is read from it.
  const entry = studyEntryPath(window.location.hash);
  if (entry) navigate(entry, { replace: true });
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
