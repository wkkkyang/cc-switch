import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus,
  Settings,
  ArrowLeft,
  FolderOpen,
  Filter,
  Target,
} from "lucide-react";
import type { Provider } from "@/types";
import type { EnvConflict } from "@/types/env";
import { useProvidersQuery } from "@/lib/query";
import {
  providersApi,
  settingsApi,
  type AppId,
  type ProviderSwitchEvent,
} from "@/lib/api";
import { checkAllEnvConflicts, checkEnvConflicts } from "@/lib/api/env";
import { useProviderActions } from "@/hooks/useProviderActions";
import { extractErrorMessage } from "@/utils/errorUtils";
import { AppSwitcher } from "@/components/AppSwitcher";
import { ProviderList } from "@/components/providers/ProviderList";
import { AddProviderDialog } from "@/components/providers/AddProviderDialog";
import { EditProviderDialog } from "@/components/providers/EditProviderDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { EnvWarningBanner } from "@/components/env/EnvWarningBanner";
import UsageScriptModal from "@/components/UsageScriptModal";
import { DeepLinkImportDialog } from "@/components/DeepLinkImportDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type View = "providers" | "settings";

function App() {
  const { t } = useTranslation();

  const [activeApp, setActiveApp] = useState<AppId>("claude");
  // 当前视图
  const [currentView, setCurrentView] = useState<View>("providers");
  // 供应商筛选
  const [selectedProviderName, setSelectedProviderName] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const providerListRef = useRef<HTMLDivElement>(null);
  const [usageProvider, setUsageProvider] = useState<Provider | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Provider | null>(null);
  const [envConflicts, setEnvConflicts] = useState<EnvConflict[]>([]);
  const [showEnvBanner, setShowEnvBanner] = useState(false);

  const addActionButtonClass =
    "bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-500/40 rounded-full w-8 h-8";

  const { data, isLoading, refetch } = useProvidersQuery(activeApp);
  const providers = useMemo(() => data?.providers ?? {}, [data]);
  const currentProviderId = data?.currentProviderId ?? "";

  // 唯一的供应商名称列表
  const uniqueProviderNames = useMemo(() => {
    // 使用Set来获取唯一的供应商名称
    const namesSet = new Set<string>();
    Object.values(providers).forEach((provider) => {
      namesSet.add(provider.name);
    });
    // 转换为数组并排序
    return Array.from(namesSet).sort();
  }, [providers]);

  // 过滤后的供应商列表
  const filteredProviders = useMemo(() => {
    if (!selectedProviderName) return providers;

    return Object.fromEntries(
      Object.entries(providers).filter(([_, provider]) =>
        provider.name === selectedProviderName
      )
    );
  }, [providers, selectedProviderName]);

  // 🎯 使用 useProviderActions Hook 统一管理所有 Provider 操作
  const {
    addProvider,
    updateProvider,
    switchProvider,
    deleteProvider,
    saveUsageScript,
    togglePin,
  } = useProviderActions(activeApp);

  // 监听来自托盘菜单的切换事件
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unsubscribe = await providersApi.onSwitched(
          async (event: ProviderSwitchEvent) => {
            if (event.appType === activeApp) {
              await refetch();
            }
          },
        );
      } catch (error) {
        console.error("[App] Failed to subscribe provider switch event", error);
      }
    };

    setupListener();
    return () => {
      unsubscribe?.();
    };
  }, [activeApp, refetch]);

  // 应用启动时检测所有应用的环境变量冲突
  useEffect(() => {
    const checkEnvOnStartup = async () => {
      try {
        const allConflicts = await checkAllEnvConflicts();
        const flatConflicts = Object.values(allConflicts).flat();

        if (flatConflicts.length > 0) {
          setEnvConflicts(flatConflicts);
          const dismissed = sessionStorage.getItem("env_banner_dismissed");
          if (!dismissed) {
            setShowEnvBanner(true);
          }
        }
      } catch (error) {
        console.error(
          "[App] Failed to check environment conflicts on startup:",
          error,
        );
      }
    };

    checkEnvOnStartup();
  }, []);

  // 应用启动时检查是否刚完成了配置迁移
  useEffect(() => {
    const checkMigration = async () => {
      try {
        const migrated = await invoke<boolean>("get_migration_result");
        if (migrated) {
          toast.success(
            t("migration.success", { defaultValue: "配置迁移成功" }),
          );
        }
      } catch (error) {
        console.error("[App] Failed to check migration result:", error);
      }
    };

    checkMigration();
  }, [t]);

  // 切换应用时检测当前应用的环境变量冲突
  useEffect(() => {
    const checkEnvOnSwitch = async () => {
      try {
        const conflicts = await checkEnvConflicts(activeApp);

        if (conflicts.length > 0) {
          // 合并新检测到的冲突
          setEnvConflicts((prev) => {
            const existingKeys = new Set(
              prev.map((c) => `${c.varName}:${c.sourcePath}`),
            );
            const newConflicts = conflicts.filter(
              (c) => !existingKeys.has(`${c.varName}:${c.sourcePath}`),
            );
            return [...prev, ...newConflicts];
          });
          const dismissed = sessionStorage.getItem("env_banner_dismissed");
          if (!dismissed) {
            setShowEnvBanner(true);
          }
        }
      } catch (error) {
        console.error(
          "[App] Failed to check environment conflicts on app switch:",
          error,
        );
      }
    };

    checkEnvOnSwitch();
  }, [activeApp]);

  // 打开网站链接
  const handleOpenWebsite = async (url: string) => {
    try {
      await settingsApi.openExternal(url);
    } catch (error) {
      const detail =
        extractErrorMessage(error) ||
        t("notifications.openLinkFailed", {
          defaultValue: "链接打开失败",
        });
      toast.error(detail);
    }
  };

  // 打开当前应用的配置目录
  const handleOpenConfigFolder = async () => {
    try {
      await settingsApi.openConfigFolder(activeApp);
    } catch (error) {
      const detail =
        extractErrorMessage(error) ||
        t("console.openConfigFolderFailed", {
          defaultValue: "打开配置文件夹失败",
        });
      toast.error(detail);
    }
  };

  // 编辑供应商
  const handleEditProvider = async (provider: Provider) => {
    await updateProvider(provider);
    setEditingProvider(null);
  };

  // 确认删除供应商
  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    await deleteProvider(confirmDelete.id);
    setConfirmDelete(null);
  };

  // 复制供应商
  const handleDuplicateProvider = async (provider: Provider) => {
    // 1️⃣ 计算新的 sortIndex：如果原供应商有 sortIndex，则复制它
    const newSortIndex =
      provider.sortIndex !== undefined ? provider.sortIndex + 1 : undefined;

    const duplicatedProvider: Omit<Provider, "id" | "createdAt"> = {
      name: `${provider.name} copy`,
      settingsConfig: JSON.parse(JSON.stringify(provider.settingsConfig)), // 深拷贝
      websiteUrl: provider.websiteUrl,
      category: provider.category,
      sortIndex: newSortIndex, // 复制原 sortIndex + 1
      meta: provider.meta
        ? JSON.parse(JSON.stringify(provider.meta))
        : undefined, // 深拷贝
      icon: provider.icon,
      iconColor: provider.iconColor,
    };

    // 2️⃣ 如果原供应商有 sortIndex，需要将后续所有供应商的 sortIndex +1
    if (provider.sortIndex !== undefined) {
      const updates = Object.values(providers)
        .filter(
          (p) =>
            p.sortIndex !== undefined &&
            p.sortIndex >= newSortIndex! &&
            p.id !== provider.id,
        )
        .map((p) => ({
          id: p.id,
          sortIndex: p.sortIndex! + 1,
        }));

      // 先更新现有供应商的 sortIndex，为新供应商腾出位置
      if (updates.length > 0) {
        try {
          await providersApi.updateSortOrder(updates, activeApp);
        } catch (error) {
          console.error("[App] Failed to update sort order", error);
          toast.error(
            t("provider.sortUpdateFailed", {
              defaultValue: "排序更新失败",
            }),
          );
          return; // 如果排序更新失败，不继续添加
        }
      }
    }

    // 3️⃣ 添加复制的供应商
    await addProvider(duplicatedProvider);
  };

  // 导入配置成功后刷新
  const handleImportSuccess = async () => {
    await refetch();
    try {
      await providersApi.updateTrayMenu();
    } catch (error) {
      console.error("[App] Failed to refresh tray menu", error);
    }
  };

  const scrollToCurrentProvider = useCallback(() => {
    if (!providerListRef.current) return;

    const currentProviderElement = providerListRef.current.querySelector(
      '.provider-card[data-current="true"]'
    ) as HTMLElement | null;

    if (currentProviderElement) {
      currentProviderElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // 添加闪烁效果
      currentProviderElement.classList.add("animate-pulse");
      setTimeout(() => {
        currentProviderElement.classList.remove("animate-pulse");
      }, 2000);
    }
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case "settings":
        return (
          <SettingsPage
            open={true}
            onOpenChange={() => setCurrentView("providers")}
            onImportSuccess={handleImportSuccess}
          />
        );
      default:
        return (
          <div className="mx-auto max-w-[56rem] px-5 flex flex-col h-[calc(100vh-8rem)] overflow-hidden">
            {/* 筛选按钮和定位按钮 */}
            <div className="pt-4 pb-2 flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-500/40">
                    <Filter className="mr-2 h-4 w-4" />
                    {selectedProviderName
                      ? `${selectedProviderName}`
                      : "筛选"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-w-md">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedProviderName(null)}>
                    {t("provider.allProviders", { defaultValue: "全部供应商" })}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {uniqueProviderNames.map((name) => (
                    <DropdownMenuItem
                      key={name}
                      onClick={() => setSelectedProviderName(name)}
                    >
                      {name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* 定位当前供应商按钮 */}
              <Button
                onClick={scrollToCurrentProvider}
                title={t("provider.locateCurrent", { defaultValue: "定位当前供应商" })}
                className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 dark:shadow-orange-500/40 h-9 w-9 p-0 flex items-center justify-center"
              >
                <Target className="h-4 w-4" />
              </Button>
            </div>
            {/* 独立滚动容器 - 解决 Linux/Ubuntu 下 DndContext 与滚轮事件冲突 */}
            <div
              ref={providerListRef}
              className="flex-1 overflow-y-auto overflow-x-hidden pb-12 px-1"
            >
              <div className="space-y-4">
                <ProviderList
                  providers={filteredProviders}
                  currentProviderId={currentProviderId}
                  appId={activeApp}
                  isLoading={isLoading}
                  onSwitch={switchProvider}
                  onEdit={setEditingProvider}
                  onDelete={setConfirmDelete}
                  onDuplicate={handleDuplicateProvider}
                  onConfigureUsage={setUsageProvider}
                  onOpenWebsite={handleOpenWebsite}
                  onTogglePin={togglePin}
                  onCreate={() => setIsAddOpen(true)}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/30"
      style={{ overflowX: "hidden" }}
    >
      {/* 全局拖拽区域（顶部 4px），避免上边框无法拖动 */}
      <div
        className="fixed top-0 left-0 right-0 h-4 z-[60]"
        data-tauri-drag-region
        style={{ WebkitAppRegion: "drag" } as any}
      />
      {/* 环境变量警告横幅 */}
      {showEnvBanner && envConflicts.length > 0 && (
        <EnvWarningBanner
          conflicts={envConflicts}
          onDismiss={() => {
            setShowEnvBanner(false);
            sessionStorage.setItem("env_banner_dismissed", "true");
          }}
          onDeleted={async () => {
            // 删除后重新检测
            try {
              const allConflicts = await checkAllEnvConflicts();
              const flatConflicts = Object.values(allConflicts).flat();
              setEnvConflicts(flatConflicts);
              if (flatConflicts.length === 0) {
                setShowEnvBanner(false);
              }
            } catch (error) {
              console.error(
                "[App] Failed to re-check conflicts after deletion:",
                error,
              );
            }
          }}
        />
      )}

      <header
        className="glass-header fixed top-0 z-50 w-full py-3 transition-all duration-300"
        data-tauri-drag-region
        style={{ WebkitAppRegion: "drag" } as any}
      >
        <div className="h-4 w-full" aria-hidden data-tauri-drag-region />
        <div
          className="mx-auto max-w-[56rem] px-6 flex flex-wrap items-center justify-between gap-2"
          data-tauri-drag-region
          style={{ WebkitAppRegion: "drag" } as any}
        >
          <div
            className="flex items-center gap-1"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {currentView !== "providers" ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentView("providers")}
                  className="mr-2 rounded-lg"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-lg font-semibold">
                  {currentView === "settings" && t("settings.title")}
                </h1>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">CC Switch</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentView("settings")}
                  title={t("common.settings")}
                  className="hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-2"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {currentView === "providers" && (
              <>
                <AppSwitcher activeApp={activeApp} onSwitch={setActiveApp} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenConfigFolder}
                  title={t("settings.openConfigFolder", {
                    defaultValue: "打开配置目录",
                  })}
                  className={`ml-2 ${addActionButtonClass}`}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setIsAddOpen(true)}
                  size="icon"
                  className={`ml-2 ${addActionButtonClass}`}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        className={`flex-1 overflow-y-auto pb-12 animate-fade-in scroll-overlay ${
          currentView === "providers" ? "pt-24" : "pt-20"
        }`}
        style={{ overflowX: "hidden" }}
      >
        {renderContent()}
      </main>

      <AddProviderDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        appId={activeApp}
        onSubmit={addProvider}
      />

      <EditProviderDialog
        open={Boolean(editingProvider)}
        provider={editingProvider}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProvider(null);
          }
        }}
        onSubmit={handleEditProvider}
        appId={activeApp}
      />

      {usageProvider && (
        <UsageScriptModal
          provider={usageProvider}
          appId={activeApp}
          isOpen={Boolean(usageProvider)}
          onClose={() => setUsageProvider(null)}
          onSave={(script) => {
            void saveUsageScript(usageProvider, script);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(confirmDelete)}
        title={t("confirm.deleteProvider")}
        message={
          confirmDelete
            ? t("confirm.deleteProviderMessage", {
                name: confirmDelete.name,
              })
            : ""
        }
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmDelete(null)}
      />

      <DeepLinkImportDialog />
    </div>
  );
}

export default App;
