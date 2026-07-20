import React, { useState } from "react";
import { PanelConfig } from "./PanelCard";
import type { Panel } from "../App";

interface Props {
  panels: Panel[];
  onApply: (changes: Partial<PanelConfig>) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#64748b", "#f97316", "#84cc16",
];

export default function RowEditPanel({ panels, onApply, onClose }: Props) {
  const [height, setHeight] = useState(panels[0]?.height ?? 200);
  const [cornerRadius, setCornerRadius] = useState(panels[0]?.cornerRadius ?? 14);
  const [color, setColor] = useState(panels[0]?.color ?? "#3b82f6");
  const [width, setWidth] = useState(panels[0]?.width ?? 280);

  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-gray-900/95 border-l border-gray-700 z-50 overflow-y-auto shadow-2xl animate-slide-in backdrop-blur-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-white">Batch Edit</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white text-sm">×</button>
        </div>
        <p className="text-[10px] text-gray-500 mb-4">{panels.length} selected — shift+click to add more</p>

        <label className="block mb-3">
          <span className="text-[10px] text-gray-400 font-medium mb-1 block">Height ({height}px)</span>
          <input type="range" min={100} max={400} step={10} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-blue-500" />
        </label>

        <label className="block mb-3">
          <span className="text-[10px] text-gray-400 font-medium mb-1 block">Width ({width}px)</span>
          <input type="range" min={160} max={600} step={10} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-blue-500" />
        </label>

        <label className="block mb-3">
          <span className="text-[10px] text-gray-400 font-medium mb-1 block">Radius ({cornerRadius}px)</span>
          <input type="range" min={0} max={40} step={2} value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} className="w-full accent-blue-500" />
        </label>

        <div className="mb-4">
          <span className="text-[10px] text-gray-400 font-medium mb-1 block">Color</span>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: color === c ? "#fff" : "transparent" }} />
            ))}
          </div>
        </div>

        <button onClick={() => onApply({ height, width, cornerRadius, color })}
          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold transition-colors mb-3">
          Apply to {panels.length} panel{panels.length !== 1 ? "s" : ""}
        </button>

        <div className="border-t border-gray-700/50 pt-2">
          {panels.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 py-0.5 text-[10px] text-gray-400">
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0" style={{ backgroundColor: p.color, color: "#fff" }}>{p.priority}</span>
              <span className="truncate">{p.title}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.15s ease-out; }
      `}</style>
    </div>
  );
}
