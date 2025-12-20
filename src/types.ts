export type ProviderCategory =
  | "official" // 官方
  | "cn_official" // 开源官方（原"国产官方"）
  | "aggregator" // 聚合网站
  | "third_party" // 第三方供应商
  | "custom"; // 自定义

export interface Provider {
  id: string;
  name: string;
  settingsConfig: Record<string, any>; // 应用配置对象：Claude 为 settings.json；Codex 为 { auth, config }
  websiteUrl?: string;
  // 新增：供应商分类（用于差异化提示/能力开关）
  category?: ProviderCategory;
  createdAt?: number; // 添加时间戳（毫秒）
  sortIndex?: number; // 排序索引（用于自定义拖拽排序）
  // 备注信息
  notes?: string;
  // 新增：是否为商业合作伙伴
  isPartner?: boolean;
  // 可选：供应商元数据（仅存于 ~/.cc-switch/config.json，不写入 live 配置）
  meta?: ProviderMeta;
  // 图标配置
  icon?: string; // 图标名称（如 "openai", "anthropic"）
  iconColor?: string; // 图标颜色（Hex 格式，如 "#00A67E"）
  // 是否置顶
  isPinned?: boolean;
  // 是否为复制的供应商
  isDuplicated?: boolean;
  // 是否已编辑（用于复制后编辑状态的标记）
  isEditedAfterDuplication?: boolean;
  current?: string;
}

// 自定义端点配置
export interface CustomEndpoint {
  url: string;
  addedAt: number;
  lastUsed?: number;
}

// 端点候选项（用于端点测速弹窗）
export interface EndpointCandidate {
  id?: string;
  url: string;
  isCustom?: boolean;
}

// 供应商元数据（字段名与后端一致，保持 snake_case）
export interface ProviderMeta {
  // 自定义端点：以 URL 为键，值为端点信息
  custom_endpoints?: Record<string, CustomEndpoint>;
  // 是否为官方合作伙伴
  isPartner?: boolean;
  // 合作伙伴促销 key（用于后端识别 PackyCode 等）
  partnerPromotionKey?: string;
  // 待选模型列表
  candidateModels?: string[];
}

// 应用设置类型（用于设置对话框与 Tauri API）
// 存储在本地 ~/.cc-switch/settings.json，不随数据库同步
export interface Settings {
  // ===== 设备级 UI 设置 =====
  // 是否在系统托盘（macOS 菜单栏）显示图标
  showInTray: boolean;
  // 点击关闭按钮时是否最小化到托盘而不是关闭应用
  minimizeToTrayOnClose: boolean;
  // 启用 Claude 插件联动（写入 ~/.claude/config.json 的 primaryApiKey）
  enableClaudePluginIntegration?: boolean;
  // 是否开机自启
  launchOnStartup?: boolean;
  // 首选语言（可选，默认中文）
  language?: "en" | "zh";

  // ===== 设备级目录覆盖 =====
  // 覆盖 Claude Code 配置目录（可选）
  claudeConfigDir?: string;
  // 覆盖 Codex 配置目录（可选）
  codexConfigDir?: string;
  // 覆盖 Gemini 配置目录（可选）
  geminiConfigDir?: string;
  // 覆盖 Qwen 配置目录（可选）
  qwenConfigDir?: string;
  // 覆盖 Grok 配置目录（可选）
  grokConfigDir?: string;

  // ===== 当前供应商 ID（设备级）=====
  // 当前 Claude 供应商 ID（优先于数据库 is_current）
  currentProviderClaude?: string;
  // 当前 Codex 供应商 ID（优先于数据库 is_current）
  currentProviderCodex?: string;
  // 当前 Gemini 供应商 ID（优先于数据库 is_current）
  currentProviderGemini?: string;
  // 当前 Grok 供应商 ID（优先于数据库 is_current）
  currentProviderGrok?: string;
  // 当前 Qwen 供应商 ID（优先于数据库 is_current）
  currentProviderQwen?: string;
}

// MCP 服务器连接参数（宽松：允许扩展字段）
export interface McpServerSpec {
  // 可选：社区常见 .mcp.json 中 stdio 配置可不写 type
  type?: "stdio" | "http" | "sse";
  // stdio 字段
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // http 和 sse 字段
  url?: string;
  headers?: Record<string, string>;
  // 通用字段
  [key: string]: any;
}

// v3.7.0: MCP 服务器应用启用状态
export interface McpApps {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
  grok: boolean;
  qwen: boolean;
}

// MCP 服务器条目（v3.7.0 统一结构）
export interface McpServer {
  id: string;
  name: string;
  server: McpServerSpec;
  apps: McpApps; // v3.7.0: 标记应用到哪些客户端
  description?: string;
  tags?: string[];
  homepage?: string;
  docs?: string;
  // 兼容旧字段（v3.6.x 及以前）
  enabled?: boolean; // 已废弃，v3.7.0 使用 apps 字段
  source?: string;
  [key: string]: any;
}

// MCP 服务器映射（id -> McpServer）
export type McpServersMap = Record<string, McpServer>;

// MCP 配置状态
export interface McpStatus {
  userConfigPath: string;
  userConfigExists: boolean;
  serverCount: number;
}

// 新：来自 config.json 的 MCP 列表响应
export interface McpConfigResponse {
  configPath: string;
  servers: Record<string, McpServer>;
}
