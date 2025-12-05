import { ProviderCategory } from "../types";
import { ProviderPreset } from "./claudeProviderPresets";

export type GrokProviderPreset = ProviderPreset;

export const grokProviderPresets: GrokProviderPreset[] = [
  {
    name: "Grok Official",
    websiteUrl: "https://x.ai",
    settingsConfig: {
      apiKey: "",
      baseURL: "https://api.x.ai/v1",
      defaultModel: "grok-code-fast-1",
      models: [
        "grok-4-1-fast-reasoning",
        "grok-4-1-fast-non-reasoning",
        "grok-4-fast-reasoning",
        "grok-4-fast-non-reasoning",
        "grok-4",
        "grok-4-latest",
        "grok-code-fast-1",
        "grok-3",
        "grok-3-latest",
        "grok-3-fast",
        "grok-3-mini",
        "grok-3-mini-fast"
      ],
      settingsVersion: 2
    },
    isOfficial: true,
    category: "official",
    icon: "grok",
    iconColor: "#000000"
  },
  {
    name: "Zhipu GLM",
    websiteUrl: "https://open.bigmodel.cn",
    settingsConfig: {
      apiKey: "",
      baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
      defaultModel: "glm-4.6",
      models: [
         "glm-4.6",
         "glm-4.5-air"
      ],
      settingsVersion: 2
    },
    category: "cn_official",
    icon: "zhipu",
    iconColor: "#0F62FE"
  }
];
