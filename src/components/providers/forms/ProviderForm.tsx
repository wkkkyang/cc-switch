import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { providerSchema, type ProviderFormData } from "@/lib/schemas/provider";
import type { AppId } from "@/lib/api";
import type { ProviderCategory, ProviderMeta } from "@/types";
import {
  providerPresets,
  type ProviderPreset,
} from "@/config/claudeProviderPresets";
import {
  codexProviderPresets,
  type CodexProviderPreset,
} from "@/config/codexProviderPresets";
import {
  geminiProviderPresets,
  type GeminiProviderPreset,
} from "@/config/geminiProviderPresets";
import {
  grokProviderPresets,
  type GrokProviderPreset,
} from "@/config/grokProviderPresets";
import {
  qwenProviderPresets,
  type QwenProviderPreset,
} from "@/config/qwenProviderPresets";
import { applyTemplateValues } from "@/utils/providerConfigUtils";
import { mergeProviderMeta } from "@/utils/providerMetaUtils";
import { getCodexCustomTemplate } from "@/config/codexTemplates";
import CodexConfigEditor from "./CodexConfigEditor";
import { CommonConfigEditor } from "./CommonConfigEditor";
import GeminiConfigEditor from "./GeminiConfigEditor";
import { ProviderPresetSelector } from "./ProviderPresetSelector";
import { BasicFormFields } from "./BasicFormFields";
import { ClaudeFormFields } from "./ClaudeFormFields";
import { CodexFormFields } from "./CodexFormFields";
import { GeminiFormFields } from "./GeminiFormFields";
import { GrokFormFields } from "./GrokFormFields";
import { QwenFormFields } from "./QwenFormFields";
import {
  useProviderCategory,
  useApiKeyState,
  useBaseUrlState,
  useModelState,
  useCodexConfigState,
  useApiKeyLink,
  useTemplateValues,
  useCommonConfigSnippet,
  useCodexCommonConfig,
  useSpeedTestEndpoints,
  useCodexTomlValidation,
  useGeminiConfigState,
  useGeminiCommonConfig,
} from "./hooks";
import { geminiApi } from "@/lib/api/gemini";

const CLAUDE_DEFAULT_CONFIG = JSON.stringify({ env: {} }, null, 2);
const CODEX_DEFAULT_CONFIG = JSON.stringify({ auth: {}, config: "" }, null, 2);
const GEMINI_DEFAULT_CONFIG = JSON.stringify(
  {
    env: {
      GOOGLE_GEMINI_BASE_URL: "",
      GEMINI_API_KEY: "",
      GEMINI_MODEL: "gemini-2.5-flash-lite",
    },
  },
  null,
  2,
);
const GROK_DEFAULT_CONFIG = JSON.stringify(
  {
    apiKey: "",
    baseURL: "",
    models: [],
    settingsVersion: 2,
  },
  null,
  2,
);
const QWEN_DEFAULT_CONFIG = JSON.stringify(
  {
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
  null,
  2,
);

type PresetEntry = {
  id: string;
  preset:
    | ProviderPreset
    | CodexProviderPreset
    | GeminiProviderPreset
    | GrokProviderPreset
    | QwenProviderPreset;
};

interface ProviderFormProps {
  appId: AppId;
  providerId?: string;
  submitLabel: string;
  onSubmit: (values: ProviderFormValues) => void;
  onCancel: () => void;
  initialData?: {
    name?: string;
    websiteUrl?: string;
    notes?: string;
    settingsConfig?: Record<string, unknown>;
    category?: ProviderCategory;
    meta?: ProviderMeta;
    icon?: string;
    iconColor?: string;
  };
  showButtons?: boolean;
}

export function ProviderForm({
  appId,
  providerId,
  submitLabel,
  onSubmit,
  onCancel,
  initialData,
  showButtons = true,
}: ProviderFormProps) {
  const { t } = useTranslation();
  const isEditMode = Boolean(initialData);

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    initialData ? null : "custom",
  );
  const [activePreset, setActivePreset] = useState<{
    id: string;
    category?: ProviderCategory;
    isPartner?: boolean;
    partnerPromotionKey?: string;
  } | null>(null);
  const [isEndpointModalOpen, setIsEndpointModalOpen] = useState(false);
  const [isCodexEndpointModalOpen, setIsCodexEndpointModalOpen] =
    useState(false);

  // 新建供应商：收集端点测速弹窗中的"自定义端点"，提交时一次性落盘到 meta.custom_endpoints
  // 编辑供应商：端点已通过 API 直接保存，不再需要此状态
  const [draftCustomEndpoints, setDraftCustomEndpoints] = useState<string[]>(
    () => {
      // 仅在新建模式下使用
      if (initialData) return [];
      return [];
    },
  );

  // 使用 category hook
  const { category } = useProviderCategory({
    appId,
    selectedPresetId,
    isEditMode,
    initialCategory: initialData?.category,
  });

  useEffect(() => {
    setSelectedPresetId(initialData ? null : "custom");
    setActivePreset(null);

    // 编辑模式不需要恢复 draftCustomEndpoints，端点已通过 API 管理
    if (!initialData) {
      setDraftCustomEndpoints([]);
    }
  }, [appId, initialData]);

  const defaultValues: ProviderFormData = useMemo(
    () => ({
      name: initialData?.name ?? "",
      websiteUrl: initialData?.websiteUrl ?? "",
      notes: initialData?.notes ?? "",
      settingsConfig: initialData?.settingsConfig
        ? JSON.stringify(initialData.settingsConfig, null, 2)
        : appId === "codex"
          ? CODEX_DEFAULT_CONFIG
          : appId === "gemini"
            ? GEMINI_DEFAULT_CONFIG
            : appId === "grok"
              ? GROK_DEFAULT_CONFIG
              : appId === "qwen"
                ? QWEN_DEFAULT_CONFIG
                : CLAUDE_DEFAULT_CONFIG,
      icon: initialData?.icon ?? "",
      iconColor: initialData?.iconColor ?? "",
      meta: {
        candidateModels: initialData?.meta?.candidateModels ?? [],
      },
    }),
    [initialData, appId],
  );

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerSchema),
    defaultValues,
    mode: "onSubmit",
  });

  // 使用 API Key hook
  const {
    apiKey,
    handleApiKeyChange,
    showApiKey: shouldShowApiKey,
  } = useApiKeyState({
    initialConfig: form.watch("settingsConfig"),
    onConfigChange: (config) => form.setValue("settingsConfig", config),
    selectedPresetId,
    category,
    appType: appId,
  });

  // 使用 Base URL hook (Claude, Codex, Gemini, Qwen)
  const {
    baseUrl,
    handleClaudeBaseUrlChange,
    handleGrokBaseUrlChange,
    handleQwenBaseUrlChange,
  } = useBaseUrlState({
    appType: appId,
    category,
    settingsConfig: form.watch("settingsConfig"),
    codexConfig: "",
    onSettingsConfigChange: (config) => form.setValue("settingsConfig", config),
    onCodexConfigChange: () => {
      /* noop */
    },
  });

  // 使用 Model hook（新：主模型 + Haiku/Sonnet/Opus 默认模型）
  const {
    claudeModel,
    defaultHaikuModel,
    defaultSonnetModel,
    defaultOpusModel,
    handleModelChange,
  } = useModelState({
    settingsConfig: form.watch("settingsConfig"),
    onConfigChange: (config) => form.setValue("settingsConfig", config),
  });

  // 使用 Codex 配置 hook (仅 Codex 模式)
  const {
    codexAuth,
    codexConfig,
    codexApiKey,
    codexBaseUrl,
    codexModelName,
    codexAuthError,
    setCodexAuth,
    handleCodexApiKeyChange,
    handleCodexBaseUrlChange,
    handleCodexModelNameChange,
    handleCodexConfigChange: originalHandleCodexConfigChange,
    resetCodexConfig,
  } = useCodexConfigState({ initialData });

  // 使用 Codex TOML 校验 hook (仅 Codex 模式)
  const { configError: codexConfigError, debouncedValidate } =
    useCodexTomlValidation();

  // 包装 handleCodexConfigChange，添加实时校验
  const handleCodexConfigChange = useCallback(
    (value: string) => {
      originalHandleCodexConfigChange(value);
      debouncedValidate(value);
    },
    [originalHandleCodexConfigChange, debouncedValidate],
  );

  // Codex 新建模式：初始化时自动填充模板
  useEffect(() => {
    if (appId === "codex" && !initialData && selectedPresetId === "custom") {
      const template = getCodexCustomTemplate();
      resetCodexConfig(template.auth, template.config);
    }
  }, [appId, initialData, selectedPresetId, resetCodexConfig]);

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const presetCategoryLabels: Record<string, string> = useMemo(
    () => ({
      official: t("providerForm.categoryOfficial", {
        defaultValue: "官方",
      }),
      cn_official: t("providerForm.categoryCnOfficial", {
        defaultValue: "国内官方",
      }),
      aggregator: t("providerForm.categoryAggregation", {
        defaultValue: "聚合服务",
      }),
      third_party: t("providerForm.categoryThirdParty", {
        defaultValue: "第三方",
      }),
    }),
    [t],
  );

  const presetEntries = useMemo(() => {
    if (appId === "codex") {
      return codexProviderPresets.map<PresetEntry>((preset, index) => ({
        id: `codex-${index}`,
        preset,
      }));
    } else if (appId === "gemini") {
      return geminiProviderPresets.map<PresetEntry>((preset, index) => ({
        id: `gemini-${index}`,
        preset,
      }));
    } else if (appId === "grok") {
      return grokProviderPresets.map<PresetEntry>((preset, index) => ({
        id: `grok-${index}`,
        preset,
      }));
    } else if (appId === "qwen") {
      return qwenProviderPresets.map<PresetEntry>((preset, index) => ({
        id: `qwen-${index}`,
        preset,
      }));
    }
    return providerPresets.map<PresetEntry>((preset, index) => ({
      id: `claude-${index}`,
      preset,
    }));
  }, [appId]);

  // 使用模板变量 hook (仅 Claude 模式)
  const {
    templateValues,
    templateValueEntries,
    selectedPreset: templatePreset,
    handleTemplateValueChange,
    validateTemplateValues,
  } = useTemplateValues({
    selectedPresetId: appId === "claude" ? selectedPresetId : null,
    presetEntries: appId === "claude" ? presetEntries : [],
    settingsConfig: form.watch("settingsConfig"),
    onConfigChange: (config) => form.setValue("settingsConfig", config),
  });

  // 使用通用配置片段 hook (仅 Claude 模式)
  const {
    useCommonConfig,
    commonConfigSnippet,
    commonConfigError,
    handleCommonConfigToggle,
    handleCommonConfigSnippetChange,
  } = useCommonConfigSnippet({
    settingsConfig: form.watch("settingsConfig"),
    onConfigChange: (config) => form.setValue("settingsConfig", config),
    initialData: appId === "claude" ? initialData : undefined,
  });

  // 使用 Codex 通用配置片段 hook (仅 Codex 模式)
  const {
    useCommonConfig: useCodexCommonConfigFlag,
    commonConfigSnippet: codexCommonConfigSnippet,
    commonConfigError: codexCommonConfigError,
    handleCommonConfigToggle: handleCodexCommonConfigToggle,
    handleCommonConfigSnippetChange: handleCodexCommonConfigSnippetChange,
  } = useCodexCommonConfig({
    codexConfig,
    onConfigChange: handleCodexConfigChange,
    initialData: appId === "codex" ? initialData : undefined,
  });

  // 使用 Gemini 配置 hook (仅 Gemini 模式)
  const {
    geminiEnv,
    geminiConfig,
    geminiApiKey,
    geminiBaseUrl,
    geminiModel,
    geminiMaxOutputTokens,
    geminiProxyHost,
    geminiProxyPort,
    geminiTlsRejectUnauthorized,
    envError,
    configError: geminiConfigError,
    handleGeminiApiKeyChange: originalHandleGeminiApiKeyChange,
    handleGeminiBaseUrlChange: originalHandleGeminiBaseUrlChange,
    handleGeminiModelChange: originalHandleGeminiModelChange,
    handleGeminiMaxOutputTokensChange:
      originalHandleGeminiMaxOutputTokensChange,
    handleGeminiProxyHostChange,
    handleGeminiProxyPortChange,
    handleGeminiTlsRejectUnauthorizedChange,
    handleGeminiEnvChange,
    handleGeminiConfigChange,
    resetGeminiConfig,
    envStringToObj,
    envObjToString,
  } = useGeminiConfigState({
    initialData: appId === "gemini" ? initialData : undefined,
  });
  const [geminiProxyEnvEnabled, setGeminiProxyEnvEnabled] = useState(true);
  const [geminiProxyEnvLoading, setGeminiProxyEnvLoading] = useState(false);

  // 同步 Gemini env 和 config 到 settingsConfig
  useEffect(() => {
    if (appId !== "gemini") return;

    try {
      const envObj = envStringToObj(geminiEnv);
      const configObj = geminiConfig.trim() ? JSON.parse(geminiConfig) : {};
      const combined = {
        env: envObj,
        config: configObj,
      };
      form.setValue("settingsConfig", JSON.stringify(combined, null, 2));
    } catch {
      // ignore parse errors
    }
  }, [appId, geminiEnv, geminiConfig, envStringToObj, form]);

  // 初始化 Gemini env 和 config（当预设被选择时）
  useEffect(() => {
    if (
      appId !== "gemini" ||
      !selectedPresetId ||
      selectedPresetId === "custom" ||
      isEditMode
    )
      return;

    try {
      const config = JSON.parse(form.watch("settingsConfig") || "{}");
      if (config.env || config.config) {
        resetGeminiConfig(config.env || {}, config.config || {});
      }
    } catch {
      // ignore parse errors
    }
  }, [appId, selectedPresetId, isEditMode, form, resetGeminiConfig]);

  // 包装 Gemini handlers 以同步 settingsConfig
  const handleGeminiApiKeyChange = useCallback(
    (key: string) => {
      originalHandleGeminiApiKeyChange(key);
    },
    [originalHandleGeminiApiKeyChange],
  );

  const handleGeminiBaseUrlChange = useCallback(
    (url: string) => {
      originalHandleGeminiBaseUrlChange(url);
    },
    [originalHandleGeminiBaseUrlChange],
  );

  const handleGeminiModelChange = useCallback(
    (model: string) => {
      originalHandleGeminiModelChange(model);
    },
    [originalHandleGeminiModelChange],
  );

  const handleGeminiMaxOutputTokensChange = useCallback(
    (tokens: string) => {
      originalHandleGeminiMaxOutputTokensChange(tokens);
    },
    [originalHandleGeminiMaxOutputTokensChange],
  );

  // 使用 Gemini 通用配置 hook (仅 Gemini 模式)
  const {
    useCommonConfig: useGeminiCommonConfigFlag,
    commonConfigSnippet: geminiCommonConfigSnippet,
    commonConfigError: geminiCommonConfigError,
    handleCommonConfigToggle: handleGeminiCommonConfigToggle,
    handleCommonConfigSnippetChange: handleGeminiCommonConfigSnippetChange,
  } = useGeminiCommonConfig({
    configValue: geminiConfig,
    onConfigChange: handleGeminiConfigChange,
    initialData: appId === "gemini" ? initialData : undefined,
  });

  const [isCommonConfigModalOpen, setIsCommonConfigModalOpen] = useState(false);

  // 🎯 新增：同步待选模型到对应输入框的回调函数
  const handleModelSync = useCallback(
    (model: string) => {
      // 根据应用类型填充到对应的模型输入框
      if (appId === "claude") {
        // Claude: 填充到默认模型（主模型）
        const currentModel = claudeModel;
        if (currentModel === model) {
          // 值相同，不显示提示
          return;
        }
        // 填充模型
        handleModelChange("ANTHROPIC_MODEL", model);
        // 统一提示格式
        toast.success(`已同步模型: ${model}`);
      } else if (appId === "codex") {
        // Codex: 填充到模型名称
        if (codexModelName === model) {
          return;
        }
        handleCodexModelNameChange(model);
        toast.success(`已同步模型: ${model}`);
      } else if (appId === "gemini") {
        // Gemini: 填充到主模型
        if (geminiModel === model) {
          return;
        }
        handleGeminiModelChange(model);
        toast.success(`已同步模型: ${model}`);
      } else if (appId === "grok") {
        // Grok: 填充到默认模型
        try {
          const config = JSON.parse(form.watch("settingsConfig") || "{}");
          const currentDefaultModel = config.defaultModel;
          
          if (currentDefaultModel === model) {
            return;
          }
          
          config.defaultModel = model;
          form.setValue("settingsConfig", JSON.stringify(config, null, 2));
          toast.success(`已同步模型: ${model}`);
        } catch (error) {
          toast.error("同步失败，配置格式错误");
        }
      } else if (appId === "qwen") {
        // Qwen: 填充到模型名称
        try {
          const config = JSON.parse(form.watch("settingsConfig") || "{}");
          if (!config.model) config.model = {};
          const currentName = config.model.name;
          
          if (currentName === model) {
            return;
          }
          
          config.model.name = model;
          form.setValue("settingsConfig", JSON.stringify(config, null, 2));
          toast.success(`已同步模型: ${model}`);
        } catch (error) {
          toast.error("同步失败，配置格式错误");
        }
      }
    },
    [
      appId,
      claudeModel,
      codexModelName,
      geminiModel,
      handleModelChange,
      handleGeminiModelChange,
      handleCodexModelNameChange,
      form,
    ],
  );

  const handleSubmit = (values: ProviderFormData) => {
    // 验证模板变量（仅 Claude 模式）
    if (appId === "claude" && templateValueEntries.length > 0) {
      const validation = validateTemplateValues();
      if (!validation.isValid && validation.missingField) {
        toast.error(
          t("providerForm.fillParameter", {
            label: validation.missingField.label,
            defaultValue: `请填写 ${validation.missingField.label}`,
          }),
        );
        return;
      }
    }

    // 供应商名称必填校验
    if (!values.name.trim()) {
      toast.error(
        t("providerForm.fillSupplierName", {
          defaultValue: "请填写供应商名称",
        }),
      );
      return;
    }

    // 非官方供应商必填校验：端点和 API Key
    if (category !== "official") {
      if (appId === "claude") {
        if (!baseUrl.trim()) {
          toast.error(
            t("providerForm.endpointRequired", {
              defaultValue: "非官方供应商请填写 API 端点",
            }),
          );
          return;
        }
        if (!apiKey.trim()) {
          toast.error(
            t("providerForm.apiKeyRequired", {
              defaultValue: "非官方供应商请填写 API Key",
            }),
          );
          return;
        }
      } else if (appId === "codex") {
        if (!codexBaseUrl.trim()) {
          toast.error(
            t("providerForm.endpointRequired", {
              defaultValue: "非官方供应商请填写 API 端点",
            }),
          );
          return;
        }
        if (!codexApiKey.trim()) {
          toast.error(
            t("providerForm.apiKeyRequired", {
              defaultValue: "非官方供应商请填写 API Key",
            }),
          );
          return;
        }
      } else if (appId === "gemini") {
        if (!geminiBaseUrl.trim()) {
          toast.error(
            t("providerForm.endpointRequired", {
              defaultValue: "非官方供应商请填写 API 端点",
            }),
          );
          return;
        }
        if (!geminiApiKey.trim()) {
          toast.error(
            t("providerForm.apiKeyRequired", {
              defaultValue: "非官方供应商请填写 API Key",
            }),
          );
          return;
        }
      } else if (appId === "grok") {
        if (!baseUrl.trim()) {
          toast.error(
            t("providerForm.endpointRequired", {
              defaultValue: "非官方供应商请填写 API 端点",
            }),
          );
          return;
        }
        if (!apiKey.trim()) {
          toast.error(
            t("providerForm.apiKeyRequired", {
              defaultValue: "非官方供应商请填写 API Key",
            }),
          );
          return;
        }
      }
    }

    let settingsConfig: string;

    // Codex: 组合 auth 和 config
    if (appId === "codex") {
      try {
        const authJson = JSON.parse(codexAuth);
        const configObj = {
          auth: authJson,
          config: codexConfig ?? "",
        };
        settingsConfig = JSON.stringify(configObj);
      } catch (err) {
        // 如果解析失败，使用表单中的配置
        settingsConfig = values.settingsConfig.trim();
      }
    } else if (appId === "gemini") {
      // Gemini: 组合 env 和 config
      try {
        const envObj = envStringToObj(geminiEnv);
        const configObj = geminiConfig.trim() ? JSON.parse(geminiConfig) : {};
        const combined = {
          env: envObj,
          config: configObj,
        };
        settingsConfig = JSON.stringify(combined);
      } catch (err) {
        // 如果解析失败，使用表单中的配置
        settingsConfig = values.settingsConfig.trim();
      }
    } else {
      // Claude: 使用表单配置
      settingsConfig = values.settingsConfig.trim();
    }

    const payload: ProviderFormValues = {
      ...values,
      name: values.name.trim(),
      websiteUrl: values.websiteUrl?.trim() ?? "",
      settingsConfig,
    };

    if (activePreset) {
      payload.presetId = activePreset.id;
      if (activePreset.category) {
        payload.presetCategory = activePreset.category;
      }
      // 继承合作伙伴标识
      if (activePreset.isPartner) {
        payload.isPartner = activePreset.isPartner;
      }
    }

    // 处理 meta 字段：仅在新建模式下从 draftCustomEndpoints 生成 custom_endpoints
    // 编辑模式：端点已通过 API 直接保存，不在此处理
    if (!isEditMode && draftCustomEndpoints.length > 0) {
      const customEndpointsToSave: Record<
        string,
        import("@/types").CustomEndpoint
      > = draftCustomEndpoints.reduce(
        (acc, url) => {
          const now = Date.now();
          acc[url] = { url, addedAt: now, lastUsed: undefined };
          return acc;
        },
        {} as Record<string, import("@/types").CustomEndpoint>,
      );

      // 检测是否需要清空端点（重要：区分"用户清空端点"和"用户没有修改端点"）
      const hadEndpoints =
        initialData?.meta?.custom_endpoints &&
        Object.keys(initialData.meta.custom_endpoints).length > 0;
      const needsClearEndpoints =
        hadEndpoints && draftCustomEndpoints.length === 0;

      // 如果用户明确清空了端点，传递空对象（而不是 null）让后端知道要删除
      let mergedMeta = needsClearEndpoints
        ? mergeProviderMeta(initialData?.meta, {})
        : mergeProviderMeta(initialData?.meta, customEndpointsToSave);

      // 添加合作伙伴标识与促销 key
      if (activePreset?.isPartner) {
        mergedMeta = {
          ...(mergedMeta ?? {}),
          isPartner: true,
        };
      }

      if (activePreset?.partnerPromotionKey) {
        mergedMeta = {
          ...(mergedMeta ?? {}),
          partnerPromotionKey: activePreset.partnerPromotionKey,
        };
      }

      // 添加待选模型
      if (
        values.meta?.candidateModels &&
        values.meta.candidateModels.length > 0
      ) {
        mergedMeta = {
          ...(mergedMeta ?? {}),
          candidateModels: values.meta.candidateModels,
        };
      }

      payload.meta = mergedMeta;
    } else {
      // 编辑模式或没有自定义端点时，直接处理meta字段
      let mergedMeta = mergeProviderMeta(initialData?.meta, {});

      // 添加待选模型
      if (
        values.meta?.candidateModels &&
        values.meta.candidateModels.length > 0
      ) {
        mergedMeta = {
          ...(mergedMeta ?? {}),
          candidateModels: values.meta.candidateModels,
        };
      }

      payload.meta = mergedMeta;
    }

    // 当使用或修改官方供应商时，显示提示（在提交前检查）
    // 使用 setTimeout 确保我们的提示在成功提示之后显示，避免重叠
    setTimeout(() => {
      // 判断逻辑：检查预设类别或初始数据类别
      const currentCategory = activePreset?.category || initialData?.category || category;
      const isOfficial = currentCategory === "official";
      
      // 详细调试信息（在开发环境）
      if (process.env.NODE_ENV === "development") {
        console.log("Gemini 提示检查:", {
          activePresetCategory: activePreset?.category,
          initialDataCategory: initialData?.category,
          hookCategory: category,
          currentCategory,
          isOfficial,
          appId,
          isEditMode,
        });
      }
      
      if (isOfficial && appId === "gemini") {
        toast.info("注意修改代理端口哦", {
          duration: 2000, // 2秒
          description: "Gemini 官方供应商可能需要配置代理端口",
          position: "bottom-right", // 避开重叠位置
        });
      }
    }, 200); // 延迟到 onSubmit 完成之后
    
    // 调用保存操作
    onSubmit(payload);
  };

  const groupedPresets = useMemo(() => {
    return presetEntries.reduce<Record<string, PresetEntry[]>>((acc, entry) => {
      const category = entry.preset.category ?? "others";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(entry);
      return acc;
    }, {});
  }, [presetEntries]);

  const categoryKeys = useMemo(() => {
    return Object.keys(groupedPresets).filter(
      (key) => key !== "custom" && groupedPresets[key]?.length,
    );
  }, [groupedPresets]);

  // 判断是否显示端点测速（仅官方类别不显示）
  const shouldShowSpeedTest = category !== "official";

  // 使用 API Key 链接 hook (Claude)
  const {
    shouldShowApiKeyLink: shouldShowClaudeApiKeyLink,
    websiteUrl: claudeWebsiteUrl,
    isPartner: isClaudePartner,
    partnerPromotionKey: claudePartnerPromotionKey,
  } = useApiKeyLink({
    appId: "claude",
    category,
    selectedPresetId,
    presetEntries,
    formWebsiteUrl: form.watch("websiteUrl") || "",
  });

  // 使用 API Key 链接 hook (Codex)
  const {
    shouldShowApiKeyLink: shouldShowCodexApiKeyLink,
    websiteUrl: codexWebsiteUrl,
    isPartner: isCodexPartner,
    partnerPromotionKey: codexPartnerPromotionKey,
  } = useApiKeyLink({
    appId: "codex",
    category,
    selectedPresetId,
    presetEntries,
    formWebsiteUrl: form.watch("websiteUrl") || "",
  });

  // 使用 API Key 链接 hook (Gemini)
  const {
    shouldShowApiKeyLink: shouldShowGeminiApiKeyLink,
    websiteUrl: geminiWebsiteUrl,
    isPartner: isGeminiPartner,
    partnerPromotionKey: geminiPartnerPromotionKey,
  } = useApiKeyLink({
    appId: "gemini",
    category,
    selectedPresetId,
    presetEntries,
    formWebsiteUrl: form.watch("websiteUrl") || "",
  });

  // 使用 API Key 链接 hook (Grok)
  const {
    shouldShowApiKeyLink: shouldShowGrokApiKeyLink,
    websiteUrl: grokWebsiteUrl,
    isPartner: isGrokPartner,
    partnerPromotionKey: grokPartnerPromotionKey,
  } = useApiKeyLink({
    appId: "grok",
    category,
    selectedPresetId,
    presetEntries,
    formWebsiteUrl: form.watch("websiteUrl") || "",
  });

  // 使用 API Key 链接 hook (Qwen)
  const {
    shouldShowApiKeyLink: shouldShowQwenApiKeyLink,
    websiteUrl: qwenWebsiteUrl,
    isPartner: isQwenPartner,
    partnerPromotionKey: qwenPartnerPromotionKey,
  } = useApiKeyLink({
    appId: "qwen",
    category,
    selectedPresetId,
    presetEntries,
    formWebsiteUrl: form.watch("websiteUrl") || "",
  });

  // 使用端点测速候选 hook
  const speedTestEndpoints = useSpeedTestEndpoints({
    appId,
    selectedPresetId,
    presetEntries,
    baseUrl,
    codexBaseUrl,
    initialData,
  });

  const isGoogleOfficialGemini = useMemo(() => {
    if (appId !== "gemini") return false;

    // 编辑模式：优先根据 meta 标记和名称判断
    if (initialData) {
      if (initialData.meta?.partnerPromotionKey === "google-official") {
        return true;
      }
      // 部分场景下 meta 可能未包含 partnerPromotionKey，这里兜底按名称识别
      if (initialData.name === "Google Official") {
        return true;
      }
    }

    // 新建模式：根据当前选择的预设判断
    if (!initialData && selectedPresetId && selectedPresetId !== "custom") {
      const entry = presetEntries.find((item) => item.id === selectedPresetId);
      if (entry && "name" in entry.preset) {
        const presetName = (entry.preset as GeminiProviderPreset).name;
        const partnerKey = (entry.preset as GeminiProviderPreset)
          .partnerPromotionKey;
        if (
          presetName === "Google Official" ||
          partnerKey === "google-official"
        ) {
          return true;
        }
      }
    }

    return false;
  }, [appId, initialData, selectedPresetId, presetEntries]);

  useEffect(() => {
    if (!isGoogleOfficialGemini) {
      return;
    }

    let cancelled = false;
    setGeminiProxyEnvLoading(true);

    (async () => {
      try {
        const status = await geminiApi.getProxyStatus();
        if (cancelled) return;
        setGeminiProxyEnvEnabled(
          typeof status.enabled === "boolean" ? status.enabled : true,
        );

        // 同步 .env 编辑器内容为实际 ~/.gemini/.env 文件内容
        if (typeof status.content === "string" && status.content.trim()) {
          handleGeminiEnvChange(status.content);
        }
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) {
          setGeminiProxyEnvLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGoogleOfficialGemini, handleGeminiEnvChange]);

  const handleGeminiProxyEnvToggle = useCallback(
    async (enabled: boolean) => {
      if (!isGoogleOfficialGemini) return;

      setGeminiProxyEnvLoading(true);
      try {
        const status = await geminiApi.setProxyEnabled(
          enabled,
          geminiProxyHost || undefined,
          geminiProxyPort || undefined,
        );
        setGeminiProxyEnvEnabled(status.enabled);
        if (typeof status.content === "string") {
          // 仅合并 http_proxy / https_proxy，保持当前供应商的其他 env 配置不变
          const currentEnvObj = envStringToObj(geminiEnv);
          const fileEnvObj = envStringToObj(status.content);

          if (enabled) {
            if (fileEnvObj.http_proxy) {
              currentEnvObj.http_proxy = fileEnvObj.http_proxy;
            }
            if (fileEnvObj.https_proxy) {
              currentEnvObj.https_proxy = fileEnvObj.https_proxy;
            }
          } else {
            delete currentEnvObj.http_proxy;
            delete currentEnvObj.https_proxy;
          }

          const mergedEnv = envObjToString(currentEnvObj);
          handleGeminiEnvChange(mergedEnv);
        }
      } catch {
      } finally {
        setGeminiProxyEnvLoading(false);
      }
    },
    [
      isGoogleOfficialGemini,
      handleGeminiEnvChange,
      geminiProxyHost,
      geminiProxyPort,
      envStringToObj,
      envObjToString,
      geminiEnv,
    ],
  );

  const handlePresetChange = (value: string) => {
    setSelectedPresetId(value);
    if (value === "custom") {
      setActivePreset(null);
      form.reset(defaultValues);

      // Codex 自定义模式：加载模板
      if (appId === "codex") {
        const template = getCodexCustomTemplate();
        resetCodexConfig(template.auth, template.config);
      }
      // Gemini 自定义模式：重置为空配置
      if (appId === "gemini") {
        resetGeminiConfig({}, {});
      }
      return;
    }

    const entry = presetEntries.find((item) => item.id === value);
    if (!entry) {
      return;
    }

    setActivePreset({
      id: value,
      category: entry.preset.category,
      isPartner: entry.preset.isPartner,
      partnerPromotionKey: entry.preset.partnerPromotionKey,
    });

    if (appId === "codex") {
      const preset = entry.preset as CodexProviderPreset;
      const auth = preset.auth ?? {};
      const config = preset.config ?? "";

      // 重置 Codex 配置
      resetCodexConfig(auth, config);

      // 更新表单其他字段
      form.reset({
        name: preset.name,
        websiteUrl: preset.websiteUrl ?? "",
        settingsConfig: JSON.stringify({ auth, config }, null, 2),
        icon: preset.icon ?? "",
        iconColor: preset.iconColor ?? "",
      });
      return;
    }

    if (appId === "gemini") {
      const preset = entry.preset as GeminiProviderPreset;
      const env = (preset.settingsConfig as any)?.env ?? {};
      const config = (preset.settingsConfig as any)?.config ?? {};

      // 重置 Gemini 配置
      resetGeminiConfig(env, config);

      // 更新表单其他字段
      form.reset({
        name: preset.name,
        websiteUrl: preset.websiteUrl ?? "",
        settingsConfig: JSON.stringify(preset.settingsConfig, null, 2),
        icon: preset.icon ?? "",
        iconColor: preset.iconColor ?? "",
      });
      return;
    }

    if (appId === "grok") {
      const preset = entry.preset as GrokProviderPreset;
      const config = preset.settingsConfig ?? {};

      // 更新表单其他字段
      form.reset({
        name: preset.name,
        websiteUrl: preset.websiteUrl ?? "",
        settingsConfig: JSON.stringify(config, null, 2),
        icon: preset.icon ?? "",
        iconColor: preset.iconColor ?? "",
      });
      return;
    }

    if (appId === "qwen") {
      const preset = entry.preset as QwenProviderPreset;
      const config = preset.settingsConfig ?? {};

      // 更新表单其他字段
      form.reset({
        name: preset.name,
        websiteUrl: preset.websiteUrl ?? "",
        settingsConfig: JSON.stringify(config, null, 2),
        icon: preset.icon ?? "",
        iconColor: preset.iconColor ?? "",
      });
      return;
    }

    const preset = entry.preset as ProviderPreset;
    const config = applyTemplateValues(
      preset.settingsConfig,
      preset.templateValues,
    );

    form.reset({
      name: preset.name,
      websiteUrl: preset.websiteUrl ?? "",
      settingsConfig: JSON.stringify(config, null, 2),
      icon: preset.icon ?? "",
      iconColor: preset.iconColor ?? "",
    });
  };

  return (
    <Form {...form}>
      <form
        id="provider-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 glass rounded-xl p-6 border border-white/10"
      >
        {/* 预设供应商选择（仅新增模式显示） */}
        {!initialData && (
          <ProviderPresetSelector
            selectedPresetId={selectedPresetId}
            groupedPresets={groupedPresets}
            categoryKeys={categoryKeys}
            presetCategoryLabels={presetCategoryLabels}
            onPresetChange={handlePresetChange}
            category={category}
          />
        )}

        {/* 基础字段 */}
        <BasicFormFields 
          form={form} 
          onModelSync={handleModelSync}
          appId={appId}
        />

        {/* Claude 专属字段 */}
        {appId === "claude" && (
          <ClaudeFormFields
            providerId={providerId}
            shouldShowApiKey={shouldShowApiKey(
              form.watch("settingsConfig"),
              isEditMode,
            )}
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
            category={category}
            shouldShowApiKeyLink={shouldShowClaudeApiKeyLink}
            websiteUrl={claudeWebsiteUrl}
            isPartner={isClaudePartner}
            partnerPromotionKey={claudePartnerPromotionKey}
            templateValueEntries={templateValueEntries}
            templateValues={templateValues}
            templatePresetName={templatePreset?.name || ""}
            onTemplateValueChange={handleTemplateValueChange}
            shouldShowSpeedTest={shouldShowSpeedTest}
            baseUrl={baseUrl}
            onBaseUrlChange={handleClaudeBaseUrlChange}
            isEndpointModalOpen={isEndpointModalOpen}
            onEndpointModalToggle={setIsEndpointModalOpen}
            onCustomEndpointsChange={
              isEditMode ? undefined : setDraftCustomEndpoints
            }
            shouldShowModelSelector={category !== "official"}
            claudeModel={claudeModel}
            defaultHaikuModel={defaultHaikuModel}
            defaultSonnetModel={defaultSonnetModel}
            defaultOpusModel={defaultOpusModel}
            onModelChange={handleModelChange}
            speedTestEndpoints={speedTestEndpoints}
          />
        )}

        {/* Codex 专属字段 */}
        {appId === "codex" && (
          <CodexFormFields
            providerId={providerId}
            codexApiKey={codexApiKey}
            onApiKeyChange={handleCodexApiKeyChange}
            category={category}
            shouldShowApiKeyLink={shouldShowCodexApiKeyLink}
            websiteUrl={codexWebsiteUrl}
            isPartner={isCodexPartner}
            partnerPromotionKey={codexPartnerPromotionKey}
            shouldShowSpeedTest={shouldShowSpeedTest}
            codexBaseUrl={codexBaseUrl}
            onBaseUrlChange={handleCodexBaseUrlChange}
            isEndpointModalOpen={isCodexEndpointModalOpen}
            onEndpointModalToggle={setIsCodexEndpointModalOpen}
            onCustomEndpointsChange={
              isEditMode ? undefined : setDraftCustomEndpoints
            }
            shouldShowModelField={category !== "official"}
            modelName={codexModelName}
            onModelNameChange={handleCodexModelNameChange}
            speedTestEndpoints={speedTestEndpoints}
          />
        )}

        {/* Grok 专属字段 */}
        {appId === "grok" && (
          <GrokFormFields
            providerId={providerId}
            shouldShowApiKey={shouldShowApiKey(
              form.watch("settingsConfig"),
              isEditMode,
            )}
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
            category={category}
            shouldShowApiKeyLink={shouldShowGrokApiKeyLink}
            websiteUrl={grokWebsiteUrl}
            isPartner={isGrokPartner}
            partnerPromotionKey={grokPartnerPromotionKey}
            shouldShowSpeedTest={shouldShowSpeedTest}
            baseUrl={baseUrl}
            onBaseUrlChange={handleGrokBaseUrlChange}
            isEndpointModalOpen={isEndpointModalOpen}
            onEndpointModalToggle={setIsEndpointModalOpen}
            onCustomEndpointsChange={
              isEditMode
                ? undefined
                : (endpoints) => setDraftCustomEndpoints(endpoints)
            }
            shouldShowModelField={true}
            model={(() => {
              try {
                const config = JSON.parse(form.watch("settingsConfig") || "{}");
                return (config.defaultModel ?? "").toString();
              } catch {
                return "";
              }
            })()}
            onModelChange={(value) => {
              try {
                const config = JSON.parse(form.watch("settingsConfig") || "{}");
                const v = value.trim();
                if (!v) {
                  // 空值 -> 删除字段
                  if (
                    Object.prototype.hasOwnProperty.call(config, "defaultModel")
                  ) {
                    delete config.defaultModel;
                  }
                } else {
                  config.defaultModel = v;
                }
                form.setValue(
                  "settingsConfig",
                  JSON.stringify(config, null, 2),
                );
              } catch {
                // ignore
              }
            }}
            models={(() => {
              try {
                const config = JSON.parse(form.watch("settingsConfig") || "{}");
                return Array.isArray(config.models) ? config.models : [];
              } catch {
                return [] as string[];
              }
            })()}
            onAddModel={(value) => {
              try {
                const config = JSON.parse(form.watch("settingsConfig") || "{}");
                const models: string[] = Array.isArray(config.models)
                  ? config.models
                  : [];
                const v = value.trim();
                if (!v) return;
                if (!models.includes(v)) {
                  models.push(v);
                }
                config.models = models;
                form.setValue(
                  "settingsConfig",
                  JSON.stringify(config, null, 2),
                );
              } catch {
                // ignore
              }
            }}
            onRemoveModel={(value) => {
              try {
                const config = JSON.parse(form.watch("settingsConfig") || "{}");
                const models: string[] = Array.isArray(config.models)
                  ? config.models
                  : [];
                const v = value.trim();
                const next = models.filter((m) => m !== v);
                config.models = next;
                if ((config.defaultModel ?? "").toString().trim() === v) {
                  // 如果删除的是当前默认模型，则删除 defaultModel 字段，回退为“使用默认”
                  delete config.defaultModel;
                }
                form.setValue(
                  "settingsConfig",
                  JSON.stringify(config, null, 2),
                );
              } catch {
                // ignore
              }
            }}
            speedTestEndpoints={speedTestEndpoints}
          />
        )}

        {/* Qwen 专属字段 */}
        {appId === "qwen" && (
          <QwenFormFields
            providerId={providerId}
            shouldShowApiKey={shouldShowApiKey(
              form.watch("settingsConfig"),
              isEditMode,
            )}
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
            category={category}
            shouldShowApiKeyLink={shouldShowQwenApiKeyLink}
            websiteUrl={qwenWebsiteUrl}
            isPartner={isQwenPartner}
            partnerPromotionKey={qwenPartnerPromotionKey}
            shouldShowSpeedTest={shouldShowSpeedTest}
            baseUrl={baseUrl}
            onBaseUrlChange={handleQwenBaseUrlChange}
            isEndpointModalOpen={isEndpointModalOpen}
            onEndpointModalToggle={setIsEndpointModalOpen}
            onCustomEndpointsChange={
              isEditMode
                ? undefined
                : (endpoints) => setDraftCustomEndpoints(endpoints)
            }
            shouldShowModelField={true}
            model={(() => {
              try {
                const config = JSON.parse(form.watch("settingsConfig") || "{}");
                // 新格式: model.name
                return config.model?.name || "";
              } catch {
                return "";
              }
            })()}
            onModelChange={(value) => {
              const config = JSON.parse(form.watch("settingsConfig") || "{}");
              // 新格式: model.name
              if (!config.model) config.model = {};
              config.model.name = value.trim();
              form.setValue("settingsConfig", JSON.stringify(config, null, 2));
            }}
            speedTestEndpoints={speedTestEndpoints}
          />
        )}

        {/* Gemini 专属字段 */}
        {appId === "gemini" && (
          <GeminiFormFields
            providerId={providerId}
            shouldShowApiKey={true}
            apiKey={geminiApiKey}
            onApiKeyChange={handleGeminiApiKeyChange}
            category={category}
            shouldShowApiKeyLink={shouldShowGeminiApiKeyLink}
            websiteUrl={geminiWebsiteUrl}
            isPartner={isGeminiPartner}
            partnerPromotionKey={geminiPartnerPromotionKey}
            shouldShowSpeedTest={shouldShowSpeedTest}
            baseUrl={geminiBaseUrl}
            onBaseUrlChange={handleGeminiBaseUrlChange}
            isEndpointModalOpen={isEndpointModalOpen}
            onEndpointModalToggle={setIsEndpointModalOpen}
            onCustomEndpointsChange={setDraftCustomEndpoints}
            shouldShowModelField={true}
            model={geminiModel}
            onModelChange={handleGeminiModelChange}
            maxOutputTokens={geminiMaxOutputTokens}
            onMaxOutputTokensChange={handleGeminiMaxOutputTokensChange}
            proxyHost={geminiProxyHost}
            proxyPort={geminiProxyPort}
            onProxyHostChange={handleGeminiProxyHostChange}
            onProxyPortChange={handleGeminiProxyPortChange}
            tlsRejectUnauthorized={geminiTlsRejectUnauthorized}
            onTlsRejectUnauthorizedChange={
              handleGeminiTlsRejectUnauthorizedChange
            }
            speedTestEndpoints={speedTestEndpoints}
            isEditMode={isEditMode}
            showProxyEnvToggle={isGoogleOfficialGemini}
            proxyEnvEnabled={geminiProxyEnvEnabled}
            onProxyEnvToggle={handleGeminiProxyEnvToggle}
            proxyEnvLoading={geminiProxyEnvLoading}
          />
        )}

        {/* 配置编辑器：Codex、Claude、Gemini、Qwen 分别使用不同的编辑器 */}
        {appId === "codex" ? (
          <>
            <CodexConfigEditor
              authValue={codexAuth}
              configValue={codexConfig}
              onAuthChange={setCodexAuth}
              onConfigChange={handleCodexConfigChange}
              useCommonConfig={useCodexCommonConfigFlag}
              onCommonConfigToggle={handleCodexCommonConfigToggle}
              commonConfigSnippet={codexCommonConfigSnippet}
              onCommonConfigSnippetChange={handleCodexCommonConfigSnippetChange}
              commonConfigError={codexCommonConfigError}
              authError={codexAuthError}
              configError={codexConfigError}
            />
            {/* 配置验证错误显示 */}
            <FormField
              control={form.control}
              name="settingsConfig"
              render={() => (
                <FormItem className="space-y-0">
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : appId === "gemini" ? (
          <>
            <GeminiConfigEditor
              envValue={geminiEnv}
              configValue={geminiConfig}
              onEnvChange={handleGeminiEnvChange}
              onConfigChange={handleGeminiConfigChange}
              useCommonConfig={useGeminiCommonConfigFlag}
              onCommonConfigToggle={handleGeminiCommonConfigToggle}
              commonConfigSnippet={geminiCommonConfigSnippet}
              onCommonConfigSnippetChange={
                handleGeminiCommonConfigSnippetChange
              }
              commonConfigError={geminiCommonConfigError}
              envError={envError}
              configError={geminiConfigError}
            />
            {/* 配置验证错误显示 */}
            <FormField
              control={form.control}
              name="settingsConfig"
              render={() => (
                <FormItem className="space-y-0">
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : appId === "qwen" ? (
          <>
            <CommonConfigEditor
              value={form.watch("settingsConfig")}
              onChange={(value) => form.setValue("settingsConfig", value)}
              useCommonConfig={useCommonConfig}
              onCommonConfigToggle={handleCommonConfigToggle}
              commonConfigSnippet={commonConfigSnippet}
              onCommonConfigSnippetChange={handleCommonConfigSnippetChange}
              commonConfigError={commonConfigError}
              onEditClick={() => setIsCommonConfigModalOpen(true)}
              isModalOpen={isCommonConfigModalOpen}
              onModalClose={() => setIsCommonConfigModalOpen(false)}
            />
            {/* 配置验证错误显示 */}
            <FormField
              control={form.control}
              name="settingsConfig"
              render={() => (
                <FormItem className="space-y-0">
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            <CommonConfigEditor
              value={form.watch("settingsConfig")}
              onChange={(value) => form.setValue("settingsConfig", value)}
              useCommonConfig={useCommonConfig}
              onCommonConfigToggle={handleCommonConfigToggle}
              commonConfigSnippet={commonConfigSnippet}
              onCommonConfigSnippetChange={handleCommonConfigSnippetChange}
              commonConfigError={commonConfigError}
              onEditClick={() => setIsCommonConfigModalOpen(true)}
              isModalOpen={isCommonConfigModalOpen}
              onModalClose={() => setIsCommonConfigModalOpen(false)}
            />
            {/* 配置验证错误显示 */}
            <FormField
              control={form.control}
              name="settingsConfig"
              render={() => (
                <FormItem className="space-y-0">
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {showButtons && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </div>
        )}
      </form>
    </Form>
  );
}

export type ProviderFormValues = ProviderFormData & {
  presetId?: string;
  presetCategory?: ProviderCategory;
  isPartner?: boolean;
  meta?: ProviderMeta;
};
