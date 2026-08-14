"use client";
import { useEffect, useRef } from "react";
import type { NormalizedMap } from "../domain/types";
import type { ReplaySnapshot } from "../simulation/engine";
const COLORS = { 0: "#91a78e", 1: "#e85d55", 2: "#3989dd", 3: "#e5a62d" } as const;
export function HexMapCanvas({ map, snapshot }: { map: NormalizedMap; snapshot: ReplaySnapshot }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; const context = canvas?.getContext?.("2d"); if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1, width = canvas.clientWidth || 760, height = canvas.clientHeight || 620;
    canvas.width = width * ratio; canvas.height = height * ratio; context.scale(ratio, ratio); context.clearRect(0, 0, width, height);
    const raw = map.tiles.map((tile) => ({ tile, px: Math.sqrt(3) * (tile.x + tile.z / 2), py: 1.5 * tile.z }));
    const xs = raw.map((p) => p.px), ys = raw.map((p) => p.py);
    const scale = Math.min((width - 42) / (Math.max(...xs) - Math.min(...xs) + 2), (height - 42) / (Math.max(...ys) - Math.min(...ys) + 2));
    const ox = width / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * scale, oy = height / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * scale, radius = scale * .58;
    for (const { tile, px, py } of raw) {
      const x = px * scale + ox, y = py * scale + oy; context.beginPath();
      for (let c = 0; c < 6; c++) { const a = Math.PI / 180 * (60 * c - 30), hx = x + radius * Math.cos(a), hy = y + radius * Math.sin(a); c ? context.lineTo(hx, hy) : context.moveTo(hx, hy); }
      context.closePath(); const owner = snapshot.owners[tile.tileId] ?? 0;
      context.fillStyle = tile.blocked ? (tile.configId === 40001 ? "#56616e" : "#5d9dac") : COLORS[owner]; context.fill();
      context.strokeStyle = "rgba(10,24,35,.55)"; context.lineWidth = Math.max(.6, scale * .045); context.stroke();
      if ([10001, 20001, 30002, 30003].includes(tile.configId)) { context.fillStyle = "#fff7da"; context.font = `${Math.max(8, radius * .72)}px sans-serif`; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(tile.configId === 10001 ? "★" : tile.configId === 20001 ? "◆" : tile.configId === 30003 ? "✦" : "●", x, y); }
    }
  }, [map, snapshot]);
  return <canvas ref={ref} className="map-canvas" aria-label={`海岛地图，T+${snapshot.hour}小时`} />;
}
