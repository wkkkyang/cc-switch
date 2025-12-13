import { useTranslation } from "react-i18next";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import EndpointSpeedTest from "./EndpointSpeedTest";
import { ApiKeySection, EndpointField } from "./shared";
import type { ProviderCategory } from "@/types";

interface EndpointCandidate {
  url: string;
}

interface GeminiFormFieldsProps {
  providerId?: string;
  isEditMode?: boolean;
  // API Key
  shouldShowApiKey: boolean;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  category?: ProviderCategory;
  shouldShowApiKeyLink: boolean;
  websiteUrl: string;
  isPartner?: boolean;
  partnerPromotionKey?: string;

  // Base URL
  shouldShowSpeedTest: boolean;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  isEndpointModalOpen: boolean;
  onEndpointModalToggle: (open: boolean) => void;
  onCustomEndpointsChange: (endpoints: string[]) => void;

  // Model
  shouldShowModelField: boolean;
  model: string;
  onModelChange: (value: string) => void;

  // Max Output Tokens
  maxOutputTokens: string;
  onMaxOutputTokensChange: (value: string) => void;

  // Proxy settings (only for official)
  proxyHost: string;
  proxyPort: string;
  onProxyHostChange: (value: string) => void;
  onProxyPortChange: (value: string) => void;

  // TLS verification (only for official)
  tlsRejectUnauthorized: boolean;
  onTlsRejectUnauthorizedChange: (value: boolean) => void;

  // Proxy env toggle (only for Google Official)
  showProxyEnvToggle?: boolean;
  proxyEnvEnabled?: boolean;
  onProxyEnvToggle?: (enabled: boolean) => void;
  proxyEnvLoading?: boolean;

  // Speed Test Endpoints
  speedTestEndpoints: EndpointCandidate[];
}

export function GeminiFormFields({
  providerId,
  shouldShowApiKey,
  apiKey,
  onApiKeyChange,
  category,
  shouldShowApiKeyLink,
  websiteUrl,
  isPartner,
  partnerPromotionKey,
  shouldShowSpeedTest,
  baseUrl,
  onBaseUrlChange,
  isEndpointModalOpen,
  onEndpointModalToggle,
  onCustomEndpointsChange,
  shouldShowModelField,
  model,
  onModelChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
  proxyHost,
  proxyPort,
  onProxyHostChange,
  onProxyPortChange,
  tlsRejectUnauthorized,
  onTlsRejectUnauthorizedChange,
  speedTestEndpoints,
  showProxyEnvToggle,
  proxyEnvEnabled,
  onProxyEnvToggle,
  proxyEnvLoading,
}: GeminiFormFieldsProps) {
  const { t } = useTranslation();

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
            placeholder={{
              official: t("provider.form.gemini.apiKeyPlaceholder", {
                defaultValue: "输入 Gemini API Key，将自动填充到配置",
              }),
              thirdParty: t("provider.form.gemini.apiKeyPlaceholder", {
                defaultValue: "输入 Gemini API Key，将自动填充到配置",
              }),
            }}
            // Gemini: 允许为官方供应商自定义 API Key（在新增与编辑中都可）
            disabled={false}
          />
      )}

      {/* Base URL 输入框（统一使用与 Codex 相同的样式与交互） */}
      {shouldShowSpeedTest && (
        <EndpointField
          id="baseUrl"
          label={t("providerForm.apiEndpoint", { defaultValue: "API 端点" })}
          value={baseUrl}
          onChange={onBaseUrlChange}
          placeholder={t("providerForm.apiEndpointPlaceholder", {
            defaultValue: "https://your-api-endpoint.com/",
          })}
          onManageClick={() => onEndpointModalToggle(true)}
        />
      )}

      {/* 模型和最大输出令牌数（官方供应商）或仅模型（非官方供应商） */}
      {shouldShowModelField && (
        <div className="grid grid-cols-1 gap-4">
          {category === "official" ? (
            // 官方供应商：模型和最大输出令牌数并排
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel htmlFor="gemini-model">
                  {t("provider.form.gemini.model", { defaultValue: "模型" })}
                </FormLabel>
                <Input
                  id="gemini-model"
                  value={model || ''}
                  onChange={(e) => {
                    if (e.target.value !== model) {
                      onModelChange(e.target.value);
                    }
                  }}
                  placeholder="gemini-2.5-flash-lite"
                />
              </div>
              <div>
                <FormLabel htmlFor="gemini-max-tokens">
                  {t("provider.form.gemini.maxOutputTokens", {
                    defaultValue: "最大输出令牌数",
                  })}
                </FormLabel>
                <Input
                  id="gemini-max-tokens"
                  type="text"
                  value={maxOutputTokens}
                  onChange={(e) => onMaxOutputTokensChange(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          ) : (
            // 非官方供应商：仅显示模型输入
            <div>
              <FormLabel htmlFor="gemini-model">
                {t("provider.form.gemini.model", { defaultValue: "模型" })}
              </FormLabel>
              <Input
                id="gemini-model"
                value={model || ''}
                onChange={(e) => {
                  if (e.target.value !== model) {
                    onModelChange(e.target.value);
                  }
                }}
                placeholder="gemini-3-pro-preview"
              />
            </div>
          )}
        </div>
      )}

      {/* 代理设置（仅官方供应商） */}
      {category === "official" && (
        <div className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">
              {t("provider.form.gemini.proxySettings", {
                defaultValue: "代理设置",
              })}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel htmlFor="gemini-proxy-host">
                  {t("provider.form.gemini.proxyHost", {
                    defaultValue: "代理地址",
                  })}
                </FormLabel>
                <Input
                  id="gemini-proxy-host"
                  value={proxyHost}
                  onChange={(e) => onProxyHostChange(e.target.value)}
                  placeholder="127.0.0.1"
                />
              </div>
              <div>
                <FormLabel htmlFor="gemini-proxy-port">
                  {t("provider.form.gemini.proxyPort", {
                    defaultValue: "代理端口",
                  })}
                </FormLabel>
                <div className="flex gap-2 items-center">
                  <Input
                    id="gemini-proxy-port"
                    type="number"
                    value={proxyPort}
                    onChange={(e) => onProxyPortChange(e.target.value)}
                    placeholder="7890"
                    className="flex-1"
                  />
                  {/* TLS 验证开关 */}
                  <div className="flex items-center gap-2 ml-2">
                    <input
                      type="checkbox"
                      id="gemini-tls-verify"
                      checked={tlsRejectUnauthorized}
                      onChange={(e) => onTlsRejectUnauthorizedChange(e.target.checked)}
                      className="w-4 h-4 text-blue-500 bg-white dark:bg-gray-800 border-border-default rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
                    />
                    <FormLabel htmlFor="gemini-tls-verify" className="mb-0 whitespace-nowrap">
                      {t("provider.form.gemini.tlsVerify", {
                        defaultValue: "TLS 验证",
                      })}
                    </FormLabel>
                    {showProxyEnvToggle && (
                      <div className="flex items-center gap-1 ml-1">
                        <span className="px-1 text-sm select-none">
                          {t("provider.form.gemini.proxyEnvToggle", {
                            defaultValue: "代理开关",
                          })}
                        </span>
                        <Switch
                          id="gemini-proxy-toggle"
                          checked={!!proxyEnvEnabled}
                          disabled={proxyEnvLoading}
                          onCheckedChange={(checked) => {
                            if (onProxyEnvToggle) {
                              onProxyEnvToggle(!!checked);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 端点测速弹窗 */}
      {shouldShowSpeedTest && isEndpointModalOpen && (
        <EndpointSpeedTest
          appId="gemini"
          providerId={providerId}
          value={baseUrl}
          onChange={onBaseUrlChange}
          initialEndpoints={speedTestEndpoints}
          visible={isEndpointModalOpen}
          onClose={() => onEndpointModalToggle(false)}
          onCustomEndpointsChange={onCustomEndpointsChange}
        />
      )}
    </>
  );
}
