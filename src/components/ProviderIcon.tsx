import React, { useMemo, useEffect, useState } from "react";
import { getIcon, hasIcon } from "@/icons/extracted";
import { cn } from "@/lib/utils";

interface ProviderIconProps {
  icon?: string; // 图标名称
  name: string; // 供应商名称（用于 fallback）
  color?: string; // 自定义颜色 (Deprecated, kept for compatibility but ignored for SVG)
  size?: number | string; // 尺寸
  className?: string;
  showFallback?: boolean; // 是否显示 fallback
}

export const ProviderIcon: React.FC<ProviderIconProps> = ({
  icon,
  name,
  size = 32,
  className,
  showFallback = true,
}) => {
  const [customIconData, setCustomIconData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 检查是否为自定义图标
  const isCustomIcon = useMemo(() => {
    return icon && (icon.startsWith("custom://") || icon.startsWith("data:"));
  }, [icon]);

  // 加载自定义图标
  useEffect(() => {
    if (!isCustomIcon || !icon) {
      setCustomIconData(null);
      return;
    }

    const loadCustomIcon = async () => {
      setIsLoading(true);
      try {
        if (icon.startsWith("data:")) {
          // Data URL 直接使用
          setCustomIconData(icon);
        } else if (icon.startsWith("custom://")) {
          // 自定义协议路径，需要通过 Tauri 命令读取
          const fileName = icon.replace("custom://", "");
          const { invoke } = await import('@tauri-apps/api/core');
          
          try {
            const data = await invoke('read_custom_icon', { fileName });
            
            // 将二进制数据转换为 base64
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
            setCustomIconData(dataUrl);
          } catch (error) {
            console.warn("Failed to load custom icon:", error);
            setCustomIconData(null);
          }
        }
      } catch (error) {
        console.error("Error loading custom icon:", error);
        setCustomIconData(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomIcon();
  }, [isCustomIcon, icon]);

  // 获取标准图标 SVG
  const iconSvg = useMemo(() => {
    if (!isCustomIcon && icon && hasIcon(icon)) {
      return getIcon(icon);
    }
    return "";
  }, [icon, isCustomIcon]);

  // 计算尺寸样式
  const sizeStyle = useMemo(() => {
    const sizeValue = typeof size === "number" ? `${size}px` : size;
    return {
      width: sizeValue,
      height: sizeValue,
      fontSize: sizeValue,
      lineHeight: 1,
    };
  }, [size]);

  // 显示自定义图标
  if (isCustomIcon && customIconData) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center flex-shrink-0",
          className,
        )}
        style={sizeStyle}
      >
        <img 
          src={customIconData} 
          alt={name}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            borderRadius: '4px'
          }}
        />
      </span>
    );
  }

  // 显示标准图标
  if (iconSvg) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center flex-shrink-0",
          className,
        )}
        style={sizeStyle}
        dangerouslySetInnerHTML={{ __html: iconSvg }}
      />
    );
  }

  // Fallback：显示首字母
  if (showFallback) {
    const initials = name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const fallbackFontSize =
      typeof size === "number" ? `${Math.max(size * 0.5, 12)}px` : "0.5em";
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center flex-shrink-0 rounded-lg",
          "bg-muted text-muted-foreground font-semibold",
          className,
        )}
        style={sizeStyle}
      >
        <span
          style={{
            fontSize: fallbackFontSize,
          }}
        >
          {initials}
        </span>
      </span>
    );
  }

  return null;
};
