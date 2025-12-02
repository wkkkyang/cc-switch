use crate::config::write_json_file;
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
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

/// 从 Provider.settings_config (JSON Value) 提取 Qwen 配置
pub fn json_to_qwen_settings(settings: &Value) -> Result<QwenSettings, AppError> {
    let mut qwen_settings = QwenSettings::default();

    // 新格式: security.auth 和 model.name
    // 这些字段在 Provider 的 settings_config 中，不需要特别提取到 QwenSettings

    // 提取 sessionTokenLimit
    if let Some(limit) = settings.get("sessionTokenLimit").and_then(|v| v.as_u64()) {
        qwen_settings.session_token_limit = Some(limit as u32);
    }

    // 提取 experimental 配置
    if let Some(exp_obj) = settings.get("experimental").and_then(|v| v.as_object()) {
        let mut exp_settings = ExperimentalSettings {
            vlm_switch_mode: None,
            vision_model_preview: None,
        };

        // 提取 vlmSwitchMode
        if let Some(mode) = exp_obj.get("vlmSwitchMode").and_then(|v| v.as_str()) {
            exp_settings.vlm_switch_mode = Some(mode.to_string());
        }

        // 提取 visionModelPreview
        if let Some(preview) = exp_obj.get("visionModelPreview").and_then(|v| v.as_bool()) {
            exp_settings.vision_model_preview = Some(preview);
        }

        qwen_settings.experimental = Some(exp_settings);
    }

    Ok(qwen_settings)
}

/// 将 Qwen 配置转换为 Provider.settings_config (JSON Value)
pub fn qwen_settings_to_json(settings: &QwenSettings) -> Value {
    let mut json_map = Map::new();

    // 添加 sessionTokenLimit
    if let Some(limit) = settings.session_token_limit {
        json_map.insert("sessionTokenLimit".to_string(), Value::Number(limit.into()));
    }

    // 添加 experimental 配置
    if let Some(exp) = &settings.experimental {
        let mut exp_map = Map::new();

        if let Some(mode) = &exp.vlm_switch_mode {
            exp_map.insert("vlmSwitchMode".to_string(), Value::String(mode.clone()));
        }

        if let Some(preview) = exp.vision_model_preview {
            exp_map.insert("visionModelPreview".to_string(), Value::Bool(preview));
        }

        if !exp_map.is_empty() {
            json_map.insert("experimental".to_string(), Value::Object(exp_map));
        }
    }

    Value::Object(json_map)
}

/// 验证 Qwen 配置的基本结构
pub fn validate_qwen_settings(settings: &Value) -> Result<(), AppError> {
    // 验证 sessionTokenLimit 是数字类型（如果存在）
    if let Some(session_limit) = settings.get("sessionTokenLimit") {
        if !session_limit.is_number() {
            return Err(AppError::localized(
                "qwen.validation.invalid_session_limit",
                "Qwen 配置格式错误: sessionTokenLimit 必须是数字",
                "Qwen config invalid: sessionTokenLimit must be a number",
            ));
        }
    }

    // 验证 experimental 是对象类型（如果存在）
    if let Some(experimental) = settings.get("experimental") {
        if !experimental.is_object() {
            return Err(AppError::localized(
                "qwen.validation.invalid_experimental",
                "Qwen 配置格式错误: experimental 必须是对象",
                "Qwen config invalid: experimental must be an object",
            ));
        }
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