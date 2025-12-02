use tauri::State;

use crate::app_config::AppType;
use crate::qwen_config::{QwenSettings, read_qwen_settings, write_qwen_settings};
use crate::services::ProviderService;
use crate::store::AppState;

/// 读取 Qwen 配置文件
#[tauri::command]
pub fn read_qwen_settings_command() -> Result<QwenSettings, String> {
    read_qwen_settings().map_err(|e| e.to_string())
}

/// 写入 Qwen 配置文件
#[tauri::command]
pub fn write_qwen_settings_command(settings: QwenSettings) -> Result<(), String> {
    write_qwen_settings(&settings).map_err(|e| e.to_string())
}

/// 读取当前生效的 Qwen 配置内容
#[tauri::command]
pub fn read_live_qwen_settings() -> Result<serde_json::Value, String> {
    let app_type = AppType::Qwen;
    ProviderService::read_live_settings(app_type).map_err(|e| e.to_string())
}

/// 同步当前 Qwen 供应商到 live 配置
#[tauri::command]
pub async fn sync_current_qwen_provider_live(
    state: State<'_, AppState>,
) -> Result<bool, String> {
    ProviderService::sync_current_to_live(state.inner())
        .map(|_| true)
        .map_err(|e| e.to_string())
}