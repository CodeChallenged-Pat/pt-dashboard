import React, { useState, useCallback, useEffect, useRef } from "react";
import PanelCard, { PanelConfig } from "./components/PanelCard";
import ControlPanel from "./components/ControlPanel";
import RowEditPanel from "./components/RowEditPanel";

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

type RowGroup = number[]; // panel IDs in this row

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
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  // Global edit mode
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const [rowGroups, setRowGroups] = useState<RowGroup[]>([]);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Persist
  useEffect(() => { localStorage.setItem("pt-dashboard-panels", JSON.stringify(panels)); }, [panels]);
  useEffect(() => { localStorage.setItem("pt-dashboard-layout", layoutMode); }, [layoutMode]);
  useEffect(() => { localStorage.setItem("pt-dashboard-gap", String(gapSize)); }, [gapSize]);
  useEffect(() => { localStorage.setItem("pt-dashboard-colwidth", String(colWidth)); }, [colWidth]);

  // Track window width
  useEffect(() => {
    const onResize = () => setWinWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Compute row groups from DOM positions
  const computeRows = useCallback(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll("[data-panel-id]");
    const tops: { id: number; top: number }[] = [];
    cards.forEach((el) => {
      const id = Number(el.getAttribute("data-panel-id"));
      const rect = el.getBoundingClientRect();
      tops.push({ id, top: rect.top });
    });
    // Sort by top, group by similar top (within 8px tolerance)
    tops.sort((a, b) => a.top - b.top);
    const groups: RowGroup[] = [];
    let current: number[] = [];
    let lastTop = -1000;
    for (const t of tops) {
      if (Math.abs(t.top - lastTop) > 8) {
        if (current.length) groups.push(current);
        current = [t.id];
        lastTop = t.top;
      } else {
        current.push(t.id);
        lastTop = t.top;
      }
    }
    if (current.length) groups.push(current);
    setRowGroups(groups);
  }, []);

  // Recompute rows on layout/panel changes + resize
  useEffect(() => {
    const timer = setTimeout(computeRows, 50);
    window.addEventListener("resize", computeRows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", computeRows);
    };
  }, [computeRows, panels, layoutMode, gapSize, colWidth, winWidth]);

  const updatePanel = useCallback((id: number, changes: Partial<PanelConfig>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }, []);

  // Batch-update a whole row
  const applyToRow = useCallback((rowIdx: number, changes: Partial<PanelConfig>) => {
    const row = rowGroups[rowIdx];
    if (!row) return;
    setPanels((prev) =>
      prev.map((p) => (row.includes(p.id) ? { ...p, ...changes } : p))
    );
  }, [rowGroups]);

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

  // Handle panel click in global edit mode
  const handlePanelClick = useCallback((panelId: number) => {
    if (!globalEditMode) return;
    const rowIdx = rowGroups.findIndex((row) => row.includes(panelId));
    if (rowIdx >= 0) {
      setSelectedRowIdx(rowIdx === selectedRowIdx ? null : rowIdx);
    }
  }, [globalEditMode, rowGroups, selectedRowIdx]);

  const selectedRow = selectedRowIdx !== null ? rowGroups[selectedRowIdx] : null;

  const sorted = [...panels].sort((a, b) => a.priority - b.priority);
  const gridCols = Math.max(1, Math.floor((winWidth - 48) / (colWidth + gapSize)));

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Top bar */}
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">PT Dashboard</h1>
          <p className="text-gray-400 text-sm">
            {panels.length} panels · {layoutMode === "justify" ? `${gridCols} cols` : "natural"} · {rowGroups.length} row{rowGroups.length !== 1 ? "s" : ""} · {winWidth}px
            {globalEditMode && <span className="text-amber-400 ml-2">⚙ Row Edit Mode</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Layout toggle */}
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button onClick={() => setLayoutMode("natural")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${layoutMode === "natural" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              ▦ Natural
            </button>
            <button onClick={() => setLayoutMode("justify")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${layoutMode === "justify" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}>
              ▣ Justify
            </button>
          </div>

          {/* Gap */}
          <label className="flex items-center gap-1.5 text-xs text-gray-400">
            Gap
            <input type="range" min={4} max={40} step={4} value={gapSize} onChange={(e) => setGapSize(Number(e.target.value))} className="w-16 accent-blue-500" />
            <span className="text-gray-500 w-7">{gapSize}px</span>
          </label>

          {/* Col width (justify only) */}
          {layoutMode === "justify" && (
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              Col
              <input type="range" min={160} max={500} step={20} value={colWidth} onChange={(e) => setColWidth(Number(e.target.value))} className="w-16 accent-blue-500" />
              <span className="text-gray-500 w-8">{colWidth}</span>
            </label>
          )}

          {/* Global edit mode toggle */}
          <button
            onClick={() => { setGlobalEditMode(!globalEditMode); setSelectedRowIdx(null); }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${
              globalEditMode ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            title="Row Edit Mode — click a panel to select its row, then batch-edit color/height/radius"
          >
            ⚙
          </button>

          <button onClick={addPanel} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            + Add Panel
          </button>
        </div>
      </header>

      {/* Dashboard grid */}
      <div ref={gridRef}
        className={layoutMode === "justify" ? "grid" : "flex flex-wrap"}
        style={layoutMode === "justify"
          ? { gridTemplateColumns: `repeat(auto-fill, minmax(${colWidth}px, 1fr))`, gap: `${gapSize}px` }
          : { gap: `${gapSize}px`, alignItems: "flex-start" }}
      >
        {sorted.map((panel) => {
          const isSelected = selectedRow?.includes(panel.id) ?? false;
          return (
            <PanelCard
              key={panel.id}
              config={panel}
              layoutMode={layoutMode}
              isSelected={isSelected}
              globalEditMode={globalEditMode}
              onClick={() => handlePanelClick(panel.id)}
              onUpdate={(changes) => updatePanel(panel.id, changes)}
              onEdit={() => setEditPanel(panel)}
              onRemove={() => removePanel(panel.id)}
            />
          );
        })}
        {panels.length === 0 && (
          <div className="w-full py-20 text-center text-gray-500 col-span-full">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-lg">No panels yet</p>
            <button onClick={addPanel} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">Create your first panel</button>
          </div>
        )}
      </div>

      {/* Row edit panel */}
      {globalEditMode && selectedRow !== null && selectedRowIdx !== null && (
        <RowEditPanel
          rowIdx={selectedRowIdx}
          panels={panels.filter((p) => selectedRow.includes(p.id))}
          onApply={(changes) => applyToRow(selectedRowIdx, changes)}
          onClose={() => setSelectedRowIdx(null)}
        />
      )}

      {/* Individual panel config */}
      {editPanel && !globalEditMode && (
        <ControlPanel
          panel={editPanel}
          onSave={(changes) => { updatePanel(editPanel.id, changes); setEditPanel(null); }}
          onClose={() => setEditPanel(null)}
        />
      )}
    </div>
  );
}
