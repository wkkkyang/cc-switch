import { invoke } from "@tauri-apps/api/core";

export interface GeminiEnvProxyStatus {
  enabled: boolean;
  content: string;
}

export const geminiApi = {
  async getProxyStatus(): Promise<GeminiEnvProxyStatus> {
    return (await invoke("get_gemini_proxy_status")) as GeminiEnvProxyStatus;
  },

  async setProxyEnabled(
    enabled: boolean,
    host?: string,
    port?: string,
  ): Promise<GeminiEnvProxyStatus> {
    return (await invoke("set_gemini_proxy_enabled", {
      enabled,
      host,
      port,
    })) as GeminiEnvProxyStatus;
  },
};
