"use client";

import { useMemo, useRef } from "react";
import { Download } from "lucide-react";

const PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];

function cleanData(data = []) {
  return data
    .map((item, index) => ({
      label: String(item.label ?? item.x ?? `Item ${index + 1}`),
      value: Number(item.value ?? item.y ?? 0),
    }))
    .filter((item) => Number.isFinite(item.value));
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function BarChart({ data, max, xLabel, yLabel }) {
  const width = 620;
  const height = 310;
  const pad = { top: 22, right: 18, bottom: 58, left: 52 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const gap = 12;
  const barWidth = Math.max(18, (chartWidth - gap * Math.max(0, data.length - 1)) / Math.max(1, data.length));

  return (
    <svg className="chart-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + chartHeight} />
      <line x1={pad.left} x2={pad.left + chartWidth} y1={pad.top + chartHeight} y2={pad.top + chartHeight} />
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = pad.top + chartHeight - chartHeight * tick;
        return (
          <g key={tick}>
            <line className="chart-grid" x1={pad.left} x2={pad.left + chartWidth} y1={y} y2={y} />
            <text className="chart-axis-text" x={pad.left - 8} y={y + 4} textAnchor="end">
              {Math.round(max * tick)}
            </text>
          </g>
        );
      })}
      {data.map((item, index) => {
        const barHeight = max ? (item.value / max) * chartHeight : 0;
        const x = pad.left + index * (barWidth + gap);
        const y = pad.top + chartHeight - barHeight;
        return (
          <g key={`${item.label}-${index}`}>
            <rect fill={PALETTE[index % PALETTE.length]} height={barHeight} rx="4" width={barWidth} x={x} y={y} />
            <text className="chart-label" textAnchor="middle" x={x + barWidth / 2} y={pad.top + chartHeight + 18}>
              {item.label.slice(0, 12)}
            </text>
          </g>
        );
      })}
      {xLabel && <text className="chart-axis-title" textAnchor="middle" x={pad.left + chartWidth / 2} y={height - 12}>{xLabel}</text>}
      {yLabel && <text className="chart-axis-title" textAnchor="middle" transform={`translate(14 ${pad.top + chartHeight / 2}) rotate(-90)`}>{yLabel}</text>}
    </svg>
  );
}

function LineChart({ data, max, xLabel, yLabel }) {
  const width = 620;
  const height = 310;
  const pad = { top: 24, right: 26, bottom: 58, left: 52 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const points = data.map((item, index) => {
    const x = pad.left + (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
    const y = pad.top + chartHeight - (max ? (item.value / max) * chartHeight : 0);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");

  return (
    <svg className="chart-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
      <line x1={pad.left} x2={pad.left} y1={pad.top} y2={pad.top + chartHeight} />
      <line x1={pad.left} x2={pad.left + chartWidth} y1={pad.top + chartHeight} y2={pad.top + chartHeight} />
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = pad.top + chartHeight - chartHeight * tick;
        return (
          <g key={tick}>
            <line className="chart-grid" x1={pad.left} x2={pad.left + chartWidth} y1={y} y2={y} />
            <text className="chart-axis-text" x={pad.left - 8} y={y + 4} textAnchor="end">
              {Math.round(max * tick)}
            </text>
          </g>
        );
      })}
      <path className="chart-line" d={path} />
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="5" />
          <text className="chart-label" textAnchor="middle" x={point.x} y={pad.top + chartHeight + 18}>
            {point.label.slice(0, 12)}
          </text>
        </g>
      ))}
      {xLabel && <text className="chart-axis-title" textAnchor="middle" x={pad.left + chartWidth / 2} y={height - 12}>{xLabel}</text>}
      {yLabel && <text className="chart-axis-title" textAnchor="middle" transform={`translate(14 ${pad.top + chartHeight / 2}) rotate(-90)`}>{yLabel}</text>}
    </svg>
  );
}

function PieChart({ data }) {
  const width = 620;
  const height = 310;
  const cx = 180;
  const cy = 155;
  const radius = 105;
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0) || 1;
  const slices = data.reduce((items, item, index) => {
    const startAngle = items.at(-1)?.endAngle || 0;
    const endAngle = startAngle + (Math.max(0, item.value) / total) * 360;
    return items.concat({
      ...item,
      endAngle,
      index,
      startAngle,
    });
  }, []);

  return (
    <svg className="chart-svg" role="img" viewBox={`0 0 ${width} ${height}`}>
      {slices.map((item) => (
        <path d={arcPath(cx, cy, radius, item.startAngle, item.endAngle)} fill={PALETTE[item.index % PALETTE.length]} key={`${item.label}-${item.index}`} />
      ))}
      <g className="chart-legend">
        {data.map((item, index) => (
          <g key={`${item.label}-${index}`} transform={`translate(350 ${72 + index * 28})`}>
            <rect fill={PALETTE[index % PALETTE.length]} height="12" rx="3" width="12" />
            <text x="20" y="11">
              {item.label}: {item.value}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

export function ChartArtifact({ spec }) {
  const svgRef = useRef(null);
  const chart = useMemo(() => {
    const data = cleanData(spec?.data);
    const max = Math.max(...data.map((item) => item.value), 1);
    return {
      data,
      max,
      title: String(spec?.title || "Chart"),
      type: ["bar", "line", "pie"].includes(spec?.type) ? spec.type : "bar",
      xLabel: String(spec?.xLabel || ""),
      yLabel: String(spec?.yLabel || ""),
    };
  }, [spec]);

  function downloadSvg() {
    const svg = svgRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${chart.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!chart.data.length) return null;

  return (
    <section className="chart-artifact" ref={svgRef}>
      <div className="chart-artifact-head">
        <div>
          <span>Chart</span>
          <strong>{chart.title}</strong>
        </div>
        <button onClick={downloadSvg} title="Download SVG" type="button">
          <Download size={15} />
        </button>
      </div>
      {chart.type === "line" ? (
        <LineChart data={chart.data} max={chart.max} xLabel={chart.xLabel} yLabel={chart.yLabel} />
      ) : chart.type === "pie" ? (
        <PieChart data={chart.data} />
      ) : (
        <BarChart data={chart.data} max={chart.max} xLabel={chart.xLabel} yLabel={chart.yLabel} />
      )}
    </section>
  );
}
