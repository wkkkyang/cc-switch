import type { ProviderCategory } from "@/types";

/**
 * Qwen 预设供应商的视觉主题配置
 */
export interface QwenPresetTheme {
  /** 图标类型：'claude' | 'codex' | 'gemini' | 'qwen' | 'generic' */
  icon?: "claude" | "codex" | "gemini" | "qwen" | "generic";
  /** 背景色（选中状态），支持 hex 颜色 */
  backgroundColor?: string;
  /** 文字色（选中状态），支持 hex 颜色 */
  textColor?: string;
}

export interface QwenProviderPreset {
  name: string;
  websiteUrl: string;
  apiKeyUrl?: string;
  settingsConfig: object;
  baseURL?: string;
  model?: string;
  description?: string;
  category?: ProviderCategory;
  isPartner?: boolean;
  partnerPromotionKey?: string;
  endpointCandidates?: string[];
  theme?: QwenPresetTheme;
  // 图标配置
  icon?: string; // 图标名称
  iconColor?: string; // 图标颜色
}

export const qwenProviderPresets: QwenProviderPreset[] = [
  {
    name: "阿里云百炼",
    websiteUrl: "https://bailian.console.aliyun.com",
    apiKeyUrl: "https://bailian.console.aliyun.com",
    settingsConfig: {
      security: {
        auth: {
          selectedType: "openai",
          apiKey: "",
          baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        },
      },
      model: {
        name: "qwen-max",
      },
      $version: 2,
    },
    baseURL: "https://dashscope.aliyuncs.com/api/v1",
    model: "qwen-max",
    description: "阿里云百炼平台官方 Qwen API",
    category: "official",
    theme: {
      icon: "qwen",
      backgroundColor: "#FF6A00",
      textColor: "#FFFFFF",
    },
    icon: "qwen",
    iconColor: "#FF6A00",
  },
  {
    name: "阿里云千问",
    websiteUrl: "https://tongyi.aliyun.com",
    apiKeyUrl: "https://help.aliyun.com/zh/qwen/",
    settingsConfig: {
      security: {
        auth: {
          selectedType: "openai",
          apiKey: "",
          baseUrl: "https://dashscope.aliyuncs.com/api/v1",
        },
      },
      model: {
        name: "qwen-plus",
      },
      $version: 2,
    },
    baseURL: "https://dashscope.aliyuncs.com/api/v1",
    model: "qwen-plus",
    description: "阿里云千问官方 API",
    category: "official",
    theme: {
      icon: "qwen",
      backgroundColor: "#FF6A00",
      textColor: "#FFFFFF",
    },
    icon: "qwen",
    iconColor: "#FF6A00",
  },
  {
    name: "通义实验室",
    websiteUrl: "https://www.modelscope.cn/models?q=qwen",
    settingsConfig: {
      security: {
        auth: {
          selectedType: "openai",
          apiKey: "",
          baseUrl: "https://api-inference.modelscope.cn",
        },
      },
      model: {
        name: "Qwen/Qwen3-72B-Chat",
      },
      $version: 2,
    },
    baseURL: "https://api-inference.modelscope.cn",
    model: "Qwen/Qwen3-72B-Chat",
    description: "ModelScope 平台 Qwen 模型",
    category: "official",
    icon: "qwen",
    iconColor: "#FF6A00",
  },
  {
    name: "自定义",
    websiteUrl: "",
    settingsConfig: {
      security: {
        auth: {
          selectedType: "openai",
          apiKey: "",
          baseUrl: "",
        },
      },
      model: {
        name: "qwen-max",
      },
      $version: 2,
    },
    model: "qwen-max",
    description: "自定义 Qwen API 端点",
    category: "custom",
  },
];

export function getQwenPresetByName(
  name: string,
): QwenProviderPreset | undefined {
  return qwenProviderPresets.find((preset) => preset.name === name);
}

export function getQwenPresetByUrl(
  url: string,
): QwenProviderPreset | undefined {
  if (!url) return undefined;
  return qwenProviderPresets.find(
    (preset) =>
      preset.baseURL &&
      url.toLowerCase().includes(preset.baseURL.toLowerCase()),
  );
}