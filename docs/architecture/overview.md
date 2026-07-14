# Architecture Overview

Start as a modular monolith. Rust domain, application, and simulation are independent of adapters. Tauri is a platform shell; React is a presentation layer; axum is an online adapter; SQLite/PostgreSQL are persistence adapters. See ADR-0003 and `repository-map.md`.
