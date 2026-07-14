use std::io;

use rivallo_platform::{CancellationToken, read_shutdown_control, run_local_api};
use tokio::io::{AsyncBufRead, BufReader};

#[tokio::main]
async fn main() {
    if run_with_reader(BufReader::new(tokio::io::stdin()))
        .await
        .is_err()
    {
        eprintln!("local API sidecar failed to start or stop cleanly");
        std::process::exit(1);
    }
}

async fn run_with_reader<R>(reader: R) -> io::Result<()>
where
    R: AsyncBufRead + Unpin,
{
    let cancellation = CancellationToken::new();
    tokio::try_join!(
        run_local_api(cancellation.clone()),
        read_shutdown_control(reader, cancellation),
    )?;
    Ok(())
}

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
