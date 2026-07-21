use std::io;
use std::time::Duration;

use axum::{Json, Router, http::StatusCode, routing::get};
use rivallo_contracts::CONTRACT_VERSION;
use serde_json::{Value, json};
use tokio::io::{AsyncBufRead, AsyncBufReadExt};
use tokio::net::TcpListener;
use tokio::sync::watch;

pub const LOCAL_API_PORT: u16 = 47_831;
pub const LOCAL_API_ADDRESS: &str = "127.0.0.1:47831";
pub const READINESS_TIMEOUT: Duration = Duration::from_secs(5);
pub const READINESS_POLL_INTERVAL: Duration = Duration::from_millis(100);
pub const LOCAL_API_SERVICE_ID: &str = "rivallo-local-api";
pub const RUNTIME_PROTOCOL: u32 = 1;
pub const SHUTDOWN_CONTROL_MESSAGE: &str = "shutdown";

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReadinessPayload {
    pub service: &'static str,
    pub contract_version: &'static str,
    pub runtime_protocol: u32,
}

impl ReadinessPayload {
    pub const fn current() -> Self {
        Self {
            service: LOCAL_API_SERVICE_ID,
            contract_version: CONTRACT_VERSION,
            runtime_protocol: RUNTIME_PROTOCOL,
        }
    }

    fn as_json(&self) -> Value {
        json!({
            "service": self.service,
            "contractVersion": self.contract_version,
            "runtimeProtocol": self.runtime_protocol,
        })
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ReadinessDiagnostic {
    UnhealthyStatus(u16),
    MalformedPayload,
    Incompatible,
}

pub fn validate_readiness_response(
    status: u16,
    body: &[u8],
) -> Result<ReadinessPayload, ReadinessDiagnostic> {
    if status != StatusCode::OK.as_u16() {
        return Err(ReadinessDiagnostic::UnhealthyStatus(status));
    }

    let Value::Object(payload) =
        serde_json::from_slice(body).map_err(|_| ReadinessDiagnostic::MalformedPayload)?
    else {
        return Err(ReadinessDiagnostic::MalformedPayload);
    };

    let service = payload
        .get("service")
        .and_then(Value::as_str)
        .ok_or(ReadinessDiagnostic::MalformedPayload)?;
    let contract_version = payload
        .get("contractVersion")
        .and_then(Value::as_str)
        .ok_or(ReadinessDiagnostic::MalformedPayload)?;
    let runtime_protocol = payload
        .get("runtimeProtocol")
        .and_then(Value::as_u64)
        .and_then(|value| u32::try_from(value).ok())
        .ok_or(ReadinessDiagnostic::MalformedPayload)?;

    let expected = ReadinessPayload::current();
    if payload.len() != 3
        || service != expected.service
        || contract_version != expected.contract_version
        || runtime_protocol != expected.runtime_protocol
    {
        return Err(ReadinessDiagnostic::Incompatible);
    }

    Ok(expected)
}

#[derive(Clone, Debug)]
pub struct CancellationToken {
    sender: watch::Sender<bool>,
}

impl CancellationToken {
    pub fn new() -> Self {
        let (sender, _) = watch::channel(false);
        Self { sender }
    }

    pub fn cancel(&self) {
        self.sender.send_replace(true);
    }

    pub fn is_cancelled(&self) -> bool {
        *self.sender.borrow()
    }

    async fn cancelled(&self) {
        let mut receiver = self.sender.subscribe();
        while !*receiver.borrow_and_update() {
            if receiver.changed().await.is_err() {
                break;
            }
        }
    }
}

impl Default for CancellationToken {
    fn default() -> Self {
        Self::new()
    }
}

pub async fn run_local_api(cancellation: CancellationToken) -> io::Result<()> {
    let listener = TcpListener::bind(LOCAL_API_ADDRESS).await?;
    serve_listener(listener, cancellation).await
}

pub async fn read_shutdown_control<R>(reader: R, cancellation: CancellationToken) -> io::Result<()>
where
    R: AsyncBufRead + Unpin,
{
    let mut lines = reader.lines();
    while let Some(line) = lines.next_line().await? {
        if line == SHUTDOWN_CONTROL_MESSAGE {
            cancellation.cancel();
            break;
        }
    }
    Ok(())
}

fn router() -> Router {
    Router::new()
        .route("/health", get(|| async { StatusCode::NO_CONTENT }))
        .route(
            "/ready",
            get(|| async { Json(ReadinessPayload::current().as_json()) }),
        )
}

async fn serve_listener(listener: TcpListener, cancellation: CancellationToken) -> io::Result<()> {
    let graceful = cancellation.clone();
    tokio::select! {
        result = axum::serve(listener, router())
            .with_graceful_shutdown(async move { graceful.cancelled().await }) => result,
        _ = cancellation.cancelled() => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, SocketAddr};

    use rivallo_contracts::CONTRACT_VERSION;
    use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader};
    use tokio::net::{TcpListener, TcpStream};
    use tokio::time::{Duration, timeout};

    use super::*;

    #[test]
    fn fixed_runtime_contract_is_loopback_and_bounded() {
        let address: SocketAddr = LOCAL_API_ADDRESS.parse().expect("fixed address parses");

        assert_eq!(address.ip(), IpAddr::from([127, 0, 0, 1]));
        assert_eq!(address.port(), LOCAL_API_PORT);
        assert_eq!(READINESS_TIMEOUT, Duration::from_secs(5));
        assert!(READINESS_POLL_INTERVAL < READINESS_TIMEOUT);
        assert_eq!(LOCAL_API_SERVICE_ID, "rivallo-local-api");
        assert_eq!(RUNTIME_PROTOCOL, 1);
    }

    #[test]
    fn readiness_reuse_requires_an_exact_compatible_payload() {
        let expected =
            br#"{"service":"rivallo-local-api","contractVersion":"0.1.0","runtimeProtocol":1}"#;

        assert_eq!(
            validate_readiness_response(200, expected),
            Ok(ReadinessPayload::current())
        );
        assert_eq!(
            ReadinessPayload::current().contract_version,
            CONTRACT_VERSION
        );

        for incompatible in [
            br#"{"service":"other","contractVersion":"0.1.0","runtimeProtocol":1}"#.as_slice(),
            br#"{"service":"rivallo-local-api","contractVersion":"9.9.9","runtimeProtocol":1}"#,
            br#"{"service":"rivallo-local-api","contractVersion":"0.1.0","runtimeProtocol":2}"#,
            br#"{"service":"rivallo-local-api","contractVersion":"0.1.0","runtimeProtocol":1,"extra":true}"#,
        ] {
            assert!(matches!(
                validate_readiness_response(200, incompatible),
                Err(ReadinessDiagnostic::Incompatible)
            ));
        }

        assert!(matches!(
            validate_readiness_response(503, expected),
            Err(ReadinessDiagnostic::UnhealthyStatus(503))
        ));
        assert!(matches!(
            validate_readiness_response(200, br#"{"service":true}"#),
            Err(ReadinessDiagnostic::MalformedPayload)
        ));
        assert!(matches!(
            validate_readiness_response(200, br#"not json"#),
            Err(ReadinessDiagnostic::MalformedPayload)
        ));
    }

    #[tokio::test]
    async fn router_serves_only_liveness_and_compatibility_readiness() {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("test listener binds");
        let address = listener.local_addr().expect("test address is available");
        let cancellation = CancellationToken::new();
        let server = tokio::spawn(serve_listener(listener, cancellation.clone()));

        let health = request(address, "/health").await;
        assert!(health.starts_with("HTTP/1.1 204 No Content\r\n"));
        assert!(!health.contains(CONTRACT_VERSION));

        let ready = request(address, "/ready").await;
        assert!(ready.starts_with("HTTP/1.1 200 OK\r\n"));
        assert!(ready.contains("\"service\":\"rivallo-local-api\""));
        assert!(ready.contains("\"contractVersion\":\"0.1.0\""));
        assert!(ready.contains("\"runtimeProtocol\":1"));

        let absent = request(address, "/shutdown").await;
        assert!(absent.starts_with("HTTP/1.1 404 Not Found\r\n"));

        cancellation.cancel();
        timeout(Duration::from_secs(1), server)
            .await
            .expect("server completes after cancellation")
            .expect("server task joins")
            .expect("server shuts down cleanly");
    }

    #[tokio::test]
    async fn shutdown_control_cancels_the_server_token_only_for_the_fixed_message() {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("test listener binds");
        let cancellation = CancellationToken::new();
        let server = tokio::spawn(serve_listener(listener, cancellation.clone()));
        let (reader, mut writer) = tokio::io::duplex(64);
        let control = tokio::spawn(read_shutdown_control(
            BufReader::new(reader),
            cancellation.clone(),
        ));

        writer.write_all(b"status\n").await.expect("write succeeds");
        tokio::task::yield_now().await;
        assert!(!cancellation.is_cancelled());

        writer
            .write_all(format!("{SHUTDOWN_CONTROL_MESSAGE}\n").as_bytes())
            .await
            .expect("write succeeds");

        timeout(Duration::from_secs(1), control)
            .await
            .expect("control reader completes")
            .expect("control task joins")
            .expect("control reader succeeds");
        assert!(cancellation.is_cancelled());
        timeout(Duration::from_secs(1), server)
            .await
            .expect("server completes through the same token")
            .expect("server task joins")
            .expect("server shuts down cleanly");
    }

    #[tokio::test]
    async fn unrelated_control_input_does_not_cancel() {
        let cancellation = CancellationToken::new();
        let input = BufReader::new(&b"status\nplease shutdown\nshutdown now\n"[..]);

        read_shutdown_control(input, cancellation.clone())
            .await
            .expect("reader reaches eof");

        assert!(!cancellation.is_cancelled());
    }

    async fn request(address: SocketAddr, path: &str) -> String {
        let mut stream = TcpStream::connect(address)
            .await
            .expect("test server accepts connections");
        stream
            .write_all(
                format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
                    .as_bytes(),
            )
            .await
            .expect("request writes");
        let mut response = Vec::new();
        stream
            .read_to_end(&mut response)
            .await
            .expect("response reads");
        String::from_utf8(response).expect("HTTP response is UTF-8")
    }
}
