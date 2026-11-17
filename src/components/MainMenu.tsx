import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Globe,
  Volume2,
  VolumeX,
  Compass,
  Cloud,
  LogIn,
  LogOut,
  CheckCircle2,
  Trash2,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { CharacterProfile, CloudSyncStatus, CloudUserInfo, LanguageMode } from '../game/types';
import { UI_STRINGS, t } from '../game/jawaData';

interface MainMenuProps {
  language: LanguageMode;
  audioMuted: boolean;
  character: CharacterProfile;
  hasCustomCharacter: boolean;
  cloudUser: CloudUserInfo | null;
  cloudSavedAt: string | null;
  cloudStatus: CloudSyncStatus;
  cloudError: string | null;
  onNewGame: () => void;
  onContinueCloud: () => void;
  onOpenCharacterCreator: () => void;
  onCloudPinSignIn: (playerId: string, pin: string) => void;
  onCloudPinRegister: (playerId: string, pin: string) => void;
  onCloudSignIn: () => void;
  onCloudSignOut: () => void;
  onDeleteCloudSave: () => void;
  onChangeLanguage: (lang: LanguageMode) => void;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  language,
  audioMuted,
  character,
  hasCustomCharacter,
  cloudUser,
  cloudSavedAt,
  cloudStatus,
  cloudError,
  onNewGame,
  onContinueCloud,
  onOpenCharacterCreator,
  onCloudPinSignIn,
  onCloudPinRegister,
  onCloudSignIn,
  onCloudSignOut,
  onDeleteCloudSave,
  onChangeLanguage,
  onToggleMute,
}) => {
  const [playerIdInput, setPlayerIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);

  const isBusy = cloudStatus === 'syncing';

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    onCloudPinSignIn(playerIdInput, pinInput);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-start lg:items-center justify-center p-4 py-6 sm:p-6 short:p-3 overflow-y-auto bg-gradient-to-r from-[#0c100e]/92 via-[#0c100e]/74 to-[#0c100e]/45 lg:to-transparent">
      <div className="w-full max-w-5xl grid grid-cols-1 short:grid-cols-12 lg:grid-cols-12 gap-5 short:gap-4 lg:gap-8 items-center short:items-start my-auto">
        {/* Left: Hero Title & Primary Actions */}
        <div className="short:col-span-7 lg:col-span-7 space-y-4 sm:space-y-5 short:space-y-2.5">
          <div className="space-y-2.5 sm:space-y-3 short:space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-tabular tracking-wider text-[#f5b942]">
              <span>KABUPATEN TUBAN · BUMI WALI</span>
              <span aria-hidden="true">·</span>
              <span>3D OPEN WORLD</span>
            </div>
            <h1 className="font-display text-4xl sm:text-6xl short:text-3xl font-extrabold tracking-tight text-[#f8f5ee] leading-[1.06] text-balance">
              TUBAN LIFE
            </h1>
            <p className="font-display text-xl sm:text-2xl short:text-base font-semibold text-[#e2c27d]">
              Petualangan ing Tuban
            </p>
            <p className="text-sm sm:text-base short:text-xs text-[#cfc9bc] max-w-xl leading-relaxed">
              {language === 'ngoko'
                ? `Jelajahi Desa Kerek, Alun-Alun & Masjid Agung Tuban, Air Terjun Nglirip, Pantai Boom & Klenteng Kwan Sing Bio, nganti Sendang Bektiharjo minangka ${character.name}.`
                : language === 'krama'
                  ? `Tliti Dhusun Kerek, Alun-Alun & Masjid Ageng Tuban, Grojogan Nglirip, Pantai Boom & Klenteng Kwan Sing Bio, ngantos Sendang Bektiharjo minangka ${character.name}.`
                  : `Jelajahi Desa Kerek, Alun-Alun & Masjid Agung Tuban, Air Terjun Nglirip, Pantai Boom & Klenteng Kwan Sing Bio, hingga Sendang Bektiharjo sebagai ${character.name}.`}
            </p>
          </div>

          {/* Primary Menu Buttons (Online Only) */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {cloudUser ? (
              <>
                {cloudSavedAt && (
                  <button
                    type="button"
                    onClick={onContinueCloud}
                    className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#0c140e] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>
                      {language === 'ngoko'
                        ? 'Lanjutke Saka Cloud Online'
                        : language === 'krama'
                          ? 'Lajengaken Saking Cloud Online'
                          : 'Lanjutkan dari Cloud Online'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onNewGame}
                  className={`flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap ${
                    cloudSavedAt
                      ? 'bg-[#1c231f] hover:bg-[#27312b] text-[#f5f2eb] border border-white/15'
                      : 'bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311]'
                  }`}
                >
                  {cloudSavedAt ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>
                    {cloudSavedAt
                      ? t(UI_STRINGS.newGame, language)
                      : language === 'indonesia'
                        ? 'Mulai Petualangan Online'
                        : 'Mulai Main Online'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onOpenCharacterCreator}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-[#1c231f] hover:bg-[#27312b] text-[#f5b942] border border-[#d99b26]/35 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{hasCustomCharacter ? `Karakter: ${character.name}` : 'Buat Karakter'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onCloudSignIn}
                disabled={isBusy}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#0c140e] font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isBusy
                    ? 'Nyambung...'
                    : language === 'indonesia'
                      ? 'Masuk Google & Main Online'
                      : 'Masuk Google & Main Online'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-[#1c231f] hover:bg-[#27312b] text-[#e5e0d5] border border-white/15 text-sm transition-colors cursor-pointer whitespace-nowrap"
              aria-label="Toggle Audio"
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{audioMuted ? 'Audio Bisu' : 'Gamelan & Audio'}</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#b8b1a3]">
              <Globe className="w-3.5 h-3.5 text-[#f5b942]" />
              <span>Pilihan Basa Dialog & UI:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#141916] border border-white/10 w-fit max-w-full">
              {(['ngoko', 'krama', 'indonesia'] as LanguageMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeLanguage(mode)}
                  className={`px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    language === mode
                      ? 'bg-[#d99b26] text-[#111311] font-semibold'
                      : 'text-[#cfc9bc] hover:text-white'
                  }`}
                >
                  {mode === 'ngoko' ? 'Jawa Ngoko' : mode === 'krama' ? 'Jawa Krama' : 'Bahasa Indonesia'}
                </button>
              ))}
            </div>
          </div>

          {/* Cloud Save Panel (ID Pemain + PIN) */}
          <div className="p-4 rounded-xl bg-[#121614]/94 border border-white/12 max-w-xl space-y-3">
            {cloudUser ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#f5f2eb] truncate">
                        Cloud Save: {cloudUser.authMode === 'pin' ? `ID ${cloudUser.playerId}` : cloudUser.displayName || cloudUser.email}
                      </div>
                      <div className="text-[11px] text-[#a8a195] truncate">
                        {cloudStatus === 'syncing'
                          ? 'Lagi nyinkronake data menyang cloud...'
                          : cloudSavedAt
                            ? `Tersimpan ing cloud · ${new Date(cloudSavedAt).toLocaleString('id-ID')}`
                            : 'Durung ana save ing cloud — bakal otomatis disimpen nalika main'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cloudSavedAt && (
                      <button
                        type="button"
                        onClick={onDeleteCloudSave}
                        title="Hapus Save Cloud"
                        className="p-2 rounded-lg bg-[#1c231f] hover:bg-red-950/60 border border-white/10 text-[#cfc9bc] hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onCloudSignOut}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c231f] hover:bg-[#27312b] border border-white/10 text-xs font-medium text-[#f5f2eb] cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
                {cloudSavedAt && cloudStatus === 'synced' && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sinkronisasi cloud aktif otomatis saben misi rampung utawa klik Simpen.</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-[#cfc9bc] min-w-0">
                    <UserCheck className="w-4 h-4 text-[#f5b942] shrink-0" />
                    <span className="truncate">
                      Avatar: <strong className="text-[#f5f2eb]">{character.name}</strong> (
                      {character.gender === 'perempuan' ? 'Perempuan' : 'Laki-laki'}
                      {character.hijab ? ', Berkerudung' : ''})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenCharacterCreator}
                    className="px-3 py-1.5 rounded-lg bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Ubah Karakter
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-[#f5f2eb]">
                      Cloud Save & Akun Online
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPinForm((v) => !v)}
                    className="text-[11px] text-[#b8b1a3] hover:text-[#f5b942] underline underline-offset-2 cursor-pointer"
                  >
                    {showPinForm ? 'Tutup ID + PIN' : 'Opsi ID Pemain + PIN'}
                  </button>
                </div>
                <p className="text-[11px] text-[#a8a195]">
                  Masuk nganggo akun Google kanggo main online, nggawe karakter 3D, lan nyimpen progres otomatis menyang Cloud.
                </p>

                <button
                  type="button"
                  onClick={onCloudSignIn}
                  disabled={isBusy}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#0c140e] text-xs font-semibold cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{isBusy ? 'Nyambung...' : 'Masuk nganggo Google'}</span>
                </button>

                {showPinForm && (
                  <form onSubmit={handlePinSubmit} className="space-y-2.5 pt-2.5 border-t border-white/10">
                    <div className="flex items-center gap-1.5 text-[11px] text-[#cfc9bc]">
                      <KeyRound className="w-3.5 h-3.5 text-[#f5b942] shrink-0" />
                      <span>ID Pemain + PIN (butuh Email/Password aktif ing Firebase)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={playerIdInput}
                        onChange={(e) => setPlayerIdInput(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="ID Pemain (cth: bagas99)"
                        autoComplete="username"
                        maxLength={20}
                        className="w-full px-3 py-2 rounded-lg bg-[#0c100e] border border-white/15 focus:border-[#d99b26] focus:outline-none text-xs text-[#f5f2eb] placeholder:text-[#726d64]"
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
                          className="w-full pl-3 pr-9 py-2 rounded-lg bg-[#0c100e] border border-white/15 focus:border-[#d99b26] focus:outline-none text-xs text-[#f5f2eb] placeholder:text-[#726d64]"
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
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d99b26] hover:bg-[#e5aa38] disabled:opacity-60 text-[#111311] text-xs font-semibold cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{isBusy ? 'Nyambung...' : 'Masuk'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onCloudPinRegister(playerIdInput, pinInput)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c231f] hover:bg-[#27312b] disabled:opacity-60 border border-white/12 text-[#f5f2eb] text-xs font-semibold cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Daftar Baru</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {cloudError && <div className="text-[11px] text-red-400 leading-relaxed">{cloudError}</div>}
          </div>
        </div>

        {/* Right: Controls & Region Guide Card */}
        <div className="short:col-span-5 lg:col-span-5 bg-[#121614]/92 border border-white/12 rounded-2xl p-4 sm:p-6 short:p-3.5 space-y-4 sm:space-y-5 short:space-y-2.5 shadow-2xl">
          <div className="flex items-center gap-2.5 text-[#f5b942]">
            <Compass className="w-5 h-5" />
            <h2 className="font-display text-base sm:text-lg font-semibold text-[#f5f2eb]">
              Panduan Kontrol & Wilayah
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/8 pb-1.5">
              <span className="text-[#a8a195]">Mlaku / Nyetir</span>
              <span className="font-mono-tabular font-semibold text-[#f5f2eb]">WASD / Joystick</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-1.5">
              <span className="text-[#a8a195]">Mlayu / Rem</span>
              <span className="font-mono-tabular font-semibold text-[#f5f2eb]">Shift / Space</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-1.5">
              <span className="text-[#a8a195]">Interaksi NPC</span>
              <span className="font-mono-tabular font-semibold text-[#f5b942]">E / Tap Tombol</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-1.5">
              <span className="text-[#a8a195]">Numpak / Mudhun</span>
              <span className="font-mono-tabular font-semibold text-[#f5b942]">F / Tap Tombol</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-1.5">
              <span className="text-[#a8a195]">Klakson</span>
              <span className="font-mono-tabular font-semibold text-[#f5f2eb]">H / Klakson</span>
            </div>
            <div className="flex items-center justify-between border-b border-white/8 pb-1.5">
              <span className="text-[#a8a195]">Putar Kamera</span>
              <span className="font-mono-tabular font-semibold text-[#f5f2eb]">Geser Layar / QC</span>
            </div>
          </div>

          <div className="pt-1 space-y-1.5 text-xs text-[#b8b1a3]">
            <div className="text-[#f5f2eb] font-medium">5 Kawasan Kabupaten Tuban:</div>
            <p className="leading-relaxed">
              Desa Kerek (Batik Gedog) · Kota Tuban (Alun-Alun & Masjid Agung) · Bukit Kapur & Nglirip · Pantai Boom & Klenteng · Goa Akbar & Bektiharjo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
