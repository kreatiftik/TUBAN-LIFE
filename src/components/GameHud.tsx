import React, { useState } from 'react';
import {
  ArrowUp,
  Backpack,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Compass,
  MapPin,
  Pause,
  Save,
  Settings,
  Sun,
  Users,
  Send,
  Navigation,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameHudState } from '../game/types';
import { MISSIONS, REGION_NAMES, UI_STRINGS, t } from '../game/jawaData';
import { TubanMinimapOverlay } from './TubanMinimapOverlay';
import { VirtualJoystick } from './VirtualJoystick';
import { DrawerTab } from './PlayerMenuModal';

interface GameHudProps {
  hud: GameHudState;
  onVirtualMove: (x: number, y: number) => void;
  onJump: () => void;
  onOpenDrawer: (tab: DrawerTab) => void;
  onInteract: () => void;
  onToggleVehicle: () => void;
  onHorn: () => void;
  onToggleWeather: () => void;
  onToggleMute: () => void;
  onSaveGame: () => void;
  onPause: () => void;
  onSetGps?: (x: number, z: number, label: string) => void;
  onSendChat?: (text: string) => void;
  onOpenCharacterCreator?: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onVirtualMove,
  onJump,
  onOpenDrawer,
  onInteract,
  onToggleVehicle,
  onHorn,
  onToggleWeather,
  onToggleMute,
  onSaveGame,
  onPause,
  onSetGps,
  onSendChat,
  onOpenCharacterCreator,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [onlinePanelOpen, setOnlinePanelOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const lang = hud.language;

  const activeMission = hud.activeMissionId
    ? MISSIONS.find((m) => m.id === hud.activeMissionId)
    : null;
  const activeStep = activeMission ? activeMission.steps[hud.activeStepIndex] : null;

  const hours = Math.floor(hud.timeOfDay).toString().padStart(2, '0');
  const mins = Math.floor((hud.timeOfDay % 1) * 60)
    .toString()
    .padStart(2, '0');

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 short:p-2">
      {/* Top Row: Minimap + Active Mission (Left) & Player Stats (Right) */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="pointer-events-auto flex flex-col short:flex-row items-start gap-1.5 sm:gap-2 shrink-0">
          <TubanMinimapOverlay
            hud={hud}
            onOpenMap={() => onOpenDrawer('map')}
            onSetGps={onSetGps}
          />

          {/* Active Mission Card tucked cleanly under Minimap (or beside it in landscape) */}
          {activeMission && activeStep && !hud.activeDialogue && (
            <button
              type="button"
              onClick={() => onOpenDrawer('missions')}
              className="text-left max-w-[148px] sm:max-w-[235px] short:max-w-[180px] bg-[#121614]/90 border border-white/12 hover:border-[#d99b26]/60 rounded-xl px-2.5 py-2 short:px-2 short:py-1.5 shadow-xl transition-colors cursor-pointer"
            >
              <div className="text-[10px] font-mono-tabular text-[#f5b942] font-semibold truncate">
                {activeMission.code} · {t(activeMission.title, lang)}
              </div>
              <p className="text-[11px] sm:text-xs short:text-[10px] text-[#e5e0d5] mt-0.5 leading-snug line-clamp-2">
                {t(activeStep.objective, lang)}
              </p>
            </button>
          )}
        </div>

        {/* Top-Center Toast Notification (Desktop & Mobile Landscape) */}
        {hud.toastMessage && (
          <div className="hidden md:flex short:flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#121614]/94 border border-[#d99b26]/55 text-[11px] sm:text-sm font-medium text-[#f8f5ee] shadow-lg max-w-[240px] sm:max-w-sm text-center">
            {hud.toastMessage}
          </div>
        )}

        {/* Top-Right Compact Stats Panel + Warga Online Toggle */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
          <div className="bg-[#121614]/90 border border-white/12 rounded-xl p-2 sm:p-3 short:p-1.5 shadow-xl w-[170px] sm:w-auto sm:min-w-[240px] short:w-[190px] short:min-w-0 space-y-1.5 sm:space-y-2 short:space-y-1">
            <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px] short:text-[10px] text-[#b8b1a3] font-mono-tabular">
              <span className="truncate max-w-[82px] sm:max-w-[135px] short:max-w-[95px] text-[#f5f2eb] font-medium">
                {t(REGION_NAMES[hud.region], lang)}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span>{hours}:{mins}</span>
                <span aria-hidden="true" className="hidden sm:inline short:hidden">·</span>
                <span className="hidden sm:inline short:hidden">
                  {hud.weather === 'hujan' ? t(UI_STRINGS.rain, lang) : t(UI_STRINGS.clear, lang)}
                </span>
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-1">
              <span className="font-mono-tabular text-sm sm:text-lg short:text-sm font-bold text-[#f5b942] truncate">
                Rp {hud.money.toLocaleString('id-ID')}
              </span>
              <span className="font-mono-tabular text-[10px] sm:text-[11px] short:text-[10px] text-[#cfc9bc] shrink-0">
                Lv.{hud.level} · {hud.reputation}
              </span>
            </div>

            {/* Health & Stamina Bars */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] w-9 sm:w-11 short:w-8 text-[#a8a195] truncate">
                  {t(UI_STRINGS.health, lang)}
                </span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150"
                    style={{ width: `${(hud.health / hud.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] w-9 sm:w-11 short:w-8 text-[#a8a195] truncate">
                  {t(UI_STRINGS.stamina, lang)}
                </span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f5b942] transition-all duration-150"
                    style={{ width: `${(hud.stamina / hud.maxStamina) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Online Players & Chat Compact Button */}
          <div className="flex items-center gap-1.5">
            {onOpenCharacterCreator && (
              <button
                type="button"
                onClick={onOpenCharacterCreator}
                title="Ubah Karakter 3D"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#121614]/90 border border-white/12 hover:border-[#d99b26]/60 text-[11px] font-medium text-[#f5f2eb] shadow-lg cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f5b942]" />
                <span className="hidden sm:inline max-w-[90px] truncate">{hud.character.name}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOnlinePanelOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold shadow-lg cursor-pointer ${
                onlinePanelOpen
                  ? 'bg-[#d99b26] text-[#111311] border-[#d99b26]'
                  : 'bg-[#121614]/90 text-[#f5f2eb] border-white/12 hover:border-cyan-400/50'
              }`}
            >
              <Users className={`w-3.5 h-3.5 ${onlinePanelOpen ? 'text-[#111311]' : hud.onlineConnected ? 'text-cyan-400' : 'text-[#8e877b]'}`} />
              <span className="font-mono-tabular">
                {hud.onlineConnected ? `${hud.onlinePlayers.length + 1} Online` : 'Offline'}
              </span>
            </button>
          </div>

          {/* Expandable Online Citizens & Live Chat Popover */}
          {onlinePanelOpen && !hud.activeDialogue && !hud.activeShopId && (
            <div className="w-[248px] sm:w-[290px] bg-[#121614]/95 border border-white/15 rounded-xl p-3 shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#f5f2eb]">
                  Warga Online ({hud.onlinePlayers.length + 1})
                </span>
                <span className="text-[10px] font-mono-tabular text-cyan-300">
                  {hud.onlineConnected ? 'Tersambung' : 'Nyambung...'}
                </span>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-0.5">
                <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-[#1a211e] text-[11px]">
                  <span className="font-semibold text-[#f5b942] truncate">
                    {hud.character.name} (Kamu)
                  </span>
                  <span className="text-[10px] text-[#a8a195] shrink-0">
                    {t(REGION_NAMES[hud.region], lang)}
                  </span>
                </div>
                {hud.onlinePlayers.length === 0 ? (
                  <p className="text-[11px] text-[#8e877b] px-1">
                    Durung ana pemain liya ing server iki. Ajak kanca mlebu supaya ketemu ing Tuban!
                  </p>
                ) : (
                  hud.onlinePlayers.map((p) => {
                    const dist = Math.round(Math.hypot(p.x - hud.playerX, p.z - hud.playerZ));
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-[#181d1a] border border-white/8 text-[11px]"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-[#f5f2eb] truncate">
                            {p.character.name}
                          </div>
                          <div className="text-[10px] text-[#9a9387] truncate">
                            {t(REGION_NAMES[p.region], lang)} · {dist}m
                          </div>
                        </div>
                        {onSetGps && (
                          <button
                            type="button"
                            onClick={() => onSetGps(p.x, p.z, p.character.name)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-[10px] font-bold cursor-pointer shrink-0"
                          >
                            <Navigation className="w-2.5 h-2.5" />
                            <span>GPS</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Feed & Input */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="max-h-24 overflow-y-auto space-y-1 text-[11px]">
                  {hud.recentChat.length === 0 ? (
                    <div className="text-[#7e786e] text-[10px]">
                      Kirim salam menyang warga online ing kene.
                    </div>
                  ) : (
                    hud.recentChat.slice(-6).map((msg) => (
                      <div key={msg.id} className="leading-snug text-[#e5e0d5]">
                        <span className="font-semibold text-cyan-300">{msg.senderName}: </span>
                        <span>{msg.text}</span>
                      </div>
                    ))
                  )}
                </div>

                {onSendChat && (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {['Halo lur!', 'Ketemuan Alun-Alun!', 'Sugeng rawuh!'].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => onSendChat(quick)}
                          className="px-2 py-0.5 rounded bg-white/8 hover:bg-white/15 text-[10px] text-[#cfc9bc] cursor-pointer"
                        >
                          {quick}
                        </button>
                      ))}
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const trimmed = chatDraft.trim();
                        if (!trimmed) return;
                        onSendChat(trimmed);
                        setChatDraft('');
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={chatDraft}
                        onChange={(e) => setChatDraft(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        maxLength={120}
                        placeholder="Tulis pesan..."
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#0c100e] border border-white/15 focus:border-[#d99b26] focus:outline-none text-xs text-[#f5f2eb] placeholder:text-[#726d64]"
                      />
                      <button
                        type="submit"
                        aria-label="Kirim Chat"
                        className="p-1.5 rounded-lg bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Portrait Toast Notification */}
      {hud.toastMessage && (
        <div className="md:hidden short:hidden self-center max-w-[90vw] px-3 py-1.5 rounded-xl bg-[#121614]/94 border border-[#d99b26]/55 text-xs font-medium text-[#f8f5ee] text-center shadow-lg">
          {hud.toastMessage}
        </div>
      )}

      {/* Bottom-Left Small Touch Joystick */}
      {!hud.activeDialogue && !hud.activeShopId && (
        <div className="pointer-events-auto absolute bottom-3 left-3 sm:bottom-4 sm:left-4 short:bottom-2.5 short:left-2.5 z-20">
          <VirtualJoystick size={88} onMove={onVirtualMove} />
        </div>
      )}

      {/* Bottom Area: Action Prompts & Dock (pushed right of bottom-left joystick on mobile) */}
      <div className="flex flex-col items-end sm:items-center short:items-end gap-2 short:gap-1.5 pl-[102px] sm:pl-28 short:pl-[104px]">
        {/* Interaction Prompt, Jump & Vehicle Speedometer */}
        {!hud.activeDialogue && !hud.activeShopId && (
          <div className="flex flex-wrap items-center justify-end sm:justify-center short:justify-end gap-2 pointer-events-auto">
            {hud.interactPrompt && (
              <button
                type="button"
                onClick={onInteract}
                className="flex items-center gap-2 px-3.5 py-2.5 short:py-2 min-h-[42px] short:min-h-[38px] rounded-xl bg-[#d99b26] hover:bg-[#e5aa38] active:scale-[0.98] text-[#111311] font-semibold text-xs sm:text-sm shadow-xl cursor-pointer transition-all"
              >
                <span className="px-1.5 py-0.5 rounded bg-[#111311]/15 font-mono-tabular text-xs font-bold">
                  {hud.interactPrompt.kind === 'vehicle' ? 'F' : 'E'}
                </span>
                <span className="max-w-[165px] sm:max-w-none truncate">
                  {t(hud.interactPrompt.label, lang)}
                </span>
              </button>
            )}

            {!hud.inVehicle && (
              <button
                type="button"
                onClick={onJump}
                aria-label="Lompat"
                className="hidden max-sm:flex touch:flex short:flex items-center gap-1 px-3 py-2.5 short:py-2 min-h-[42px] short:min-h-[38px] rounded-xl bg-[#121614]/90 border border-white/15 active:bg-white/15 text-xs font-semibold text-[#f5f2eb] shadow-lg cursor-pointer"
              >
                <ArrowUp className="w-4 h-4 text-[#f5b942]" />
                <span>Lompat</span>
              </button>
            )}

            {hud.inVehicle && (
              <div className="flex flex-wrap items-center justify-end gap-2 px-3 py-1.5 sm:px-4 sm:py-2 short:py-1 rounded-xl bg-[#121614]/92 border border-[#d99b26]/45 shadow-xl">
                <div>
                  <div className="text-[10px] text-[#b8b1a3] leading-none max-w-[90px] sm:max-w-none truncate">
                    {hud.vehicleName}
                  </div>
                  <div className="font-mono-tabular text-sm sm:text-lg short:text-sm font-bold text-[#f5b942] leading-tight">
                    {hud.speedKmh} <span className="text-[10px] sm:text-xs font-normal text-[#cfc9bc]">km/j</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onHorn}
                  className="px-2.5 py-1.5 min-h-[36px] short:min-h-[32px] rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-[#f5f2eb] cursor-pointer"
                >
                  Klakson
                </button>
                <button
                  type="button"
                  onClick={onToggleVehicle}
                  className="px-2.5 py-1.5 min-h-[36px] short:min-h-[32px] rounded-lg bg-red-600/80 hover:bg-red-500 text-xs font-semibold text-white cursor-pointer"
                >
                  {t(UI_STRINGS.exitVehicle, lang)}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Unified Bottom Control Dock */}
        {!hud.activeDialogue && !hud.activeShopId && (
          <div className="pointer-events-auto flex flex-col items-end sm:items-center short:items-end max-w-full">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="flex items-center gap-1 px-3 py-1 short:py-0.5 rounded-t-lg bg-[#121614]/90 border border-b-0 border-white/12 text-[11px] short:text-[10px] text-[#b8b1a3] hover:text-white cursor-pointer"
            >
              {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{dockCollapsed ? 'Menu' : 'Tutup'}</span>
            </button>

            {!dockCollapsed && (
              <div className="flex flex-nowrap sm:flex-wrap short:flex-nowrap items-center justify-start sm:justify-center short:justify-start gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 short:py-1 rounded-xl bg-[#121614]/92 border border-white/12 shadow-2xl max-w-full overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => onOpenDrawer('missions')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Compass className="w-3.5 h-3.5 text-[#f5b942]" />
                  <span>Misi</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrawer('inventory')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Backpack className="w-3.5 h-3.5 text-[#f5b942]" />
                  <span>Tas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrawer('map')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#f5b942]" />
                  <span>Peta</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleWeather}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  {hud.weather === 'hujan' ? (
                    <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-[#f5b942]" />
                  )}
                  <span>Cuaca</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  {hud.audioMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#a8a195]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#f5b942]" />
                  )}
                  <span>Audio</span>
                </button>
                <button
                  type="button"
                  onClick={onSaveGame}
                  title="Simpen Progress menyang Cloud Online"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Simpen Cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDrawer('settings')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg hover:bg-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Settings className="w-3.5 h-3.5 text-[#cfc9bc]" />
                  <span>Setelan</span>
                </button>
                <button
                  type="button"
                  onClick={onPause}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 short:py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-xs font-medium text-[#f5f2eb] cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
