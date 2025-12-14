use crate::config::write_json_file;
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

/// 获取 Qwen 配置目录路径（支持设置覆盖）
pub fn get_qwen_dir() -> PathBuf {
    if let Some(custom) = crate::settings::get_qwen_override_dir() {
        return custom;
    }

    crate::test_utils::home_dir()
        .expect("无法获取用户主目录")
        .join(".qwen")
}

/// 获取 Qwen settings.json 文件路径
pub fn get_qwen_settings_path() -> PathBuf {
    get_qwen_dir().join("settings.json")
}

/// Qwen 配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QwenSettings {
    /// 会话令牌限制
    #[serde(rename = "sessionTokenLimit", skip_serializing_if = "Option::is_none")]
    pub session_token_limit: Option<u32>,

    /// 实验性功能配置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experimental: Option<ExperimentalSettings>,
}

/// 实验性功能配置
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExperimentalSettings {
    /// 视觉模型切换模式
    #[serde(rename = "vlmSwitchMode", skip_serializing_if = "Option::is_none")]
    pub vlm_switch_mode: Option<String>,

    /// 视觉模型预览开关
    #[serde(rename = "visionModelPreview", skip_serializing_if = "Option::is_none")]
    pub vision_model_preview: Option<bool>,
}

impl QwenSettings {
    /// 创建默认配置
    pub fn default() -> Self {
        Self {
            session_token_limit: None,
            experimental: None,
        }
    }

    /// 从 JSON Value 转换为 QwenSettings
    pub fn from_json_value(value: &Value) -> Result<Self, AppError> {
        serde_json::from_value(value.clone()).map_err(|e| AppError::JsonSerialize { source: e })
    }

    /// 转换为 JSON Value
    pub fn to_json_value(&self) -> Result<Value, AppError> {
        serde_json::to_value(self).map_err(|e| AppError::JsonSerialize { source: e })
    }
}

/// 读取 Qwen settings.json 配置文件
pub fn read_qwen_settings() -> Result<QwenSettings, AppError> {
    let path = get_qwen_settings_path();

    if !path.exists() {
        return Ok(QwenSettings::default());
    }

    let content = fs::read_to_string(&path).map_err(|e| AppError::io(&path, e))?;
    let value: Value = serde_json::from_str(&content).map_err(|e| AppError::json(&path, e))?;

    QwenSettings::from_json_value(&value)
}

/// 写入 Qwen settings.json 配置文件（原子操作）
pub fn write_qwen_settings(settings: &QwenSettings) -> Result<(), AppError> {
    let path = get_qwen_settings_path();

    // 确保目录存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::io(parent, e))?;
    }

    // 设置文件权限为 600（仅所有者可读写）
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if path.exists() {
            let mut perms = fs::metadata(&path)
                .map_err(|e| AppError::io(&path, e))?
                .permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&path, perms).map_err(|e| AppError::io(&path, e))?;
        }
    }

    write_json_file(&path, settings)?;

    // 设置文件权限为 600（仅所有者可读写）
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&path)
            .map_err(|e| AppError::io(&path, e))?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&path, perms).map_err(|e| AppError::io(&path, e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qwen_settings_serialization() {
        let settings = QwenSettings {
            session_token_limit: Some(32000),
            experimental: Some(ExperimentalSettings {
                vlm_switch_mode: Some("once".to_string()),
                vision_model_preview: Some(false),
            }),
        };

        let json = settings.to_json_value().unwrap();
        let deserialized = QwenSettings::from_json_value(&json).unwrap();

        assert_eq!(deserialized.session_token_limit, Some(32000));
        assert_eq!(deserialized.experimental.as_ref().unwrap().vlm_switch_mode.as_ref().unwrap(), "once");
        assert_eq!(deserialized.experimental.as_ref().unwrap().vision_model_preview, Some(false));
    }

    #[test]
    fn test_qwen_settings_default() {
        let settings = QwenSettings::default();
        assert_eq!(settings.session_token_limit, None);
        assert_eq!(settings.experimental, None);
    }

    #[test]
    fn test_json_to_qwen_settings() {
        let json = serde_json::json!({
            "sessionTokenLimit": 32000,
            "experimental": {
                "vlmSwitchMode": "once",
                "visionModelPreview": false
            }
        });

        let settings = json_to_qwen_settings(&json).unwrap();
        assert_eq!(settings.session_token_limit, Some(32000));
        assert_eq!(settings.experimental.as_ref().unwrap().vlm_switch_mode.as_ref().unwrap(), "once");
        assert_eq!(settings.experimental.as_ref().unwrap().vision_model_preview, Some(false));
    }

    #[test]
    fn test_qwen_settings_to_json() {
        let settings = QwenSettings {
            session_token_limit: Some(32000),
            experimental: Some(ExperimentalSettings {
                vlm_switch_mode: Some("once".to_string()),
                vision_model_preview: Some(false),
            }),
        };

        let json = qwen_settings_to_json(&settings);
        assert_eq!(json.get("sessionTokenLimit").and_then(|v| v.as_u64()), Some(32000));
        assert_eq!(json.get("experimental").and_then(|v| v.get("vlmSwitchMode")).and_then(|v| v.as_str()), Some("once"));
        assert_eq!(json.get("experimental").and_then(|v| v.get("visionModelPreview")).and_then(|v| v.as_bool()), Some(false));
    }
}