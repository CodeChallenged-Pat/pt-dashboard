import React, { useState, useCallback, useEffect, useRef } from "react";

export interface PanelConfig {
  priority: number;
  title: string;
  colSpan: number;    // columns this panel spans
  rowSpan: number;    // rows this panel spans
  cornerRadius: number;
  color: string;
  content?: string;
}

export interface Panel extends PanelConfig {
  id: number;
}

const GRID_COLS = 6;  // fixed column count — scales with window

const DEFAULT_PANELS: Panel[] = [
  { id: 1, priority: 1, title: "Today's Sales", colSpan: 2, rowSpan: 2, cornerRadius: 16, color: "#3b82f6", content: "📊 $12,345" },
  { id: 2, priority: 2, title: "Security Events", colSpan: 1, rowSpan: 1, cornerRadius: 12, color: "#ef4444", content: "🔒 3 cancels" },
  { id: 3, priority: 3, title: "Tender Breakdown", colSpan: 2, rowSpan: 2, cornerRadius: 20, color: "#10b981", content: "💳 Cash 45% · EFTPOS 35%" },
  { id: 4, priority: 4, title: "Hourly Traffic", colSpan: 3, rowSpan: 2, cornerRadius: 14, color: "#f59e0b", content: "📈 Peak 12-2pm · 287 customers" },
  { id: 5, priority: 5, title: "Staff Performance", colSpan: 1, rowSpan: 1, cornerRadius: 10, color: "#8b5cf6", content: "👤 Top: Krishna $4,521" },
  { id: 6, priority: 6, title: "Site Health", colSpan: 1, rowSpan: 1, cornerRadius: 12, color: "#06b6d4", content: "🟢 3 sites OK" },
  { id: 7, priority: 7, title: "FX Rates", colSpan: 1, rowSpan: 1, cornerRadius: 8, color: "#ec4899", content: "💱 NZD/USD 0.61" },
  { id: 8, priority: 8, title: "Yesterday", colSpan: 2, rowSpan: 1, cornerRadius: 16, color: "#64748b", content: "📅 $48,920 · 1,247 items" },
];

// Panel component — renders in a grid cell with resize handle
function DashboardPanel({
  panel, isSelected, batchMode, onClick, onResize, onEdit, onRemove,
}: {
  panel: Panel; isSelected: boolean; batchMode: boolean;
  onClick: (shift: boolean) => void; onResize: (colSpan: number, rowSpan: number) => void;
  onEdit: () => void; onRemove: () => void;
}) {
  const { priority, title, colSpan, rowSpan, cornerRadius, color, content } = panel;
  const glowColor = color + "33";
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0, col: colSpan, row: rowSpan });

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY, col: colSpan, row: rowSpan };

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startPos.current.x;
      const dy = ev.clientY - startPos.current.y;
      // ~150px/col, ~120px/row — snap to grid
      const newCol = Math.max(1, Math.min(GRID_COLS, startPos.current.col + Math.round(dx / 150)));
      const newRow = Math.max(1, Math.min(6, startPos.current.row + Math.round(dy / 120)));
      // Update the ref so onUp has the final values
      startPos.current.col = newCol;
      startPos.current.row = newRow;
      onResize(newCol, newRow);
    };

    const onUp = () => {
      isResizing.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Commit final size from last known position
      onResize(startPos.current.col, startPos.current.row);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={`relative group transition-all duration-200 ${batchMode ? "cursor-pointer" : ""}`}
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        minHeight: rowSpan * 100,
      }}
      onClick={batchMode ? (e) => { e.stopPropagation(); onClick(e.shiftKey); } : undefined}
    >
      {/* Resize handle (always visible in batch mode, hover in normal) */}
      {batchMode && (
        <div
          ref={resizeRef}
          onMouseDown={onResizeStart}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10 flex items-end justify-end p-0.5"
          style={{ color: color }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M0 12V9h3L0 12zm0-6V3h3l3 3H3L0 6zm6 6V9h3l-3 3z" fill="currentColor" opacity="0.6"/></svg>
        </div>
      )}

      {/* Glow */}
      <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50"
        style={{ backgroundColor: glowColor, borderRadius: `${cornerRadius}px` }} />

      {/* Card body */}
      <div className={`relative h-full border flex flex-col group-hover:shadow-lg ${isSelected ? "ring-2 ring-offset-1 ring-offset-gray-950" : ""}`}
        style={{ backgroundColor: "#1e293b", borderRadius: `${cornerRadius}px`, borderColor: isSelected ? "#f59e0b" : color + "44", boxShadow: isSelected ? `0 0 20px ${color}66` : `0 0 12px ${glowColor}` }}>
        {isSelected && <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: `${cornerRadius}px`, background: `${color}11` }} />}
        <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: `1px solid ${color}33` }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: color }}>{priority}</span>
            <span className="text-xs font-semibold text-gray-100 truncate">{title}</span>
          </div>
          <div className={`flex gap-1 ${batchMode ? "hidden" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
            <button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-xs">⚙️</button>
            <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs">×</button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-3 min-h-0">
          {content ? <span className="text-lg text-gray-200 text-center">{content}</span>
            : <span className="text-gray-500 text-xs">Panel content</span>}
        </div>
        <div className="px-3 py-1 text-[9px] text-gray-500 flex justify-between border-t border-gray-700/30 opacity-0 group-hover:opacity-100">
          <span>{colSpan}×{rowSpan}</span>
          <span>P{priority}</span>
        </div>
      </div>
    </div>
  );
}

// ── Batch Edit Sidebar ──
function BatchSidebar({ panels, onApply, onClose }: {
  panels: Panel[]; onApply: (c: Partial<PanelConfig>) => void; onClose: () => void;
}) {
  const [colSpan, setColSpan] = useState(panels[0]?.colSpan ?? 2);
  const [rowSpan, setRowSpan] = useState(panels[0]?.rowSpan ?? 1);
  const [cornerRadius, setCR] = useState(panels[0]?.cornerRadius ?? 14);
  const [color, setColor] = useState(panels[0]?.color ?? "#3b82f6");
  const COLS = ["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#64748b","#f97316","#84cc16"];

  return (
    <div className="fixed right-0 top-0 h-full w-64 bg-gray-900/95 border-l border-gray-700 z-50 overflow-y-auto animate-slide-in backdrop-blur-sm">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white">Batch Edit</h2>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 text-xs">×</button>
        </div>
        <p className="text-[10px] text-gray-500 mb-3">{panels.length} selected — shift+click more</p>

        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Cols ({colSpan})</span>
          <input type="range" min={1} max={GRID_COLS} step={1} value={colSpan} onChange={e => setColSpan(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Rows ({rowSpan})</span>
          <input type="range" min={1} max={6} step={1} value={rowSpan} onChange={e => setRowSpan(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Radius ({cornerRadius}px)</span>
          <input type="range" min={0} max={40} step={2} value={cornerRadius} onChange={e => setCR(+e.target.value)} className="w-full accent-blue-500" /></label>

        <div className="mb-3">
          <span className="text-[10px] text-gray-400 block mb-1">Color</span>
          <div className="flex flex-wrap gap-1 mb-1">{COLS.map(c => <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: color===c?"#fff":"transparent" }} />)}</div>
        </div>

        <button onClick={() => onApply({ colSpan, rowSpan, cornerRadius, color })}
          className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-bold mb-2">
          Apply to {panels.length}
        </button>

        <div className="border-t border-gray-700/50 pt-1">
          {panels.map(p => <div key={p.id} className="flex items-center gap-1 py-0.5 text-[9px] text-gray-400">
            <span className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0" style={{ backgroundColor: p.color }}>{p.priority}</span>
            <span className="truncate">{p.title}</span></div>)}
        </div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in{animation:slideIn .15s ease-out}`}</style>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [panels, setPanels] = useState<Panel[]>(() => {
    const s = localStorage.getItem("ptdash-panels");
    return s ? JSON.parse(s) : DEFAULT_PANELS;
  });
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [gapSize, setGapSize] = useState(() => {
    const s = localStorage.getItem("ptdash-gap");
    return s ? +s : 12;
  });
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [winWidth, setWinWidth] = useState(window.innerWidth);

  useEffect(() => { localStorage.setItem("ptdash-panels", JSON.stringify(panels)); }, [panels]);
  useEffect(() => { localStorage.setItem("ptdash-gap", String(gapSize)); }, [gapSize]);
  useEffect(() => { const f = () => setWinWidth(window.innerWidth); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);

  const updatePanel = useCallback((id: number, changes: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }, []);

  const applyBatch = useCallback((changes: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, ...changes } : p));
  }, [selectedIds]);

  const toggleSelect = useCallback((id: number, shift: boolean) => {
    setSelectedIds(prev => {
      if (!shift) return new Set([id]);
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
  }, []);

  const addPanel = useCallback(() => {
    const maxId = panels.reduce((m, p) => Math.max(m, p.id), 0);
    const maxP = panels.reduce((m, p) => Math.max(m, p.priority), 0);
    setPanels(prev => [...prev, { id: maxId+1, priority: maxP+1, title: `Panel ${maxId+1}`, colSpan: 1, rowSpan: 1, cornerRadius: 14, color: `hsl(${Math.random()*360},70%,55%)`, content: "✨" }]);
  }, [panels]);

  const removePanel = useCallback((id: number) => {
    setPanels(prev => prev.filter(p => p.id !== id));
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, []);

  const sorted = [...panels].sort((a, b) => a.priority - b.priority);
  const selectedPanels = panels.filter(p => selectedIds.has(p.id));
  const sidebarOpen = batchMode && selectedPanels.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <header className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-white">PT Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1 text-[10px] text-gray-400">Gap
            <input type="range" min={4} max={32} step={4} value={gapSize} onChange={e => setGapSize(+e.target.value)} className="w-12 accent-blue-500" />
          </label>
          <button onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            className={`w-8 h-8 flex items-center justify-center rounded text-xs ${batchMode ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Batch mode">⚙</button>
          <button onClick={addPanel} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium">+ Panel</button>
        </div>
      </header>

      {/* Grid: fixed columns, scales with window */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: `${gapSize}px`,
          marginRight: sidebarOpen ? "256px" : 0,
          transition: "margin-right 0.15s ease-out",
        }}
      >
        {sorted.map(p => (
          <DashboardPanel key={p.id} panel={p}
            batchMode={batchMode}
            isSelected={selectedIds.has(p.id)}
            onClick={(shift) => toggleSelect(p.id, shift)}
            onResize={(colSpan, rowSpan) => updatePanel(p.id, { colSpan, rowSpan })}
            onEdit={() => setEditPanel(p)}
            onRemove={() => removePanel(p.id)} />
        ))}
      </div>

      {/* Batch sidebar */}
      {sidebarOpen && (
        <BatchSidebar panels={selectedPanels} onApply={applyBatch} onClose={() => setSelectedIds(new Set())} />
      )}

      {/* Individual config — no backdrop, panels stay clickable */}
      {editPanel && !batchMode && (
        <div className="fixed right-0 top-0 h-full w-72 bg-gray-900/95 border-l border-gray-700 z-50 overflow-y-auto animate-slide-in backdrop-blur-sm p-4" style={{ marginRight: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Edit Panel</h2>
              <button onClick={() => setEditPanel(null)} className="text-gray-400 hover:text-white">×</button>
            </div>
            <label className="block mb-2"><span className="text-[10px] text-gray-400">Title</span>
              <input value={editPanel.title} onChange={e => updatePanel(editPanel.id, { title: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs" /></label>
            <label className="block mb-2"><span className="text-[10px] text-gray-400">Cols ({editPanel.colSpan})</span>
              <input type="range" min={1} max={GRID_COLS} value={editPanel.colSpan} onChange={e => updatePanel(editPanel.id, { colSpan: +e.target.value })} className="w-full accent-blue-500" /></label>
            <label className="block mb-2"><span className="text-[10px] text-gray-400">Rows ({editPanel.rowSpan})</span>
              <input type="range" min={1} max={6} value={editPanel.rowSpan} onChange={e => updatePanel(editPanel.id, { rowSpan: +e.target.value })} className="w-full accent-blue-500" /></label>
            <label className="block mb-2"><span className="text-[10px] text-gray-400">Radius ({editPanel.cornerRadius})</span>
              <input type="range" min={0} max={40} value={editPanel.cornerRadius} onChange={e => updatePanel(editPanel.id, { cornerRadius: +e.target.value })} className="w-full accent-blue-500" /></label>
          </div>
      )}

      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in{animation:slideIn .15s ease-out}`}</style>
    </div>
  );
}
