import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { CharacterProfile, OnlineChatMessage, OnlinePlayerInfo, RegionId, VehicleType } from './src/game/types.ts';
import { sanitizeCharacterProfile } from './src/game/characterPresets.ts';

interface ServerPlayer extends OnlinePlayerInfo {
  ws: WebSocket;
  lastSeen: number;
}

const VALID_REGIONS = new Set<RegionId>(['desa', 'kota', 'pegunungan', 'pesisir', 'wisata']);
const VALID_VEHICLES = new Set<VehicleType>([
  'motor_bebek',
  'motor_matic',
  'motor_sport',
  'mobil_keluarga',
  'pickup',
  'truk',
  'bus',
  'sepeda',
]);

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.min(max, Math.max(min, val));
}

function toPublicPlayer(p: ServerPlayer): OnlinePlayerInfo {
  return {
    id: p.id,
    uid: p.uid,
    character: p.character,
    x: p.x,
    y: p.y,
    z: p.z,
    yaw: p.yaw,
    speed: p.speed,
    region: p.region,
    inVehicle: p.inVehicle,
    vehicleType: p.vehicleType,
    vehicleColor: p.vehicleColor,
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, onlinePlayers: players.size });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  const players = new Map<string, ServerPlayer>();

  const broadcast = (payload: unknown, excludeId?: string) => {
    const serialized = JSON.stringify(payload);
    for (const [id, client] of players.entries()) {
      if (excludeId && id === excludeId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    }
  };

  wss.on('connection', (ws) => {
    let playerId: string = randomUUID();
    let joined = false;

    ws.on('message', (rawBuf) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawBuf.toString('utf8')) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;

      if (type === 'join') {
        const uid =
          typeof msg.uid === 'string' && msg.uid.trim().length > 0
            ? msg.uid.trim().slice(0, 128)
            : null;
        const requestedId =
          typeof msg.clientId === 'string' && /^[a-zA-Z0-9_\-]{4,64}$/.test(msg.clientId)
            ? msg.clientId
            : playerId;
        playerId = requestedId;

        // Deduplicate previous stale connection for the same authenticated UID or clientId
        for (const [existingId, existingPlayer] of players.entries()) {
          if (existingId === playerId || (uid && existingPlayer.uid && existingPlayer.uid === uid)) {
            players.delete(existingId);
            broadcast({ type: 'player:left', id: existingId }, existingId);
            try {
              existingPlayer.ws.close(1000, 'reconnected');
            } catch {
              // ignore
            }
          }
        }

        const character = sanitizeCharacterProfile(
          msg.character as Partial<CharacterProfile> | undefined
        );
        const region =
          typeof msg.region === 'string' && VALID_REGIONS.has(msg.region as RegionId)
            ? (msg.region as RegionId)
            : 'desa';
        const vehicleType =
          typeof msg.vehicleType === 'string' && VALID_VEHICLES.has(msg.vehicleType as VehicleType)
            ? (msg.vehicleType as VehicleType)
            : null;

        const player: ServerPlayer = {
          id: playerId,
          uid,
          character,
          x: clampNum(msg.x, -420, 420, -12),
          y: clampNum(msg.y, -30, 120, 0),
          z: clampNum(msg.z, -420, 420, 10),
          yaw: clampNum(msg.yaw, -Math.PI * 4, Math.PI * 4, 0),
          speed: clampNum(msg.speed, 0, 50, 0),
          region,
          inVehicle: Boolean(msg.inVehicle && vehicleType),
          vehicleType,
          vehicleColor: Math.floor(clampNum(msg.vehicleColor, 0, 0xffffff, 0x1e40af)),
          ws,
          lastSeen: Date.now(),
        };

        players.set(playerId, player);
        joined = true;

        const snapshot = Array.from(players.values())
          .filter((p) => p.id !== playerId)
          .map(toPublicPlayer);

        ws.send(
          JSON.stringify({
            type: 'welcome',
            selfId: playerId,
            players: snapshot,
          })
        );

        broadcast({ type: 'player:joined', player: toPublicPlayer(player) }, playerId);
        return;
      }

      if (!joined) return;
      const current = players.get(playerId);
      if (!current) return;
      current.lastSeen = Date.now();

      if (type === 'state') {
        const region =
          typeof msg.region === 'string' && VALID_REGIONS.has(msg.region as RegionId)
            ? (msg.region as RegionId)
            : current.region;
        const vehicleType =
          typeof msg.vehicleType === 'string' && VALID_VEHICLES.has(msg.vehicleType as VehicleType)
            ? (msg.vehicleType as VehicleType)
            : null;

        current.x = clampNum(msg.x, -420, 420, current.x);
        current.y = clampNum(msg.y, -30, 120, current.y);
        current.z = clampNum(msg.z, -420, 420, current.z);
        current.yaw = clampNum(msg.yaw, -Math.PI * 4, Math.PI * 4, current.yaw);
        current.speed = clampNum(msg.speed, 0, 50, 0);
        current.region = region;
        current.inVehicle = Boolean(msg.inVehicle && vehicleType);
        current.vehicleType = vehicleType;
        current.vehicleColor = Math.floor(clampNum(msg.vehicleColor, 0, 0xffffff, current.vehicleColor));

        broadcast(
          {
            type: 'player:state',
            id: playerId,
            x: current.x,
            y: current.y,
            z: current.z,
            yaw: current.yaw,
            speed: current.speed,
            region: current.region,
            inVehicle: current.inVehicle,
            vehicleType: current.vehicleType,
            vehicleColor: current.vehicleColor,
          },
          playerId
        );
      } else if (type === 'profile') {
        current.character = sanitizeCharacterProfile(
          msg.character as Partial<CharacterProfile> | undefined,
          current.character.name
        );
        broadcast(
          {
            type: 'player:profile',
            id: playerId,
            character: current.character,
          },
          playerId
        );
      } else if (type === 'chat') {
        if (typeof msg.text !== 'string') return;
        const cleanText = msg.text.replace(/\s+/g, ' ').trim().slice(0, 100);
        if (!cleanText) return;
        const chatMsg: OnlineChatMessage = {
          id:
            typeof msg.msgId === 'string' && msg.msgId.length > 0
              ? msg.msgId.slice(0, 48)
              : randomUUID(),
          senderId: playerId,
          senderName: current.character.name,
          text: cleanText,
          sentAt: Date.now(),
        };
        broadcast({ type: 'player:chat', message: chatMsg });
      } else if (type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }
    });

    ws.on('close', () => {
      if (players.has(playerId)) {
        players.delete(playerId);
        broadcast({ type: 'player:left', id: playerId });
      }
    });

    ws.on('error', () => {
      if (players.has(playerId)) {
        players.delete(playerId);
        broadcast({ type: 'player:left', id: playerId });
      }
    });
  });

  // Periodic stale socket cleanup
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, p] of players.entries()) {
      if (now - p.lastSeen > 30000 || p.ws.readyState !== WebSocket.OPEN) {
        players.delete(id);
        broadcast({ type: 'player:left', id });
        try {
          p.ws.terminate();
        } catch {
          // ignore
        }
      }
    }
  }, 8000);
  sweepTimer.unref();

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve('dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`TUBAN LIFE server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
