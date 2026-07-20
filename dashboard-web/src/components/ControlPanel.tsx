import React, { useState } from "react";
import { PanelConfig } from "./PanelCard";
import type { Panel } from "../App";

interface Props {
  panel: Panel;
  onSave: (changes: Partial<PanelConfig>) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#64748b", "#f97316", "#84cc16",
];

export default function ControlPanel({ panel, onSave, onClose }: Props) {
  const [title, setTitle] = useState(panel.title);
  const [priority, setPriority] = useState(panel.priority);
  const [width, setWidth] = useState(panel.width);
  const [height, setHeight] = useState(panel.height);
  const [cornerRadius, setCornerRadius] = useState(panel.cornerRadius);
  const [color, setColor] = useState(panel.color);

  const handleSave = () => {
    onSave({ title, priority, width, height, cornerRadius, color });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto shadow-2xl animate-slide-in">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Configure Panel</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>

          {/* Title */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </label>

          {/* Priority */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">
              Priority ({priority})
            </span>
            <input
              type="range"
              min={1}
              max={20}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>1 (first)</span>
              <span>20 (last)</span>
            </div>
          </label>

          {/* Width */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">
              Width ({width}px)
            </span>
            <input
              type="range"
              min={160}
              max={600}
              step={10}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </label>

          {/* Height */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">
              Height ({height}px)
            </span>
            <input
              type="range"
              min={120}
              max={500}
              step={10}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </label>

          {/* Corner Radius */}
          <label className="block mb-4">
            <span className="text-xs text-gray-400 font-medium mb-1 block">
              Corner Radius ({cornerRadius}px)
            </span>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={cornerRadius}
              onChange={(e) => setCornerRadius(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </label>

          {/* Color */}
          <div className="mb-6">
            <span className="text-xs text-gray-400 font-medium mb-2 block">
              Theme Color
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#fff" : "transparent",
                    boxShadow: color === c ? `0 0 8px ${c}` : "none",
                  }}
                />
              ))}
            </div>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-8 rounded bg-gray-800 border border-gray-700 cursor-pointer"
            />
          </div>

          {/* Preview */}
          <div className="mb-6 p-3 bg-gray-800 rounded-lg">
            <span className="text-[10px] text-gray-500 block mb-1">Preview</span>
            <div
              className="h-16 border flex items-center justify-center text-xs text-gray-300"
              style={{
                backgroundColor: "#1e293b",
                borderColor: color + "66",
                borderRadius: `${cornerRadius}px`,
                boxShadow: `0 0 12px ${color}33`,
              }}
            >
              {title || "Untitled"}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
