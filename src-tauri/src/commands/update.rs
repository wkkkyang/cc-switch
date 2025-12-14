#![allow(non_snake_case)]

use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;

/// 比较两个版本号，返回 true 如果 new_version > current_version
fn compare_versions(current: &str, new: &str) -> bool {
    let current_parts: Vec<u32> = current
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let new_parts: Vec<u32> = new
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    for i in 0..current_parts.len().max(new_parts.len()) {
        let curr = current_parts.get(i).copied().unwrap_or(0);
        let ne = new_parts.get(i).copied().unwrap_or(0);
        if ne > curr {
            return true;
        } else if ne < curr {
            return false;
        }
    }
    false
}

/// 获取当前应用版本
#[tauri::command]
pub async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

/// 检查是否有可用的更新
#[tauri::command]
pub async fn check_update() -> Result<CheckUpdateResponse, String> {
    let current_version = env!("CARGO_PKG_VERSION");

    // 尝试从环境变量获取构建路径，或查找默认位置
    let new_exe_path = if cfg!(windows) {
        // 首先检查环境变量
        if let Ok(build_path) = std::env::var("CC_SWITCH_BUILD_PATH") {
            PathBuf::from(build_path)
        } else {
            // 尝试在常见的开发路径中查找
            let mut found_path = None;

            // 尝试用户文档中的项目路径
            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                let potential = PathBuf::from(userprofile)
                    .join(r"Documents\Code\GitHub Clone Projects\cc-switch-main\cc-switch-main\src-tauri\target\release\cc-switch.exe");
                if potential.exists() {
                    found_path = Some(potential);
                }
            }

            // 尝试D:\路径
            if found_path.is_none() {
                let potential =
                    PathBuf::from(r"d:\documents\Code\GitHub Clone Projects\cc-switch-main\cc-switch-main\src-tauri\target\release\cc-switch.exe");
                if potential.exists() {
                    found_path = Some(potential);
                }
            }

            found_path.unwrap_or_else(|| {
                PathBuf::from(r"src-tauri\target\release\cc-switch.exe")
            })
        }
    } else {
        if let Ok(build_path) = std::env::var("CC_SWITCH_BUILD_PATH") {
            PathBuf::from(build_path)
        } else {
            let mut found_path = None;

            if let Ok(home) = std::env::var("HOME") {
                let potential =
                    PathBuf::from(&home).join("projects/cc-switch-main/cc-switch-main/src-tauri/target/release/cc-switch");
                if potential.exists() {
                    found_path = Some(potential);
                }
            }

            found_path.unwrap_or_else(|| PathBuf::from("src-tauri/target/release/cc-switch"))
        }
    };

    if !new_exe_path.exists() {
        return Ok(CheckUpdateResponse {
            has_update: false,
            current_version: current_version.to_string(),
            new_version: current_version.to_string(),
            new_exe_path: None,
        });
    }

    // 尝试读取新版本号文件
    let new_version = match fs::read_to_string(new_exe_path.with_file_name("version.txt")) {
        Ok(content) => content.trim().to_string(),
        Err(_) => {
            // 无法读取版本文件，返回暂无更新
            return Ok(CheckUpdateResponse {
                has_update: false,
                current_version: current_version.to_string(),
                new_version: current_version.to_string(),
                new_exe_path: None,
            });
        }
    };

    // 比较版本号
    let has_update = compare_versions(current_version, &new_version);

    Ok(CheckUpdateResponse {
        has_update,
        current_version: current_version.to_string(),
        new_version,
        new_exe_path: if has_update {
            Some(new_exe_path.to_string_lossy().to_string())
        } else {
            None
        },
    })
}

/// 执行更新
#[tauri::command]
pub async fn perform_update(_app: AppHandle) -> Result<String, String> {
    let install_path = if cfg!(windows) {
        PathBuf::from(r"E:\Program Files\cc-switch-own\cc-switch.exe")
    } else {
        let home = std::env::var("HOME").map_err(|_| "无法获取主目录".to_string())?;
        PathBuf::from(home).join("cc-switch")
    };

    // 使用与check_update相同的逻辑查找新版本
    let new_exe_path = if cfg!(windows) {
        if let Ok(build_path) = std::env::var("CC_SWITCH_BUILD_PATH") {
            PathBuf::from(build_path)
        } else {
            let mut found_path = None;

            if let Ok(userprofile) = std::env::var("USERPROFILE") {
                let potential = PathBuf::from(userprofile)
                    .join(r"Documents\Code\GitHub Clone Projects\cc-switch-main\cc-switch-main\src-tauri\target\release\cc-switch.exe");
                if potential.exists() {
                    found_path = Some(potential);
                }
            }

            if found_path.is_none() {
                let potential =
                    PathBuf::from(r"d:\documents\Code\GitHub Clone Projects\cc-switch-main\cc-switch-main\src-tauri\target\release\cc-switch.exe");
                if potential.exists() {
                    found_path = Some(potential);
                }
            }

            found_path.unwrap_or_else(|| {
                PathBuf::from(r"src-tauri\target\release\cc-switch.exe")
            })
        }
    } else {
        if let Ok(build_path) = std::env::var("CC_SWITCH_BUILD_PATH") {
            PathBuf::from(build_path)
        } else {
            let mut found_path = None;

            if let Ok(home) = std::env::var("HOME") {
                let potential =
                    PathBuf::from(&home).join("projects/cc-switch-main/cc-switch-main/src-tauri/target/release/cc-switch");
                if potential.exists() {
                    found_path = Some(potential);
                }
            }

            found_path.unwrap_or_else(|| PathBuf::from("src-tauri/target/release/cc-switch"))
        }
    };

    if !new_exe_path.exists() {
        return Err(format!(
            "新版本文件不存在。已检查位置: {}",
            new_exe_path.display()
        ));
    }

    // 确保安装目录存在
    if let Some(parent) = install_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建安装目录失败: {e}"))?;
    }

    // 创建备份
    if install_path.exists() {
        let backup_path = format!("{}.backup", install_path.display());
        fs::copy(&install_path, &backup_path)
            .map_err(|e| format!("创建备份失败: {e}"))?;
    }

    // 复制新文件到安装位置
    fs::copy(&new_exe_path, &install_path)
        .map_err(|e| format!("复制文件失败: {e}"))?;

    Ok(format!(
        "更新成功！应用已更新到最新版本。请重启应用以使用新版本。"
    ))
}

#[derive(serde::Serialize)]
pub struct CheckUpdateResponse {
    pub has_update: bool,
    pub current_version: String,
    pub new_version: String,
    pub new_exe_path: Option<String>,
}
