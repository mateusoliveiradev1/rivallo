//! Platform-owned local-persistence adapter boundaries.

mod sqlite;

pub use sqlite::{LocalDataDirectoryResolver, SqlitePersistenceAdapter};
