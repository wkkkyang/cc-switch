import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import EndpointSpeedTest from "./EndpointSpeedTest";
import { ApiKeySection, EndpointField } from "./shared";
import type { ProviderCategory } from "@/types";

interface EndpointCandidate {
  url: string;
}

interface GrokFormFieldsProps {
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

  // Base URL
  shouldShowSpeedTest: boolean;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
  isEndpointModalOpen: boolean;
  onEndpointModalToggle: (open: boolean) => void;
  onCustomEndpointsChange?: (endpoints: string[]) => void;

  // Model
  shouldShowModelField: boolean;
  model: string;
  onModelChange: (value: string) => void;

  // Speed Test Endpoints
  speedTestEndpoints: EndpointCandidate[];
  // Models list management
  models: string[];
  onAddModel: (value: string) => void;
  onRemoveModel: (value: string) => void;
}

export function GrokFormFields({
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
  speedTestEndpoints,
  models,
  onAddModel,
  onRemoveModel,
}: GrokFormFieldsProps) {
  const { t } = useTranslation();
  const [newModel, setNewModel] = useState("");

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

      {/* Base URL 输入框 */}
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

      {/* Model 选择 */}
      {shouldShowModelField && (
        <div className="space-y-3">
          <div>
            <FormLabel htmlFor="grok-model">
              {t("provider.form.model", { defaultValue: "模型" })}
            </FormLabel>
            <Input
              id="grok-model"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              placeholder={t("provider.form.modelPlaceholder", {
                defaultValue: "例如：grok-code-fast-1",
              })}
              className="mt-2"
            />
          </div>

          {/* 模型列表管理 */}
          <div className="space-y-2">
            <FormLabel>{t("provider.form.models", { defaultValue: "模型列表" })}</FormLabel>
            <div className="flex items-center gap-2">
              <Input
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                placeholder={t("provider.form.modelPlaceholder", { defaultValue: "例如：grok-4-1" })}
                className="flex-1"
              />
              <button
                type="button"
                className="px-3 py-2 text-xs rounded-md border border-border/20 hover:bg-accent"
                onClick={() => {
                  const v = newModel.trim();
                  if (!v) return;
                  onAddModel(v);
                  setNewModel("");
                }}
              >
                {t("common.add")}
              </button>
            </div>
            {models && models.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {models.map((m) => (
                  <div
                    key={m}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-xs"
                  >
                    <span className="font-mono">{m}</span>
                    <button
                      type="button"
                      className="px-1.5 py-0.5 rounded border border-border/20 hover:bg-destructive/10"
                      onClick={() => onRemoveModel(m)}
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Endpoint Speed Test Modal */}
      {isEndpointModalOpen && (
        <EndpointSpeedTest
          appId="grok"
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
