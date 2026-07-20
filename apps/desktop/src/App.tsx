import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

import { CareerApp } from './career/CareerApp.js';
import { Button } from './ui/primitives/actions.js';
import { Skeleton, Status } from './ui/primitives/feedback.js';

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

const sameLifecycleStatus = (current: LifecycleStatus, next: LifecycleStatus) => {
  if (current.state !== next.state) return false;
  if (current.state === 'ready' && next.state === 'ready') {
    return current.ownership === next.ownership;
  }
  if (current.state === 'recoverableFailure' && next.state === 'recoverableFailure') {
    return (
      current.failure.code === next.failure.code &&
      current.failure.message === next.failure.message &&
      current.failure.diagnostic === next.failure.diagnostic
    );
  }
  return true;
};

const bridgeFailure = (): LifecycleStatus => ({
  state: 'recoverableFailure',
  failure: {
    code: 'lifecycle_command_unavailable',
    message: 'The desktop could not check the local service.',
    diagnostic: 'lifecycle_command_unavailable',
  },
});

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
          setStatus((current) => (sameLifecycleStatus(current, nextStatus) ? current : nextStatus));
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

  if (status.state === 'ready') {
    return <CareerApp serviceOwnership={status.ownership} />;
  }

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
          <Status
            headingLevel={2}
            label="Starting local service"
            labelId="state-title"
            variant="loading"
          >
            <p>This should only take a few seconds.</p>
            <Skeleton className="lifecycle-skeleton" lines={2} />
          </Status>
        )}

        {status.state === 'recoverableFailure' && (
          <div className="failure-content">
            <Status
              headingLevel={2}
              label="Local service needs attention"
              labelId="state-title"
              variant="danger"
            >
              <p>{status.failure.message}</p>
            </Status>

            <p className="recovery-copy">
              Close any conflicting local service if needed, then try startup again. Rivallo will
              never stop a process it did not start.
            </p>

            <Button
              className="shell-action"
              leadingIcon="retry"
              loading={retrying}
              loadingLabel="Retrying…"
              onClick={() => void retryLifecycle()}
              variant="primary"
            >
              Retry startup
            </Button>

            {import.meta.env.DEV && (
              <details className="development-diagnostics">
                <summary>Development diagnostics</summary>
                <p>Share this safe lifecycle code when investigating startup.</p>
                <code>{`${status.failure.code}\n${status.failure.diagnostic}`}</code>
                <Button
                  className="copy-button"
                  leadingIcon="copy"
                  onClick={() => void copyDiagnostic(status.failure)}
                  variant="secondary"
                >
                  Copy diagnostic
                </Button>
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
