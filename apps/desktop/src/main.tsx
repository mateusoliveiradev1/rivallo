import { StrictMode, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from './ui/primitives/disclosure.js';
import './styles.css';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Desktop root element is missing.');
}
const desktopRoot = root;

const isUiLab = import.meta.env.DEV && window.location.pathname === '/__ui-lab';

interface DesktopSurfaceModule {
  readonly App?: ComponentType;
  readonly UiLab?: ComponentType;
}

async function mountDesktopSurface() {
  const surfaceModule: DesktopSurfaceModule = await (isUiLab
    ? import('./ui-lab/UiLab.js')
    : import('./App.js'));
  const Surface = isUiLab ? surfaceModule.UiLab : surfaceModule.App;

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
