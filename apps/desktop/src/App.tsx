import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

type ServiceOwnership = 'owned' | 'reused';

type FailureCode =
  | 'port_occupied'
  | 'unhealthy_response'
  | 'malformed_readiness'
  | 'incompatible_service'
  | 'readiness_timeout'
  | 'sidecar_start_failed'
  | 'owned_child_exited'
  | 'owned_readiness_lost'
  | 'lifecycle_command_unavailable';

interface LifecycleFailure {
  code: FailureCode;
  message: string;
  diagnostic: string;
}

type LifecycleStatus =
  | { state: 'initializing' }
  | { state: 'ready'; ownership: ServiceOwnership }
  | { state: 'recoverableFailure'; failure: LifecycleFailure };

const INITIAL_STATUS: LifecycleStatus = { state: 'initializing' };
const STATUS_REFRESH_INTERVAL_MS = 500;

const bridgeFailure = (): LifecycleStatus => ({
  state: 'recoverableFailure',
  failure: {
    code: 'lifecycle_command_unavailable',
    message: 'The desktop could not check the local service.',
    diagnostic: 'lifecycle_command_unavailable',
  },
});

const ownershipMessage = (ownership: ServiceOwnership) =>
  ownership === 'owned'
    ? 'The local service started for this desktop session.'
    : 'A compatible local service is already running and has been reused.';

export function App() {
  const [status, setStatus] = useState<LifecycleStatus>(INITIAL_STATUS);
  const [retrying, setRetrying] = useState(false);
  const [copyConfirmation, setCopyConfirmation] = useState('');

  useEffect(() => {
    let active = true;

    const refreshStatus = async () => {
      try {
        const nextStatus = await invoke<LifecycleStatus>('lifecycle_status');
        if (active) {
          setStatus(nextStatus);
        }
      } catch {
        if (active) {
          setStatus(bridgeFailure());
        }
      }
    };

    void refreshStatus();
    const refreshTimer = window.setInterval(() => void refreshStatus(), STATUS_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const retryLifecycle = async () => {
    setRetrying(true);
    setCopyConfirmation('');
    setStatus(INITIAL_STATUS);

    try {
      setStatus(await invoke<LifecycleStatus>('retry_lifecycle'));
    } catch {
      setStatus(bridgeFailure());
    } finally {
      setRetrying(false);
    }
  };

  const copyDiagnostic = async (failure: LifecycleFailure) => {
    try {
      await navigator.clipboard.writeText(`${failure.code}\n${failure.diagnostic}`);
      setCopyConfirmation('Diagnostic copied.');
    } catch {
      setCopyConfirmation('Copy failed. Select the diagnostic text and copy it manually.');
    }
  };

  return (
    <main className="operational-shell">
      <header className="shell-header">
        <p className="working-name">Rivallo</p>
        <h1>Local service</h1>
        <p>Preparing the private service required by this desktop session.</p>
      </header>

      <section
        className={`lifecycle-panel lifecycle-panel--${status.state}`}
        aria-labelledby="state-title"
      >
        {status.state === 'initializing' && (
          <div className="state-content" role="status" aria-live="polite" aria-busy="true">
            <span className="state-indicator" aria-hidden="true" />
            <div>
              <h2 id="state-title">Starting local service</h2>
              <p>This should only take a few seconds.</p>
            </div>
          </div>
        )}

        {status.state === 'ready' && (
          <div className="state-content" role="status" aria-live="polite">
            <span className="state-indicator" aria-hidden="true" />
            <div>
              <h2 id="state-title">Local service ready</h2>
              <p>{ownershipMessage(status.ownership)}</p>
            </div>
          </div>
        )}

        {status.state === 'recoverableFailure' && (
          <div className="failure-content" role="alert">
            <div className="state-content">
              <span className="state-indicator" aria-hidden="true" />
              <div>
                <h2 id="state-title">Local service needs attention</h2>
                <p>{status.failure.message}</p>
              </div>
            </div>

            <p className="recovery-copy">
              Close any conflicting local service if needed, then try startup again. Rivallo will
              never stop a process it did not start.
            </p>

            <button
              type="button"
              className="retry-button"
              onClick={() => void retryLifecycle()}
              disabled={retrying}
            >
              {retrying ? 'Retrying…' : 'Retry startup'}
            </button>

            {import.meta.env.DEV && (
              <details className="development-diagnostics">
                <summary>Development diagnostics</summary>
                <p>Share this safe lifecycle code when investigating startup.</p>
                <code>{`${status.failure.code}\n${status.failure.diagnostic}`}</code>
                <button
                  type="button"
                  className="copy-button"
                  onClick={() => void copyDiagnostic(status.failure)}
                >
                  Copy diagnostic
                </button>
                <span className="copy-confirmation" role="status" aria-live="polite">
                  {copyConfirmation}
                </span>
              </details>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
