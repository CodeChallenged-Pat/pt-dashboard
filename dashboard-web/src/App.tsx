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

export default function App() {
  const [panels, setPanels] = useState<Panel[]>(() => {
    const saved = localStorage.getItem("pt-dashboard-panels");
    return saved ? JSON.parse(saved) : DEFAULT_PANELS;
  });
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [columnCount, setColumnCount] = useState(3);

  // Persist panels
  useEffect(() => {
    localStorage.setItem("pt-dashboard-panels", JSON.stringify(panels));
  }, [panels]);

  // Track column count based on container width
  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth;
      if (w < 640) setColumnCount(1);
      else if (w < 1024) setColumnCount(2);
      else setColumnCount(3);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const updatePanel = useCallback((id: number, changes: Partial<PanelConfig>) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...changes } : p))
    );
  }, []);

  const addPanel = useCallback(() => {
    const maxId = panels.reduce((m, p) => Math.max(m, p.id), 0);
    const maxPrio = panels.reduce((m, p) => Math.max(m, p.priority), 0);
    setPanels((prev) => [
      ...prev,
      {
        id: maxId + 1,
        priority: maxPrio + 1,
        title: `New Panel ${maxId + 1}`,
        width: 280,
        height: 200,
        cornerRadius: 14,
        color: `hsl(${Math.random() * 360}, 70%, 55%)`,
        content: "✨ Configure me",
      },
    ]);
  }, [panels]);

  const removePanel = useCallback((id: number) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Sort by priority
  const sorted = [...panels].sort((a, b) => a.priority - b.priority);

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Top bar */}
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">PT Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {panels.length} panels · {columnCount} column{columnCount > 1 ? "s" : ""} ·{" "}
            {window.innerWidth}px wide
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addPanel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Panel
          </button>
        </div>
      </header>

      {/* Dashboard grid — flow layout, priority ordered */}
      <div
        className="flex flex-wrap gap-4"
        style={{ alignItems: "flex-start" }}
      >
        {sorted.map((panel) => (
          <PanelCard
            key={panel.id}
            config={panel}
            onUpdate={(changes) => updatePanel(panel.id, changes)}
            onEdit={() => setEditPanel(panel)}
            onRemove={() => removePanel(panel.id)}
          />
        ))}
        {panels.length === 0 && (
          <div className="w-full py-20 text-center text-gray-500">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-lg">No panels yet</p>
            <button
              onClick={addPanel}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
            >
              Create your first panel
            </button>
          </div>
        )}
      </div>

      {/* Control panel for editing a panel */}
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
