import { useState, useCallback, useEffect, useRef } from "react";

interface UseGeminiConfigStateProps {
  initialData?: {
    settingsConfig?: Record<string, unknown>;
  };
}

/**
 * 管理 Gemini 配置状态
 * Gemini 配置包含两部分：env (环境变量) 和 config (扩展配置 JSON)
 */
export function useGeminiConfigState({
  initialData,
}: UseGeminiConfigStateProps) {
  const [geminiEnv, setGeminiEnvState] = useState("");
  const [geminiConfig, setGeminiConfigState] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiBaseUrl, setGeminiBaseUrl] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [geminiMaxOutputTokens, setGeminiMaxOutputTokens] = useState("");
  const [geminiProxyHost, setGeminiProxyHost] = useState("");
  const [geminiProxyPort, setGeminiProxyPort] = useState("");
  const [geminiTlsRejectUnauthorized, setGeminiTlsRejectUnauthorized] =
    useState(false);
  const [envError, setEnvError] = useState("");
  const [configError, setConfigError] = useState("");
  // 标记用户是否手动修改过模型，防止 env 同步覆盖正在输入的内容
  const manualModelTouchedRef = useRef(false);

  // 将 JSON env 对象转换为 .env 格式字符串
  // 保留所有环境变量，已知 key 优先显示
  const envObjToString = useCallback(
    (envObj: Record<string, unknown>): string => {
      const priorityKeys = [
        "GEMINI_API_KEY",
        "NODE_TLS_REJECT_UNAUTHORIZED",
        "https_proxy",
        "http_proxy",
        "GOOGLE_GEMINI_BASE_URL",
        "GEMINI_MODEL",
      ];
      const lines: string[] = [];
      const addedKeys = new Set<string>();

      // 先添加已知 key（按顺序）
      for (const key of priorityKeys) {
        if (typeof envObj[key] === "string" && envObj[key]) {
          lines.push(`${key}=${envObj[key]}`);
          addedKeys.add(key);
        }
      }

      // 再添加其他自定义 key（保留用户添加的环境变量）
      for (const [key, value] of Object.entries(envObj)) {
        if (!addedKeys.has(key) && typeof value === "string") {
          lines.push(`${key}=${value}`);
        }
      }

      return lines.join("\n");
    },
    [],
  );

  // 将 .env 格式字符串转换为 JSON env 对象
  const envStringToObj = useCallback(
    (envString: string): Record<string, string> => {
      const env: Record<string, string> = {};
      const lines = envString.split("\n");
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          const value = trimmed.substring(equalIndex + 1).trim();
          env[key] = value;
        }
      });
      return env;
    },
    [],
  );

  // 初始化 Gemini 配置（编辑模式）
  useEffect(() => {
    if (!initialData) return;

    const config = initialData.settingsConfig;
    if (typeof config === "object" && config !== null) {
      // 设置 env
      const env = (config as any).env || {};
      setGeminiEnvState(envObjToString(env));

      // 设置 config
      const configObj = (config as any).config || {};
      setGeminiConfigState(JSON.stringify(configObj, null, 2));

      // 提取 API Key、Base URL 和 Model
      if (typeof env.GEMINI_API_KEY === "string") {
        setGeminiApiKey(env.GEMINI_API_KEY);
      }
      if (typeof env.GOOGLE_GEMINI_BASE_URL === "string") {
        setGeminiBaseUrl(env.GOOGLE_GEMINI_BASE_URL);
      }
      if (typeof env.GEMINI_MODEL === "string") {
        setGeminiModel(env.GEMINI_MODEL);
      }

      // 从 config 中提取 model 和 maxOutputTokens
      if (typeof configObj.model === "string") {
        setGeminiModel(configObj.model);
      }
      if (typeof configObj.maxOutputTokens === "number") {
        setGeminiMaxOutputTokens(String(configObj.maxOutputTokens));
      }

      // 从 env 中提取代理设置
      const httpsProxy = env.https_proxy || env.HTTPS_PROXY || "";
      if (typeof httpsProxy === "string" && httpsProxy) {
        const match = httpsProxy.match(/^https?:\/\/([^:]+):(\d+)/);
        if (match) {
          setGeminiProxyHost(match[1]);
          setGeminiProxyPort(match[2]);
        }
      }

      // 从 env 中提取 TLS 验证设置
      const tlsValue = env.NODE_TLS_REJECT_UNAUTHORIZED;
      if (typeof tlsValue === "string") {
        setGeminiTlsRejectUnauthorized(tlsValue === "1");
      }
    }
  }, [initialData, envObjToString]);

  // 从 geminiEnv 中提取并同步 API Key 和 Base URL（不包括 Model）
  // 模型字段仅在初始化和预设切换时加载，之后不自动同步以避免覆盖用户输入
  useEffect(() => {
    const envObj = envStringToObj(geminiEnv);
    const extractedKey = envObj.GEMINI_API_KEY || "";
    const extractedBaseUrl = envObj.GOOGLE_GEMINI_BASE_URL || "";

    if (extractedKey !== geminiApiKey) {
      setGeminiApiKey(extractedKey);
    }
    if (extractedBaseUrl !== geminiBaseUrl) {
      setGeminiBaseUrl(extractedBaseUrl);
    }
  }, [geminiEnv, envStringToObj, geminiApiKey, geminiBaseUrl]);

  // 验证 Gemini Config JSON
  const validateGeminiConfig = useCallback((value: string): string => {
    if (!value.trim()) return ""; // 空值允许
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return "";
      }
      return "Config must be a JSON object";
    } catch {
      return "Invalid JSON format";
    }
  }, []);

  // 设置 env
  const setGeminiEnv = useCallback((value: string) => {
    setGeminiEnvState(value);
    // .env 格式较宽松，不做严格校验
    setEnvError("");
  }, []);

  // 设置 config (支持函数更新)
  const setGeminiConfig = useCallback(
    (value: string | ((prev: string) => string)) => {
      const newValue =
        typeof value === "function" ? value(geminiConfig) : value;
      setGeminiConfigState(newValue);
      setConfigError(validateGeminiConfig(newValue));
    },
    [geminiConfig, validateGeminiConfig],
  );

  // 处理 Gemini API Key 输入并写回 env
  const handleGeminiApiKeyChange = useCallback(
    (key: string) => {
      const trimmed = key.trim();
      setGeminiApiKey(trimmed);

      const envObj = envStringToObj(geminiEnv);
      envObj.GEMINI_API_KEY = trimmed;
      const newEnv = envObjToString(envObj);
      setGeminiEnv(newEnv);
    },
    [geminiEnv, envStringToObj, envObjToString, setGeminiEnv],
  );

  // 处理 Gemini Base URL 变化
  const handleGeminiBaseUrlChange = useCallback(
    (url: string) => {
      const sanitized = url.trim().replace(/\/+$/, "");
      setGeminiBaseUrl(sanitized);

      const envObj = envStringToObj(geminiEnv);
      envObj.GOOGLE_GEMINI_BASE_URL = sanitized;
      const newEnv = envObjToString(envObj);
      setGeminiEnv(newEnv);
    },
    [geminiEnv, envStringToObj, envObjToString, setGeminiEnv],
  );

  // 处理 Gemini Model 变化
  const handleGeminiModelChange = useCallback(
    (model: string) => {
      const trimmed = model.trim();
      setGeminiModel(trimmed);

      // 标记为用户已手动修改模型，防止后续 env 同步覆盖
      // 但如果用户完全清空模型，则清除标志，允许后续 env 变化填充
      try {
        manualModelTouchedRef.current = trimmed.length > 0;
      } catch {
        /* ignore */
      }

      // 同步到 config
      try {
        const configObj = geminiConfig ? JSON.parse(geminiConfig) : {};
        if (trimmed === "") {
          // 如果清空模型，从配置中移除该字段
          if (Object.prototype.hasOwnProperty.call(configObj, "model")) {
            delete configObj.model;
          }
        } else {
          configObj.model = trimmed;
        }
        setGeminiConfig(JSON.stringify(configObj, null, 2));
      } catch {
        // 如果 config 解析失败，忽略
      }
    },
    [geminiConfig, setGeminiConfig],
  );

  // 处理 Gemini MaxOutputTokens 变化
  const handleGeminiMaxOutputTokensChange = useCallback(
    (tokens: string) => {
      const trimmed = tokens.trim();
      setGeminiMaxOutputTokens(trimmed);

      // 同步到 config
      try {
        const configObj = geminiConfig ? JSON.parse(geminiConfig) : {};
        
        // 如果输入为空，移除 maxOutputTokens 字段
        if (trimmed === "") {
          if (Object.prototype.hasOwnProperty.call(configObj, "maxOutputTokens")) {
            delete configObj.maxOutputTokens;
          }
        } else {
          // 否则尝试解析为数字并验证
          const tokensNum = parseInt(trimmed, 10);
          if (!isNaN(tokensNum) && tokensNum > 0) {
            configObj.maxOutputTokens = tokensNum;
          } else {
            // 如果解析失败或不是正数，移除该字段
            if (Object.prototype.hasOwnProperty.call(configObj, "maxOutputTokens")) {
              delete configObj.maxOutputTokens;
            }
            return; // 不更新配置，因为输入无效
          }
        }
        
        // 只有在有实际变化时才更新配置
        const newConfig = JSON.stringify(configObj, null, 2);
        if (newConfig !== geminiConfig) {
          setGeminiConfig(newConfig);
        }
      } catch {
        // 如果 config 解析失败，忽略
      }
    },
    [geminiConfig, setGeminiConfig],
  );

  // 处理 env 变化
  const handleGeminiEnvChange = useCallback(
    (value: string) => {
      setGeminiEnv(value);
    },
    [setGeminiEnv],
  );

  // 处理 config 变化
  const handleGeminiConfigChange = useCallback(
    (value: string) => {
      setGeminiConfig(value);
    },
    [setGeminiConfig],
  );

  // 处理代理地址变化
  const handleGeminiProxyHostChange = useCallback(
    (host: string) => {
      const trimmed = host.trim();
      setGeminiProxyHost(trimmed);

      const envObj = envStringToObj(geminiEnv);
      const port = geminiProxyPort || "7890";
      const proxyUrl = trimmed ? `http://${trimmed}:${port}` : "";
      
      // 更新环境变量
      if (trimmed) {
        envObj.https_proxy = proxyUrl;
        envObj.http_proxy = proxyUrl;
      } else {
        // 如果清空主机，也清空端口和代理设置
        delete envObj.https_proxy;
        delete envObj.http_proxy;
        setGeminiProxyPort("");
      }
      
      const newEnv = envObjToString(envObj);
      setGeminiEnv(newEnv);
    },
    [geminiEnv, geminiProxyPort, envStringToObj, envObjToString, setGeminiEnv],
  );

  // 处理代理端口变化
  const handleGeminiProxyPortChange = useCallback(
    (port: string) => {
      const trimmed = port.trim();
      setGeminiProxyPort(trimmed);

      const envObj = envStringToObj(geminiEnv);
      const host = geminiProxyHost || "127.0.0.1";
      const proxyUrl = trimmed ? `http://${host}:${trimmed}` : "";
      
      // 更新环境变量
      if (trimmed) {
        envObj.https_proxy = proxyUrl;
        envObj.http_proxy = proxyUrl;
      } else {
        // 如果清空端口，也清空代理设置
        delete envObj.https_proxy;
        delete envObj.http_proxy;
      }
      
      const newEnv = envObjToString(envObj);
      setGeminiEnv(newEnv);
    },
    [geminiEnv, geminiProxyHost, envStringToObj, envObjToString, setGeminiEnv],
  );

  // 处理 TLS 验证变化
  const handleGeminiTlsRejectUnauthorizedChange = useCallback(
    (enabled: boolean) => {
      setGeminiTlsRejectUnauthorized(enabled);

      const envObj = envStringToObj(geminiEnv);
      if (enabled) {
        envObj.NODE_TLS_REJECT_UNAUTHORIZED = "1";
      } else {
        delete envObj.NODE_TLS_REJECT_UNAUTHORIZED;
      }
      const newEnv = envObjToString(envObj);
      setGeminiEnv(newEnv);
    },
    [geminiEnv, envStringToObj, envObjToString, setGeminiEnv],
  );

  // 重置配置（用于预设切换）
  const resetGeminiConfig = useCallback(
    (env: Record<string, unknown>, config: Record<string, unknown>) => {
      const envString = envObjToString(env);
      const configString = JSON.stringify(config, null, 2);

      setGeminiEnv(envString);
      setGeminiConfig(configString);

      // 提取 API Key、Base URL 和 Model
      if (typeof env.GEMINI_API_KEY === "string") {
        setGeminiApiKey(env.GEMINI_API_KEY);
      } else {
        setGeminiApiKey("");
      }

      if (typeof env.GOOGLE_GEMINI_BASE_URL === "string") {
        setGeminiBaseUrl(env.GOOGLE_GEMINI_BASE_URL);
      } else {
        setGeminiBaseUrl("");
      }

      // 检查是否为官方供应商
      const isOfficial = env.GOOGLE_GEMINI_BASE_URL === 'https://generativelanguage.googleapis.com/v1beta';
      
      // 处理模型名称 - 官方供应商默认为空
      let modelToSet = "";
      if (!isOfficial) {
        if (typeof config.model === "string") {
          modelToSet = config.model;
        } else if (typeof env.GEMINI_MODEL === "string") {
          modelToSet = env.GEMINI_MODEL;
        }
      }
      setGeminiModel(modelToSet);
      
      // 处理最大输出令牌数 - 官方供应商默认为空
      if (isOfficial) {
        setGeminiMaxOutputTokens("");
      } else if (typeof config.maxOutputTokens === 'number') {
        setGeminiMaxOutputTokens(String(config.maxOutputTokens));
      } else {
        setGeminiMaxOutputTokens("");
      }

      // 处理代理设置
      const httpsProxy = env.https_proxy || env.HTTPS_PROXY || "";
      if (typeof httpsProxy === "string" && httpsProxy) {
        const match = httpsProxy.match(/^https?:\/\/([^:]+)(?::(\d+))?/);
        if (match) {
          setGeminiProxyHost(match[1] || "");
          setGeminiProxyPort(match[2] || "");
        }
      } else {
        setGeminiProxyHost("");
        setGeminiProxyPort("");
      }

      // 处理 TLS 验证设置
      const tlsValue = env.NODE_TLS_REJECT_UNAUTHORIZED;
      if (typeof tlsValue === "string") {
        setGeminiTlsRejectUnauthorized(tlsValue === "1");
      } else {
        setGeminiTlsRejectUnauthorized(true);
      }

      // 预设切换视为非用户手动修改，清除手动标志
      try {
        manualModelTouchedRef.current = false;
      } catch {
        /* ignore */
      }
    },
    [envObjToString, setGeminiEnv, setGeminiConfig],
  );

  return {
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
    configError,
    setGeminiEnv,
    setGeminiConfig,
    handleGeminiApiKeyChange,
    handleGeminiBaseUrlChange,
    handleGeminiModelChange,
    handleGeminiMaxOutputTokensChange,
    handleGeminiProxyHostChange,
    handleGeminiProxyPortChange,
    handleGeminiTlsRejectUnauthorizedChange,
    handleGeminiEnvChange,
    handleGeminiConfigChange,
    resetGeminiConfig,
    envStringToObj,
    envObjToString,
  };
}
