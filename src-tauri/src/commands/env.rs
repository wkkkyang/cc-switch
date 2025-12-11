use crate::services::env_checker::{check_env_conflicts as check_conflicts, EnvConflict};
use crate::services::env_manager::{
    delete_env_vars as delete_vars, restore_from_backup, BackupInfo,
};
use crate::gemini_config::{read_gemini_env, serialize_env_file, write_gemini_env_atomic};
use serde::Serialize;

/// Check environment variable conflicts for a specific app
#[tauri::command]
pub fn check_env_conflicts(app: String) -> Result<Vec<EnvConflict>, String> {
    check_conflicts(&app)
}

/// Delete environment variables with backup
#[tauri::command]
pub fn delete_env_vars(conflicts: Vec<EnvConflict>) -> Result<BackupInfo, String> {
    delete_vars(conflicts)
}

/// Restore environment variables from backup file
#[tauri::command]
pub fn restore_env_backup(backup_path: String) -> Result<(), String> {
    restore_from_backup(backup_path)
}

#[derive(Serialize)]
pub struct GeminiEnvProxyStatus {
    pub enabled: bool,
    pub content: String,
}

#[tauri::command]
pub fn get_gemini_proxy_status() -> Result<GeminiEnvProxyStatus, String> {
    let env_map = read_gemini_env().map_err(|e| e.to_string())?;
    let enabled = match (
        env_map.get("https_proxy"),
        env_map.get("http_proxy"),
    ) {
        (Some(h1), Some(h2)) => {
            let v1 = h1.trim();
            let v2 = h2.trim();
            !v1.is_empty() && v1 == v2
        }
        _ => false,
    };
    let content = serialize_env_file(&env_map);

    Ok(GeminiEnvProxyStatus { enabled, content })
}

#[tauri::command]
pub fn set_gemini_proxy_enabled(
    enabled: bool,
    host: Option<String>,
    port: Option<String>,
) -> Result<GeminiEnvProxyStatus, String> {
    let mut env_map = read_gemini_env().map_err(|e| e.to_string())?;

    if enabled {
        let host = host.unwrap_or_else(|| "127.0.0.1".to_string());
        let port = port.unwrap_or_else(|| "7890".to_string());
        let value = format!("http://{host}:{port}");
        env_map.insert("https_proxy".to_string(), value.clone());
        env_map.insert("http_proxy".to_string(), value);
    } else {
        env_map.remove("https_proxy");
        env_map.remove("http_proxy");
    }

    write_gemini_env_atomic(&env_map).map_err(|e| e.to_string())?;

    let content = serialize_env_file(&env_map);
    let final_enabled = match (
        env_map.get("https_proxy"),
        env_map.get("http_proxy"),
    ) {
        (Some(h1), Some(h2)) => {
            let v1 = h1.trim();
            let v2 = h2.trim();
            !v1.is_empty() && v1 == v2
        }
        _ => false,
    };

    Ok(GeminiEnvProxyStatus {
        enabled: final_enabled,
        content,
    })
}
