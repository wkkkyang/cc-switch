import { invoke } from "@tauri-apps/api/core";

export interface CheckUpdateResponse {
  has_update: boolean;
  current_version: string;
  new_version: string;
  new_exe_path?: string;
}

/**
 * 获取应用当前版本
 */
export async function getAppVersion(): Promise<string> {
  return invoke<string>("get_app_version");
}

/**
 * 检查是否有可用更新
 */
export async function checkUpdate(): Promise<CheckUpdateResponse> {
  return invoke<CheckUpdateResponse>("check_update");
}

/**
 * 执行更新
 */
export async function performUpdate(): Promise<string> {
  return invoke<string>("perform_update");
}

/**
 * 重启应用
 */
export async function restartApp(): Promise<void> {
  return invoke<void>("restart_app");
}
