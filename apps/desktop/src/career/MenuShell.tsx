import { Icon } from '@rivallo/icons';
import type { PropsWithChildren, ReactNode } from 'react';

import { RivalloBrand } from '../matchday/RivalloBrand.js';
import { WindowControls } from '../matchday/WindowControls.js';

interface MenuShellProps extends PropsWithChildren {
  readonly title?: string;
  readonly description?: string;
  readonly onBack?: () => void;
  readonly actions?: ReactNode;
}

export function MenuShell({ children, title, description, onBack, actions }: MenuShellProps) {
  return (
    <div className="menu-shell">
      <header className="menu-shell__bar" data-tauri-drag-region>
        <div className="menu-shell__brand">
          <RivalloBrand />
          <span>0.1.0 · fase 06.6</span>
        </div>
        <div className="menu-shell__bar-actions">{actions}</div>
        <WindowControls />
      </header>
      <main className="menu-shell__main">
        {(title || onBack) && (
          <header className="menu-page-heading">
            {onBack && (
              <button aria-label="Voltar ao Menu Principal" onClick={onBack} type="button">
                <Icon name="previous" size={20} />
              </button>
            )}
            <div>
              {title && <h1>{title}</h1>}
              {description && <p>{description}</p>}
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
