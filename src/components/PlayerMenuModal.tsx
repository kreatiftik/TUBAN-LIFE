import React, { useState } from 'react';
import {
  Backpack,
  CheckCircle2,
  Compass,
  MapPin,
  Settings,
  Shirt,
  Sun,
  CloudRain,
  Save,
  X,
  Navigation,
  Cloud,
  LogIn,
  LogOut,
  UploadCloud,
  DownloadCloud,
  UserPlus,
  Eye,
  EyeOff,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  CloudSyncStatus,
  CloudUserInfo,
  GameHudState,
  LanguageMode,
  OutfitId,
  WeatherType,
} from '../game/types';
import { MISSIONS, OUTFIT_LABELS, REGION_NAMES, UI_STRINGS, t } from '../game/jawaData';
import { LANDMARKS } from '../game/worldData';

export type DrawerTab = 'inventory' | 'missions' | 'map' | 'settings';

interface PlayerMenuModalProps {
  hud: GameHudState;
  initialTab: DrawerTab;
  cloudUser: CloudUserInfo | null;
  cloudSavedAt: string | null;
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  onClose: () => void;
  onUseItem: (id: string) => void;
  onEquipOutfit: (outfit: OutfitId) => void;
  onStartMission: (missionId: string) => void;
  onSetGps: (x: number, z: number, label: string) => void;
  onTeleport: (x: number, z: number, label: string) => void;
  onChangeLanguage: (lang: LanguageMode) => void;
  onSetWeather: (w: WeatherType) => void;
  onSetTime: (hour: number) => void;
  onSetGraphicsMode: (mode: 'lancar' | 'seimbang' | 'tinggi') => void;
  onToggleMute: () => void;
  onToggleGamelan: () => void;
  onSaveGame: () => void;
  onCloudPinSignIn: (playerId: string, pin: string) => void;
  onCloudPinRegister: (playerId: string, pin: string) => void;
  onCloudSignIn: () => void;
  onCloudSignOut: () => void;
  onSaveToCloud: () => void;
  onLoadFromCloud: () => void;
  onOpenCharacterCreator: () => void;
  onReturnToMenu: () => void;
}

export const PlayerMenuModal: React.FC<PlayerMenuModalProps> = ({
  hud,
  initialTab,
  cloudUser,
  cloudSavedAt,
  cloudStatus,
  cloudError,
  onClose,
  onUseItem,
  onEquipOutfit,
  onStartMission,
  onSetGps,
  onTeleport,
  onChangeLanguage,
  onSetWeather,
  onSetTime,
  onSetGraphicsMode,
  onToggleMute,
  onToggleGamelan,
  onSaveGame,
  onCloudPinSignIn,
  onCloudPinRegister,
  onCloudSignIn,
  onCloudSignOut,
  onSaveToCloud,
  onLoadFromCloud,
  onOpenCharacterCreator,
  onReturnToMenu,
}) => {
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const lang = hud.language;

  const tabs: Array<{ id: DrawerTab; label: string; icon: React.ReactNode }> = [
    { id: 'missions', label: t(UI_STRINGS.missions, lang), icon: <Compass className="w-4 h-4" /> },
    { id: 'inventory', label: t(UI_STRINGS.inventory, lang), icon: <Backpack className="w-4 h-4" /> },
    { id: 'map', label: 'Peta & GPS', icon: <MapPin className="w-4 h-4" /> },
    { id: 'settings', label: t(UI_STRINGS.settings, lang), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 short:p-2 bg-black/60">
      <div className="w-full max-w-4xl bg-[#121614] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] short:max-h-[95dvh]">
        {/* Header & Tabs */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-3 sm:px-5 sm:py-4 short:py-2 border-b border-white/10 bg-[#161b18] shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1210] border border-white/10 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 short:py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  tab === tb.id
                    ? 'bg-[#d99b26] text-[#111311]'
                    : 'text-[#cfc9bc] hover:text-white'
                }`}
              >
                {tb.icon}
                <span>{tb.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 short:py-1.5 min-h-[38px] short:min-h-[34px] rounded-lg bg-white/8 hover:bg-white/15 text-xs font-medium text-[#f5f2eb] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Tutup</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 short:p-3.5 overflow-y-auto space-y-5 sm:space-y-6 short:space-y-3.5">
          {tab === 'missions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#b8b1a3]">
                <span>
                  Misi Rampung: {hud.completedMissionIds.length} / {MISSIONS.length}
                </span>
                <span>Reputasi Warga: {hud.reputation}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {MISSIONS.map((m) => {
                  const isDone = hud.completedMissionIds.includes(m.id);
                  const isActive = hud.activeMissionId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isActive
                          ? 'bg-[#1f261e] border-[#d99b26]'
                          : 'bg-[#181d1a] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono-tabular text-[#f5b942] font-semibold">
                          {m.code} · {t(REGION_NAMES[m.region], lang)}
                        </span>
                        {isDone && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Rampung
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-base font-bold text-[#f5f2eb]">
                        {t(m.title, lang)}
                      </h4>
                      <p className="text-xs text-[#b8b1a3] leading-relaxed">
                        {t(m.summary, lang)}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/8 text-xs">
                        <span className="font-mono-tabular text-[#d6d0c4]">
                          Rp {m.rewardMoney.toLocaleString('id-ID')} · +{m.rewardXp} XP
                        </span>
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => {
                              onStartMission(m.id);
                              onClose();
                            }}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600/30 text-emerald-300'
                                : 'bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311]'
                            }`}
                          >
                            {isActive ? 'Lagi Dijalanke' : 'Aktifke GPS'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'inventory' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items */}
              <div className="space-y-3">
                <h4 className="font-display text-base font-bold text-[#f5f2eb] flex items-center gap-2">
                  <Backpack className="w-4 h-4 text-[#f5b942]" />
                  <span>{t(UI_STRINGS.inventory, lang)}</span>
                </h4>
                {hud.inventory.length === 0 ? (
                  <p className="text-xs text-[#a8a195]">Tas kosong. Mampir menyang Warung utawa Pasar!</p>
                ) : (
                  <div className="space-y-2.5">
                    {hud.inventory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#181d1a] border border-white/10"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#f5f2eb]">
                            {t(item.name, lang)}{' '}
                            <span className="font-mono-tabular text-[#f5b942]">×{item.quantity}</span>
                          </div>
                          <div className="text-xs text-[#a8a195] mt-0.5">
                            {t(item.description, lang)}
                          </div>
                        </div>
                        {item.category === 'makanan' && (
                          <button
                            type="button"
                            onClick={() => onUseItem(item.id)}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-xs font-semibold cursor-pointer"
                          >
                            Dhahar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Wardrobe / Outfits */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-display text-base font-bold text-[#f5f2eb] flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-[#f5b942]" />
                    <span>{t(UI_STRINGS.wardrobe, lang)} {hud.character.name}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCharacterCreator();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-xs font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ubah Karakter 3D</span>
                  </button>
                </div>
                <div className="space-y-2.5">
                  {(['kasual', 'batik', 'jaket_motor', 'lurik'] as OutfitId[]).map((oid) => {
                    const owned = hud.ownedOutfits.includes(oid);
                    const equipped = hud.outfit === oid;
                    return (
                      <div
                        key={oid}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#181d1a] border border-white/10"
                      >
                        <div>
                          <div className="text-sm font-semibold text-[#f5f2eb]">
                            {t(OUTFIT_LABELS[oid], lang)}
                          </div>
                          <div className="text-xs text-[#a8a195]">
                            {owned ? 'Wis diduweni' : 'Tuku ing Galeri Batik Gedog Kerek Tuban'}
                          </div>
                        </div>
                        {owned && (
                          <button
                            type="button"
                            onClick={() => onEquipOutfit(oid)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                              equipped
                                ? 'bg-emerald-600/30 text-emerald-300'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                          >
                            {equipped ? 'Dipakai' : 'Anggo'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'map' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#b8b1a3]">
                <span>
                  Lokasi Ditemokake: {hud.discoveredLandmarks.length} / {LANDMARKS.length}
                </span>
                <span>Klik "GPS" kanggo nuntun dalan, utawa "Tuju" kanggo cepet tekan lokasi.</span>
              </div>
              {hud.onlinePlayers.length > 0 && (
                <div className="p-3 rounded-xl bg-[#161e20] border border-cyan-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                    <Users className="w-4 h-4" />
                    <span>Pemain Online ing Tuban ({hud.onlinePlayers.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {hud.onlinePlayers.map((p) => {
                      const dist = Math.round(Math.hypot(p.x - hud.playerX, p.z - hud.playerZ));
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#121614] border border-white/10"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#f5f2eb] truncate">
                              {p.character.name}
                            </div>
                            <div className="text-[10px] text-[#9a9387] truncate">
                              {t(REGION_NAMES[p.region], lang)} · {dist}m
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSetGps(p.x, p.z, p.character.name);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#0c1416] text-xs font-bold cursor-pointer shrink-0"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>GPS</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {LANDMARKS.map((lm) => {
                  const dist = Math.round(Math.hypot(lm.x - hud.playerX, lm.z - hud.playerZ));
                  return (
                    <div
                      key={lm.id}
                      className="p-3.5 rounded-xl bg-[#181d1a] border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="text-[11px] font-mono-tabular text-[#f5b942]">
                          {t(REGION_NAMES[lm.region], lang)} · {dist}m
                        </div>
                        <div className="font-semibold text-sm text-[#f5f2eb] mt-0.5">
                          {lm.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onSetGps(lm.x, lm.z, lm.name);
                            onClose();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-xs font-semibold cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>GPS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onTeleport(lm.x, lm.z, lm.name);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-[#f5f2eb] cursor-pointer"
                        >
                          Tuju
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#b8b1a3]">
                    {t(UI_STRINGS.language, lang)}
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#0e1210] border border-white/10">
                    {(['ngoko', 'krama', 'indonesia'] as LanguageMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onChangeLanguage(mode)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                          lang === mode ? 'bg-[#d99b26] text-[#111311]' : 'text-[#cfc9bc]'
                        }`}
                      >
                        {mode === 'ngoko' ? 'Jawa Ngoko' : mode === 'krama' ? 'Jawa Krama' : 'Indonesia'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#b8b1a3]">
                    {t(UI_STRINGS.weather, lang)}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSetWeather('cerah')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        hud.weather === 'cerah'
                          ? 'bg-[#d99b26] text-[#111311] border-[#d99b26]'
                          : 'bg-[#181d1a] text-[#f5f2eb] border-white/10'
                      }`}
                    >
                      <Sun className="w-4 h-4" />
                      <span>{t(UI_STRINGS.clear, lang)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetWeather('hujan')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        hud.weather === 'hujan'
                          ? 'bg-[#38bdf8] text-[#0f172a] border-[#38bdf8]'
                          : 'bg-[#181d1a] text-[#f5f2eb] border-white/10'
                      }`}
                    >
                      <CloudRain className="w-4 h-4" />
                      <span>{t(UI_STRINGS.rain, lang)}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#b8b1a3]">
                    Wektu (Jam {Math.floor(hud.timeOfDay).toString().padStart(2, '0')}:00)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Esuk', hr: 6.5 },
                      { label: 'Awan', hr: 12 },
                      { label: 'Sore', hr: 17.3 },
                      { label: 'Wengi', hr: 21.5 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => onSetTime(preset.hr)}
                        className="px-3 py-2 rounded-lg bg-[#181d1a] hover:bg-white/10 border border-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#b8b1a3]">
                    Kualitas Grafis & Performa FPS
                  </label>
                  <div className="flex gap-1.5 p-1 rounded-xl bg-[#0e1210] border border-white/10">
                    {(
                      [
                        { id: 'lancar', label: 'Lancar (FPS)' },
                        { id: 'seimbang', label: 'Seimbang' },
                        { id: 'tinggi', label: 'Tinggi' },
                      ] as const
                    ).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => onSetGraphicsMode(g.id)}
                        className={`flex-1 px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                          hud.graphicsMode === g.id
                            ? 'bg-[#d99b26] text-[#111311]'
                            : 'text-[#cfc9bc] hover:text-white'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[#8d877a]">
                    {hud.graphicsMode === 'lancar'
                      ? 'Bayangan dipateni kanggo FPS paling entheng lan lancar.'
                      : hud.graphicsMode === 'seimbang'
                        ? 'Standar entheng nganggo bayangan cepet lan gambar tajem.'
                        : 'Resolusi dhuwur lan bayangan alus kanggo piranti kuwat.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#b8b1a3]">
                    Audio & Musik Gamelan
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onToggleMute}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-[#181d1a] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#f5f2eb] cursor-pointer"
                    >
                      {hud.audioMuted ? 'Suara: Bisu' : 'Suara: Aktif'}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleGamelan}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-[#181d1a] hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#f5f2eb] cursor-pointer"
                    >
                      {hud.gamelanEnabled ? 'Gamelan: Aktif' : 'Gamelan: Mati'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 p-3.5 rounded-xl bg-[#181d1a] border border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#f5f2eb]">
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <span>Cloud Save Online</span>
                    </div>
                    {cloudUser && (
                      <button
                        type="button"
                        onClick={onCloudSignOut}
                        className="flex items-center gap-1 text-[11px] text-[#b8b1a3] hover:text-white cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Keluar</span>
                      </button>
                    )}
                  </div>

                  {cloudUser ? (
                    <div className="space-y-2.5">
                      <div className="text-[11px] text-[#a8a195]">
                        Akun:{' '}
                        <span className="text-[#f5f2eb] font-medium">
                          {cloudUser.authMode === 'pin'
                            ? `ID ${cloudUser.playerId}`
                            : cloudUser.email || cloudUser.displayName}
                        </span>
                        <br />
                        {cloudStatus === 'syncing'
                          ? 'Status: Lagi nyinkronake menyang cloud...'
                          : cloudSavedAt
                            ? `Simpanan cloud: ${new Date(cloudSavedAt).toLocaleString('id-ID')}`
                            : 'Durung ana data save ing cloud.'}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={onSaveToCloud}
                          disabled={cloudStatus === 'syncing'}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#0c140e] text-xs font-semibold cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Simpen Cloud</span>
                        </button>
                        {cloudSavedAt && (
                          <button
                            type="button"
                            onClick={() => {
                              onLoadFromCloud();
                              onClose();
                            }}
                            disabled={cloudStatus === 'syncing'}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#232b26] hover:bg-white/15 disabled:opacity-60 text-[#f5f2eb] text-xs font-semibold cursor-pointer"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                            <span>Muat Cloud</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (cloudStatus === 'syncing') return;
                        onCloudPinSignIn(playerIdInput, pinInput);
                      }}
                      className="space-y-2"
                    >
                      <p className="text-[11px] text-[#a8a195]">
                        Masuk utawa gawe ID Pemain + PIN (min. 6) supaya progres kesimpen online.
                      </p>
                      <input
                        type="text"
                        value={playerIdInput}
                        onChange={(e) => setPlayerIdInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="ID Pemain (cth: bagas99)"
                        autoComplete="username"
                        maxLength={20}
                        className="w-full px-3 py-2 rounded-lg bg-[#0e1210] border border-white/15 focus:border-[#d99b26] focus:outline-none text-xs text-[#f5f2eb] placeholder:text-[#726d64]"
                      />
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          placeholder="PIN (min. 6 angka/huruf)"
                          autoComplete="current-password"
                          maxLength={32}
                          className="w-full pl-3 pr-9 py-2 rounded-lg bg-[#0e1210] border border-white/15 focus:border-[#d99b26] focus:outline-none text-xs text-[#f5f2eb] placeholder:text-[#726d64]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin((v) => !v)}
                          aria-label={showPin ? 'Sembunyikan PIN' : 'Lihat PIN'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a9387] hover:text-[#f5f2eb] cursor-pointer"
                        >
                          {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={cloudStatus === 'syncing'}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#0c140e] text-xs font-semibold cursor-pointer"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Masuk</span>
                        </button>
                        <button
                          type="button"
                          disabled={cloudStatus === 'syncing'}
                          onClick={() => onCloudPinRegister(playerIdInput, pinInput)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#232b26] hover:bg-white/15 disabled:opacity-60 text-[#f5f2eb] text-xs font-semibold cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Daftar Baru</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={onCloudSignIn}
                        disabled={cloudStatus === 'syncing'}
                        className="w-full text-center text-[11px] text-[#a8a195] hover:text-[#f5b942] underline underline-offset-2 pt-0.5 cursor-pointer disabled:opacity-50"
                      >
                        Atau Masuk nganggo Google
                      </button>
                    </form>
                  )}

                  {cloudError && <div className="text-[11px] text-red-400">{cloudError}</div>}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={onSaveGame}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-sm font-semibold cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t(UI_STRINGS.saveGame, lang)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onReturnToMenu}
                    className="w-full px-4 py-3 rounded-xl bg-[#181d1a] hover:bg-red-950/60 border border-white/10 text-sm font-medium text-[#f5f2eb] cursor-pointer"
                  >
                    {t(UI_STRINGS.backToMenu, lang)}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
