use crate::config::write_json_file;
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// 获取 Grok 配置目录路径（支持设置覆盖）
pub fn get_grok_dir() -> PathBuf {
    if let Some(custom) = crate::settings::get_grok_override_dir() {
        return custom;
    }

    crate::test_utils::home_dir()
        .expect("无法获取用户主目录")
        .join(".grok")
}

/// 获取 Grok user-settings.json 文件路径
pub fn get_grok_settings_path() -> PathBuf {
    get_grok_dir().join("user-settings.json")
}

/// Grok 配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrokSettings {
    #[serde(rename = "apiKey", skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,

    #[serde(rename = "baseURL", skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,

    #[serde(rename = "defaultModel", skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub models: Vec<String>,

    #[serde(rename = "mcpServers", skip_serializing_if = "Option::is_none")]
    pub mcp_servers: Option<HashMap<String, Value>>,

    #[serde(rename = "settingsVersion")]
    pub settings_version: u32,
}

impl GrokSettings {
    /// 创建默认配置
    pub fn default() -> Self {
        Self {
            api_key: None,
            base_url: None,
            default_model: Some("grok-code-fast-1".to_string()),
            models: vec![
                "grok-4-1-fast-reasoning".to_string(),
                "grok-4-1-fast-non-reasoning".to_string(),
                "grok-4-fast-reasoning".to_string(),
                "grok-4-fast-non-reasoning".to_string(),
                "grok-4".to_string(),
                "grok-4-latest".to_string(),
                "grok-code-fast-1".to_string(),
                "grok-3".to_string(),
                "grok-3-latest".to_string(),
                "grok-3-fast".to_string(),
                "grok-3-mini".to_string(),
                "grok-3-mini-fast".to_string(),
            ],
            mcp_servers: None,
            settings_version: 2,
        }
    }

    /// 从 JSON Value 转换为 GrokSettings
    pub fn from_json_value(value: &Value) -> Result<Self, AppError> {
        serde_json::from_value(value.clone()).map_err(|e| AppError::JsonSerialize { source: e })
    }

    /// 转换为 JSON Value
    pub fn to_json_value(&self) -> Result<Value, AppError> {
        serde_json::to_value(self).map_err(|e| AppError::JsonSerialize { source: e })
    }
}

/// 读取 Grok user-settings.json 配置文件
pub fn read_grok_settings() -> Result<GrokSettings, AppError> {
    let path = get_grok_settings_path();

    if !path.exists() {
        return Ok(GrokSettings::default());
    }

    let content = fs::read_to_string(&path).map_err(|e| AppError::io(&path, e))?;
    let value: Value = serde_json::from_str(&content).map_err(|e| AppError::json(&path, e))?;

    GrokSettings::from_json_value(&value)
}

/// 写入 Grok user-settings.json 配置文件（原子操作）
pub fn write_grok_settings(settings: &GrokSettings) -> Result<(), AppError> {
    let path = get_grok_settings_path();

    // 确保目录存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| AppError::io(parent, e))?;
    }
    
    // 使用 write_json_file 辅助函数（它内部会处理序列化和原子写入）
    let value = settings.to_json_value()?;
    write_json_file(&path, &value)
}

/// 读取 Grok user-settings.json 中的 mcpServers 映射
pub fn read_mcp_servers_map() -> Result<HashMap<String, Value>, AppError> {
    let settings = read_grok_settings()?;
    Ok(settings.mcp_servers.unwrap_or_default())
}

/// 将给定的启用 MCP 服务器映射写入到 Grok user-settings.json 的 mcpServers 字段
pub fn set_mcp_servers_map(servers: &HashMap<String, Value>) -> Result<(), AppError> {
    let mut settings = read_grok_settings()?;
    
    // 构建 mcpServers 对象：移除 UI 辅助字段（enabled/source），仅保留实际 MCP 规范
    let mut out: HashMap<String, Value> = HashMap::new();
    for (id, spec) in servers.iter() {
        let mut obj = if let Some(map) = spec.as_object() {
            map.clone()
        } else {
            return Err(AppError::McpValidation(format!(
                "MCP 服务器 '{id}' 不是对象"
            )));
        };

        if let Some(server_val) = obj.remove("server") {
            let server_obj = server_val.as_object().cloned().ok_or_else(|| {
                AppError::McpValidation(format!("MCP 服务器 '{id}' server 字段不是对象"))
            })?;
            obj = server_obj;
        }

        obj.remove("enabled");
        obj.remove("source");
        obj.remove("id");
        obj.remove("name");
        obj.remove("description");
        obj.remove("tags");
        obj.remove("homepage");
        obj.remove("docs");

        out.insert(id.clone(), Value::Object(obj));
    }

    settings.mcp_servers = Some(out);
    write_grok_settings(&settings)
}

