import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Crosshair,
  Maximize2,
  Minimize2,
  Map as MapIcon,
  Navigation,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { GameHudState, LandmarkPoint } from '../game/types';
import { LANDMARKS, ROAD_SEGMENTS, SAWAH_PADS, WORLD_PLAY_LIMIT } from '../game/worldData';
import { REGION_NAMES, t } from '../game/jawaData';

interface TubanMinimapOverlayProps {
  hud: GameHudState;
  onOpenMap: () => void;
  onSetGps?: (x: number, z: number, label: string) => void;
}

type ZoomLevel = {
  id: 'dekat' | 'kawasan' | 'tuban';
  label: string;
  scale: number; // canvas pixels per world meter (at 240px base canvas)
};

const ZOOM_LEVELS: ZoomLevel[] = [
  { id: 'dekat', label: '1x', scale: 0.92 },
  { id: 'kawasan', label: '2x', scale: 0.52 },
  { id: 'tuban', label: '3x', scale: 0.28 },
];

const SHORT_LANDMARK_NAMES: Record<string, string> = {
  lm_desa: 'Desa Kerek',
  lm_warung: 'Warung Mbah Darto',
  lm_balai: 'Balai Kerek',
  lm_peternakan: 'Peternakan',
  lm_hutanjati: 'Hutan Jati',
  lm_spbu: 'SPBU Sleko',
  lm_alun: 'Alun-Alun',
  lm_pendopo: 'Pendopo',
  lm_pasar: 'Pasar Baru',
  lm_toko_klambi: 'Batik Gedog',
  lm_bengkel: 'Bengkel',
  lm_polisi: 'Polres',
  lm_rs: 'RSUD',
  lm_sunan_bonang: 'Sunan Bonang',
  lm_masjid: 'Masjid Agung',
  lm_stasiun: 'Terminal KP',
  lm_airterjun: 'Nglirip',
  lm_kebun_teh: 'Siwalan',
  lm_tpi: 'Pantai Boom',
  lm_seafood: 'Kare Rajungan',
  lm_klenteng: 'Kwan Sing Bio',
  lm_mercusuar: 'Awar-Awar',
  lm_candi: 'Paduraksa',
  lm_danau: 'Bektiharjo',
  lm_bukit_wisata: 'Bkt Semanding',
};

const PRIORITY_LANDMARK_IDS = new Set([
  'lm_alun',
  'lm_tpi',
  'lm_desa',
  'lm_masjid',
  'lm_sunan_bonang',
  'lm_klenteng',
  'lm_airterjun',
  'lm_danau',
  'lm_pasar',
  'lm_pendopo',
  'lm_stasiun',
  'lm_mercusuar',
  'lm_candi',
]);

function getLandmarkColor(type: LandmarkPoint['type'], discovered: boolean, id?: string): string {
  if (!discovered) return '#cbd5e1';
  if (id === 'lm_klenteng') return '#ef4444';
  if (id === 'lm_masjid' || id === 'lm_sunan_bonang') return '#10b981';
  if (id === 'lm_danau') return '#38bdf8';
  switch (type) {
    case 'pantai':
      return '#38bdf8';
    case 'gunung':
      return '#4ade80';
    case 'wisata':
      return '#f5b942';
    case 'pasar':
    case 'toko':
      return '#fb923c';
    case 'spbu':
      return '#facc15';
    case 'polisi':
      return '#60a5fa';
    case 'rs':
      return '#f87171';
    case 'bengkel':
      return '#a78bfa';
    default:
      return '#f5f2eb';
  }
}

function drawLandmarkIcon(
  ctx: CanvasRenderingContext2D,
  lm: LandmarkPoint,
  x: number,
  y: number,
  color: string,
  scaleFactor: number,
  discovered: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleFactor, scaleFactor);

  // Subtle dark circular backdrop so icons pop cleanly over terrain/roads and stay distinct from player chevron
  ctx.fillStyle = 'rgba(11, 15, 13, 0.92)';
  ctx.beginPath();
  ctx.arc(0, 0, 7.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = discovered ? 'rgba(255, 255, 255, 0.24)' : 'rgba(203, 213, 225, 0.32)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  if (lm.id === 'lm_klenteng') {
    // Klenteng Kwan Sing Bio: Crimson & Gold Pagoda Roof
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-5.2, 0.4);
    ctx.lineTo(0, -4.6);
    ctx.lineTo(5.2, 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-3.6, 0.4, 7.2, 1.4);
    ctx.fillRect(-3.2, 1.8, 1.3, 2.8);
    ctx.fillRect(1.9, 1.8, 1.3, 2.8);
    ctx.fillRect(-0.5, -5.6, 1, 1.3);
  } else if (lm.id === 'lm_masjid' || lm.id === 'lm_sunan_bonang') {
    // Masjid Agung Tuban / Makam Sunan Bonang: Emerald Dome + Gold Crescent Spire
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 0.8, 3.8, Math.PI, 0);
    ctx.lineTo(3.8, 3.8);
    ctx.lineTo(-3.8, 3.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f5b942';
    ctx.fillRect(-0.6, -5.2, 1.2, 2.4);
    ctx.beginPath();
    ctx.arc(0, -5.4, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0f0d';
    ctx.fillRect(-1.1, 1.4, 2.2, 2.4);
  } else if (lm.id === 'lm_danau') {
    // Goa Akbar & Sendang Bektiharjo: Limestone Cave Arch + Cyan Spring Wave
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0.6, 4.4, Math.PI, 0);
    ctx.lineTo(4.4, 3.2);
    ctx.lineTo(2.4, 3.2);
    ctx.arc(0, 1.4, 2.2, 0, Math.PI, true);
    ctx.lineTo(-4.4, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, 4.1);
    ctx.quadraticCurveTo(-1.5, 2.9, 0, 4.1);
    ctx.quadraticCurveTo(1.5, 5.1, 4, 4.1);
    ctx.stroke();
  } else if (lm.id === 'lm_alun' || lm.id === 'lm_pendopo') {
    // Alun-Alun Tuban / Pendopo Krido Manunggal: Golden Joglo Pavilion / Plaza Emblem
    ctx.fillStyle = '#f5b942';
    ctx.beginPath();
    ctx.moveTo(0, -4.8);
    ctx.lineTo(5, 0);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-3.4, 0.2, 6.8, 3.2);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-1.2, 1.1, 2.4, 2.3);
  } else if (lm.id === 'lm_candi') {
    // Gapura Paduraksa Ronggolawe: Stepped Split Gate
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-4.2, -2.5, 2.8, 6.5);
    ctx.fillRect(1.4, -2.5, 2.8, 6.5);
    ctx.fillRect(-2.6, -4.6, 5.2, 2.1);
  } else if (lm.type === 'pantai') {
    // Pantai Boom / Mercusuar: Coastal Anchor / Lighthouse Beacon
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -4.2);
    ctx.lineTo(0, 3.6);
    ctx.moveTo(-2.8, -1.6);
    ctx.lineTo(2.8, -1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 1.2, 3.4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (lm.type === 'gunung' || lm.id === 'lm_bukit_wisata') {
    // Air Terjun Nglirip & Bukit Kapur: Twin Peak + Waterfall Drop
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(-4.8, 3.6);
    ctx.lineTo(-1, -4.2);
    ctx.lineTo(2.4, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(1.6, -2.2, 1.9, 5.8);
  } else if (lm.type === 'pasar' || lm.type === 'toko') {
    // Market Canopy Awning
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(-4.2, -3.4, 8.4, 2.8);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-3.4, -0.4, 6.8, 3.8);
  } else if (lm.type === 'rs') {
    // Medical Cross
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1.4, -4.2, 2.8, 8.4);
    ctx.fillRect(-4.2, -1.4, 8.4, 2.8);
  } else if (lm.type === 'polisi') {
    // Police Shield
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(0, -4.4);
    ctx.lineTo(3.8, -2.6);
    ctx.lineTo(3.2, 1.6);
    ctx.lineTo(0, 4.4);
    ctx.lineTo(-3.2, 1.6);
    ctx.lineTo(-3.8, -2.6);
    ctx.closePath();
    ctx.fill();
  } else if (lm.type === 'spbu') {
    // Fuel Pump
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -3.8, 4.6, 7.6);
    ctx.fillStyle = '#0b0f0d';
    ctx.fillRect(-2, -2.6, 2.6, 2.2);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(1.6, -1.5);
    ctx.lineTo(3.5, 0.5);
    ctx.lineTo(3.5, 3);
    ctx.stroke();
  } else if (lm.type === 'bengkel') {
    // Gear/Diamond Icon
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0f0d';
    ctx.beginPath();
    ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Desa / Balai / Terminal House Silhouette
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -4.2);
    ctx.lineTo(4.2, -0.4);
    ctx.lineTo(3.2, -0.4);
    ctx.lineTo(3.2, 3.8);
    ctx.lineTo(-3.2, 3.8);
    ctx.lineTo(-3.2, -0.4);
    ctx.lineTo(-4.2, -0.4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export const TubanMinimapOverlay: React.FC<TubanMinimapOverlayProps> = ({
  hud,
  onOpenMap,
  onSetGps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomIdx, setZoomIdx] = useState<number>(1);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);

  const activeZoom = ZOOM_LEVELS[zoomIdx] ?? ZOOM_LEVELS[1];

  const sortedLandmarks = useMemo(() => {
    return LANDMARKS.map((lm) => ({
      ...lm,
      shortName: SHORT_LANDMARK_NAMES[lm.id] ?? lm.name,
      dist: Math.round(Math.hypot(lm.x - hud.playerX, lm.z - hud.playerZ)),
      discovered: hud.discoveredLandmarks.includes(lm.id),
    })).sort((a, b) => a.dist - b.dist);
  }, [hud.playerX, hud.playerZ, hud.discoveredLandmarks]);

  const nearestLandmark = sortedLandmarks[0] ?? null;

  const gpsDist = hud.gpsTarget
    ? Math.round(Math.hypot(hud.gpsTarget.x - hud.playerX, hud.gpsTarget.z - hud.playerZ))
    : null;

  const canvasLogicalSize = expanded ? 280 : 210;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = canvasLogicalSize;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    const half = size / 2;
    const scale = activeZoom.scale * (size / 210);

    const toMap = (wx: number, wz: number): [number, number] => [
      (wx - hud.playerX) * scale,
      (wz - hud.playerZ) * scale,
    ];

    // Base Tuban terrain background
    ctx.fillStyle = '#151f18';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(half, half);

    // Northern Pegunungan Kapur & Grabagan hills tint (z < -85)
    const [, northEdgeY] = toMap(0, -85);
    if (northEdgeY > -half - 20) {
      ctx.fillStyle = '#1d2b20';
      ctx.fillRect(-half - 30, -half - 30, size + 60, Math.max(0, northEdgeY + half + 30));
    }

    // Western Hutan Jati Grabagan & Desa Kerek woods tint (x < -125, z < 110)
    const [forestRightX, forestBottomY] = toMap(-125, 110);
    if (forestRightX > -half - 20) {
      ctx.fillStyle = 'rgba(26, 46, 30, 0.72)';
      ctx.fillRect(
        -half - 20,
        Math.max(-half - 20, northEdgeY),
        forestRightX + half + 20,
        forestBottomY - Math.max(-half - 20, northEdgeY)
      );
    }

    // Playable Tuban perimeter border guide
    const [boundMinX, boundMinY] = toMap(-WORLD_PLAY_LIMIT, -WORLD_PLAY_LIMIT);
    const [boundMaxX, boundMaxY] = toMap(WORLD_PLAY_LIMIT, WORLD_PLAY_LIMIT);
    ctx.strokeStyle = 'rgba(217, 155, 38, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      boundMinX,
      boundMinY,
      boundMaxX - boundMinX,
      boundMaxY - boundMinY
    );
    ctx.setLineDash([]);

    // Sawah Kerek terraced fields
    ctx.fillStyle = '#244528';
    ctx.strokeStyle = 'rgba(134, 239, 172, 0.22)';
    ctx.lineWidth = 0.75;
    for (const pad of SAWAH_PADS) {
      const [sx, sy] = toMap(pad.x - pad.w / 2, pad.z - pad.d / 2);
      const sw = pad.w * scale;
      const sh = pad.d * scale;
      if (sx + sw < -half || sx > half || sy + sh < -half || sy > half) continue;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.strokeRect(sx, sy, sw, sh);
    }

    // Alun-Alun Tuban plaza (116, -22, 34x28)
    {
      const [ax, ay] = toMap(116 - 17, -22 - 14);
      const aw = 34 * scale;
      const ah = 28 * scale;
      ctx.fillStyle = '#334237';
      ctx.fillRect(ax, ay, aw, ah);
      ctx.strokeStyle = 'rgba(245, 185, 66, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ax, ay, aw, ah);
    }

    // Stadion Tuban Sport Center pitch (278, 22, 36x24)
    {
      const [sx, sy] = toMap(278 - 18, 22 - 12);
      ctx.fillStyle = '#1f5c35';
      ctx.fillRect(sx, sy, 36 * scale, 24 * scale);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(sx, sy, 36 * scale, 24 * scale);
    }

    // Pesisir Pantura Laut Jawa coastline (z > 188, x > -5) with Tanjung Awar-Awar cape
    const [coastLeftX, coastTopY] = toMap(-5, 188);
    if (coastTopY < half + 30) {
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(Math.max(-half - 20, coastLeftX), coastTopY, size + 80, size + 80);

      // Sandy Pantura shoreline strip
      ctx.fillStyle = '#9a8458';
      ctx.fillRect(Math.max(-half - 20, coastLeftX), coastTopY - 4 * scale, size + 80, 6 * scale);

      // Tanjung Awar-Awar rocky cape headland (285, 192)
      const [capeX, capeY] = toMap(285, 192);
      ctx.fillStyle = '#57534e';
      ctx.beginPath();
      ctx.arc(capeX, capeY, 18 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Dermaga Pantai Boom pier (108, 195)
      const [pierX, pierY] = toMap(104, 178);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(pierX, pierY, 8 * scale, 32 * scale);
    }

    // Air Terjun Nglirip turquoise pool (-70, -178)
    {
      const [nx, ny] = toMap(-70, -178);
      if (Math.abs(nx) < half + 30 && Math.abs(ny) < half + 30) {
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(nx, ny, Math.max(3, 12 * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sendang Bektiharjo spring pool (-95, 202)
    {
      const [lx, ly] = toMap(-95, 202);
      if (Math.abs(lx) < half + 40 && Math.abs(ly) < half + 40) {
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(lx, ly, Math.max(4, 28 * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Kali Kening winding river (z = -65 .. 130)
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = Math.max(2.5, 6.5 * scale);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let z = -65; z <= 130; z += 10) {
      const rx = -78 + Math.sin(z * 0.05) * 8;
      const [mx, my] = toMap(rx, z);
      if (z === -65) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.stroke();

    // Road Network (casing then surface)
    for (const r of ROAD_SEGMENTS) {
      const [x1, y1] = toMap(r.x1, r.z1);
      const [x2, y2] = toMap(r.x2, r.z2);
      ctx.strokeStyle = r.paved ? 'rgba(15, 23, 42, 0.7)' : 'rgba(69, 48, 28, 0.6)';
      ctx.lineWidth = Math.max(2.8, r.width * scale * 0.95);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = r.paved ? '#64748b' : '#967754';
      ctx.lineWidth = Math.max(1.8, r.width * scale * 0.7);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Subtle distance rings centered on player
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (const meters of [50, 120]) {
      const rPx = meters * scale;
      if (rPx > 14 && rPx < half - 6) {
        ctx.beginPath();
        ctx.arc(0, 0, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw nearby NPCs, Vehicles, & Online Players
    for (const ent of hud.minimapEntities) {
      if (ent.kind === 'mission' || ent.kind === 'landmark') continue;
      const [ex, ey] = toMap(ent.x, ent.z);
      if (Math.abs(ex) > half - 3 || Math.abs(ey) > half - 3) continue;

      if (ent.kind === 'npc') {
        ctx.fillStyle = '#34d399';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      } else if (ent.kind === 'vehicle') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(ex - 2.2, ey - 2.2, 4.4, 4.4);
      } else if (ent.kind === 'goat') {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(ex - 1.2, ey - 1.2, 2.4, 2.4);
      } else if (ent.kind === 'remote_player') {
        ctx.fillStyle = '#0d120f';
        ctx.beginPath();
        ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.8, 0, Math.PI * 2);
        ctx.fill();

        if (expanded && ent.label) {
          ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
          const tw = ctx.measureText(ent.label).width + 6;
          ctx.fillStyle = 'rgba(88, 28, 135, 0.88)';
          ctx.beginPath();
          ctx.roundRect(ex - tw / 2, ey + 6.5, tw, 11, 3);
          ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ent.label, ex, ey + 12);
        }
      }
    }

    // Draw Tuban Landmarks + collision-free labels
    const placedLabelRects: Array<{ x1: number; y1: number; x2: number; y2: number }> = [
      // Reserve center box around player arrow so labels never cover player
      { x1: -24, y1: -16, x2: 24, y2: 16 },
    ];

    const labelFont = expanded
      ? '600 10px "Plus Jakarta Sans", sans-serif'
      : '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.font = labelFont;

    // Sort priority landmarks first for label placement, then by proximity
    const labelCandidates = [...sortedLandmarks].sort((a, b) => {
      const aPrio = PRIORITY_LANDMARK_IDS.has(a.id) ? 0 : 1;
      const bPrio = PRIORITY_LANDMARK_IDS.has(b.id) ? 0 : 1;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return a.dist - b.dist;
    });

    for (const lm of labelCandidates) {
      const [lx, ly] = toMap(lm.x, lm.z);
      const inside = Math.abs(lx) <= half - 8 && Math.abs(ly) <= half - 8;
      if (!inside) continue;

      const isHovered = hoveredLandmarkId === lm.id;
      const color = getLandmarkColor(lm.type, lm.discovered, lm.id);
      const isPriority = PRIORITY_LANDMARK_IDS.has(lm.id);
      const iconScale = isHovered ? 1.18 : isPriority ? (expanded ? 0.96 : 0.86) : expanded ? 0.82 : 0.72;
      const iconRadiusPx = 7.2 * iconScale;

      drawLandmarkIcon(ctx, lm, lx, ly, color, iconScale, lm.discovered);

      // Draw readable Tuban location label if it fits without overlapping
      const shouldTryLabel =
        isHovered ||
        isPriority ||
        activeZoom.id === 'dekat' ||
        expanded;

      if (shouldTryLabel) {
        const text = lm.shortName;
        const textW = ctx.measureText(text).width + 6;
        const textH = expanded ? 12 : 11;
        const boxX = Math.max(-half + 4, Math.min(half - 4 - textW, lx - textW / 2));
        const preferAbove = ly > -half + 24;
        const boxY = preferAbove ? ly - iconRadiusPx - textH - 2 : ly + iconRadiusPx + 2;

        if (boxY >= -half + 2 && boxY + textH <= half - 2) {
          const overlaps = placedLabelRects.some(
            (r) =>
              boxX < r.x2 + 2 &&
              boxX + textW > r.x1 - 2 &&
              boxY < r.y2 + 1 &&
              boxY + textH > r.y1 - 1
          );

          if (!overlaps || isHovered) {
            placedLabelRects.push({ x1: boxX, y1: boxY, x2: boxX + textW, y2: boxY + textH });

            ctx.fillStyle = isHovered ? 'rgba(217, 155, 38, 0.94)' : 'rgba(13, 18, 15, 0.84)';
            ctx.beginPath();
            ctx.roundRect(boxX, boxY, textW, textH, 3);
            ctx.fill();

            ctx.fillStyle = isHovered ? '#111311' : color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, boxX + 3, boxY + textH / 2 + 0.5);
          }
        }
      }
    }

    // Off-screen Tuban directional edge markers for top 2 major landmarks (if not already on-map)
    const offscreenHighlights = sortedLandmarks
      .filter((lm) => PRIORITY_LANDMARK_IDS.has(lm.id))
      .filter((lm) => {
        const [lx, ly] = toMap(lm.x, lm.z);
        return Math.abs(lx) > half - 7 || Math.abs(ly) > half - 7;
      })
      .slice(0, expanded ? 3 : 2);

    for (const lm of offscreenHighlights) {
      const [lx, ly] = toMap(lm.x, lm.z);
      const maxC = Math.max(Math.abs(lx), Math.abs(ly));
      if (maxC < 1) continue;
      const edgeScale = (half - 7) / maxC;
      const ex = lx * edgeScale;
      const ey = ly * edgeScale;
      const angle = Math.atan2(ey, ex);

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(245, 242, 235, 0.72)';
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-2.5, -2.5);
      ctx.lineTo(-2.5, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // GPS Route Line & Beacon
    if (hud.gpsTarget) {
      const [gx, gy] = toMap(hud.gpsTarget.x, hud.gpsTarget.z);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(gx, gy);
      ctx.stroke();
      ctx.setLineDash([]);

      const maxEdge = half - 10;
      const maxC = Math.max(Math.abs(gx), Math.abs(gy));
      const clampScale = maxC > maxEdge ? maxEdge / maxC : 1;
      const cx = gx * clampScale;
      const cy = gy * clampScale;

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    // Player heading arrow at center (0, 0)
    // In Three.js +Z is South (down on map), +X is East (right on map), yaw=0 faces +Z
    ctx.save();
    ctx.rotate(-hud.playerYaw);
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, 7.5);
    ctx.lineTo(-5.2, -5.2);
    ctx.lineTo(0, -2.4);
    ctx.lineTo(5.2, -5.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Crisp North indicator badge at top-center
    ctx.fillStyle = 'rgba(13, 18, 15, 0.85)';
    ctx.beginPath();
    ctx.roundRect(half - 8, 3, 16, 13, 3);
    ctx.fill();
    ctx.fillStyle = '#f5b942';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('U', half, 9.5);

    ctx.restore();
  }, [hud, activeZoom, expanded, canvasLogicalSize, sortedLandmarks, hoveredLandmarkId]);

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!expanded) {
      if (hoveredLandmarkId !== null) setHoveredLandmarkId(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasLogicalSize - canvasLogicalSize / 2;
    const py = ((e.clientY - rect.top) / rect.height) * canvasLogicalSize - canvasLogicalSize / 2;
    const scale = activeZoom.scale * (canvasLogicalSize / 210);
    const wx = hud.playerX + px / scale;
    const wz = hud.playerZ + py / scale;

    let closest: string | null = null;
    let bestD = 16 / scale;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(lm.x - wx, lm.z - wz);
      if (d < bestD) {
        bestD = d;
        closest = lm.id;
      }
    }
    setHoveredLandmarkId(closest);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!expanded) {
      onOpenMap();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvasLogicalSize - canvasLogicalSize / 2;
    const py = ((e.clientY - rect.top) / rect.height) * canvasLogicalSize - canvasLogicalSize / 2;
    const scale = activeZoom.scale * (canvasLogicalSize / 210);
    const wx = hud.playerX + px / scale;
    const wz = hud.playerZ + py / scale;

    let clickedLm: LandmarkPoint | null = null;
    let bestD = 18 / scale;
    for (const lm of LANDMARKS) {
      const d = Math.hypot(lm.x - wx, lm.z - wz);
      if (d < bestD) {
        bestD = d;
        clickedLm = lm;
      }
    }

    if (clickedLm && onSetGps) {
      onSetGps(clickedLm.x, clickedLm.z, clickedLm.name);
    } else if (onSetGps) {
      const clampedX = Math.round(Math.max(-WORLD_PLAY_LIMIT, Math.min(WORLD_PLAY_LIMIT, wx)));
      const clampedZ = Math.round(Math.max(-WORLD_PLAY_LIMIT, Math.min(WORLD_PLAY_LIMIT, wz)));
      onSetGps(clampedX, clampedZ, `Titik (${clampedX}, ${clampedZ})`);
    }
  };

  const cycleZoom = () => {
    setZoomIdx((idx) => (idx + 1) % ZOOM_LEVELS.length);
  };

  const stepZoomIn = () => {
    setZoomIdx((idx) => Math.max(0, idx - 1));
  };

  const stepZoomOut = () => {
    setZoomIdx((idx) => Math.min(ZOOM_LEVELS.length - 1, idx + 1));
  };

  const featuredTubanDestinations = useMemo(
    () =>
      LANDMARKS.filter((lm) =>
        ['lm_alun', 'lm_tpi', 'lm_desa', 'lm_airterjun', 'lm_klenteng', 'lm_danau'].includes(lm.id)
      ),
    []
  );

  const pxInt = Math.round(hud.playerX);
  const pzInt = Math.round(hud.playerZ);

  return (
    <section
      aria-label="Peta Mini Kabupaten Tuban"
      className={`relative flex flex-col bg-[#121614]/92 border border-[#d99b26]/35 rounded-xl p-1.5 sm:p-2 short:p-1 shadow-xl transition-all ${
        expanded
          ? 'w-[264px] sm:w-[304px] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto no-scrollbar'
          : 'w-[116px] sm:w-[196px] short:w-[100px]'
      }`}
    >
      {/* Top Bar: Tuban Region + Controls */}
      <div className="flex items-center justify-between gap-1 pb-1 px-0.5">
        <button
          type="button"
          onClick={onOpenMap}
          title="Bukak Peta Lengkap Tuban"
          className="flex items-center gap-1 min-w-0 text-left hover:text-[#f5b942] transition-colors cursor-pointer"
        >
          <Compass className="w-3 h-3 text-[#f5b942] shrink-0" />
          <span className="text-[10px] sm:text-[11px] short:text-[9px] font-semibold text-[#f5f2eb] truncate">
            {expanded ? 'Peta Mini Tuban' : t(REGION_NAMES[hud.region], hud.language)}
          </span>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          {expanded ? (
            <>
              <button
                type="button"
                onClick={stepZoomIn}
                disabled={zoomIdx === 0}
                title="Perbesar Peta"
                aria-label="Perbesar Peta"
                className="p-1 rounded bg-white/8 hover:bg-white/15 disabled:opacity-35 text-[#e5e0d5] cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={stepZoomOut}
                disabled={zoomIdx === ZOOM_LEVELS.length - 1}
                title="Perkecil Peta"
                aria-label="Perkecil Peta"
                className="p-1 rounded bg-white/8 hover:bg-white/15 disabled:opacity-35 text-[#e5e0d5] cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={cycleZoom}
              title={`Skala Peta (${activeZoom.label})`}
              className="px-1.5 py-0.5 rounded bg-white/8 hover:bg-white/15 font-mono-tabular text-[9px] sm:text-[10px] font-semibold text-[#d6d0c4] cursor-pointer"
            >
              {activeZoom.label}
            </button>
          )}

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Ringkas Peta Mini' : 'Perluas Peta Mini Tuban'}
            aria-label={expanded ? 'Ringkas Peta Mini' : 'Perluas Peta Mini Tuban'}
            className="p-1 rounded bg-white/8 hover:bg-[#d99b26]/25 text-[#f5b942] cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Dynamic Coordinate-Centered Tuban Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-white/12 bg-[#151f18]">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onPointerMove={handleCanvasPointerMove}
          onPointerLeave={() => setHoveredLandmarkId(null)}
          title={
            expanded
              ? 'Klik lokasi ing peta kanggo ngarahake GPS'
              : 'Klik kanggo mbukak Peta & GPS lengkap'
          }
          className="block w-full aspect-square cursor-pointer"
        />

        {/* Subtle bottom-left coordinate readout overlaid cleanly inside canvas frame */}
        <div className="pointer-events-none absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[#0d120f]/85 font-mono-tabular text-[8px] sm:text-[9px] text-[#d6d0c4] leading-none">
          X {pxInt} · Z {pzInt}
        </div>
      </div>

      {/* Nearest Tuban Landmark & GPS Readout (unboxed tabular text) */}
      <div className="mt-1 sm:mt-1.5 short:mt-0.5 space-y-0.5 px-0.5 font-mono-tabular">
        {nearestLandmark && (
          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] short:text-[8.5px] text-[#cfc9bc]">
            <span className="truncate">
              {nearestLandmark.shortName}
            </span>
            <span className="text-emerald-400 shrink-0">{nearestLandmark.dist}m</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] short:text-[8.5px]">
          <span className="flex items-center gap-1 truncate text-[#f5f2eb]">
            <Crosshair className="w-2.5 h-2.5 text-[#f5b942] shrink-0" />
            <span className="truncate">
              {hud.gpsTarget ? hud.gpsTarget.label : 'Bebas'}
            </span>
          </span>
          {gpsDist !== null && (
            <span className="text-[#f5b942] font-semibold shrink-0">{gpsDist}m</span>
          )}
        </div>
      </div>

      {/* Expanded Interactive Tuban Locations Quick-GPS Strip */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[#b8b1a3]">
            <span>Pilih Tujuan Tuban (GPS)</span>
            <button
              type="button"
              onClick={onOpenMap}
              className="inline-flex items-center gap-1 text-[#f5b942] hover:underline font-medium cursor-pointer"
            >
              <MapIcon className="w-3 h-3" />
              <span>Semua ({LANDMARKS.length})</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {featuredTubanDestinations.map((lm) => {
              const dist = Math.round(Math.hypot(lm.x - hud.playerX, lm.z - hud.playerZ));
              const isTarget = hud.gpsTarget?.label === lm.name;
              return (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => {
                    if (onSetGps) {
                      onSetGps(lm.x, lm.z, lm.name);
                    } else {
                      onOpenMap();
                    }
                  }}
                  className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-left text-[10px] border transition-colors cursor-pointer ${
                    isTarget
                      ? 'bg-[#d99b26]/20 border-[#d99b26]/65 text-[#f5b942]'
                      : 'bg-[#181d1a] hover:bg-white/10 border-white/8 text-[#e5e0d5]'
                  }`}
                >
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <Navigation className="w-2.5 h-2.5 shrink-0 text-[#f5b942]" />
                    <span className="truncate">{SHORT_LANDMARK_NAMES[lm.id] ?? lm.name}</span>
                  </span>
                  <span className="font-mono-tabular text-[9px] text-[#a8a195] shrink-0">
                    {dist}m
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
