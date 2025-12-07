import { useCallback, useMemo } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Provider } from "@/types";
import { providersApi, type AppId } from "@/lib/api";

export function useDragSort(providers: Record<string, Provider>, appId: AppId) {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const sortedProviders = useMemo(() => {
    const locale = i18n.language === "zh" ? "zh-CN" : "en-US";
    return Object.values(providers).sort((a, b) => {
      // 置顶的优先
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 置顶的之间按 sortIndex 排序
      if (a.isPinned && b.isPinned) {
        if (a.sortIndex !== undefined && b.sortIndex !== undefined) {
          return a.sortIndex - b.sortIndex;
        }
      }

      // 非置顶的之间按 sortIndex 排序
      if (a.sortIndex !== undefined && b.sortIndex !== undefined) {
        return a.sortIndex - b.sortIndex;
      }
      if (a.sortIndex !== undefined) return -1;
      if (b.sortIndex !== undefined) return 1;

      const timeA = a.createdAt ?? 0;
      const timeB = b.createdAt ?? 0;
      if (timeA && timeB && timeA !== timeB) {
        return timeA - timeB;
      }

      return a.name.localeCompare(b.name, locale);
    });
  }, [providers, i18n.language]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = sortedProviders.findIndex(
        (provider) => provider.id === active.id,
      );
      const newIndex = sortedProviders.findIndex(
        (provider) => provider.id === over.id,
      );

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reordered = arrayMove(sortedProviders, oldIndex, newIndex);

      // 检查是否跨越了置顶/非置顶边界
      const activeProvider = sortedProviders[oldIndex];
      const overProvider = sortedProviders[newIndex];

      const wasPinned = activeProvider.isPinned;
      const targetPinned = overProvider.isPinned;

      // 更新置顶状态（如果跨越边界）
      const updates = reordered.map((provider, index) => {
        const update: any = {
          id: provider.id,
          sortIndex: index,
        };

        // 如果是拖拽的供应商，根据目标位置更新置顶状态
        if (provider.id === activeProvider.id) {
          if (wasPinned !== targetPinned) {
            update.isPinned = targetPinned;
          }
        }

        return update;
      });

      try {
        await providersApi.updateSortOrder(updates, appId);
        await queryClient.invalidateQueries({
          queryKey: ["providers", appId],
        });

        // 更新托盘菜单以反映新的排序（失败不影响主操作）
        try {
          await providersApi.updateTrayMenu();
        } catch (trayError) {
          console.error("Failed to update tray menu after sort", trayError);
          // 托盘菜单更新失败不影响排序成功
        }

        toast.success(
          t("provider.sortUpdated", {
            defaultValue: "排序已更新",
          }),
        );
      } catch (error) {
        console.error("Failed to update provider sort order", error);
        toast.error(
          t("provider.sortUpdateFailed", {
            defaultValue: "排序更新失败",
          }),
        );
      }
    },
    [sortedProviders, appId, queryClient, t],
  );

  return {
    sortedProviders,
    sensors,
    handleDragEnd,
  };
}
