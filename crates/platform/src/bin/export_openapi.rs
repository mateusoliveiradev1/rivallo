//! Writes the schema-only OpenAPI document to an explicitly supplied path.

use std::{env, error::Error, fs, path::PathBuf, process};

fn output_path() -> Result<PathBuf, String> {
    let mut arguments = env::args_os().skip(1);
    let flag = arguments.next();
    let path = arguments.next();

    match (flag.as_deref(), path, arguments.next()) {
        (Some(flag), Some(path), None) if flag == "--output" => Ok(PathBuf::from(path)),
        _ => Err("usage: export-openapi --output <path>".to_owned()),
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    let output = output_path().map_err(std::io::Error::other)?;
    let document = rivallo_platform::schema_only_openapi_json()?;
    fs::write(output, document)?;
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("export-openapi: {error}");
        process::exit(1);
    }
}
