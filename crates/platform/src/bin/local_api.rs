#[cfg(test)]
mod tests {
    use tokio::io::BufReader;
    use tokio::time::{Duration, timeout};

    use super::run_with_reader;

    #[tokio::test]
    async fn private_shutdown_input_completes_the_binary_runtime_path() {
        timeout(
            Duration::from_secs(2),
            run_with_reader(BufReader::new(&b"shutdown\n"[..])),
        )
        .await
        .expect("sidecar exits through bounded graceful cancellation")
        .expect("sidecar runtime completes cleanly");
    }
}
