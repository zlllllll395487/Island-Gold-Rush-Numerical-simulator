"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapTile, NormalizedMap, TileId } from "../domain/types";
import type { Point } from "../map/layout";
import type { ReplaySnapshot } from "../simulation/engine";

const CAMP_COLORS = { 0: "#5fa967", 1: "#df5149", 2: "#3188d7", 3: "#e3a522" } as const;
const TILE_NAMES: Record<number, string> = {
  10001: "\u8054\u76df\u57fa\u5730",
  20001: "\u5148\u950b\u8425",
  30001: "\u666e\u901a\u5730",
  30002: "\u8d44\u6e90\u5730",
  30003: "\u6838\u5fc3\u5730",
  40001: "\u5c71\u5730",
  40002: "\u6c34\u57df",
};

interface PointyTopLayout {
  radius: number;
  centers: Map<TileId, Point>;
}

function pointyTopCenter(tile: MapTile, size: number): Point {
  return {
    x: size * Math.sqrt(3) * (tile.x + tile.z / 2),
    y: size * 1.5 * tile.z,
  };
}

function pointyTopVertices(center: Point, size: number): Point[] {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = -Math.PI / 6 + index * Math.PI / 3;
    return { x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) };
  });
}

function layoutPointyTopMap(tiles: readonly MapTile[], width: number, height: number, padding: number): PointyTopLayout {
  const rawCenters = new Map(tiles.map((tile) => [tile.tileId, pointyTopCenter(tile, 1)]));
  const vertices = [...rawCenters.values()].flatMap((center) => pointyTopVertices(center, 1));
  const minX = Math.min(...vertices.map((point) => point.x));
  const maxX = Math.max(...vertices.map((point) => point.x));
  const minY = Math.min(...vertices.map((point) => point.y));
  const maxY = Math.max(...vertices.map((point) => point.y));
  const radius = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  const offsetX = padding - minX * radius + (width - padding * 2 - (maxX - minX) * radius) / 2;
  const offsetY = padding - minY * radius + (height - padding * 2 - (maxY - minY) * radius) / 2;
  return {
    radius,
    centers: new Map(tiles.map((tile) => {
      const raw = rawCenters.get(tile.tileId)!;
      return [tile.tileId, { x: raw.x * radius + offsetX, y: raw.y * radius + offsetY }];
    })),
  };
}
function traceHex(context: CanvasRenderingContext2D, center: Point, radius: number) {
  const points = pointyTopVertices(center, radius);
  context.beginPath();
  points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
  context.closePath();
}

function drawCrystal(context: CanvasRenderingContext2D, center: Point, radius: number, core: boolean) {
  const drawOne = (offset: number, scale: number) => {
    context.beginPath();
    context.moveTo(center.x + offset, center.y - radius * 0.5 * scale);
    context.lineTo(center.x + offset + radius * 0.26 * scale, center.y - radius * 0.08 * scale);
    context.lineTo(center.x + offset + radius * 0.1 * scale, center.y + radius * 0.48 * scale);
    context.lineTo(center.x + offset - radius * 0.2 * scale, center.y + radius * 0.12 * scale);
    context.closePath();
    context.fillStyle = core ? "#fff0a8" : "#ffd45c";
    context.fill();
    context.strokeStyle = core ? "#ffffff" : "#fff1a7";
    context.lineWidth = Math.max(1, radius * 0.07);
    context.stroke();
  };
  drawOne(core ? -radius * 0.12 : 0, core ? 0.92 : 0.78);
  if (core) drawOne(radius * 0.22, 0.64);
}

function drawMountain(context: CanvasRenderingContext2D, center: Point, radius: number) {
  for (const [offset, scale] of [[-0.18, 0.72], [0.2, 0.58]] as const) {
    context.beginPath();
    context.moveTo(center.x + radius * (offset - scale * 0.45), center.y + radius * 0.32);
    context.lineTo(center.x + radius * offset, center.y - radius * scale * 0.48);
    context.lineTo(center.x + radius * (offset + scale * 0.45), center.y + radius * 0.32);
    context.closePath();
    context.fillStyle = "#263241";
    context.fill();
    context.strokeStyle = "#9aa7b4";
    context.lineWidth = Math.max(0.8, radius * 0.045);
    context.stroke();
  }
}

function drawWaves(context: CanvasRenderingContext2D, center: Point, radius: number) {
  context.strokeStyle = "#e6fff5";
  context.lineWidth = Math.max(1, radius * 0.08);
  context.lineCap = "round";
  for (const offset of [-0.26, 0, 0.26]) {
    context.beginPath();
    context.moveTo(center.x - radius * 0.45, center.y + radius * offset);
    context.quadraticCurveTo(center.x - radius * 0.2, center.y + radius * (offset - 0.18), center.x, center.y + radius * offset);
    context.quadraticCurveTo(center.x + radius * 0.2, center.y + radius * (offset + 0.18), center.x + radius * 0.45, center.y + radius * offset);
    context.stroke();
  }
}

function drawStar(context: CanvasRenderingContext2D, center: Point, radius: number) {
  context.beginPath();
  for (let index = 0; index < 10; index++) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const length = index % 2 ? radius * 0.2 : radius * 0.44;
    const point = { x: center.x + Math.cos(angle) * length, y: center.y + Math.sin(angle) * length };
    if (index > 0) {
      context.lineTo(point.x, point.y);
    } else {
      context.moveTo(point.x, point.y);
    }
  }
  context.closePath();
  context.fillStyle = "#fff7dc";
  context.fill();
  context.strokeStyle = "#253241";
  context.lineWidth = Math.max(0.7, radius * 0.04);
  context.stroke();
}

function drawFlag(context: CanvasRenderingContext2D, center: Point, radius: number) {
  context.strokeStyle = "#fff7dc";
  context.fillStyle = "#fff7dc";
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.moveTo(center.x - radius * 0.2, center.y + radius * 0.42);
  context.lineTo(center.x - radius * 0.2, center.y - radius * 0.44);
  context.stroke();
  context.beginPath();
  context.moveTo(center.x - radius * 0.18, center.y - radius * 0.4);
  context.lineTo(center.x + radius * 0.34, center.y - radius * 0.2);
  context.lineTo(center.x - radius * 0.18, center.y);
  context.closePath();
  context.fill();
}

function drawBattle(context: CanvasRenderingContext2D, center: Point, radius: number) {
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(1.2, radius * 0.1);
  context.lineCap = "round";
  for (const direction of [-1, 1]) {
    context.beginPath();
    context.moveTo(center.x - radius * 0.28, center.y + direction * radius * 0.28);
    context.lineTo(center.x + radius * 0.28, center.y - direction * radius * 0.28);
    context.stroke();
  }
  context.strokeStyle = "rgba(255,112,86,.75)";
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.arc(center.x, center.y, radius * 0.7, 0, Math.PI * 2);
  context.stroke();
}

function fillFor(tile: MapTile, owner: 0 | 1 | 2 | 3) {
  if (tile.configId === 40001) return "#596574";
  if (tile.configId === 40002) return "#4f9c86";
  return CAMP_COLORS[owner];
}

export function HexMapCanvasV2({ map, snapshot }: { map: NormalizedMap; snapshot: ReplaySnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef<PointyTopLayout | null>(null);
  const [hover, setHover] = useState<{ tileId: TileId; x: number; y: number } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 900;
    const height = canvas.clientHeight || 720;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const layout = layoutPointyTopMap(map.tiles, width, height, 14);
    layoutRef.current = layout;

    for (const tile of map.tiles) {
      const center = layout.centers.get(tile.tileId)!;
      const owner = (snapshot.owners[tile.tileId] ?? 0) as 0 | 1 | 2 | 3;
      traceHex(context, center, layout.radius);
      context.fillStyle = fillFor(tile, owner);
      context.fill();
      context.strokeStyle = hover?.tileId === tile.tileId ? "#ffffff" : "rgba(8,24,31,.72)";
      context.lineWidth = hover?.tileId === tile.tileId ? Math.max(1.5, layout.radius * 0.09) : Math.max(0.7, layout.radius * 0.045);
      context.stroke();

      if (tile.configId === 40001) drawMountain(context, center, layout.radius);
      else if (tile.configId === 40002) drawWaves(context, center, layout.radius);
      else if (tile.configId === 30002) drawCrystal(context, center, layout.radius, false);
      else if (tile.configId === 30003) drawCrystal(context, center, layout.radius, true);
      else if (tile.configId === 10001) drawStar(context, center, layout.radius);
      else if (tile.configId === 20001) drawFlag(context, center, layout.radius);

      const status = snapshot.tileStatus[tile.tileId];
      if (status?.attackerCount) drawBattle(context, center, layout.radius);
      if (status?.occupationProgress) {
        context.beginPath();
        context.arc(center.x, center.y, layout.radius * 0.79, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * status.occupationProgress);
        context.strokeStyle = "#fff4b2";
        context.lineWidth = Math.max(1.5, layout.radius * 0.11);
        context.stroke();
      }
    }
  }, [map, snapshot, hover?.tileId]);

  useEffect(() => {
    draw();
    const canvas = canvasRef.current;
    const resizeTarget = canvas?.parentElement ?? canvas;
    if (!resizeTarget || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(resizeTarget);
    return () => observer.disconnect();
  }, [draw]);

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const layout = layoutRef.current;
    if (!canvas || !layout) return;
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    let nearest: { tileId: TileId; distance: number } | null = null;
    for (const [tileId, center] of layout.centers) {
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      if (distance <= layout.radius && (!nearest || distance < nearest.distance)) nearest = { tileId, distance };
    }
    setHover(nearest ? { tileId: nearest.tileId, x: point.x, y: point.y } : null);
  };

  const tile = hover ? map.byId.get(hover.tileId) : null;
  const status = hover ? snapshot.tileStatus[hover.tileId] : null;
  return (
    <div className="map-canvas-wrap" data-orientation="pointy-top">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        role="img"
        aria-label={"\u6d77\u5c9b\u5730\u56fe\uff0cT+" + snapshot.hour + "\u5c0f\u65f6\uff0c\u5c16\u9876\u516d\u8fb9\u5f62"}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      />
      {hover && tile && (
        <div className="tile-tooltip" style={{ left: Math.min(hover.x + 14, 720), top: Math.max(12, hover.y - 42) }}>
          <strong>{TILE_NAMES[tile.configId]}</strong>
          <span>#{tile.tileId} · ({tile.x},{tile.y},{tile.z})</span>
          <span>{"\u6240\u6709\u8005 " + (snapshot.owners[tile.tileId] || "\u4e2d\u7acb") + " · \u9632\u5b88 " + (status?.defenseCamp ?? snapshot.owners[tile.tileId] ?? 0)}</span>
          {status && <span>{"\u961f\u5217 " + status.defenderCount + " vs " + status.attackerCount + " · \u58eb\u6c14 " + (status.frontMorale ?? "--")}</span>}
          {!!status?.occupationProgress && <span>{"\u5360\u9886 " + Math.round(status.occupationProgress * 100) + "%"}</span>}
        </div>
      )}
    </div>
  );
}
