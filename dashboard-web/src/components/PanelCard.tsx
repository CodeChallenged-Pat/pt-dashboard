import React from "react";

export interface PanelConfig {
  priority: number;
  title: string;
  width: number;
  height: number;
  cornerRadius: number;
  color: string;
  content?: string;
}

type LayoutMode = "natural" | "justify";

interface Props {
  config: PanelConfig;
  layoutMode: LayoutMode;
  isSelected: boolean;
  batchMode: boolean;
  onSelect: (shiftKey: boolean) => void;
  onUpdate: (changes: Partial<PanelConfig>) => void;
  onEdit: () => void;
  onRemove: () => void;
}

export default function PanelCard({ config, layoutMode, isSelected, batchMode, onSelect, onEdit, onRemove }: Props) {
  const { priority, title, width, height, cornerRadius, color, content } = config;
  const glowColor = color + "33";
  const isJustify = layoutMode === "justify";

  return (
    <div
      className={`relative group transition-all duration-300 ease-in-out ${batchMode ? "cursor-pointer" : ""}`}
      style={{
        width: isJustify ? "100%" : `${width}px`, height: `${height}px`,
        minWidth: isJustify ? 0 : "160px", minHeight: "120px",
        flexShrink: isJustify ? undefined : 0,
      }}
      onClick={batchMode ? (e) => onSelect(e.shiftKey) : undefined}
    >
      <div className="absolute inset-0 blur-xl opacity-30 transition-opacity group-hover:opacity-50"
        style={{ backgroundColor: glowColor, borderRadius: `${cornerRadius}px` }} />

      <div className={`relative h-full border flex flex-col transition-all duration-200 group-hover:shadow-lg ${isSelected ? "ring-2 ring-offset-1 ring-offset-gray-950" : ""}`}
        style={{
          backgroundColor: "#1e293b", borderRadius: `${cornerRadius}px`,
          borderColor: isSelected ? "#f59e0b" : color + "44",
          boxShadow: isSelected ? `0 0 24px ${color}66` : `0 0 20px ${glowColor}`,
        }}>
        {isSelected && (
          <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: `${cornerRadius}px`, background: `${color}11` }} />
        )}
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${color}33` }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: color, color: "#fff" }}>{priority}</span>
            <span className="text-sm font-semibold text-gray-100 truncate">{title}</span>
            {isSelected && <span className="text-[10px] text-amber-400 font-medium shrink-0">✓</span>}
          </div>
          <div className={`flex gap-1 ${batchMode ? "hidden" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
            <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white" title="Configure">⚙️</button>
            <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400" title="Remove">×</button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          {content ? <div className="text-center"><span className="text-2xl text-gray-200">{content}</span></div>
            : <span className="text-gray-500 text-sm">Panel content goes here</span>}
        </div>
        <div className="px-3 py-1.5 text-[10px] text-gray-500 flex justify-between border-t border-gray-700/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>{isJustify ? "grid" : `${width}×${height}`} · r={cornerRadius}</span>
          <span>P{priority}</span>
        </div>
      </div>
    </div>
  );
}
