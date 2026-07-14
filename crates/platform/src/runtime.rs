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
        let expected = br#"{"service":"rivallo-local-api","contractVersion":"0.1.0","runtimeProtocol":1}"#;

        assert_eq!(
            validate_readiness_response(200, expected),
            Ok(ReadinessPayload::current())
        );
        assert_eq!(ReadinessPayload::current().contract_version, CONTRACT_VERSION);

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
            .write_all(format!("GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n").as_bytes())
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
