import React, { useState, useCallback, useEffect, useRef } from "react";

export interface PanelConfig {
  priority: number;
  title: string;
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
  cornerRadius: number;
  color: string;
  content?: string;
  isLocked?: boolean;
  isMinimized?: boolean;
}
export interface Panel extends PanelConfig { id: number; }

const GRID_COLS = 12;

const DEFAULT_PANELS: Panel[] = [
  { id: 1, priority: 1, title: "Today's Sales", colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 2, cornerRadius: 16, color: "#3b82f6", content: "📊 $12,345" },
  { id: 2, priority: 2, title: "Security Events", colStart: 5, rowStart: 1, colSpan: 2, rowSpan: 1, cornerRadius: 12, color: "#ef4444", content: "🔒 3 cancels" },
  { id: 3, priority: 3, title: "Tender Breakdown", colStart: 7, rowStart: 1, colSpan: 3, rowSpan: 2, cornerRadius: 20, color: "#10b981", content: "💳 Cash 45%" },
  { id: 4, priority: 4, title: "Hourly Traffic", colStart: 10, rowStart: 1, colSpan: 3, rowSpan: 1, cornerRadius: 14, color: "#f59e0b", content: "📈 287 customers" },
  { id: 5, priority: 5, title: "Staff Performance", colStart: 5, rowStart: 2, colSpan: 2, rowSpan: 1, cornerRadius: 10, color: "#8b5cf6", content: "👤 Krishna $4,521" },
  { id: 6, priority: 6, title: "Site Health", colStart: 10, rowStart: 2, colSpan: 3, rowSpan: 1, cornerRadius: 12, color: "#06b6d4", content: "🟢 3 sites OK" },
  { id: 7, priority: 7, title: "FX Rates", colStart: 1, rowStart: 3, colSpan: 2, rowSpan: 1, cornerRadius: 8, color: "#ec4899", content: "💱 NZD/USD 0.61" },
  { id: 8, priority: 8, title: "Yesterday", colStart: 3, rowStart: 3, colSpan: 4, rowSpan: 1, cornerRadius: 16, color: "#64748b", content: "📅 $48,920 · 1,247 items" },
];

// ── Panel Card ──
function DashboardPanel({ panel, isSelected, batchMode, onClick, onResize, onMove, onEdit, onRemove, onToggleLock, gridRef, gapSize, zIndex }: {
  panel: Panel; isSelected: boolean; batchMode: boolean;
  onClick: (shift: boolean) => void; onResize: (colSpan: number, rowSpan: number) => void;
  onMove: (colStart: number, rowStart: number) => void; onEdit: () => void; onRemove: () => void;
  onToggleLock: () => void; onToggleMinimize: () => void; gridRef: React.RefObject<HTMLDivElement | null>; gapSize: number; zIndex: number;
}) {
  const { priority, title, colStart, rowStart, colSpan, rowSpan, cornerRadius, color, content, isLocked, isMinimized } = panel;
  const locked = isLocked === true;
  const glowColor = color + "33";
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  // ── Resize (corner handle) ──
  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    isResizing.current = true;
    let curCol = colSpan, curRow = rowSpan;
    let lastX = e.clientX, lastY = e.clientY;
    let accCol = 0, accRow = 0;
    const colPx = window.innerWidth / GRID_COLS;
    const rowPx = 100 + gapSize;  // grid row height + gap for snapping

    const onMoveFn = (ev: MouseEvent) => {
      const fdx = ev.clientX - lastX; const fdy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      accCol += fdx / colPx; accRow += fdy / rowPx;
      const sc = Math.round(accCol), sr = Math.round(accRow);
      let c = false;
      if (sc !== 0) { curCol = Math.max(1, Math.min(GRID_COLS, curCol + sc)); accCol -= sc; c = true; }
      if (sr !== 0) { curRow = Math.max(1, Math.min(6, curRow + sr)); accRow -= sr; c = true; }
      if (c) onResize(curCol, curRow);
    };
    const onUpFn = () => { isResizing.current = false; window.removeEventListener("mousemove", onMoveFn); window.removeEventListener("mouseup", onUpFn); onResize(curCol, curRow); };
    window.addEventListener("mousemove", onMoveFn);
    window.addEventListener("mouseup", onUpFn);
  };

  // ── Drag to move (header bar) ──
  const onHeaderDown = (e: React.MouseEvent) => {
    if (!batchMode) return;
    e.preventDefault(); e.stopPropagation();
    if (isResizing.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    const gridRect = grid.getBoundingClientRect();
    const colPx = gridRect.width / GRID_COLS;
    const rowPx = 100 + gapSize;
    let curC = colStart, curR = rowStart;
    let lastX = e.clientX, lastY = e.clientY;
    let accC = 0, accR = 0;

    const onMoveFn = (ev: MouseEvent) => {
      const fdx = ev.clientX - lastX; const fdy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      accC += fdx / colPx; accR += fdy / rowPx;
      const sc = Math.round(accC), sr = Math.round(accR);
      let c = false;
      if (sc !== 0) { curC = Math.max(1, Math.min(GRID_COLS, curC + sc)); accC -= sc; c = true; }
      if (sr !== 0) { curR = Math.max(1, Math.min(99, curR + sr)); accR -= sr; c = true; }
      if (c) onMove(curC, curR);
    };
    const onUpFn = () => { window.removeEventListener("mousemove", onMoveFn); window.removeEventListener("mouseup", onUpFn); onMove(curC, curR); };
    window.addEventListener("mousemove", onMoveFn);
    window.addEventListener("mouseup", onUpFn);
  };

  return (
    <div className={`relative group transition-all duration-200 ${batchMode ? "cursor-pointer" : ""}`}
      style={{ gridColumn: `${colStart} / span ${colSpan}`, gridRow: `${rowStart} / span ${isMinimized ? 1 : rowSpan}`, minHeight: isMinimized ? 36 : rowSpan * 100, zIndex }}
      onClick={batchMode ? (e) => { e.stopPropagation(); onClick(e.shiftKey); } : undefined}>

      {/* Glow */}
      <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50" style={{ backgroundColor: glowColor, borderRadius: `${cornerRadius}px` }} />

      {/* Card body */}
      <div className={`relative h-full border flex flex-col group-hover:shadow-lg ${isSelected ? "ring-2 ring-offset-1 ring-offset-gray-950" : ""}`}
        style={{ backgroundColor: "#1e293b", borderRadius: `${cornerRadius}px`, borderColor: isSelected ? "#f59e0b" : color + "44", boxShadow: isSelected ? `0 0 20px ${color}66` : `0 0 12px ${glowColor}` }}>
        {isSelected && <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: `${cornerRadius}px`, background: `${color}11` }} />}

        {/* Header — draggable in batch mode (unless locked) */}
        <div className={`flex items-center justify-between px-3 py-2 shrink-0 ${batchMode && !locked ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ borderBottom: isMinimized ? "none" : `1px solid ${color}33` }}
          onMouseDown={batchMode && !locked ? onHeaderDown : undefined}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: color }}>{priority}</span>
            <span className="text-xs font-semibold text-gray-100 truncate">{title}</span>
            {locked && <span className="text-[10px] text-amber-400 shrink-0" title="Locked">🔒</span>}
            {isMinimized && <span className="text-[10px] text-gray-500 shrink-0">—</span>}
          </div>
          <div className={`flex gap-1 ${batchMode ? "" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
            {batchMode && (
              <button onClick={onToggleLock}
                className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${locked ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/10 text-gray-400 hover:text-white"}`}
                title={locked ? "Unlock" : "Lock"}>🔒</button>
            )}
            <button onClick={onToggleMinimize}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-xs"
              title={isMinimized ? "Expand" : "Minimize"}>−</button>
            {!batchMode && (<>
              <button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-xs">⚙️</button>
              <DeleteButton onConfirm={onRemove} />
            </>)}
          </div>
        </div>

        {/* Content (hidden when minimized) */}
        {!isMinimized && (<>
        <div className="flex-1 flex items-center justify-center p-3 min-h-0">
          {content ? <span className="text-lg text-gray-200 text-center">{content}</span>
            : <span className="text-gray-500 text-xs">Panel content</span>}
        </div>

        {/* Resize handle (hidden if locked) */}
        {batchMode && !locked && (
          <div ref={resizeRef} onMouseDown={onResizeStart}
            className="absolute bottom-1 right-1 w-8 h-8 cursor-se-resize z-10 flex items-end justify-end rounded-br-lg hover:bg-white/5" style={{ color }}>
            <svg width="16" height="16" viewBox="0 0 12 12"><path d="M0 12V9h3L0 12zm0-6V3h3l3 3H3L0 6zm6 6V9h3l-3 3z" fill="currentColor" opacity="0.8"/></svg>
          </div>
        )}

        {/* Position footer */}
        <div className="px-3 py-1 text-[9px] text-gray-500 flex justify-between border-t border-gray-700/30 opacity-0 group-hover:opacity-100">
          <span>c{colStart}r{rowStart} · {colSpan}×{rowSpan}</span>
          <span>P{priority}</span>
        </div>
        </>)}
      </div>
    </div>
  );
}

// ── Delete confirmation button ──
function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [show, setShow] = useState(false);
  if (show) {
    return (
      <div className="flex items-center gap-1 bg-gray-800 rounded px-1 py-0.5">
        <span className="text-[10px] text-red-400">Delete?</span>
        <button onClick={() => { onConfirm(); setShow(false); }} className="w-5 h-5 flex items-center justify-center rounded bg-red-500/20 text-red-400 text-[10px] hover:bg-red-500/40">✓</button>
        <button onClick={() => setShow(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 text-[10px]">×</button>
      </div>
    );
  }
  return (
    <button onClick={() => setShow(true)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs" title="Delete">🗑️</button>
  );
}

// ── Batch Sidebar ──
function BatchSidebar({ panels, onApply, onClose }: {
  panels: Panel[]; onApply: (c: Partial<PanelConfig>) => void; onClose: () => void;
}) {
  const [colSpan, setColSpan] = useState(panels[0]?.colSpan ?? 2);
  const [rowSpan, setRowSpan] = useState(panels[0]?.rowSpan ?? 1);
  const [colStart, setColStart] = useState(panels[0]?.colStart ?? 1);
  const [rowStart, setRowStart] = useState(panels[0]?.rowStart ?? 1);
  const [cornerRadius, setCR] = useState(panels[0]?.cornerRadius ?? 14);
  const [color, setColor] = useState(panels[0]?.color ?? "#3b82f6");
  const COLS = ["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#64748b","#f97316","#84cc16"];

  return (
    <div className="fixed right-0 top-0 h-full w-64 bg-gray-900/95 border-l border-gray-700 z-50 overflow-y-auto animate-slide-in backdrop-blur-sm">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold text-white">Batch Edit</h2>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 text-xs">×</button></div>
        <p className="text-[10px] text-gray-500 mb-3">{panels.length} selected — shift+click more</p>

        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Col ({colStart})</span>
          <input type="range" min={1} max={GRID_COLS} step={1} value={colStart} onChange={e => setColStart(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Row ({rowStart})</span>
          <input type="range" min={1} max={20} step={1} value={rowStart} onChange={e => setRowStart(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Width ({colSpan})</span>
          <input type="range" min={1} max={GRID_COLS} step={1} value={colSpan} onChange={e => setColSpan(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Height ({rowSpan})</span>
          <input type="range" min={1} max={6} step={1} value={rowSpan} onChange={e => setRowSpan(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Radius ({cornerRadius}px)</span>
          <input type="range" min={0} max={40} step={2} value={cornerRadius} onChange={e => setCR(+e.target.value)} className="w-full accent-blue-500" /></label>

        <div className="mb-3"><span className="text-[10px] text-gray-400 block mb-1">Color</span>
          <div className="flex flex-wrap gap-1 mb-1">{COLS.map(c => <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: color===c?"#fff":"transparent" }} />)}</div></div>

        <button onClick={() => onApply({ colStart, rowStart, colSpan, rowSpan, cornerRadius, color })}
          className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-bold mb-2">Apply to {panels.length}</button>

        <div className="border-t border-gray-700/50 pt-1">{panels.map(p => <div key={p.id} className="flex items-center gap-1 py-0.5 text-[9px] text-gray-400">
          <span className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0" style={{ backgroundColor: p.color }}>{p.priority}</span>
          <span className="truncate">{p.title}</span></div>)}</div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in{animation:slideIn .15s ease-out}`}</style>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [panels, setPanels] = useState<Panel[]>(() => {
    const s = localStorage.getItem("ptdash-panels-v2");
    return s ? JSON.parse(s) : DEFAULT_PANELS;
  });
  const [editPanel, setEditPanel] = useState<Panel | null>(null);
  const [gapSize, setGapSize] = useState(() => { const s = localStorage.getItem("ptdash-gap"); return s ? +s : 12; });
  const [batchMode, setBatchMode] = useState(false);
  const [dockMode, setDockMode] = useState<'full' | 'left' | 'right'>('full');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [zCounter, setZCounter] = useState(0);
  const [panelZIndex, setPanelZIndex] = useState<Record<number, number>>({});
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("ptdash-panels-v2", JSON.stringify(panels)); }, [panels]);
  useEffect(() => { localStorage.setItem("ptdash-gap", String(gapSize)); }, [gapSize]);

  const updatePanel = useCallback((id: number, changes: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }, []);
  const applyBatch = useCallback((changes: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, ...changes } : p));
  }, [selectedIds]);
  const toggleSelect = useCallback((id: number, shift: boolean) => {
    setSelectedIds(prev => { if (!shift) return new Set([id]); const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    // Bring to front
    setZCounter(c => { const next = c + 1; setPanelZIndex(p => ({ ...p, [id]: next })); return next; });
  }, []);

  const toggleLock = useCallback((id: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, isLocked: !p.isLocked } : p));
  }, []);

  const toggleMinimize = useCallback((id: number) => {
    setPanels(prev => {
      const panel = prev.find(p => p.id === id);
      if (!panel) return prev;
      const willMinimize = !panel.isMinimized;
      let updated = prev.map(p => p.id === id ? { ...p, isMinimized: willMinimize } : p);
      if (willMinimize) {
        // Shift panels below up into freed space
        updated = updated.map(p => {
          if (p.id === id || p.rowStart <= panel.rowStart) return p;
          if (p.isLocked) return p;
          // Check if this panel overlaps horizontally with the minimized one
          const pEnd = p.colStart + p.colSpan;
          const mEnd = panel.colStart + panel.colSpan;
          const overlap = p.colStart < mEnd && pEnd > panel.colStart;
          if (overlap) {
            const shift = panel.rowSpan - 1; // freed rows (minimized = 1 row, was rowSpan)
            if (shift > 0) return { ...p, rowStart: Math.max(1, p.rowStart - shift) };
          }
          return p;
        });
      }
      return updated;
    });
  }, []);

  const cycleDock = useCallback(() => {
    setDockMode(prev => prev === 'full' ? 'right' : prev === 'right' ? 'left' : 'full');
  }, []);

  const addPanel = useCallback(() => {
    const maxId = panels.reduce((m, p) => Math.max(m, p.id), 0);
    const maxP = panels.reduce((m, p) => Math.max(m, p.priority), 0);
    setPanels(prev => [...prev, { id: maxId+1, priority: maxP+1, title: `Panel ${maxId+1}`, colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 1, cornerRadius: 14, color: `hsl(${Math.random()*360},70%,55%)`, content: "✨" }]);
  }, [panels]);

  // Auto-layout panels to avoid overlapping
  const scatterPanels = useCallback(() => {
    const sorted = [...panels].sort((a, b) => a.priority - b.priority);
    const locked = panels.filter(p => p.isLocked);
    const unlocked = sorted.filter(p => !p.isLocked);
    const occupied = new Set<string>();
    // Mark locked panel positions as occupied
    locked.forEach(p => {
      for (let dr = 0; dr < p.rowSpan; dr++)
        for (let dc = 0; dc < p.colSpan; dc++)
          occupied.add(`${p.colStart + dc}-${p.rowStart + dr}`);
    });
    const scattered = unlocked.map(p => {
      let r = 1, c = 1;
      outer: for (r = 1; r <= 50; r++) {
        for (c = 1; c <= GRID_COLS - p.colSpan + 1; c++) {
          let fits = true;
          for (let dr = 0; dr < p.rowSpan && fits; dr++)
            for (let dc = 0; dc < p.colSpan && fits; dc++)
              if (occupied.has(`${c + dc}-${r + dr}`)) fits = false;
          if (fits) break outer;
        }
      }
      for (let dr = 0; dr < p.rowSpan; dr++)
        for (let dc = 0; dc < p.colSpan; dc++)
          occupied.add(`${c + dc}-${r + dr}`);
      return { ...p, colStart: c, rowStart: r };
    });
    setPanels([...locked, ...scattered]);
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
          {batchMode && (<>
            <label className="flex items-center gap-1 text-[10px] text-gray-400">Gap
            <input type="range" min={4} max={32} step={4} value={gapSize} onChange={e => setGapSize(+e.target.value)} className="w-12 accent-blue-500" /></label>
            <button onClick={scatterPanels} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs font-medium" title="Auto-layout panels so none overlap">↔ Scatter</button>
            <button onClick={addPanel} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium">+ Panel</button>
          </>)}
          <button onClick={cycleDock}
            className={`w-9 h-9 flex items-center justify-center rounded text-sm ${dockMode !== 'full' ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title={`Dock: ${dockMode === 'full' ? 'Full screen' : dockMode === 'right' ? 'Docked right' : 'Docked left'} — click to cycle`}>⊞</button>
          <button onClick={() => { setBatchMode(!batchMode); setSelectedIds(new Set()); }}
            className={`w-9 h-9 flex items-center justify-center rounded text-base ${batchMode ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Batch mode — shift+click to select, drag header to move, drag corner to resize">⚙</button>
        </div>
      </header>

      <div ref={gridRef} className="grid"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: `${gapSize}px`, gridAutoRows: "100px",
          marginRight: sidebarOpen ? "256px" : 0, transition: "margin-right 0.15s ease-out" }}>
        {sorted.map(p => (
          <DashboardPanel key={p.id} panel={p} gridRef={gridRef} batchMode={batchMode} gapSize={gapSize} zIndex={panelZIndex[p.id] || 0} onToggleLock={() => toggleLock(p.id)} onToggleMinimize={() => toggleMinimize(p.id)}
            isSelected={selectedIds.has(p.id)} onClick={(shift) => toggleSelect(p.id, shift)}
            onResize={(colSpan, rowSpan) => updatePanel(p.id, { colSpan, rowSpan })}
            onMove={(colStart, rowStart) => updatePanel(p.id, { colStart, rowStart })}
            onEdit={() => setEditPanel(p)} onRemove={() => removePanel(p.id)} />
        ))}
      </div>

      {sidebarOpen && (<BatchSidebar panels={selectedPanels} onApply={applyBatch} onClose={() => setSelectedIds(new Set())} />)}

      {editPanel && !batchMode && (
        <div className="fixed right-0 top-0 h-full w-72 bg-gray-900/95 border-l border-gray-700 z-50 overflow-y-auto animate-slide-in backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-white">Edit Panel</h2><button onClick={() => setEditPanel(null)} className="text-gray-400 hover:text-white">×</button></div>
          <label className="block mb-2"><span className="text-[10px] text-gray-400">Title</span>
            <input value={editPanel.title} onChange={e => updatePanel(editPanel.id, { title: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs" /></label>
          <label className="block mb-2"><span className="text-[10px] text-gray-400">Col ({editPanel.colStart})</span>
            <input type="range" min={1} max={GRID_COLS} value={editPanel.colStart} onChange={e => updatePanel(editPanel.id, { colStart: +e.target.value })} className="w-full accent-blue-500" /></label>
          <label className="block mb-2"><span className="text-[10px] text-gray-400">Row ({editPanel.rowStart})</span>
            <input type="range" min={1} max={20} value={editPanel.rowStart} onChange={e => updatePanel(editPanel.id, { rowStart: +e.target.value })} className="w-full accent-blue-500" /></label>
          <label className="block mb-2"><span className="text-[10px] text-gray-400">Width ({editPanel.colSpan})</span>
            <input type="range" min={1} max={GRID_COLS} value={editPanel.colSpan} onChange={e => updatePanel(editPanel.id, { colSpan: +e.target.value })} className="w-full accent-blue-500" /></label>
          <label className="block mb-2"><span className="text-[10px] text-gray-400">Height ({editPanel.rowSpan})</span>
            <input type="range" min={1} max={6} value={editPanel.rowSpan} onChange={e => updatePanel(editPanel.id, { rowSpan: +e.target.value })} className="w-full accent-blue-500" /></label>
          <label className="block mb-2"><span className="text-[10px] text-gray-400">Radius ({editPanel.cornerRadius})</span>
            <input type="range" min={0} max={40} value={editPanel.cornerRadius} onChange={e => updatePanel(editPanel.id, { cornerRadius: +e.target.value })} className="w-full accent-blue-500" /></label>
        </div>
      )}
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in{animation:slideIn .15s ease-out}`}</style>
    </div>
  );
}
