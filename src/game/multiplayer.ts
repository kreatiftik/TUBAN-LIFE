import { CharacterProfile, OnlineChatMessage, OnlinePlayerInfo, RegionId, VehicleType } from './types';

export interface MultiplayerJoinPayload {
  uid: string | null;
  character: CharacterProfile;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  region: RegionId;
  inVehicle: boolean;
  vehicleType: VehicleType | null;
  vehicleColor: number;
}

export interface MultiplayerStatePayload {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  region: RegionId;
  inVehicle: boolean;
  vehicleType: VehicleType | null;
  vehicleColor: number;
}

export interface MultiplayerCallbacks {
  onConnectionChange: (connected: boolean, selfId: string | null) => void;
  onWelcome: (selfId: string, players: OnlinePlayerInfo[]) => void;
  onPlayerJoined: (player: OnlinePlayerInfo) => void;
  onPlayerState: (update: { id: string } & MultiplayerStatePayload) => void;
  onPlayerProfile: (id: string, character: CharacterProfile) => void;
  onPlayerLeft: (id: string) => void;
  onChat: (message: OnlineChatMessage) => void;
}

export class TubanMultiplayerClient {
  private ws: WebSocket | null = null;
  private clientId: string;
  private selfId: string | null = null;
  private shouldRun = false;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private latestJoinProvider: () => MultiplayerJoinPayload;
  private callbacks: MultiplayerCallbacks;

  constructor(
    latestJoinProvider: () => MultiplayerJoinPayload,
    callbacks: MultiplayerCallbacks
  ) {
    this.clientId = `tb_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    this.latestJoinProvider = latestJoinProvider;
    this.callbacks = callbacks;
  }

  public connect() {
    if (this.shouldRun && this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.shouldRun = true;
    this.openSocket();
  }

  public disconnect() {
    this.shouldRun = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close(1000, 'leave');
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.selfId = null;
    this.callbacks.onConnectionChange(false, null);
  }

  public sendState(payload: MultiplayerStatePayload) {
    this.send({ type: 'state', ...payload });
  }

  public sendProfile(character: CharacterProfile) {
    this.send({ type: 'profile', character });
  }

  public sendChat(text: string): string {
    const msgId = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.send({ type: 'chat', text, msgId });
    return msgId;
  }

  public getSelfId(): string | null {
    return this.selfId;
  }

  private send(obj: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  private openSocket() {
    if (!this.shouldRun) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (!this.shouldRun || this.ws !== ws) {
        ws.close();
        return;
      }
      const initial = this.latestJoinProvider();
      this.send({
        type: 'join',
        clientId: this.clientId,
        ...initial,
      });

      if (this.pingTimer !== null) clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        this.send({ type: 'ping' });
      }, 12000);
    };

    ws.onmessage = (ev) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(String(ev.data)) as Record<string, unknown>;
      } catch {
        return;
      }
      if (data.type === 'welcome') {
        this.selfId = typeof data.selfId === 'string' ? data.selfId : this.clientId;
        this.callbacks.onConnectionChange(true, this.selfId);
        const list = Array.isArray(data.players) ? (data.players as OnlinePlayerInfo[]) : [];
        this.callbacks.onWelcome(this.selfId, list);
      } else if (data.type === 'player:joined' && data.player) {
        this.callbacks.onPlayerJoined(data.player as OnlinePlayerInfo);
      } else if (data.type === 'player:state' && typeof data.id === 'string') {
        this.callbacks.onPlayerState(data as unknown as { id: string } & MultiplayerStatePayload);
      } else if (data.type === 'player:profile' && typeof data.id === 'string' && data.character) {
        this.callbacks.onPlayerProfile(data.id, data.character as CharacterProfile);
      } else if (data.type === 'player:left' && typeof data.id === 'string') {
        this.callbacks.onPlayerLeft(data.id);
      } else if (data.type === 'player:chat' && data.message) {
        this.callbacks.onChat(data.message as OnlineChatMessage);
      }
    };

    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
      }
      if (this.pingTimer !== null) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.selfId = null;
      this.callbacks.onConnectionChange(false, null);
      if (this.shouldRun) {
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // handled by onclose
    };
  }

  private scheduleReconnect() {
    if (!this.shouldRun || this.reconnectTimer !== null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldRun) {
        this.openSocket();
      }
    }, 2500);
  }
}
