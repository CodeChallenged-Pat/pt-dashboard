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
  globalHeight: number;
  onUpdate: (changes: Partial<PanelConfig>) => void;
  onEdit: () => void;
  onRemove: () => void;
}

export default function PanelCard({ config, layoutMode, globalHeight, onEdit, onRemove }: Props) {
  const { priority, title, width, height, cornerRadius, color, content } = config;
  const glowColor = color + "33";
  const isJustify = layoutMode === "justify";
  // Use global height if set, otherwise per-panel height
  const effectiveHeight = globalHeight > 0 ? globalHeight : height;

  return (
    <div
      className="relative group transition-all duration-300 ease-in-out"
      style={{
        // Natural mode: explicit width. Justify mode: fill grid cell
        width: isJustify ? "100%" : `${width}px`,
        height: `${effectiveHeight}px`,
        minWidth: isJustify ? 0 : "160px",
        minHeight: "120px",
        // In justify mode, let the grid handle positioning
        flexShrink: isJustify ? undefined : 0,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 blur-xl opacity-30 transition-opacity group-hover:opacity-50"
        style={{ backgroundColor: glowColor, borderRadius: `${cornerRadius}px` }}
      />

      {/* Card body */}
      <div
        className="relative h-full border border-gray-700/50 flex flex-col transition-shadow duration-200 group-hover:shadow-lg"
        style={{
          backgroundColor: "#1e293b",
          borderRadius: `${cornerRadius}px`,
          borderColor: color + "44",
          boxShadow: `0 0 20px ${glowColor}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ borderBottom: `1px solid ${color}33` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: color, color: "#fff" }}
            >
              {priority}
            </span>
            <span className="text-sm font-semibold text-gray-100 truncate">{title}</span>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title="Configure panel"
            >
              ⚙️
            </button>
            <button
              onClick={onRemove}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              title="Remove panel"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          {content ? (
            <div className="text-center">
              <span className="text-2xl text-gray-200">{content}</span>
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Panel content goes here</span>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 text-[10px] text-gray-500 flex justify-between border-t border-gray-700/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>
            {isJustify ? "grid" : `${width}×${height}`} · r={cornerRadius}
          </span>
          <span>P{priority}</span>
        </div>
      </div>
    </div>
  );
}
