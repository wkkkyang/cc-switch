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
    // 获取当前运行的可执行文件路径
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("无法获取当前执行文件路径: {e}"))?;
    
    let install_path = current_exe;

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

    // 验证新版本文件的版本号
    let new_version_path = new_exe_path.with_file_name("version.txt");
    if new_version_path.exists() {
        match fs::read_to_string(&new_version_path) {
            Ok(new_version) => {
                let current_version = env!("CARGO_PKG_VERSION");
                let new_version = new_version.trim();
                
                // 确保新版本确实比当前版本新
                if !compare_versions(current_version, new_version) {
                    return Err(format!(
                        "新版本({})不比当前版本({})新，无法更新",
                        new_version, current_version
                    ));
                }
            }
            Err(e) => {
                log::warn!("无法读取新版本文件: {}", e);
            }
        }
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
    // 注意：在 Windows 上，如果文件正在运行，复制会失败
    // 这种情况下需要使用临时文件重命名策略
    if cfg!(windows) {
        // Windows 特殊处理：使用临时文件
        let temp_path = install_path.with_extension("exe.tmp");
        
        // 先复制到临时文件
        fs::copy(&new_exe_path, &temp_path)
            .map_err(|e| format!("复制到临时文件失败: {e}"))?;
        
        // 尝试重命名临时文件到目标文件
        // 这在某些情况下可能仍然失败，但比直接复制更可靠
        match fs::rename(&temp_path, &install_path) {
            Ok(_) => {},
            Err(_) => {
                // 如果重命名失败，删除临时文件并返回错误
                let _ = fs::remove_file(&temp_path);
                return Err(format!(
                    "无法覆盖正在运行的程序文件。请手动关闭程序后重试，或使用管理员权限运行。"
                ));
            }
        }
    } else {
        // 非 Windows 系统直接复制
        fs::copy(&new_exe_path, &install_path)
            .map_err(|e| format!("复制文件失败: {e}"))?;
    }

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
