import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

interface UncontrolledCandidateModelsManagerProps {
  candidateModels: string[];
  onChange: (models: string[]) => void;
}

export function UncontrolledCandidateModelsManager({
  candidateModels,
  onChange,
}: UncontrolledCandidateModelsManagerProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const addModel = () => {
    const newModelName = inputValue.trim();

    if (!newModelName) {
      return;
    }

    const currentModels = Array.isArray(candidateModels) ? candidateModels : [];

    if (currentModels.includes(newModelName)) {
      toast.error("该模型已存在");
      return;
    }

    const newModels = [...currentModels, newModelName];
    onChange(newModels);
    setInputValue("");
    toast.success("模型添加成功");
  };

  const deleteModel = (modelToDelete: string) => {
    const currentModels = Array.isArray(candidateModels) ? candidateModels : [];
    const newModels = currentModels.filter((model) => model !== modelToDelete);
    onChange(newModels);
    toast.success("模型删除成功");
  };

  const copyToClipboard = (modelName: string) => {
    navigator.clipboard
      .writeText(modelName)
      .then(() => {
        toast.success("模型名称已复制到剪贴板");
      })
      .catch(() => {
        toast.error("复制失败，请重试");
      });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addModel();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* 触发按钮 */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 border border-input rounded-md text-sm bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-muted-foreground">
          {candidateModels.length > 0
            ? `已添加 ${candidateModels.length} 个模型`
            : "管理待选模型"}
        </span>
        <ChevronDown
          className={`h-4 w-4 opacity-50 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 下拉菜单内容 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-input rounded-md shadow-lg z-50">
          <div className="w-full p-3 space-y-2">
            {/* 添加新模型 */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                className="flex-1 px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="输入新模型名称"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                type="button"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
                onClick={addModel}
              >
                添加
              </button>
            </div>

            {/* 模型列表 */}
            <div className="max-h-64 overflow-y-auto border border-border rounded-md p-2 bg-background">
              {candidateModels.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  暂无待选模型
                </div>
              ) : (
                <div className="space-y-1.5">
                  {candidateModels.map((model) => (
                    <div
                      key={model}
                      className="flex justify-between items-center px-2 py-1.5 border border-border rounded bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div
                        className="text-sm flex-1 truncate pr-2"
                        title={model}
                      >
                        {model}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          type="button"
                          className="px-2 py-0.5 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90 transition-colors"
                          onClick={() => copyToClipboard(model)}
                          title="复制模型名称到剪贴板"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          className="px-2 py-0.5 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90 transition-colors"
                          onClick={() => deleteModel(model)}
                          title="删除模型"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
