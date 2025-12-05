//! Grok MCP 同步和导入模块

use serde_json::Value;
use std::collections::HashMap;

use crate::app_config::{McpApps, McpConfig, McpServer, MultiAppConfig};
use crate::error::AppError;

use super::validation::{extract_server_spec, validate_server_spec};

/// 返回已启用的 MCP 服务器（过滤 enabled==true）
fn collect_enabled_servers(cfg: &McpConfig) -> HashMap<String, Value> {
    let mut out = HashMap::new();
    for (id, entry) in cfg.servers.iter() {
        let enabled = entry
            .get("enabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        if !enabled {
            continue;
        }
        match extract_server_spec(entry) {
            Ok(spec) => {
                out.insert(id.clone(), spec);
            }
            Err(err) => {
                log::warn!("跳过无效的 MCP 条目 '{id}': {err}");
            }
        }
    }
    out
}

/// 从统一结构中收集启用了 Grok 应用的 MCP 服务器（v3.7.0+）
fn collect_grok_enabled_servers(config: &MultiAppConfig) -> HashMap<String, Value> {
    let mut out = HashMap::new();
    
    // 优先使用统一结构（v3.7.0+）
    if let Some(servers) = &config.mcp.servers {
        for (id, server) in servers.iter() {
            if server.apps.grok {
                out.insert(id.clone(), server.server.clone());
            }
        }
    } else {
        // 回退到旧结构（向后兼容）
        for (id, entry) in config.mcp.grok.servers.iter() {
            let enabled = entry
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            if !enabled {
                continue;
            }
            match extract_server_spec(entry) {
                Ok(spec) => {
                    out.insert(id.clone(), spec);
                }
                Err(err) => {
                    log::warn!("跳过无效的 MCP 条目 '{id}': {err}");
                }
            }
        }
    }
    
    out
}

/// 将 config.json 中启用了 Grok 应用的项投影写入 Grok user-settings.json
pub fn sync_enabled_to_grok(config: &MultiAppConfig) -> Result<(), AppError> {
    let enabled = collect_grok_enabled_servers(config);
    crate::grok_config::set_mcp_servers_map(&enabled)
}

/// 从 Grok user-settings.json 导入 mcpServers 到统一结构（v3.7.0+）
/// 已存在的服务器将启用 Grok 应用，不覆盖其他字段和应用状态
pub fn import_from_grok(config: &mut MultiAppConfig) -> Result<usize, AppError> {
    let map = crate::grok_config::read_mcp_servers_map()?;

    // 确保新结构存在
    let servers = config.mcp.servers.get_or_insert_with(HashMap::new);

    let mut changed = 0;
    let mut errors = Vec::new();

    for (id, spec) in map.iter() {
        // 校验：单项失败不中止，收集错误继续处理
        if let Err(e) = validate_server_spec(spec) {
            log::warn!("跳过无效 MCP 服务器 '{id}': {e}");
            errors.push(format!("{id}: {e}"));
            continue;
        }

        if let Some(existing) = servers.get_mut(id) {
            // 已存在：仅启用 Grok 应用
            if !existing.apps.grok {
                existing.apps.grok = true;
                changed += 1;
                log::info!("MCP 服务器 '{id}' 已启用 Grok 应用");
            }
        } else {
            // 新建服务器：默认仅启用 Grok
            servers.insert(
                id.clone(),
                McpServer {
                    id: id.clone(),
                    name: id.clone(),
                    server: spec.clone(),
                    apps: McpApps {
                        claude: false,
                        codex: false,
                        gemini: false,
                        grok: true,
                        qwen: false,
                    },
                    description: None,
                    homepage: None,
                    docs: None,
                    tags: Vec::new(),
                },
            );
            changed += 1;
            log::info!("导入新 MCP 服务器 '{id}'");
        }
    }

    if !errors.is_empty() {
        log::warn!("导入完成，但有 {} 项失败: {:?}", errors.len(), errors);
    }

    Ok(changed)
}

/// 将单个 MCP 服务器同步到 Grok live 配置
pub fn sync_single_server_to_grok(
    _config: &MultiAppConfig,
    id: &str,
    server_spec: &Value,
) -> Result<(), AppError> {
    // 读取现有的 MCP 配置
    let current = crate::grok_config::read_mcp_servers_map()?;

    // 创建新的 HashMap，包含现有的所有服务器 + 当前要同步的服务器
    let mut updated = current;
    updated.insert(id.to_string(), server_spec.clone());

    // 写回
    crate::grok_config::set_mcp_servers_map(&updated)
}

/// 从 Grok live 配置中移除单个 MCP 服务器
pub fn remove_server_from_grok(id: &str) -> Result<(), AppError> {
    // 读取现有的 MCP 配置
    let mut current = crate::grok_config::read_mcp_servers_map()?;

    // 移除指定服务器
    current.remove(id);

    // 写回
    crate::grok_config::set_mcp_servers_map(&current)
}
