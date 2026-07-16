import { invoke } from '@tauri-apps/api/core';
import { Icon } from '@rivallo/icons';

import { Tooltip } from '../ui/primitives/disclosure.js';

const windowCommand = (command: string, value?: unknown) =>
  invoke(`plugin:window|${command}`, {
    label: 'main',
    ...(value === undefined ? {} : { value }),
  });

export function WindowControls() {
  const runWindowAction = (action: () => Promise<unknown>) => {
    void action().catch(() => {
      // The controls are rendered in browser QA too; window commands only exist in Tauri.
    });
  };

  return (
    <div aria-label="Controles da janela" className="window-controls" role="group">
      <Tooltip content="Minimizar Rivallo">
        <button
          aria-label="Minimizar Rivallo"
          onClick={() => runWindowAction(() => windowCommand('minimize'))}
          type="button"
        >
          <Icon name="minimize" size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Alternar tela cheia">
        <button
          aria-label="Alternar tela cheia"
          onClick={() =>
            runWindowAction(async () =>
              windowCommand('set_fullscreen', !(await windowCommand('is_fullscreen'))),
            )
          }
          type="button"
        >
          <Icon name="fullscreen" size={16} />
        </button>
      </Tooltip>
      <Tooltip content="Fechar Rivallo">
        <button
          aria-label="Fechar Rivallo"
          className="window-controls__close"
          onClick={() => runWindowAction(() => windowCommand('close'))}
          type="button"
        >
          <Icon name="close" size={16} />
        </button>
      </Tooltip>
    </div>
  );
}
