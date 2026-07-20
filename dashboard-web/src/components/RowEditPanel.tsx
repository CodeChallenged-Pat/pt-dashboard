import React, { useState } from "react";
import { PanelConfig } from "./PanelCard";
import type { Panel } from "../App";

interface Props {
  rowIdx: number;
  panels: Panel[]; // panels in this row
  onApply: (changes: Partial<PanelConfig>) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#64748b", "#f97316", "#84cc16",
];

export default function RowEditPanel({ rowIdx, panels, onApply, onClose }: Props) {
  // Use the first panel's values as defaults
  const [height, setHeight] = useState(panels[0]?.height ?? 200);
  const [cornerRadius, setCornerRadius] = useState(panels[0]?.cornerRadius ?? 14);
  const [color, setColor] = useState(panels[0]?.color ?? "#3b82f6");

  const handleApply = () => {
    onApply({ height, cornerRadius, color });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto shadow-2xl animate-slide-in">
        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white">Row {rowIdx + 1} Edit</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white">×</button>
          </div>
          <p className="text-xs text-gray-500 mb-5">{panels.length} panel{panels.length !== 1 ? "s" : ""} in this row</p>

          {/* Height */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">Row Height ({height}px)</span>
            <input type="range" min={120} max={400} step={10} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-blue-500" />
          </label>

          {/* Corner Radius */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">Corner Radius ({cornerRadius}px)</span>
            <input type="range" min={0} max={40} step={2} value={cornerRadius} onChange={(e) => setCornerRadius(Number(e.target.value))} className="w-full accent-blue-500" />
          </label>

          {/* Color */}
          <div className="mb-6">
            <span className="text-xs text-gray-400 font-medium mb-2 block">Row Color</span>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: color === c ? "#fff" : "transparent", boxShadow: color === c ? `0 0 8px ${c}` : "none" }} />
              ))}
            </div>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-8 rounded bg-gray-800 border border-gray-700 cursor-pointer" />
          </div>

          {/* Preview */}
          <div className="mb-6 p-3 bg-gray-800 rounded-lg">
            <span className="text-[10px] text-gray-500 block mb-1">Preview</span>
            <div className="flex gap-2">
              {panels.slice(0, 3).map((p) => (
                <div key={p.id} className="flex-1 h-12 border flex items-center justify-center text-[10px] text-gray-300"
                  style={{ backgroundColor: "#1e293b", borderColor: color + "66", borderRadius: `${cornerRadius}px`, boxShadow: `0 0 8px ${color}33` }}>
                  {p.title.slice(0, 8)}
                </div>
              ))}
              {panels.length > 3 && <div className="flex items-center text-gray-500 text-xs">+{panels.length - 3}</div>}
            </div>
          </div>

          {/* Panel list in this row */}
          <div className="mb-5">
            <span className="text-[10px] text-gray-500 block mb-2">Panels in this row:</span>
            {panels.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1 text-xs text-gray-400">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: p.color, color: "#fff" }}>{p.priority}</span>
                <span className="truncate">{p.title}</span>
              </div>
            ))}
          </div>

          {/* Apply */}
          <button onClick={handleApply}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-bold transition-colors">
            Apply to Row {rowIdx + 1}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.2s ease-out; }
      `}</style>
    </>
  );
}
