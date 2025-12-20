#![allow(non_snake_case)]

use crate::init_status::InitErrorPayload;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

/// 打开外部链接
#[tauri::command]
pub async fn open_external(app: AppHandle, url: String) -> Result<bool, String> {
    let url = if url.starts_with("http://") || url.starts_with("https://") {
        url
    } else {
        format!("https://{url}")
    };

    app.opener()
        .open_url(&url, None::<String>)
        .map_err(|e| format!("打开链接失败: {e}"))?;

    Ok(true)
}

/// 判断是否为便携版（绿色版）运行
#[tauri::command]
pub async fn is_portable_mode() -> Result<bool, String> {
    let exe_path = std::env::current_exe().map_err(|e| format!("获取可执行路径失败: {e}"))?;
    if let Some(dir) = exe_path.parent() {
        Ok(dir.join("portable.ini").is_file())
    } else {
        Ok(false)
    }
}

/// 获取应用启动阶段的初始化错误（若有）。
/// 用于前端在早期主动拉取，避免事件订阅竞态导致的提示缺失。
#[tauri::command]
pub async fn get_init_error() -> Result<Option<InitErrorPayload>, String> {
    Ok(crate::init_status::get_init_error())
}

/// 获取 JSON→SQLite 迁移结果（若有）。
/// 只返回一次 true，之后返回 false，用于前端显示一次性 Toast 通知。
#[tauri::command]
pub async fn get_migration_result() -> Result<bool, String> {
    Ok(crate::init_status::take_migration_success())
}

/// 保存自定义图标文件
#[tauri::command]
pub async fn save_custom_icon(
    app: AppHandle,
    file_name: String,
    file_data: Vec<u8>,
    metadata: serde_json::Value,
) -> Result<String, String> {
    use tauri::Manager;
    use std::fs;

    // 获取用户数据目录
    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {e}"))?;

    // 创建 icons 目录
    let icons_dir = data_dir.join("icons");
    if !icons_dir.exists() {
        fs::create_dir_all(&icons_dir)
            .map_err(|e| format!("创建图标目录失败: {e}"))?;
    }

    // 保存图片文件
    let file_path = icons_dir.join(&file_name);
    fs::write(&file_path, &file_data)
        .map_err(|e| format!("保存图标文件失败: {e}"))?;

    // 保存元数据
    let metadata_path = icons_dir.join(format!("{}.json", file_name));
    let metadata_str = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("序列化元数据失败: {e}"))?;
    fs::write(&metadata_path, metadata_str)
        .map_err(|e| format!("保存元数据失败: {e}"))?;

    // 返回自定义协议路径
    Ok(format!("custom://{}", file_name))
}

/// 读取自定义图标文件
#[tauri::command]
pub async fn read_custom_icon(
    app: AppHandle,
    file_name: String,
) -> Result<Vec<u8>, String> {
    use tauri::Manager;
    use std::fs;

    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {e}"))?;

    let file_path = data_dir.join("icons").join(&file_name);
    
    if !file_path.exists() {
        return Err(format!("图标文件不存在: {file_name}"));
    }

    let data = fs::read(&file_path)
        .map_err(|e| format!("读取图标文件失败: {e}"))?;

    Ok(data)
}

/// 删除自定义图标文件
#[tauri::command]
pub async fn delete_custom_icon(
    app: AppHandle,
    file_name: String,
) -> Result<bool, String> {
    use tauri::Manager;
    use std::fs;

    let data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {e}"))?;

    let icons_dir = data_dir.join("icons");
    let file_path = icons_dir.join(&file_name);
    let metadata_path = icons_dir.join(format!("{}.json", file_name));

    // 删除图片文件
    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("删除图标文件失败: {e}"))?;
    }

    // 删除元数据文件
    if metadata_path.exists() {
        fs::remove_file(&metadata_path)
            .map_err(|e| format!("删除元数据文件失败: {e}"))?;
    }

    Ok(true)
}
