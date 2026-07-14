use std::io::{self, Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::sync::{Arc, Mutex, MutexGuard};
use std::thread;
use std::time::{Duration, Instant};

use rivallo_platform::{
    LOCAL_API_ADDRESS, READINESS_POLL_INTERVAL, READINESS_TIMEOUT, ReadinessDiagnostic,
    SHUTDOWN_CONTROL_MESSAGE, validate_readiness_response,
};
use serde::Serialize;
use tauri::{AppHandle, RunEvent, State};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};

const PROBE_IO_TIMEOUT: Duration = Duration::from_millis(400);
const OWNED_READINESS_INTERVAL: Duration = Duration::from_secs(1);
const COOPERATIVE_SHUTDOWN_WAIT: Duration = Duration::from_millis(750);
const MAX_READINESS_RESPONSE_BYTES: u64 = 8 * 1024;

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
enum ServiceOwnership {
    Owned,
    Reused,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
enum FailureCode {
    PortOccupied,
    UnhealthyResponse,
    MalformedReadiness,
    IncompatibleService,
    ReadinessTimeout,
    SidecarStartFailed,
    OwnedChildExited,
    OwnedReadinessLost,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct LifecycleFailure {
    code: FailureCode,
    message: &'static str,
    diagnostic: &'static str,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
enum LifecycleStatus {
    Initializing,
    Ready { ownership: ServiceOwnership },
    RecoverableFailure { failure: LifecycleFailure },
}

type OwnedChild = Arc<Mutex<Option<CommandChild>>>;

struct LifecycleInner {
    status: LifecycleStatus,
    generation: u64,
    owned_child: Option<OwnedChild>,
    shutting_down: bool,
}

struct LifecycleManager {
    inner: Mutex<LifecycleInner>,
}

impl LifecycleManager {
    fn new() -> Self {
        Self {
            inner: Mutex::new(LifecycleInner {
                status: LifecycleStatus::Initializing,
                generation: 0,
                owned_child: None,
                shutting_down: false,
            }),
        }
    }

    fn lock(&self) -> MutexGuard<'_, LifecycleInner> {
        self.inner
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn status(&self) -> LifecycleStatus {
        self.lock().status.clone()
    }

    fn begin(self: &Arc<Self>, app: AppHandle) {
        let (generation, previous_child) = {
            let mut inner = self.lock();
            inner.generation += 1;
            inner.status = LifecycleStatus::Initializing;
            inner.shutting_down = false;
            (inner.generation, inner.owned_child.take())
        };
        let manager = Arc::clone(self);
        tauri::async_runtime::spawn_blocking(move || {
            stop_owned_child(previous_child);
            run_lifecycle_attempt(app, manager, generation);
        });
    }

    fn is_current(&self, generation: u64) -> bool {
        let inner = self.lock();
        inner.generation == generation && !inner.shutting_down
    }

    fn is_initializing(&self, generation: u64) -> bool {
        let inner = self.lock();
        inner.generation == generation
            && !inner.shutting_down
            && matches!(inner.status, LifecycleStatus::Initializing)
    }

    fn is_ready_owned(&self, generation: u64) -> bool {
        let inner = self.lock();
        inner.generation == generation
            && !inner.shutting_down
            && matches!(
                inner.status,
                LifecycleStatus::Ready {
                    ownership: ServiceOwnership::Owned
                }
            )
    }

    fn store_owned_child(&self, generation: u64, child: OwnedChild) -> bool {
        let mut inner = self.lock();
        if inner.generation != generation || inner.shutting_down {
            return false;
        }
        inner.owned_child = Some(child);
        true
    }

    fn mark_ready(&self, generation: u64, ownership: ServiceOwnership) {
        let mut inner = self.lock();
        if inner.generation == generation && !inner.shutting_down {
            inner.status = LifecycleStatus::Ready { ownership };
        }
    }

    fn mark_failure(&self, generation: u64, failure: LifecycleFailure) {
        let mut inner = self.lock();
        if inner.generation == generation && !inner.shutting_down {
            inner.status = LifecycleStatus::RecoverableFailure { failure };
        }
    }

    fn shutdown_owned(&self) {
        let owned_child = {
            let mut inner = self.lock();
            inner.generation += 1;
            inner.shutting_down = true;
            inner.owned_child.take()
        };
        stop_owned_child(owned_child);
    }
}

#[derive(Debug)]
enum ProbeResult {
    Compatible,
    NotListening,
    Failure(LifecycleFailure),
}

enum InitialAction {
    Reuse,
    Spawn,
    Fail(LifecycleFailure),
}

fn decide_initial_probe(result: ProbeResult) -> InitialAction {
    match result {
        ProbeResult::Compatible => InitialAction::Reuse,
        ProbeResult::NotListening => InitialAction::Spawn,
        ProbeResult::Failure(failure) => InitialAction::Fail(failure),
    }
}

fn run_lifecycle_attempt(app: AppHandle, manager: Arc<LifecycleManager>, generation: u64) {
    if !manager.is_current(generation) {
        return;
    }

    match decide_initial_probe(probe_readiness()) {
        InitialAction::Reuse => {
            manager.mark_ready(generation, ServiceOwnership::Reused);
            return;
        }
        InitialAction::Fail(failure) => {
            manager.mark_failure(generation, failure);
            return;
        }
        InitialAction::Spawn => {}
    }

    let command = match app.shell().sidecar("local_api") {
        Ok(command) => command,
        Err(_) => {
            manager.mark_failure(generation, sidecar_start_failure());
            return;
        }
    };
    let (mut events, child) = match command.spawn() {
        Ok(spawned) => spawned,
        Err(_) => {
            manager.mark_failure(generation, sidecar_start_failure());
            return;
        }
    };
    let owned_child = Arc::new(Mutex::new(Some(child)));
    if !manager.store_owned_child(generation, Arc::clone(&owned_child)) {
        stop_owned_child(Some(owned_child));
        return;
    }

    let exit_manager = Arc::clone(&manager);
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            if matches!(event, CommandEvent::Terminated(_)) {
                exit_manager.mark_failure(
                    generation,
                    LifecycleFailure {
                        code: FailureCode::OwnedChildExited,
                        message: "The local service stopped unexpectedly.",
                        diagnostic: "owned_child_exited",
                    },
                );
                break;
            }
        }
    });

    let deadline = Instant::now() + READINESS_TIMEOUT;
    loop {
        if !manager.is_initializing(generation) {
            return;
        }
        match probe_readiness() {
            ProbeResult::Compatible => {
                manager.mark_ready(generation, ServiceOwnership::Owned);
                start_owned_readiness_monitor(manager, generation);
                return;
            }
            ProbeResult::NotListening if Instant::now() < deadline => {
                thread::sleep(READINESS_POLL_INTERVAL);
            }
            ProbeResult::NotListening => {
                manager.mark_failure(
                    generation,
                    LifecycleFailure {
                        code: FailureCode::ReadinessTimeout,
                        message: "The local service did not become ready in time.",
                        diagnostic: "readiness_timeout",
                    },
                );
                return;
            }
            ProbeResult::Failure(failure) => {
                manager.mark_failure(generation, failure);
                return;
            }
        }
    }
}

fn start_owned_readiness_monitor(manager: Arc<LifecycleManager>, generation: u64) {
    tauri::async_runtime::spawn_blocking(move || {
        while manager.is_ready_owned(generation) {
            thread::sleep(OWNED_READINESS_INTERVAL);
            if !manager.is_ready_owned(generation) {
                break;
            }
            if !matches!(probe_readiness(), ProbeResult::Compatible) {
                manager.mark_failure(
                    generation,
                    LifecycleFailure {
                        code: FailureCode::OwnedReadinessLost,
                        message: "The local service is no longer ready.",
                        diagnostic: "owned_readiness_lost",
                    },
                );
                break;
            }
        }
    });
}

fn probe_readiness() -> ProbeResult {
    let address: SocketAddr = LOCAL_API_ADDRESS
        .parse()
        .expect("the fixed platform address is valid");
    let mut stream = match TcpStream::connect_timeout(&address, PROBE_IO_TIMEOUT) {
        Ok(stream) => stream,
        Err(error)
            if matches!(
                error.kind(),
                io::ErrorKind::ConnectionRefused
                    | io::ErrorKind::TimedOut
                    | io::ErrorKind::NotConnected
            ) =>
        {
            return ProbeResult::NotListening;
        }
        Err(_) => return ProbeResult::Failure(port_occupied_failure()),
    };
    if stream.set_read_timeout(Some(PROBE_IO_TIMEOUT)).is_err()
        || stream.set_write_timeout(Some(PROBE_IO_TIMEOUT)).is_err()
        || stream
            .write_all(b"GET /ready HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
            .is_err()
    {
        return ProbeResult::Failure(port_occupied_failure());
    }

    let mut response = Vec::new();
    if stream
        .take(MAX_READINESS_RESPONSE_BYTES + 1)
        .read_to_end(&mut response)
        .is_err()
        || response.len() as u64 > MAX_READINESS_RESPONSE_BYTES
    {
        return ProbeResult::Failure(malformed_readiness_failure());
    }
    let Some(headers_end) = response.windows(4).position(|bytes| bytes == b"\r\n\r\n") else {
        return ProbeResult::Failure(malformed_readiness_failure());
    };
    let Some(status) = response
        .split(|byte| *byte == b'\n')
        .next()
        .and_then(|line| std::str::from_utf8(line).ok())
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|status| status.parse::<u16>().ok())
    else {
        return ProbeResult::Failure(malformed_readiness_failure());
    };
    let body = &response[headers_end + 4..];
    match validate_readiness_response(status, body) {
        Ok(_) => ProbeResult::Compatible,
        Err(ReadinessDiagnostic::UnhealthyStatus(_)) => ProbeResult::Failure(LifecycleFailure {
            code: FailureCode::UnhealthyResponse,
            message: "A local service answered but is not ready.",
            diagnostic: "unhealthy_readiness_response",
        }),
        Err(ReadinessDiagnostic::MalformedPayload) => {
            ProbeResult::Failure(malformed_readiness_failure())
        }
        Err(ReadinessDiagnostic::Incompatible) => ProbeResult::Failure(LifecycleFailure {
            code: FailureCode::IncompatibleService,
            message: "A different or incompatible local service is using the required address.",
            diagnostic: "incompatible_local_service",
        }),
    }
}

fn port_occupied_failure() -> LifecycleFailure {
    LifecycleFailure {
        code: FailureCode::PortOccupied,
        message: "The local service address is occupied and cannot be reused safely.",
        diagnostic: "local_address_occupied",
    }
}

fn malformed_readiness_failure() -> LifecycleFailure {
    LifecycleFailure {
        code: FailureCode::MalformedReadiness,
        message: "The local service returned an invalid readiness response.",
        diagnostic: "malformed_readiness_response",
    }
}

fn sidecar_start_failure() -> LifecycleFailure {
    LifecycleFailure {
        code: FailureCode::SidecarStartFailed,
        message: "The local service could not be started.",
        diagnostic: "sidecar_start_failed",
    }
}

fn stop_owned_child(owned_child: Option<OwnedChild>) {
    let Some(owned_child) = owned_child else {
        return;
    };
    let child = owned_child
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .take();
    let Some(mut child) = child else {
        return;
    };
    let shutdown = format!("{SHUTDOWN_CONTROL_MESSAGE}\n");
    let _ = child.write(shutdown.as_bytes());
    thread::sleep(COOPERATIVE_SHUTDOWN_WAIT);
    let _ = child.kill();
}

#[tauri::command]
fn lifecycle_status(manager: State<'_, Arc<LifecycleManager>>) -> LifecycleStatus {
    manager.status()
}

#[tauri::command]
fn retry_lifecycle(app: AppHandle, manager: State<'_, Arc<LifecycleManager>>) -> LifecycleStatus {
    manager.inner().begin(app);
    manager.status()
}

fn main() {
    let manager = Arc::new(LifecycleManager::new());
    let exit_manager = Arc::clone(&manager);
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::clone(&manager))
        .invoke_handler(tauri::generate_handler![lifecycle_status, retry_lifecycle])
        .setup(move |app| {
            manager.begin(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build the Rivallo desktop host");

    app.run(move |_app, event| {
        if matches!(event, RunEvent::Exit) {
            exit_manager.shutdown_owned();
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compatible_reuse_has_no_owned_child_or_monitor() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Reused);

        assert_eq!(
            manager.status(),
            LifecycleStatus::Ready {
                ownership: ServiceOwnership::Reused
            }
        );
        assert!(!manager.is_ready_owned(0));
        assert!(manager.lock().owned_child.is_none());
    }

    #[test]
    fn owned_child_exit_becomes_recoverable_failure() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Owned);
        manager.mark_failure(
            0,
            LifecycleFailure {
                code: FailureCode::OwnedChildExited,
                message: "The local service stopped unexpectedly.",
                diagnostic: "owned_child_exited",
            },
        );

        assert!(matches!(
            manager.status(),
            LifecycleStatus::RecoverableFailure {
                failure: LifecycleFailure {
                    code: FailureCode::OwnedChildExited,
                    ..
                }
            }
        ));
    }

    #[test]
    fn owned_readiness_loss_becomes_recoverable_failure() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Owned);
        manager.mark_failure(
            0,
            LifecycleFailure {
                code: FailureCode::OwnedReadinessLost,
                message: "The local service is no longer ready.",
                diagnostic: "owned_readiness_lost",
            },
        );

        assert!(matches!(
            manager.status(),
            LifecycleStatus::RecoverableFailure {
                failure: LifecycleFailure {
                    code: FailureCode::OwnedReadinessLost,
                    ..
                }
            }
        ));
    }

    #[test]
    fn retry_probes_again_before_spawning() {
        assert!(matches!(
            decide_initial_probe(ProbeResult::Compatible),
            InitialAction::Reuse
        ));
        assert!(matches!(
            decide_initial_probe(ProbeResult::NotListening),
            InitialAction::Spawn
        ));
    }

    #[test]
    fn shutdown_contacts_only_the_owned_child() {
        let manager = LifecycleManager::new();
        manager.mark_ready(0, ServiceOwnership::Reused);
        manager.shutdown_owned();

        assert!(manager.lock().owned_child.is_none());
        assert!(manager.lock().shutting_down);
    }
}
