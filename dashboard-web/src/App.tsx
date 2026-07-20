import React, { useState, useCallback, useEffect } from "react";
import PanelCard, { PanelConfig } from "./components/PanelCard";
import ControlPanel from "./components/ControlPanel";

export interface Panel extends PanelConfig {
  id: number;
}

const DEFAULT_PANELS: Panel[] = [
  { id: 1, priority: 1, title: "Today's Sales", width: 320, height: 240, cornerRadius: 16, color: "#3b82f6", content: "📊 $12,345" },
  { id: 2, priority: 2, title: "Security Events", width: 280, height: 200, cornerRadius: 12, color: "#ef4444", content: "🔒 3 cancels today" },
  { id: 3, priority: 3, title: "Tender Breakdown", width: 350, height: 280, cornerRadius: 20, color: "#10b981", content: "💳 Cash 45% · EFTPOS 35% · Card 20%" },
  { id: 4, priority: 4, title: "Hourly Traffic", width: 400, height: 260, cornerRadius: 14, color: "#f59e0b", content: "📈 Peak: 12-2pm · 287 customers" },
  { id: 5, priority: 5, title: "Staff Performance", width: 300, height: 220, cornerRadius: 10, color: "#8b5cf6", content: "👤 Top: Krishna — $4,521" },
  { id: 6, priority: 6, title: "Site Health", width: 260, height: 180, cornerRadius: 12, color: "#06b6d4", content: "🟢 All 3 sites reporting" },
  { id: 7, priority: 7, title: "FX Rates", width: 240, height: 160, cornerRadius: 8, color: "#ec4899", content: "💱 NZD/USD 0.61 · NZD/AUD 0.93" },
  { id: 8, priority: 8, title: "Yesterday Totals", width: 310, height: 200, cornerRadius: 16, color: "#64748b", content: "📅 $48,920 · 1,247 items · 842 txns" },
];

type LayoutMode = "natural" | "justify";

export default function App() {
  const [panels, setPanels] = useState<Panel[]>(() => {
    const saved = localStorage.getItem("pt-dashboard-panels");
    return saved ? JSON.parse(saved) : DEFAULT_PANELS;
  });
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const saved = localStorage.getItem("pt-dashboard-layout");
    return (saved as LayoutMode) || "natural";
  });
  const [gapSize, setGapSize] = useState(() => {
    const saved = localStorage.getItem("pt-dashboard-gap");
    return saved ? Number(saved) : 16;
  });
  const [colWidth, setColWidth] = useState(() => {
    const saved = localStorage.getItem("pt-dashboard-colwidth");
    return saved ? Number(saved) : 280;
  });
  const [globalHeight, setGlobalHeight] = useState(() => {
    const saved = localStorage.getItem("pt-dashboard-height");
    return saved ? Number(saved) : 0;  // 0 = use per-panel heights
  });
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  // Persist
  useEffect(() => { localStorage.setItem("pt-dashboard-panels", JSON.stringify(panels)); }, [panels]);
  useEffect(() => { localStorage.setItem("pt-dashboard-layout", layoutMode); }, [layoutMode]);
  useEffect(() => { localStorage.setItem("pt-dashboard-gap", String(gapSize)); }, [gapSize]);
  useEffect(() => { localStorage.setItem("pt-dashboard-colwidth", String(colWidth)); }, [colWidth]);
  useEffect(() => { localStorage.setItem("pt-dashboard-height", String(globalHeight)); }, [globalHeight]);

  // Track window width for column count
  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const updatePanel = useCallback((id: number, changes: Partial<PanelConfig>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }, []);

  const addPanel = useCallback(() => {
    const maxId = panels.reduce((m, p) => Math.max(m, p.id), 0);
    const maxPrio = panels.reduce((m, p) => Math.max(m, p.priority), 0);
    setPanels((prev) => [...prev, {
      id: maxId + 1, priority: maxPrio + 1, title: `New Panel ${maxId + 1}`,
      width: 280, height: 200, cornerRadius: 14,
      color: `hsl(${Math.random() * 360}, 70%, 55%)`, content: "✨ Configure me",
    }]);
  }, [panels]);

  const removePanel = useCallback((id: number) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const sorted = [...panels].sort((a, b) => a.priority - b.priority);

  // Calculate column count in justify mode
  const gridCols = Math.max(1, Math.floor((winWidth - 48) / (colWidth + gapSize)));

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Top bar */}
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">PT Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {panels.length} panels · {layoutMode === "justify" ? `${gridCols} col${gridCols !== 1 ? "s" : ""} justified` : "natural flow"} · {winWidth}px wide
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Layout mode toggle */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setLayoutMode("natural")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                layoutMode === "natural"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Panels flow naturally, keeping their configured widths"
            >
              ▦ Natural
            </button>
            <button
              onClick={() => setLayoutMode("justify")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                layoutMode === "justify"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Panels stretch to justify each row edge-to-edge"
            >
              ▣ Justify
            </button>
          </div>

          {/* Gap control */}
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            Gap
            <input
              type="range" min={4} max={40} step={4} value={gapSize}
              onChange={(e) => setGapSize(Number(e.target.value))}
              className="w-16 accent-blue-500"
            />
            <span className="text-gray-500 w-7">{gapSize}px</span>
          </label>

          {/* Column width (justify mode only) */}
          {layoutMode === "justify" && (
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Col
              <input
                type="range" min={160} max={500} step={20} value={colWidth}
                onChange={(e) => setColWidth(Number(e.target.value))}
                className="w-16 accent-blue-500"
              />
              <span className="text-gray-500 w-8">{colWidth}</span>
            </label>
          )}

          {/* Global height slider */}
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            H
            <input
              type="range" min={0} max={400} step={10} value={globalHeight}
              onChange={(e) => setGlobalHeight(Number(e.target.value))}
              className="w-16 accent-blue-500"
            />
            <span className="text-gray-500 w-8">{globalHeight === 0 ? "auto" : `${globalHeight}px`}</span>
          </label>

          <button
            onClick={addPanel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Panel
          </button>
        </div>
      </header>

      {/* Dashboard grid */}
      <div
        className={
          layoutMode === "justify"
            ? "grid"
            : "flex flex-wrap"
        }
        style={
          layoutMode === "justify"
            ? {
                gridTemplateColumns: `repeat(auto-fill, minmax(${colWidth}px, 1fr))`,
                gap: `${gapSize}px`,
              }
            : {
                gap: `${gapSize}px`,
                alignItems: "flex-start",
              }
        }
      >
        {sorted.map((panel) => (
          <PanelCard
            key={panel.id}
            config={panel}
            layoutMode={layoutMode}
            globalHeight={globalHeight}
            onUpdate={(changes) => updatePanel(panel.id, changes)}
            onEdit={() => setEditPanel(panel)}
            onRemove={() => removePanel(panel.id)}
          />
        ))}
        {panels.length === 0 && (
          <div className="w-full py-20 text-center text-gray-500 col-span-full">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-lg">No panels yet</p>
            <button onClick={addPanel} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
              Create your first panel
            </button>
          </div>
        )}
      </div>

      {editPanel && (
        <ControlPanel
          panel={editPanel}
          onSave={(changes) => {
            updatePanel(editPanel.id, changes);
            setEditPanel(null);
          }}
          onClose={() => setEditPanel(null)}
        />
      )}
    </div>
  );
}
