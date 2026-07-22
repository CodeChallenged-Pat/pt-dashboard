import React, { useState, useCallback, useEffect, useRef, ReactNode } from "react";

// ═══════════════════════════════════════════════
//  Chart Components
// ═══════════════════════════════════════════════

// 1. StatCard — large number + label + delta indicator
function StatCard({ value, label, delta, deltaLabel, color }: {
  value: string; label: string; delta?: number; deltaLabel?: string; color: string;
}) {
  const isPositive = delta !== undefined && delta >= 0;
  const deltaStr = delta !== undefined ? `${isPositive ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%` : '';
  return (
    <div className="flex flex-col items-center justify-center h-full gap-1.5">
      <div className="text-4xl font-bold tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
      {delta !== undefined && (
        <div className={`text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {deltaStr} {deltaLabel && <span className="text-gray-500 font-normal">vs {deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

// 2. LineChart — simple SVG polyline with weekday labels, avg line, weekend shading
function LineChart({ data, color, valueLabel, avgValue, weekdayLabels }: {
  data: { label: string; value: number; isWeekend?: boolean }[]; color: string; valueLabel?: string;
  avgValue?: number; weekdayLabels?: string[];
}) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-gray-500 text-xs">No data</div>;
  const W = 400, H = 240;
  const pad = { top: 15, right: 8, bottom: 36, left: 40 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.value), Math.max(avgValue || 0, 1));
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
    const y = pad.top + plotH - ((d.value - minVal) / range) * plotH;
    return `${x},${y}`;
  }).join(' ');

  const yTicks = 4;
  const xStep = data.length / plotW; // items per pixel

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Chart area background */}
      <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="#1e293b" rx="4" opacity="0.5" />

      {/* Weekend shading */}
      {data.map((d, i) => {
        if (!d.isWeekend) return null;
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
        const barW = plotW / data.length;
        return <rect key={`we-${i}`} x={x - barW / 2} y={pad.top} width={barW} height={plotH} fill="#334155" opacity="0.4" />;
      })}

      {/* Grid lines */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const y = pad.top + (i / yTicks) * plotH;
        return <line key={`g-${i}`} x1={pad.left} y1={y} x2={pad.left + plotW} y2={y} stroke="#334155" strokeWidth="0.5" />;
      })}
      {/* Y-axis labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = maxVal - (i / yTicks) * range;
        const y = pad.top + (i / yTicks) * plotH;
        const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0);
        return <text key={`y-${i}`} x={pad.left - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="9">{label}</text>;
      })}
      {/* Average line */}
      {avgValue !== undefined && avgValue > 0 && (
        <>
          <line x1={pad.left} y1={pad.top + plotH - ((avgValue - minVal) / range) * plotH}
                x2={pad.left + plotW} y2={pad.top + plotH - ((avgValue - minVal) / range) * plotH}
                stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" />
          <rect x={pad.left + plotW - 44} y={pad.top + plotH - ((avgValue - minVal) / range) * plotH - 10}
                width="44" height="20" rx="3" fill="#0f172a" opacity="0.85" />
          <text x={pad.left + plotW - 4} y={pad.top + plotH - ((avgValue - minVal) / range) * plotH - 2}
                textAnchor="end" fill="#64748b" fontSize="7">avg</text>
          <text x={pad.left + plotW - 4} y={pad.top + plotH - ((avgValue - minVal) / range) * plotH + 7}
                textAnchor="end" fill="#94a3b8" fontSize="8" fontWeight="bold">
            ${avgValue >= 1000 ? (avgValue/1000).toFixed(1) + 'k' : avgValue.toFixed(0)}
          </text>
        </>
      )}
      {/* Area fill */}
      {(() => {
        const areaPoints = `${pad.left},${pad.top + plotH} ` + points + ` ${pad.left + plotW},${pad.top + plotH}`;
        return <polygon points={areaPoints} fill={color} opacity="0.1" />;
      })()}
      {/* Line */}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots */}
      {data.map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
        const y = pad.top + plotH - ((d.value - minVal) / range) * plotH;
        return <circle key={`dot-${i}`} cx={x} cy={y} r="2.5" fill={color} />;
      })}
      {/* X-axis labels — day name + date */}
      {data.map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * plotW;
        const dayName = weekdayLabels ? weekdayLabels[i] : '';
        return (
          <g key={`x-${i}`}>
            {dayName && <text x={x} y={H - 14} textAnchor="middle" fill="#64748b" fontSize="7">{dayName}</text>}
            <text x={x} y={H - 3} textAnchor="middle" fill="#64748b" fontSize="8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// 3. BarChart — horizontal bars
function BarChart({ data, color, valueLabel }: {
  data: { label: string; value: number }[]; color: string; valueLabel?: string;
}) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-gray-500 text-xs">No data</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex flex-col gap-2 w-full h-full justify-center px-2">
      {data.map((d, i) => {
        const pct = (d.value / maxVal) * 100;
        return (
          <div key={d.label} className="flex items-center gap-2">
            <div className="w-20 text-right shrink-0">
              <span className="text-[10px] text-gray-400 truncate block" title={d.label}>{d.label}</span>
            </div>
            <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden relative">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }} />
            </div>
            <span className="text-[10px] text-gray-300 w-14 shrink-0 text-right">
              {valueLabel === '$' ? '$' : ''}{d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 4. PieChart — SVG circle segments
function PieChart({ data }: {
  data: { label: string; value: number; color: string }[];
}) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-gray-500 text-xs">No data</div>;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 160;
  const cx = size / 2, cy = size / 2, r = size / 2 - 5;

  let cumulativeAngle = -Math.PI / 2;
  const slices = data.map(d => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = r * 0.6;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const pct = ((d.value / total) * 100).toFixed(1);

    return { pathD, color: d.color, label: d.label, pct, lx, ly };
  });

  const PIE_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];
  return (
    <div className="flex flex-col items-center gap-2 h-full justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.pathD} fill={s.color || PIE_COLORS[i % PIE_COLORS.length]} stroke="#1e293b" strokeWidth="1.5" />
            {parseFloat(s.pct) >= 5 && (
              <text x={s.lx} y={s.ly + 1} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">{s.pct}%</text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color || PIE_COLORS[i % PIE_COLORS.length] }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. DataTable — simple HTML table
function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <div className="flex items-center justify-center h-full text-gray-500 text-xs">No data</div>;
  return (
    <div className="overflow-auto max-h-full w-full">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-[#1e293b]">
          <tr className="border-b border-gray-700">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1.5 px-2 text-gray-400 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="py-1 px-2 text-gray-300 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Panel Types & Defaults
// ═══════════════════════════════════════════════

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
  chartType?: string;
  isLocked?: boolean;
  isMinimized?: boolean;
  titleColor?: string;
  titleFont?: string;
  headerBg?: string;
  bodyBg?: string;
  borderWidth?: number;
  titleAlign?: string;
}
export interface Panel extends PanelConfig { id: number; }

const GRID_COLS = 12;

const DEFAULT_PANELS: Panel[] = [
  { id: 1, priority: 1, title: "Today's Sales",    colStart: 1,  rowStart: 1, colSpan: 4, rowSpan: 3, cornerRadius: 16, color: "#3b82f6", chartType: "stat-today" },
  { id: 2, priority: 2, title: "Yesterday",         colStart: 5,  rowStart: 1, colSpan: 4, rowSpan: 3, cornerRadius: 14, color: "#64748b", chartType: "stat-yesterday" },
  { id: 3, priority: 3, title: "This Week",         colStart: 9,  rowStart: 1, colSpan: 4, rowSpan: 3, cornerRadius: 14, color: "#10b981", chartType: "stat-week" },
  { id: 4, priority: 4, title: "Daily Sales (14d)", colStart: 1,  rowStart: 4, colSpan: 6, rowSpan: 5, cornerRadius: 14, color: "#f59e0b", chartType: "line-daily-sales" },
  { id: 5, priority: 5, title: "Tender Breakdown",  colStart: 7,  rowStart: 4, colSpan: 3, rowSpan: 5, cornerRadius: 14, color: "#ec4899", chartType: "pie-tender" },
  { id: 6, priority: 6, title: "Hourly Traffic",    colStart: 10, rowStart: 4, colSpan: 3, rowSpan: 5, cornerRadius: 14, color: "#06b6d4", chartType: "line-hourly" },
  { id: 7, priority: 7, title: "Clerk Performance", colStart: 1,  rowStart: 9, colSpan: 5, rowSpan: 5, cornerRadius: 14, color: "#8b5cf6", chartType: "bar-clerks" },
  { id: 8, priority: 8, title: "Clerk Details",     colStart: 6,  rowStart: 9, colSpan: 7, rowSpan: 5, cornerRadius: 14, color: "#ef4444", chartType: "table-clerks" },
];

// ═══════════════════════════════════════════════
//  DashboardPanel
// ═══════════════════════════════════════════════

function DashboardPanel({ panel, isSelected, batchMode, onClick, onResize, onMove, onEdit, onRemove, onToggleLock, onToggleMinimize, gridRef, gapSize, zIndex, children }: {
  panel: Panel; isSelected: boolean; batchMode: boolean;
  onClick: (shift: boolean) => void; onResize: (colSpan: number, rowSpan: number) => void;
  onMove: (colStart: number, rowStart: number) => void; onEdit: () => void; onRemove: () => void;
  onToggleLock: () => void; onToggleMinimize: () => void; gridRef: React.RefObject<HTMLDivElement | null>; gapSize: number; zIndex: number;
  children?: ReactNode;
}) {
  const { priority, title, colStart, rowStart, colSpan, rowSpan, cornerRadius, color, content, isLocked, isMinimized, titleColor, titleFont, headerBg, bodyBg, borderWidth, titleAlign } = panel;
  const locked = isLocked === true;
  const headerColor = titleColor || color;
  const headerFont = titleFont || "inherit";
  const bw = borderWidth || 1;
  const ta = titleAlign || "left";
  const glowColor = color + "33";
  const resizeRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    isResizing.current = true;
    let curCol = colSpan, curRow = rowSpan;
    let lastX = e.clientX, lastY = e.clientY;
    let accCol = 0, accRow = 0;
    const gridRect = gridRef.current?.getBoundingClientRect();
    const colPx = gridRect ? (gridRect.width - (GRID_COLS - 1) * gapSize) / GRID_COLS : window.innerWidth / GRID_COLS;
    const rowPx = 40 + gapSize;

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

  const onHeaderDown = (e: React.MouseEvent) => {
    if (!batchMode) return;
    e.preventDefault(); e.stopPropagation();
    if (isResizing.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    const gridRect = grid.getBoundingClientRect();
    const colPx = (gridRect.width - (GRID_COLS - 1) * gapSize) / GRID_COLS;
    const rowPx = 40 + gapSize;
    let curC = colStart, curR = rowStart;
    let lastX = e.clientX, lastY = e.clientY;
    let accC = 0, accR = 0;

    const onMoveFn = (ev: MouseEvent) => {
      const fdx = ev.clientX - lastX; const fdy = ev.clientY - lastY;
      lastX = ev.clientX; lastY = ev.clientY;
      accC += fdx / colPx; accR += fdy / rowPx;
      const sc = Math.round(accC), sr = Math.round(accR);
      let c = false;
      if (sc !== 0) {
        curC = Math.max(1, Math.min(GRID_COLS - colSpan + 1, curC + sc));
        accC -= sc; c = true;
      }
      if (sr !== 0) { curR = Math.max(1, Math.min(99, curR + sr)); accR -= sr; c = true; }
      if (c) onMove(curC, curR);
    };
    const onUpFn = () => { window.removeEventListener("mousemove", onMoveFn); window.removeEventListener("mouseup", onUpFn); onMove(curC, curR); };
    window.addEventListener("mousemove", onMoveFn);
    window.addEventListener("mouseup", onUpFn);
  };

  return (
    <div className={`relative group transition-all duration-200 ${batchMode ? "cursor-pointer" : ""}`}
      style={{ gridColumn: `${colStart} / span ${colSpan}`, gridRow: `${rowStart} / span ${isMinimized ? 1 : rowSpan}`, minHeight: isMinimized ? 36 : rowSpan * (40 + gapSize), zIndex }}
      onClick={batchMode ? (e) => { e.stopPropagation(); onClick(e.shiftKey); } : undefined}>

      <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50" style={{ backgroundColor: glowColor, borderRadius: `${cornerRadius}px` }} />

      <div className={`relative h-full flex flex-col group-hover:shadow-lg ${isSelected ? "ring-2 ring-offset-1 ring-offset-gray-950" : ""}`}
        style={{ backgroundColor: bodyBg || "#1e293b", borderRadius: `${cornerRadius}px`, borderStyle: "solid", borderColor: isSelected ? "#f59e0b" : color + "44", boxShadow: isSelected ? `0 0 20px ${color}66` : `0 0 12px ${glowColor}`, borderWidth: `${bw}px` }}>
        {isSelected && <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: `${cornerRadius}px`, background: `${color}11` }} />}

        <div className={`flex items-center px-3 py-2 shrink-0 relative ${batchMode && !locked ? "cursor-grab active:cursor-grabbing" : ""}`}
          style={{ borderBottom: isMinimized ? "none" : `1px solid ${color}33`, backgroundColor: headerBg || "transparent", borderTopLeftRadius: `${cornerRadius}px`, borderTopRightRadius: `${cornerRadius}px` }}
          onMouseDown={batchMode && !locked ? onHeaderDown : undefined}
          onDoubleClick={onToggleMinimize}>
          
          {titleAlign === "right" && (
            <div className={`flex gap-1 z-10 ${batchMode ? "" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
              {!batchMode && (<><button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-xs">⚙️</button><DeleteButton onConfirm={onRemove} /></>)}
              {batchMode && (<button onClick={onToggleLock} className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${locked ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/10 text-gray-400 hover:text-white"}`} title={locked ? "Unlock" : "Lock"}>{locked ? "🔒" : "🔓"}</button>)}
            </div>
          )}
          
          <div className="flex items-center gap-1.5 min-w-0" style={titleAlign === "center" 
            ? { position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 1 }
            : { flex: 1, justifyContent: titleAlign === "right" ? "flex-end" : "flex-start", paddingRight: titleAlign !== "right" ? 0 : undefined }
          }>
            {!batchMode && <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: color }}>{priority}</span>}
            <span className="text-xs font-semibold truncate" style={{ color: headerColor, fontFamily: headerFont }}>{title}</span>
          </div>
          
          <div className="flex items-center gap-1 ml-auto z-10">
            {titleAlign !== "right" && (
              <div className={`flex gap-1 ${batchMode ? "" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                {batchMode && (<button onClick={onToggleLock} className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${locked ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/10 text-gray-400 hover:text-white"}`} title={locked ? "Unlock" : "Lock"}>{locked ? "🔒" : "🔓"}</button>)}
                {!batchMode && (<><button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-xs">⚙️</button><DeleteButton onConfirm={onRemove} /></>)}
              </div>
            )}
            <button onClick={onToggleMinimize}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white text-xs"
              title={isMinimized ? "Expand" : "Minimize"}>−</button>
          </div>
        </div>

        {!isMinimized && (<>
        <div className={`flex-1 min-h-0 ${children ? '' : 'flex items-center justify-center p-3'}`}>
          {children ? children
            : content ? <span className="text-lg text-gray-200 text-center">{content}</span>
            : <span className="text-gray-500 text-xs">Panel content</span>}
        </div>

        {batchMode && !locked && (
          <div ref={resizeRef} onMouseDown={onResizeStart}
            className="absolute bottom-1 right-1 w-8 h-8 cursor-se-resize z-10 flex items-end justify-end rounded-br-lg hover:bg-white/5" style={{ color }}>
            <svg width="16" height="16" viewBox="0 0 12 12"><path d="M0 12V9h3L0 12zm0-6V3h3l3 3H3L0 6zm6 6V9h3l-3 3z" fill="currentColor" opacity="0.8"/></svg>
          </div>
        )}

        <div className="px-3 py-1 text-[9px] text-gray-500 flex justify-between border-t border-gray-700/30 opacity-0 group-hover:opacity-100">
          <span>c{colStart}r{rowStart} · {colSpan}×{rowSpan}</span>
          <span>P{priority}</span>
        </div>
        </>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Delete Button
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
//  Batch Sidebar
// ═══════════════════════════════════════════════

function BatchSidebar({ panels, onApply, onClose }: {
  panels: Panel[]; onApply: (c: Partial<PanelConfig>) => void; onClose: () => void;
}) {
  const [colSpan, setColSpan] = useState(panels[0]?.colSpan ?? 2);
  const [rowSpan, setRowSpan] = useState(panels[0]?.rowSpan ?? 1);
  const [colStart, setColStart] = useState(panels[0]?.colStart ?? 1);
  const [rowStart, setRowStart] = useState(panels[0]?.rowStart ?? 1);
  const [cornerRadius, setCR] = useState(panels[0]?.cornerRadius ?? 14);
  const [color, setColor] = useState(panels[0]?.color ?? "#3b82f6");
  const [titleColor, setTitleColor] = useState(panels[0]?.titleColor || panels[0]?.color || "#3b82f6");
  const [titleFont, setTitleFont] = useState(panels[0]?.titleFont || "");
  const [headerBg, setHeaderBg] = useState(panels[0]?.headerBg || "");
  const [bodyBg, setBodyBg] = useState(panels[0]?.bodyBg || "");
  const [borderWidth, setBw] = useState(panels[0]?.borderWidth || 1);
  const [titleAlign, setTa] = useState(panels[0]?.titleAlign || "left");
  const COLS = ["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#64748b","#f97316","#84cc16"];

  const [themes, setThemes] = useState<{name:string,color:string,titleColor:string,headerBg:string,bodyBg:string,cornerRadius:number,borderWidth:number,titleAlign:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem("ptdash-themes") || "[]"); } catch { return []; }
  });
  const [newThemeName, setNewThemeName] = useState("");

  const initPos = useRef({ colStart, rowStart, colSpan, rowSpan });
  useEffect(() => { initPos.current = { colStart, rowStart, colSpan, rowSpan }; }, [panels]);

  const doApply = () => {
    const changes: Partial<PanelConfig> = { cornerRadius, color, titleColor, titleFont: titleFont || undefined, headerBg: headerBg || undefined, bodyBg: bodyBg || undefined, borderWidth, titleAlign };
    if (colStart !== initPos.current.colStart) changes.colStart = colStart;
    if (rowStart !== initPos.current.rowStart) changes.rowStart = rowStart;
    if (colSpan !== initPos.current.colSpan) changes.colSpan = colSpan;
    if (rowSpan !== initPos.current.rowSpan) changes.rowSpan = rowSpan;
    onApply(changes);
  };

  const saveTheme = () => {
    if (!newThemeName.trim()) return;
    const t = { name: newThemeName, color, titleColor, headerBg, bodyBg, cornerRadius, borderWidth, titleAlign };
    const updated = [...themes.filter(x => x.name !== newThemeName), t];
    setThemes(updated);
    localStorage.setItem("ptdash-themes", JSON.stringify(updated));
    setNewThemeName("");
  };

  const applyTheme = (t: typeof themes[0]) => {
    setColor(t.color); setTitleColor(t.titleColor); setCR(t.cornerRadius); setHeaderBg(t.headerBg); setBodyBg(t.bodyBg); setBw(t.borderWidth || 1); setTa(t.titleAlign || "left");
  };

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
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Border ({borderWidth}px)</span>
          <input type="range" min={0} max={8} step={1} value={borderWidth} onChange={e => setBw(+e.target.value)} className="w-full accent-blue-500" /></label>
        <label className="block mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Title Align</span>
          <select value={titleAlign} onChange={e => setTa(e.target.value)} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-[10px]">
            <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>

        <div className="mb-3"><span className="text-[10px] text-gray-400 block mb-1">Color</span>
          <div className="flex flex-wrap gap-1 mb-1">{COLS.map(c => <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: color===c?"#fff":"transparent" }} />)}</div></div>

        <div className="mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Title Color</span>
          <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} className="w-full h-6 rounded bg-gray-800 border border-gray-700 cursor-pointer" /></div>
        <div className="mb-3"><span className="text-[10px] text-gray-400 block mb-0.5">Title Font</span>
          <select value={titleFont} onChange={e => setTitleFont(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-[10px]">
            <option value="">Default</option><option value="Inter, sans-serif">Inter</option>
            <option value="Georgia, serif">Georgia</option><option value="'Courier New', monospace">Courier</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
            <option value="Impact, sans-serif">Impact</option>
            <option value="'Comic Sans MS', cursive">Comic Sans</option></select></div>

        <div className="mb-1"><span className="text-[10px] text-gray-400 block mb-0.5">Header Bg</span>
          <input type="color" value={headerBg || "#1e293b"} onChange={e => setHeaderBg(e.target.value)} className="w-full h-6 rounded bg-gray-800 border border-gray-700 cursor-pointer" /></div>
        <div className="mb-2"><span className="text-[10px] text-gray-400 block mb-0.5">Body Bg</span>
          <input type="color" value={bodyBg || "#1e293b"} onChange={e => setBodyBg(e.target.value)} className="w-full h-6 rounded bg-gray-800 border border-gray-700 cursor-pointer" /></div>

        <div className="mb-3 border-t border-gray-700/50 pt-2">
          <span className="text-[10px] text-gray-400 block mb-1">Themes</span>
          {themes.length > 0 && <div className="flex flex-wrap gap-1 mb-1">{themes.map(t => (
            <button key={t.name} onClick={() => applyTheme(t)} className="px-2 py-0.5 rounded text-[9px] border border-gray-600 hover:border-gray-400 text-gray-300"
              style={{ borderColor: t.color }} title={t.name}>{t.name}</button>
          ))}</div>}
          <div className="flex gap-1">
            <input value={newThemeName} onChange={e => setNewThemeName(e.target.value)} placeholder="Theme name" className="flex-1 bg-gray-800 text-white border border-gray-700 rounded px-1.5 py-0.5 text-[10px]" />
            <button onClick={saveTheme} className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-[10px]">Save</button>
          </div>
        </div>

        <button onClick={doApply}
          className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-xs font-bold mb-2">Apply to {panels.length}</button>

        <div className="border-t border-gray-700/50 pt-1">{panels.map(p => <div key={p.id} className="flex items-center gap-1 py-0.5 text-[9px] text-gray-400">
          <span className="w-3 h-3 rounded-full flex items-center justify-center text-[6px] font-bold shrink-0" style={{ backgroundColor: p.color }}>{p.priority}</span>
          <span className="truncate">{p.title}</span></div>)}</div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in{animation:slideIn .15s ease-out}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Edit Panel Sidebar
// ═══════════════════════════════════════════════

function EditPanel({ panel, onClose, onUpdate }: { panel: Panel; onClose: () => void; onUpdate: (ch: Partial<PanelConfig>) => void }) {
  const [id, setId] = useState(panel.id);
  const [, forceUpdate] = useState(0);
  if (id !== panel.id) { setId(panel.id); setTimeout(() => forceUpdate(x => x + 1), 0); }
  const p = panel;
  return (
    <div className="fixed right-0 top-0 h-full w-72 bg-gray-900/95 border-l border-gray-700 z-50 overflow-y-auto animate-slide-in backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-white">Edit Panel</h2><button onClick={onClose} className="text-gray-400 hover:text-white">×</button></div>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Title</span>
        <input defaultValue={panel.title} onChange={e => onUpdate({ title: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Title Color</span>
        <input type="color" defaultValue={panel.titleColor || panel.color} onChange={e => onUpdate({ titleColor: e.target.value })} className="w-full h-7 rounded bg-gray-800 border border-gray-700 cursor-pointer" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Title Font</span>
        <select defaultValue={panel.titleFont || ""} onChange={e => onUpdate({ titleFont: e.target.value || undefined })}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs">
          <option value="">Default</option><option value="Inter, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option><option value="'Courier New', monospace">Courier</option>
          <option value="'Times New Roman', serif">Times New Roman</option><option value="Verdana, sans-serif">Verdana</option>
          <option value="'Trebuchet MS', sans-serif">Trebuchet</option><option value="Impact, sans-serif">Impact</option>
          <option value="'Comic Sans MS', cursive">Comic Sans</option><option value="system-ui, sans-serif">System UI</option>
        </select></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Header Bg</span>
        <input type="color" defaultValue={panel.headerBg || "#1e293b"} onChange={e => onUpdate({ headerBg: e.target.value })} className="w-full h-7 rounded bg-gray-800 border border-gray-700 cursor-pointer" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Body Bg</span>
        <input type="color" defaultValue={panel.bodyBg || "#1e293b"} onChange={e => onUpdate({ bodyBg: e.target.value })} className="w-full h-7 rounded bg-gray-800 border border-gray-700 cursor-pointer" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Col ({panel.colStart})</span>
        <input type="range" min={1} max={GRID_COLS} defaultValue={panel.colStart} onChange={e => onUpdate({ colStart: +e.target.value })} className="w-full accent-blue-500" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Row ({panel.rowStart})</span>
        <input type="range" min={1} max={20} defaultValue={panel.rowStart} onChange={e => onUpdate({ rowStart: +e.target.value })} className="w-full accent-blue-500" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Width ({panel.colSpan})</span>
        <input type="range" min={1} max={GRID_COLS} defaultValue={panel.colSpan} onChange={e => onUpdate({ colSpan: +e.target.value })} className="w-full accent-blue-500" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Height ({panel.rowSpan})</span>
        <input type="range" min={1} max={6} defaultValue={panel.rowSpan} onChange={e => onUpdate({ rowSpan: +e.target.value })} className="w-full accent-blue-500" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Radius ({panel.cornerRadius})</span>
        <input type="range" min={0} max={40} defaultValue={panel.cornerRadius} onChange={e => onUpdate({ cornerRadius: +e.target.value })} className="w-full accent-blue-500" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Border ({panel.borderWidth || 1}px)</span>
        <input type="range" min={0} max={8} defaultValue={panel.borderWidth || 1} onChange={e => onUpdate({ borderWidth: +e.target.value })} className="w-full accent-blue-500" /></label>
      <label className="block mb-2"><span className="text-[10px] text-gray-400">Title Align</span>
        <select defaultValue={panel.titleAlign || "left"} onChange={e => onUpdate({ titleAlign: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-700 rounded px-2 py-1 text-xs">
          <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  API types
// ═══════════════════════════════════════════════

interface MetricsData {
  summary: {
    today: { sales: number; transactions: number };
    yesterday: { sales: number; transactions: number };
    week: { sales: number; transactions: number };
    active_clerks: number;
    cancels_today: number;
  } | null;
  dailySales: { date: string; gross: number; nett: number; transactions: number; cancels: number }[] | null;
  hourlyTraffic: { hour: number; avg_transactions: number; avg_sales: number; avg_customers: number }[] | null;
  tenderBreakdown: { type: string; amount: number; count: number; pct: number }[] | null;
  clerkPerformance: { clerk: string; total_sales: number; transactions: number; avg_sale: number }[] | null;
}

const API = "http://192.168.0.216:8000/api/v1/metrics";
const SITE_ID = 3;

// ═══════════════════════════════════════════════
//  Main App
// ═══════════════════════════════════════════════

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
  const [clipboard, setClipboard] = useState<PanelConfig | null>(null);
  const [pasteCount, setPasteCount] = useState(0);

  // ── Metrics data state ──
  const [metrics, setMetrics] = useState<MetricsData>({
    summary: null,
    dailySales: null,
    hourlyTraffic: null,
    tenderBreakdown: null,
    clerkPerformance: null,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch all metrics on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [summaryRes, dailyRes, hourlyRes, tenderRes, clerkRes] = await Promise.all([
          fetch(`${API}/summary-stats?site_id=${SITE_ID}`),
          fetch(`${API}/daily-sales?site_id=${SITE_ID}`),
          fetch(`${API}/hourly-traffic?site_id=${SITE_ID}`),
          fetch(`${API}/tender-breakdown?site_id=${SITE_ID}`),
          fetch(`${API}/clerk-performance?site_id=${SITE_ID}`),
        ]);
        const [summary, dailySales, hourlyTraffic, tenderBreakdown, clerkPerformance] = await Promise.all([
          summaryRes.json(),
          dailyRes.json(),
          hourlyRes.json(),
          tenderRes.json(),
          clerkRes.json(),
        ]);
        if (!cancelled) {
          setMetrics({ summary, dailySales, hourlyTraffic, tenderBreakdown, clerkPerformance });
          setMetricsLoading(false);
        }
      } catch (err) {
        console.error("Metrics fetch failed:", err);
        if (!cancelled) setMetricsLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { localStorage.setItem("ptdash-gap", String(gapSize)); }, [gapSize]);

  // Live observer — POSTs panel positions on every change
  useEffect(() => {
    fetch("http://192.168.0.216:8000/obs/panel-state", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ts: Date.now(), cols: Object.fromEntries(panels.map(p => [p.id, {c:p.colStart,r:p.rowStart,cs:p.colSpan,rs:p.rowSpan,min:p.isMinimized||false,ta:p.titleAlign||'L'}])) }),
    }).catch(() => {});
  }, [panels]);

  // Ctrl+C / Ctrl+V keyboard handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedIds.size === 1) {
          const id = [...selectedIds][0];
          const p = panels.find(x => x.id === id);
          if (p) {
            const { id: _id, ...cfg } = p;
            setClipboard(cfg);
            setPasteCount(0);
          }
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        if (clipboard) {
          const offset = pasteCount + 1;
          const maxId = panels.reduce((m, p) => Math.max(m, p.id), 0);
          const maxP = panels.reduce((m, p) => Math.max(m, p.priority), 0);
          const newPanel: Panel = {
            ...clipboard, id: maxId + 1, priority: maxP + 1,
            title: clipboard.title?.replace(/ Copy( \d+)?$/, '') + ` Copy ${offset}`,
            colStart: Math.min(GRID_COLS - clipboard.colSpan + 1, clipboard.colStart + offset),
            rowStart: Math.max(1, clipboard.rowStart + offset),
          };
          setPanels(prev => [...prev, newPanel]);
          setPasteCount(offset);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, panels, clipboard, pasteCount]);

  const updatePanel = useCallback((id: number, changes: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }, []);
  const applyBatch = useCallback((changes: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, ...changes } : p));
  }, [selectedIds]);
  const toggleSelect = useCallback((id: number, shift: boolean) => {
    setSelectedIds(prev => { if (!shift) return new Set([id]); const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
      const pLeft = panel.colStart; const pRight = panel.colStart + panel.colSpan;
      const stack = prev.filter(p => 
        p.id !== id && !p.isLocked &&
        (p.colStart < pRight && p.colStart + p.colSpan > pLeft)
      );
      const toggled = { ...panel, isMinimized: willMinimize };
      const all = [...stack, toggled].sort((a, b) => a.rowStart - b.rowStart);
      const baseRow = Math.min(...all.map(p => p.rowStart));
      let nextRow = baseRow;
      const repositioned = all.map(p => {
        const r = { ...p, rowStart: nextRow };
        nextRow += (p.isMinimized ? 1 : p.rowSpan);
        return r;
      });
      const stackIds = new Set(repositioned.map(p => p.id));
      return prev.map(p => stackIds.has(p.id) ? repositioned.find(r => r.id === p.id)! : p);
    });
  }, []);

  // Clean _savedRowStart from panels before saving to localStorage
  useEffect(() => {
    const clean = panels.map(({ _savedRowStart, ...p }: any) => p);
    localStorage.setItem("ptdash-panels-v2", JSON.stringify(clean));
  }, [panels]);

  const cycleDock = useCallback(() => {
    setDockMode(prev => prev === 'full' ? 'right' : prev === 'right' ? 'left' : 'full');
  }, []);

  const addPanel = useCallback(() => {
    const maxId = panels.reduce((m, p) => Math.max(m, p.id), 0);
    const maxP = panels.reduce((m, p) => Math.max(m, p.priority), 0);
    setPanels(prev => [...prev, { id: maxId+1, priority: maxP+1, title: `Panel ${maxId+1}`, colStart: 1, rowStart: 1, colSpan: 2, rowSpan: 2, cornerRadius: 14, color: `hsl(${Math.random()*360},70%,55%)`, content: "✨" }]);
  }, [panels]);

  const scatterPanels = useCallback(() => {
    const sorted = [...panels].sort((a, b) => a.priority - b.priority);
    const locked = panels.filter(p => p.isLocked);
    const unlocked = sorted.filter(p => !p.isLocked);
    const occupied = new Set<string>();
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

  // ── Render chart content for each panel type ──
  const renderChart = useCallback((chartType: string | undefined): ReactNode => {
    if (metricsLoading) return <div className="flex items-center justify-center h-full text-gray-500 text-xs">Loading metrics...</div>;
    if (!metrics) return <div className="flex items-center justify-center h-full text-gray-500 text-xs">No data</div>;

    const s = metrics.summary;
    const ds = metrics.dailySales;
    const ht = metrics.hourlyTraffic;
    const tb = metrics.tenderBreakdown;
    const cp = metrics.clerkPerformance;

    switch (chartType) {
      case "stat-today": {
        if (!s) return null;
        const today = s.today?.sales || 0;
        const yesterday = s.yesterday?.sales || 1;
        const delta = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : today > 0 ? 100 : 0;
        return <StatCard value={`$${today.toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0})}`} label="Today's Sales" delta={delta} deltaLabel="yesterday" color="#3b82f6" />;
      }
      case "stat-yesterday": {
        if (!s) return null;
        return <StatCard value={`$${(s.yesterday?.sales || 0).toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0})}`} label="Yesterday" color="#64748b" />;
      }
      case "stat-week": {
        if (!s) return null;
        return <StatCard value={`$${(s.week?.sales || 0).toLocaleString(undefined, {minimumFractionDigits:0,maximumFractionDigits:0})}`} label="This Week" color="#10b981" />;
      }
      case "line-daily-sales": {
        if (!ds) return null;
        const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const last14 = ds.slice(-14).map((d: any, i: number) => {
          const dt = new Date(d.date);
          const dayOfWeek = dt.getDay();
          return {
            label: d.date?.slice(5) || '', // MM-DD
            value: d.nett || 0,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          };
        });
        const weekdayLabels = ds.slice(-14).map((d: any) => {
          const dt = new Date(d.date);
          return DAYS[dt.getDay()];
        });
        // Trimmed average: remove highest and lowest, average the rest
        const values = last14.map(d => d.value).sort((a: number, b: number) => a - b);
        const trimmed = values.slice(1, -1); // remove min and max
        const avg = trimmed.reduce((s: number, v: number) => s + v, 0) / (trimmed.length || 1);
        return <LineChart data={last14} color="#f59e0b" valueLabel="$" avgValue={avg} weekdayLabels={weekdayLabels} />;
      }
      case "pie-tender": {
        if (!tb) return null;
        const PIE_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];
        const data = tb.map((d: any, i: number) => ({
          label: d.type,
          value: d.pct,
          color: PIE_COLORS[i % PIE_COLORS.length],
        }));
        return <PieChart data={data} />;
      }
      case "line-hourly": {
        if (!ht) return null;
        const data = ht.map((d: any) => ({
          label: `${d.hour}:00`,
          value: d.avg_transactions || 0,
        }));
        return <LineChart data={data} color="#06b6d4" />;
      }
      case "bar-clerks": {
        if (!cp) return null;
        const top6 = cp.slice(0, 6).map((d: any) => ({
          label: d.clerk?.split(' ')[0] || d.clerk, // first name
          value: d.total_sales || 0,
        }));
        return <BarChart data={top6} color="#8b5cf6" valueLabel="$" />;
      }
      case "table-clerks": {
        if (!cp) return null;
        return <DataTable
          headers={["Clerk", "Total Sales", "Transactions", "Avg Sale"]}
          rows={cp.map((d: any) => [
            d.clerk,
            `$${d.total_sales?.toLocaleString(undefined, {minimumFractionDigits:2,maximumFractionDigits:2}) || '0.00'}`,
            String(d.transactions || 0),
            `$${d.avg_sale?.toFixed(2) || '0.00'}`,
          ])}
        />;
      }
      default:
        return null;
    }
  }, [metrics, metricsLoading]);

  const sorted = [...panels].sort((a, b) => a.priority - b.priority);
  const selectedPanels = panels.filter(p => selectedIds.has(p.id));
  const sidebarOpen = batchMode && selectedPanels.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6" style={{ marginRight: sidebarOpen ? "256px" : 0, transition: "margin-right 0.15s ease-out" }}>
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
            className={`w-9 h-9 flex items-center justify-center rounded text-2xl ${batchMode ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            title="Batch mode — shift+click to select, drag header to move, drag corner to resize">⚙</button>
        </div>
      </header>

      {batchMode && (
        <div className="flex items-center justify-center mb-3">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 flex items-center gap-3">
            <span className="text-amber-400 text-xs font-medium">⚙ Batch Edit Mode</span>
            <span className="text-gray-500 text-[10px]">shift+click to select · drag header to move · corner to resize</span>
            <button onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}
              className="text-gray-400 hover:text-white text-xs">✕</button>
          </div>
        </div>
      )}

      <div ref={gridRef} className="grid"
        style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: `${gapSize}px`, gridAutoRows: `${40 + gapSize}px` }}>
        {sorted.map(p => (
          <DashboardPanel key={p.id} panel={p} gridRef={gridRef} batchMode={batchMode} gapSize={gapSize} zIndex={panelZIndex[p.id] || 0} onToggleLock={() => toggleLock(p.id)} onToggleMinimize={() => toggleMinimize(p.id)}
            isSelected={selectedIds.has(p.id)} onClick={(shift) => toggleSelect(p.id, shift)}
            onResize={(colSpan, rowSpan) => updatePanel(p.id, { colSpan, rowSpan })}
            onMove={(colStart, rowStart) => updatePanel(p.id, { colStart, rowStart })}
            onEdit={() => setEditPanel(p)} onRemove={() => removePanel(p.id)}>
            {renderChart(p.chartType)}
          </DashboardPanel>
        ))}
      </div>

      {sidebarOpen && (<BatchSidebar panels={selectedPanels} onApply={applyBatch} onClose={() => setSelectedIds(new Set())} />)}

      {editPanel && !batchMode && (
        <EditPanel key={editPanel.id} panel={editPanel} onClose={() => setEditPanel(null)} onUpdate={(ch) => updatePanel(editPanel.id, ch)} />
      )}
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}.animate-slide-in{animation:slideIn .15s ease-out}`}</style>
    </div>
  );
}
