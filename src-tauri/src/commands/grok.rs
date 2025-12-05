use tauri::State;

use crate::app_config::AppType;
use crate::grok_config::{GrokSettings, read_grok_settings, write_grok_settings};
use crate::services::ProviderService;
use crate::store::AppState;

/// 读取 Grok 配置文件
#[tauri::command]
pub fn read_grok_settings_command() -> Result<GrokSettings, String> {
    read_grok_settings().map_err(|e| e.to_string())
}

/// 写入 Grok 配置文件
#[tauri::command]
pub fn write_grok_settings_command(settings: GrokSettings) -> Result<(), String> {
    write_grok_settings(&settings).map_err(|e| e.to_string())
}

/// 读取当前生效的 Grok 配置内容
#[tauri::command]
pub fn read_live_grok_settings() -> Result<serde_json::Value, String> {
    let app_type = AppType::Grok;
    ProviderService::read_live_settings(app_type).map_err(|e| e.to_string())
}

/// 同步当前 Grok 供应商到 live 配置
#[tauri::command]
pub async fn sync_current_grok_provider_live(
    state: State<'_, AppState>,
) -> Result<bool, String> {
    ProviderService::sync_current_to_live(state.inner())
        .map(|_| true)
        .map_err(|e| e.to_string())
}
