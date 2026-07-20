import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from './ui/primitives/disclosure.js';
import { initializeWorldReferenceCatalog } from './world-reference-catalog.js';
import './styles.css';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Desktop root element is missing.');
}
const desktopRoot = root;

const isUiLab = import.meta.env.DEV && window.location.pathname === '/__ui-lab';
const isDataEditor = window.location.pathname === '/data-editor';

interface DesktopSurfaceModule {
  readonly App?: ComponentType;
  readonly DataEditorApp?: ComponentType;
  readonly UiLab?: ComponentType;
}

async function mountDesktopSurface() {
  if (!isUiLab) await initializeWorldReferenceCatalog();
  const surfaceModule: DesktopSurfaceModule = isDataEditor
    ? await import('./data-editor/DataEditorApp.js')
    : await (isUiLab ? import('./ui-lab/UiLab.js') : import('./App.js'));
  const Surface = isDataEditor
    ? surfaceModule.DataEditorApp
    : isUiLab
      ? surfaceModule.UiLab
      : surfaceModule.App;

  if (!Surface) {
    throw new Error('Desktop surface module is missing its expected export.');
  }

  createRoot(desktopRoot).render(
    <StrictMode>
      <TooltipProvider>
        <Surface />
      </TooltipProvider>
    </StrictMode>,
  );
}

void mountDesktopSurface();
