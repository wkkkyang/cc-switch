import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProviderIcon } from "./ProviderIcon";
import { iconList } from "@/icons/extracted";
import { searchIcons, getIconMetadata } from "@/icons/extracted/metadata";
import { cn } from "@/lib/utils";
import { Upload, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

interface IconPickerProps {
  value?: string; // 当前选中的图标
  onValueChange: (icon: string) => void; // 选择回调
  color?: string; // 预览颜色
}

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onValueChange,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customIconPreview, setCustomIconPreview] = useState<string | null>(null);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

  // 过滤图标列表
  const filteredIcons = useMemo(() => {
    if (!searchQuery) return iconList;
    return searchIcons(searchQuery);
  }, [searchQuery]);

  // 加载自定义图标预览
  useEffect(() => {
    const loadCustomIconPreview = async () => {
      if (!value || (!value.startsWith("custom://") && !value.startsWith("data:"))) {
        setCustomIconPreview(null);
        return;
      }

      setIsLoadingCustom(true);
      try {
        if (value.startsWith("data:")) {
          setCustomIconPreview(value);
        } else if (value.startsWith("custom://")) {
          const fileName = value.replace("custom://", "");
          const { invoke } = await import('@tauri-apps/api/core');
          
          try {
            const data = await invoke('read_custom_icon', { fileName });
            const dataArray = data as number[];
            const uint8Array = new Uint8Array(dataArray);
            
            // 使用浏览器原生 API 生成 base64
            const base64 = btoa(
              uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            // 根据文件名后缀确定图片类型
            const extension = fileName.split('.').pop()?.toLowerCase();
            const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 
                           extension === 'gif' ? 'image/gif' : 'image/png';
            const dataUrl = `data:${mimeType};base64,${base64}`;
            setCustomIconPreview(dataUrl);
          } catch (error) {
            console.warn("无法加载自定义图标:", error);
            setCustomIconPreview(null);
          }
        }
      } catch (error) {
        console.error("预览加载失败:", error);
        setCustomIconPreview(null);
      } finally {
        setIsLoadingCustom(false);
      }
    };

    loadCustomIconPreview();
  }, [value]);

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      toast.error(t("iconPicker.invalidFileType", {
        defaultValue: "请选择图片文件"
      }));
      return;
    }

    // 验证文件大小 (限制为 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("iconPicker.fileTooLarge", {
        defaultValue: "文件大小不能超过 2MB"
      }));
      return;
    }

    setIsUploading(true);

    try {
      // 使用 Tauri 的文件系统 API 读取文件
      const arrayBuffer = await file.arrayBuffer();
      
      // 使用浏览器原生 API 生成 base64
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const dataUrl = `data:${file.type};base64,${base64}`;

      // 生成唯一的文件名，保留原始扩展名
      const timestamp = Date.now();
      const extension = file.name.split('.').pop() || 'png';
      const fileName = `custom_icon_${timestamp}.${extension}`;

      // 准备二进制数据
      const binaryData = Array.from(new Uint8Array(arrayBuffer));

      // 使用 Tauri 命令保存文件
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        
        // 调用 Rust 命令保存图标文件
        const result = await invoke('save_custom_icon', {
          fileName: fileName,
          fileData: binaryData,
          metadata: {
            name: fileName,
            displayName: file.name.replace(/\.[^/.]+$/, ""),
            uploadTime: timestamp,
            size: file.size,
            type: file.type
          }
        });

        // 使用自定义图标路径
        const customIconPath = `custom://${fileName}`;
        onValueChange(customIconPath);
        
        toast.success(t("iconPicker.uploadSuccess", {
          defaultValue: "图标上传成功"
        }));

      } catch (fsError) {
        // 如果文件系统操作失败，使用 data URL 作为 fallback
        console.warn("文件系统保存失败，使用 data URL:", fsError);
        onValueChange(dataUrl);
        toast.success(t("iconPicker.uploadSuccessFallback", {
          defaultValue: "图标上传成功（临时模式）"
        }));
      }

    } catch (error) {
      console.error("上传失败:", error);
      toast.error(t("iconPicker.uploadFailed", {
        defaultValue: "上传失败，请重试"
      }));
    } finally {
      setIsUploading(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 上传按钮区域 */}
      <div>
        <Label>
          {t("iconPicker.customIcon", { defaultValue: "自定义图标" })}
        </Label>
        <div className="mt-2 flex gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="icon-file-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading 
              ? t("iconPicker.uploading", { defaultValue: "上传中..." })
              : t("iconPicker.uploadButton", { defaultValue: "上传图标" })
            }
          </Button>
          <span className="text-xs text-muted-foreground">
            {t("iconPicker.uploadHint", { defaultValue: "支持 PNG、JPG、GIF，最大 2MB" })}
          </span>
        </div>
      </div>

      {/* 当前选中的自定义图标预览 */}
      {value && (value.startsWith("custom://") || value.startsWith("data:")) && (
        <div className="p-3 bg-accent rounded-lg border border-border/20">
          <Label className="mb-2 block">
            {t("iconPicker.currentCustomIcon", { defaultValue: "当前自定义图标" })}
          </Label>
          <div className="flex items-center gap-3">
            <ProviderIcon 
              icon={value} 
              name="custom-icon" 
              size={48} 
              className="border-2 border-primary/30 rounded-lg"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">
                {value.startsWith("custom://") ? value.replace("custom://", "") : "Data URL Icon"}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("iconPicker.customIconHint", { defaultValue: "自定义图标将保存在本地" })}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onValueChange("")}
              className="text-red-500 hover:text-red-600"
            >
              {t("iconPicker.remove", { defaultValue: "移除" })}
            </Button>
          </div>
        </div>
      )}

      {/* 搜索区域 */}
      <div>
        <Label htmlFor="icon-search">
          {t("iconPicker.search", { defaultValue: "搜索图标" })}
        </Label>
        <Input
          id="icon-search"
          type="text"
          placeholder={t("iconPicker.searchPlaceholder", {
            defaultValue: "输入图标名称...",
          })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2"
        />
      </div>

      {/* 图标网格 */}
      <div className="max-h-[50vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2">
          {filteredIcons.map((iconName) => {
            const meta = getIconMetadata(iconName);
            const isSelected = value === iconName;

            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onValueChange(iconName)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg",
                  "border-2 transition-all duration-200",
                  "hover:bg-accent hover:border-primary/50",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-transparent",
                )}
                title={meta?.displayName || iconName}
              >
                <ProviderIcon icon={iconName} name={iconName} size={32} />
                <span className="text-xs text-muted-foreground truncate w-full text-center">
                  {meta?.displayName || iconName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredIcons.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("iconPicker.noResults", { defaultValue: "未找到匹配的图标" })}
        </div>
      )}
    </div>
  );
};
