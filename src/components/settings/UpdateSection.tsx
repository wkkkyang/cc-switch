import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import * as updateApi from "@/lib/api/update";

export function UpdateSection() {
  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>("");

  // 初始化：获取当前版本
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await updateApi.getAppVersion();
        setCurrentVersion(version);
      } catch (err) {
        console.error("获取版本失败:", err);
      }
    };

    fetchVersion();
  }, []);

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setError("");

    try {
      const response = await updateApi.checkUpdate();
      setHasUpdate(response.has_update);
      setNewVersion(response.new_version);

      if (response.has_update) {
        toast.success(`发现新版本: ${response.new_version}`);
      } else {
        toast.info("暂无更新");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "检查更新失败";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsChecking(false);
    }
  };

  const handlePerformUpdate = async () => {
    setIsUpdating(true);
    setError("");

    try {
      const message = await updateApi.performUpdate();
      toast.success(message);

      // 显示重启提示
      setTimeout(() => {
        const shouldRestart = confirm(
          "更新已安装。现在重启应用以使用新版本吗？",
        );
        if (shouldRestart) {
          updateApi.restartApp();
        }
      }, 1000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "执行更新失败";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 版本信息 */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1">当前版本</p>
          <p className="text-lg font-semibold">
            {currentVersion || "加载中..."}
          </p>
        </div>

        {hasUpdate && newVersion && (
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                发现新版本
              </p>
              <p className="text-sm text-muted-foreground">
                最新版本: {newVersion}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">错误</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          onClick={handleCheckUpdate}
          disabled={isChecking || isUpdating}
          variant="outline"
          className="gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              检查中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              检查更新
            </>
          )}
        </Button>

        {hasUpdate && (
          <Button
            onClick={handlePerformUpdate}
            disabled={isUpdating || isChecking}
            className="gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                更新中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                立即更新
              </>
            )}
          </Button>
        )}
      </div>

      {/* 信息提示 */}
      <p className="text-xs text-muted-foreground">
        应用将在更新后重启。请确保没有正在进行的重要操作。
      </p>
    </div>
  );
}
