//! Test utilities for overriding system paths in tests.
//!
//! This module provides a mechanism to override `home_dir()` during tests,
//! allowing tests to use a temporary directory instead of the real home directory.

use std::path::PathBuf;
use std::sync::RwLock;

static TEST_HOME_OVERRIDE: RwLock<Option<PathBuf>> = RwLock::new(None);

/// Set the test home directory override.
/// This should only be called in tests.
#[cfg(test)]
pub fn set_test_home(path: Option<PathBuf>) {
    let mut guard = TEST_HOME_OVERRIDE.write().expect("test home lock poisoned");
    *guard = path;
}

/// Get the home directory, respecting test overrides.
/// In tests, this will return the override if set.
/// In production, this falls back to `dirs::home_dir()`.
pub fn home_dir() -> Option<PathBuf> {
    // Check test override first
    if let Ok(guard) = TEST_HOME_OVERRIDE.read() {
        if let Some(ref path) = *guard {
            return Some(path.clone());
        }
    }

    // Fall back to dirs::home_dir()
    dirs::home_dir()
}
