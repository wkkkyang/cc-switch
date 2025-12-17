import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCallback } from "react";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import EndpointSpeedTest from "./EndpointSpeedTest";
import { ApiKeySection, EndpointField } from "./shared";
import type { ProviderCategory } from "@/types";
import type { TemplateValueConfig } from "@/config/claudeProviderPresets";

interface EndpointCandidate {
  url: string;
}

interface ClaudeFormFieldsProps {
  providerId?: string;
  // API Key
  shouldShowApiKey: boolean;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  category?: ProviderCategory;
  shouldShowApiKeyLink: boolean;
  websiteUrl: string;
  isPartner?: boolean;
  partnerPromotionKey?: string;

  // Template Values
  templateValueEntries: Array<[string, TemplateValueConfig]>;
  templateValues: Record<string, TemplateValueConfig>;
  templatePresetName: string;
  onTemplateValueChange: (key: string, value: string) => void;

  // Base URL
  shouldShowSpeedTest: boolean;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  isEndpointModalOpen: boolean;
  onEndpointModalToggle: (open: boolean) => void;
  onCustomEndpointsChange?: (endpoints: string[]) => void;

  // Model Selector
  shouldShowModelSelector: boolean;
  claudeModel: string;
  defaultHaikuModel: string;
  defaultSonnetModel: string;
  defaultOpusModel: string;
  onModelChange: (
    field:
      | "ANTHROPIC_MODEL"
      | "ANTHROPIC_DEFAULT_HAIKU_MODEL"
      | "ANTHROPIC_DEFAULT_SONNET_MODEL"
      | "ANTHROPIC_DEFAULT_OPUS_MODEL",
    value: string,
  ) => void;
  settingsConfig: string; // 新增：用于批量同步
  onSettingsConfigChange: (config: string) => void; // 新增：用于批量同步

  // Speed Test Endpoints
  speedTestEndpoints: EndpointCandidate[];
}

export function ClaudeFormFields({
  providerId,
  shouldShowApiKey,
  apiKey,
  onApiKeyChange,
  category,
  shouldShowApiKeyLink,
  websiteUrl,
  isPartner,
  partnerPromotionKey,
  templateValueEntries,
  templateValues,
  templatePresetName,
  onTemplateValueChange,
  shouldShowSpeedTest,
  baseUrl,
  onBaseUrlChange,
  isEndpointModalOpen,
  onEndpointModalToggle,
  onCustomEndpointsChange,
  shouldShowModelSelector,
  claudeModel,
  defaultHaikuModel,
  defaultSonnetModel,
  defaultOpusModel,
  onModelChange,
  settingsConfig,
  onSettingsConfigChange,
  speedTestEndpoints,
}: ClaudeFormFieldsProps) {
  const { t } = useTranslation();

  // 批量同步函数 - 直接操作配置，避免多次状态更新
  const handleBatchSync = useCallback(() => {
    if (!claudeModel || claudeModel.trim() === "") {
      toast.warning("主模型为空，无法同步");
      return;
    }

    try {
      const config = settingsConfig ? JSON.parse(settingsConfig) : { env: {} };
      if (!config.env) config.env = {};

      // 一次性更新所有默认模型
      config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = claudeModel;
      config.env.ANTHROPIC_DEFAULT_SONNET_MODEL = claudeModel;
      config.env.ANTHROPIC_DEFAULT_OPUS_MODEL = claudeModel;

      onSettingsConfigChange(JSON.stringify(config, null, 2));
      toast.success(`已将 "${claudeModel}" 同步到所有默认模型`);
    } catch (error) {
      toast.error("同步失败，请重试");
    }
  }, [claudeModel, settingsConfig, onSettingsConfigChange]);

  // 批量清除函数
  const handleBatchClear = useCallback(() => {
    try {
      const config = settingsConfig ? JSON.parse(settingsConfig) : { env: {} };
      if (!config.env) config.env = {};

      // 一次性清空所有默认模型
      delete config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
      delete config.env.ANTHROPIC_DEFAULT_SONNET_MODEL;
      delete config.env.ANTHROPIC_DEFAULT_OPUS_MODEL;

      onSettingsConfigChange(JSON.stringify(config, null, 2));
      toast.success("已清空所有默认模型");
    } catch (error) {
      toast.error("清除失败，请重试");
    }
  }, [settingsConfig, onSettingsConfigChange]);

  return (
    <>
      {/* API Key 输入框 */}
      {shouldShowApiKey && (
        <ApiKeySection
          value={apiKey}
          onChange={onApiKeyChange}
          category={category}
          shouldShowLink={shouldShowApiKeyLink}
          websiteUrl={websiteUrl}
          isPartner={isPartner}
          partnerPromotionKey={partnerPromotionKey}
        />
      )}

      {/* 模板变量输入 */}
      {templateValueEntries.length > 0 && (
        <div className="space-y-3">
          <FormLabel>
            {t("providerForm.parameterConfig", {
              name: templatePresetName,
              defaultValue: `${templatePresetName} 参数配置`,
            })}
          </FormLabel>
          <div className="space-y-4">
            {templateValueEntries.map(([key, config]) => (
              <div key={key} className="space-y-2">
                <FormLabel htmlFor={`template-${key}`}>
                  {config.label}
                </FormLabel>
                <Input
                  id={`template-${key}`}
                  type="text"
                  required
                  value={
                    templateValues[key]?.editorValue ??
                    config.editorValue ??
                    config.defaultValue ??
                    ""
                  }
                  onChange={(e) => onTemplateValueChange(key, e.target.value)}
                  placeholder={config.placeholder || config.label}
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Base URL 输入框 */}
      {shouldShowSpeedTest && (
        <EndpointField
          id="baseUrl"
          label={t("providerForm.apiEndpoint")}
          value={baseUrl}
          onChange={onBaseUrlChange}
          placeholder={t("providerForm.apiEndpointPlaceholder")}
          hint={t("providerForm.apiHint")}
          onManageClick={() => onEndpointModalToggle(true)}
        />
      )}

      {/* 端点测速弹窗 */}
      {shouldShowSpeedTest && isEndpointModalOpen && (
        <EndpointSpeedTest
          appId="claude"
          providerId={providerId}
          value={baseUrl}
          onChange={onBaseUrlChange}
          initialEndpoints={speedTestEndpoints}
          visible={isEndpointModalOpen}
          onClose={() => onEndpointModalToggle(false)}
          onCustomEndpointsChange={onCustomEndpointsChange}
        />
      )}

      {/* 模型选择器 */}
      {shouldShowModelSelector && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 主模型 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FormLabel htmlFor="claudeModel">
                  {t("providerForm.anthropicModel", { defaultValue: "主模型" })}
                </FormLabel>
                {/* 同步按钮 - 同步到三个默认模型 */}
                <button
                  type="button"
                  className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors flex items-center gap-1 mr-2"
                  onClick={handleBatchSync}
                  title="同步主模型到 Haiku/Sonnet/Opus 默认模型"
                >
                  ⚡ 同步
                </button>
                {/* 清除按钮 - 清空所有默认模型 */}
                <button
                  type="button"
                  className="px-2 py-0.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors flex items-center gap-1"
                  onClick={handleBatchClear}
                  title="清空 Haiku/Sonnet/Opus 默认模型"
                >
                  🗑️ 清除
                </button>
              </div>
              <Input
                id="claudeModel"
                type="text"
                value={claudeModel}
                onChange={(e) =>
                  onModelChange("ANTHROPIC_MODEL", e.target.value)
                }
                placeholder={t("providerForm.modelPlaceholder", {
                  defaultValue: "",
                })}
                autoComplete="off"
              />
            </div>

            {/* 默认 Haiku */}
            <div className="space-y-2">
              <FormLabel htmlFor="claudeDefaultHaikuModel">
                {t("providerForm.anthropicDefaultHaikuModel", {
                  defaultValue: "Haiku 默认模型",
                })}
              </FormLabel>
              <Input
                id="claudeDefaultHaikuModel"
                type="text"
                value={defaultHaikuModel}
                onChange={(e) =>
                  onModelChange("ANTHROPIC_DEFAULT_HAIKU_MODEL", e.target.value)
                }
                placeholder={t("providerForm.haikuModelPlaceholder", {
                  defaultValue: "",
                })}
                autoComplete="off"
              />
            </div>

            {/* 默认 Sonnet */}
            <div className="space-y-2">
              <FormLabel htmlFor="claudeDefaultSonnetModel">
                {t("providerForm.anthropicDefaultSonnetModel", {
                  defaultValue: "Sonnet 默认模型",
                })}
              </FormLabel>
              <Input
                id="claudeDefaultSonnetModel"
                type="text"
                value={defaultSonnetModel}
                onChange={(e) =>
                  onModelChange(
                    "ANTHROPIC_DEFAULT_SONNET_MODEL",
                    e.target.value,
                  )
                }
                placeholder={t("providerForm.modelPlaceholder", {
                  defaultValue: "",
                })}
                autoComplete="off"
              />
            </div>

            {/* 默认 Opus */}
            <div className="space-y-2">
              <FormLabel htmlFor="claudeDefaultOpusModel">
                {t("providerForm.anthropicDefaultOpusModel", {
                  defaultValue: "Opus 默认模型",
                })}
              </FormLabel>
              <Input
                id="claudeDefaultOpusModel"
                type="text"
                value={defaultOpusModel}
                onChange={(e) =>
                  onModelChange("ANTHROPIC_DEFAULT_OPUS_MODEL", e.target.value)
                }
                placeholder={t("providerForm.modelPlaceholder", {
                  defaultValue: "",
                })}
                autoComplete="off"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("providerForm.modelHelper", {
              defaultValue:
                "可选：指定默认使用的 Claude 模型，留空则使用系统默认。",
            })}
          </p>
        </div>
      )}
    </>
  );
}
