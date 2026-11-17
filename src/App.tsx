import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { CloudSyncStatus, CloudUserInfo, CharacterProfile, GameHudState, SaveData } from './game/types';
import { UI_STRINGS, t } from './game/jawaData';
import {
  extractPlayerLabel,
  isSyntheticPinUser,
  onAuthChange,
  registerPlayerWithPin,
  signInWithGoogle,
  signInWithPlayerPin,
  signOutUser,
} from './firebase';
import { deleteCloudSave, fetchCloudSave, upsertCloudSave } from './game/cloudSave';
import { MainMenu } from './components/MainMenu';
import { GameHud } from './components/GameHud';
import { DialogueModal } from './components/DialogueModal';
import { ShopModal } from './components/ShopModal';
import { DrawerTab, PlayerMenuModal } from './components/PlayerMenuModal';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';

function formatCloudError(err: unknown): string {
  console.error('[CloudSave]', err);
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err);
  const combined = `${code} ${msg}`;

  if (combined.includes('invalid-player-id')) {
    return 'ID Pemain kudu 3–20 karakter (huruf, angka, utawa garis ngisor _).';
  }
  if (combined.includes('invalid-pin-length') || combined.includes('weak-password')) {
    return 'PIN minimal 6 angka/karakter (maksimal 32).';
  }
  if (combined.includes('email-already-in-use')) {
    return 'ID Pemain iki wis didaftarake. Klik "Masuk" yen wis nduwe akun, utawa pilih ID liyane.';
  }
  if (
    combined.includes('invalid-credential') ||
    combined.includes('wrong-password') ||
    combined.includes('user-not-found') ||
    combined.includes('invalid-email')
  ) {
    return 'ID Pemain durung kedaftar utawa PIN salah. Priksa maneh utawa klik "Daftar Baru".';
  }
  if (combined.includes('too-many-requests')) {
    return 'Kakehan nyoba mlebu. Enteni sedhela banjur coba maneh.';
  }
  if (combined.includes('Quota exceeded')) {
    return 'Kuota harian Firestore wis entek, coba maneh sesuk.';
  }
  if (combined.includes('popup-closed-by-user')) {
    return 'Login Google dibatalake.';
  }
  if (combined.includes('cancelled-popup-request')) {
    return 'Permintaan login sadurunge dibatalake. Klik Masuk Google sepisan maneh.';
  }
  if (combined.includes('popup-blocked')) {
    return 'Popup login Google diblokir browser. Izinke popup ing browser utawa aktifake Email/Password ing Firebase Console.';
  }
  if (combined.includes('unauthorized-domain')) {
    return `Domain (${window.location.hostname}) durung didhaftarake ing Firebase Authorized Domains.`;
  }
  if (combined.includes('operation-not-allowed')) {
    return 'Login ID Pemain + PIN butuh fitur Email/Password diaktifake ing Firebase Console (Authentication → Sign-in method → Email/Password). Gunakake "Masuk nganggo Google" kanggo langsung mlebu saiki.';
  }
  if (
    combined.includes('web-storage-unsupported') ||
    combined.includes('operation-not-supported-in-this-environment')
  ) {
    return 'Penyimpanan browser diblokir ing lingkungan iki. Coba buka ing tab browser anyar.';
  }
  if (combined.includes('network-request-failed')) {
    return 'Koneksi menyang Firebase gagal. Priksa jaringan utawa pemblokir iklan.';
  }
  if (combined.includes('internal-error')) {
    return 'Login Google gagal ing pratinjau iframe. Gunakake ID Pemain + PIN utawa buka ing tab anyar.';
  }
  if (combined.includes('permission-denied') || combined.includes('insufficient permissions')) {
    let opLabel = '';
    try {
      const parsed = JSON.parse(msg) as { operationType?: unknown };
      if (typeof parsed.operationType === 'string' && parsed.operationType.length > 0) {
        opLabel = ` (${parsed.operationType})`;
      }
    } catch {
      // plain error message without JSON wrapper
    }
    return `Akses Firestore ditolak${opLabel}. Priksa aturan Firestore wis dideploy lan priksa manawa aplikasi wis nganggo versi paling anyar (muat ulang kaca).`;
  }
  if (combined.includes('client is offline')) {
    return 'Koneksi Firestore lagi offline. Priksa jaringan internet.';
  }
  return `Gagal nyambung menyang Cloud Save (${code || 'unknown'}). Coba maneh sedhela.`;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const cloudUserRef = useRef<CloudUserInfo | null>(null);

  const [hud, setHud] = useState<GameHudState | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab | null>(null);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [customGlbUrl, setCustomGlbUrl] = useState<string | null>(null);

  const [cloudUser, setCloudUser] = useState<CloudUserInfo | null>(null);
  const [cloudSaveData, setCloudSaveData] = useState<SaveData | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('idle');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const syncPayloadToCloud = useCallback(
    async (user: CloudUserInfo, payload: SaveData, silent: boolean) => {
      setCloudStatus('syncing');
      setCloudError(null);
      try {
        await upsertCloudSave(user.uid, payload);
        setCloudSaveData(payload);
        setCloudStatus('synced');
        if (!silent) {
          engineRef.current?.notifyToast('Progress wis disimpen menyang Cloud!');
        }
      } catch (err) {
        setCloudStatus('error');
        setCloudError(formatCloudError(err));
      }
    },
    []
  );

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new GameEngine(mountEl, (nextState) => {
      setHud(nextState);
    });
    engine.setOnSaveListener((payload, silent) => {
      const user = cloudUserRef.current;
      if (user) {
        void syncPayloadToCloud(user, payload, silent);
      }
    });
    engineRef.current = engine;

    return () => {
      engine.setOnSaveListener(null);
      engine.dispose();
      engineRef.current = null;
    };
  }, [syncPayloadToCloud]);

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      if (!fbUser) {
        cloudUserRef.current = null;
        engineRef.current?.setAuthUid(null);
        setCloudUser(null);
        setCloudSaveData(null);
        setCloudStatus('idle');
        setCloudError(null);
        return;
      }

      const isPin = isSyntheticPinUser(fbUser);
      const info: CloudUserInfo = {
        uid: fbUser.uid,
        displayName: fbUser.displayName,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
        authMode: isPin ? 'pin' : 'google',
        playerId: extractPlayerLabel(fbUser),
      };
      cloudUserRef.current = info;
      engineRef.current?.setAuthUid(fbUser.uid);
      setCloudUser(info);
      setCloudStatus('syncing');
      setCloudError(null);

      try {
        const remote = await fetchCloudSave(fbUser.uid);
        setCloudSaveData(remote);
        setCloudStatus('synced');
        if (remote?.character) {
          engineRef.current?.setCharacterProfile(remote.character, {
            persistSave: false,
            notify: false,
          });
        } else {
          // Every newly logged-in user gets prompted to create their custom character
          setShowCharacterCreator(true);
        }
      } catch (err) {
        setCloudStatus('error');
        setCloudError(formatCloudError(err));
      }
    });
    return () => unsub();
  }, []);

  const handleCloudPinSignIn = async (playerId: string, pin: string) => {
    setCloudStatus('syncing');
    setCloudError(null);
    try {
      await signInWithPlayerPin(playerId, pin);
    } catch (err) {
      setCloudStatus('error');
      setCloudError(formatCloudError(err));
    }
  };

  const handleCloudPinRegister = async (playerId: string, pin: string) => {
    setCloudStatus('syncing');
    setCloudError(null);
    try {
      await registerPlayerWithPin(playerId, pin);
    } catch (err) {
      setCloudStatus('error');
      setCloudError(formatCloudError(err));
    }
  };

  const handleCloudSignIn = async () => {
    setCloudStatus('syncing');
    setCloudError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setCloudStatus('error');
      setCloudError(formatCloudError(err));
    }
  };

  const handleCloudSignOut = async () => {
    setCloudError(null);
    try {
      await signOutUser();
      setDrawerTab(null);
      setShowCharacterCreator(false);
      setCustomGlbUrl(null);
      engineRef.current?.setCustomGlbUrl(null);
      engineRef.current?.resetToMenuOnSignOut();
    } catch (err) {
      setCloudError(formatCloudError(err));
    }
  };

  const handleSaveToCloud = async () => {
    const user = cloudUserRef.current;
    const engine = engineRef.current;
    if (!user || !engine) {
      engine?.notifyToast('Masuk akun online dhisik kanggo nyimpen menyang Cloud!');
      return;
    }
    const payload = engine.exportSavePayload();
    await syncPayloadToCloud(user, payload, false);
  };

  const handleLoadFromCloud = async () => {
    const user = cloudUserRef.current;
    const engine = engineRef.current;
    if (!user || !engine) return;
    setCloudStatus('syncing');
    setCloudError(null);
    try {
      const latest = await fetchCloudSave(user.uid);
      if (latest) {
        setCloudSaveData(latest);
        engine.applySaveData(latest, 'Progress saka Cloud wis dimuat!');
      } else {
        engine.notifyToast('Durung ana simpanan ing Cloud.');
      }
      setCloudStatus('synced');
    } catch (err) {
      setCloudStatus('error');
      setCloudError(formatCloudError(err));
    }
  };

  const handleDeleteCloudSave = async () => {
    const user = cloudUserRef.current;
    if (!user) return;
    setCloudStatus('syncing');
    setCloudError(null);
    try {
      await deleteCloudSave(user.uid);
      setCloudSaveData(null);
      setCloudStatus('synced');
    } catch (err) {
      setCloudStatus('error');
      setCloudError(formatCloudError(err));
    }
  };

  const handleVirtualMove = useCallback((x: number, y: number) => {
    engineRef.current?.setVirtualMove(x, y);
  }, []);

  const handleJump = useCallback(() => {
    engineRef.current?.jump();
  }, []);

  const handleSaveCharacter = useCallback(
    async (profile: CharacterProfile) => {
      const currentEngine = engineRef.current;
      if (!currentEngine) return;
      currentEngine.setCharacterProfile(profile, { persistSave: false, notify: true });
      setShowCharacterCreator(false);
      const user = cloudUserRef.current;
      if (user) {
        const payload = currentEngine.exportSavePayload();
        await syncPayloadToCloud(user, payload, true);
      }
    },
    [syncPayloadToCloud]
  );

  const engine = engineRef.current;

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-[#0f1311]">
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Main Menu Overlay */}
      {hud && hud.screen === 'menu' && (
        <MainMenu
          language={hud.language}
          audioMuted={hud.audioMuted}
          character={hud.character}
          hasCustomCharacter={hud.hasCustomCharacter}
          cloudUser={cloudUser}
          cloudSavedAt={cloudSaveData?.savedAt ?? null}
          cloudStatus={cloudStatus}
          cloudError={cloudError}
          onNewGame={() => {
            if (!cloudUserRef.current) return;
            engine?.startNewGame();
          }}
          onContinueCloud={() => void handleLoadFromCloud()}
          onOpenCharacterCreator={() => {
            if (!cloudUserRef.current) return;
            setShowCharacterCreator(true);
          }}
          onCloudPinSignIn={(id, pin) => void handleCloudPinSignIn(id, pin)}
          onCloudPinRegister={(id, pin) => void handleCloudPinRegister(id, pin)}
          onCloudSignIn={() => void handleCloudSignIn()}
          onCloudSignOut={() => void handleCloudSignOut()}
          onDeleteCloudSave={() => void handleDeleteCloudSave()}
          onChangeLanguage={(lang) => engine?.setLanguage(lang)}
          onToggleMute={() => engine?.setAudioMuted(!hud.audioMuted)}
        />
      )}

      {/* Active Gameplay HUD */}
      {hud && hud.screen === 'playing' && (
        <GameHud
          hud={hud}
          onVirtualMove={handleVirtualMove}
          onJump={handleJump}
          onOpenDrawer={(tab) => setDrawerTab(tab)}
          onInteract={() => engine?.triggerInteract()}
          onToggleVehicle={() => engine?.toggleVehicle()}
          onHorn={() => {
            if (engine) {
              window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH' }));
            }
          }}
          onToggleWeather={() =>
            engine?.setWeather(hud.weather === 'cerah' ? 'hujan' : 'cerah')
          }
          onToggleMute={() => engine?.setAudioMuted(!hud.audioMuted)}
          onSaveGame={() => void handleSaveToCloud()}
          onPause={() => engine?.setScreen('paused')}
          onSetGps={(x, z, label) => engine?.setCustomGpsTarget(x, z, label)}
          onSendChat={(text) => engine?.sendOnlineChat(text)}
          onOpenCharacterCreator={() => setShowCharacterCreator(true)}
        />
      )}

      {/* Javanese NPC Dialogue Modal */}
      {hud && hud.screen === 'playing' && hud.activeDialogue && (
        <DialogueModal
          dialogue={hud.activeDialogue}
          language={hud.language}
          onSelectOption={(idx) => engine?.chooseDialogueOption(idx)}
          onClose={() => engine?.closeDialogue()}
        />
      )}

      {/* Shop Modal */}
      {hud && hud.screen === 'playing' && hud.activeShopId && (
        <ShopModal
          shopId={hud.activeShopId}
          money={hud.money}
          language={hud.language}
          onBuy={(shopId, itemId) => engine?.buyShopItem(shopId, itemId)}
          onClose={() => engine?.closeShop()}
        />
      )}

      {/* Player Drawer (Missions / Inventory / World Map GPS / Settings) */}
      {hud && hud.screen === 'playing' && drawerTab && (
        <PlayerMenuModal
          hud={hud}
          initialTab={drawerTab}
          cloudUser={cloudUser}
          cloudSavedAt={cloudSaveData?.savedAt ?? null}
          cloudStatus={cloudStatus}
          cloudError={cloudError}
          onClose={() => setDrawerTab(null)}
          onUseItem={(id) => engine?.useInventoryItem(id)}
          onEquipOutfit={(o) => engine?.equipOutfit(o)}
          onStartMission={(id) => engine?.startMission(id)}
          onSetGps={(x, z, label) => engine?.setCustomGpsTarget(x, z, label)}
          onTeleport={(x, z, label) => engine?.teleportToLandmark(x, z, label)}
          onChangeLanguage={(l) => engine?.setLanguage(l)}
          onSetWeather={(w) => engine?.setWeather(w)}
          onSetTime={(h) => engine?.setTimeOfDay(h)}
          onSetGraphicsMode={(m) => engine?.setGraphicsMode(m)}
          onToggleMute={() => engine?.setAudioMuted(!hud.audioMuted)}
          onToggleGamelan={() => engine?.setGamelanEnabled(!hud.gamelanEnabled)}
          onCloudPinSignIn={(id, pin) => void handleCloudPinSignIn(id, pin)}
          onCloudPinRegister={(id, pin) => void handleCloudPinRegister(id, pin)}
          onCloudSignIn={() => void handleCloudSignIn()}
          onCloudSignOut={() => void handleCloudSignOut()}
          onSaveToCloud={() => void handleSaveToCloud()}
          onLoadFromCloud={() => void handleLoadFromCloud()}
          onOpenCharacterCreator={() => setShowCharacterCreator(true)}
          onReturnToMenu={() => {
            setDrawerTab(null);
            engine?.saveGame(true);
            engine?.setScreen('menu');
          }}
        />
      )}

      {/* Custom 3D Character Creator Modal */}
      {hud && showCharacterCreator && (
        <CharacterCreatorModal
          initialProfile={hud.character}
          graphicsMode={hud.graphicsMode}
          initialCustomGlbUrl={customGlbUrl}
          onChangeCustomGlbUrl={(url) => {
            setCustomGlbUrl(url);
            engineRef.current?.setCustomGlbUrl(url);
          }}
          onSave={(profile) => void handleSaveCharacter(profile)}
          onClose={() => setShowCharacterCreator(false)}
        />
      )}

      {/* Pause Menu Overlay */}
      {hud && hud.screen === 'paused' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/65">
          <div className="w-full max-w-sm max-h-[92dvh] overflow-y-auto bg-[#121614] border border-white/15 rounded-2xl p-5 sm:p-6 short:p-4 shadow-2xl space-y-4 short:space-y-2.5">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#f5f2eb] text-center">
              Game Dipause
            </h2>
            <div className="space-y-2.5 short:space-y-2">
              <button
                type="button"
                onClick={() => engine?.setScreen('playing')}
                className="w-full py-3 rounded-xl bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] font-semibold text-sm cursor-pointer"
              >
                {t(UI_STRINGS.resume, hud.language)}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveToCloud()}
                className="w-full py-3 rounded-xl bg-[#1c231f] hover:bg-[#27312b] border border-white/10 text-[#f5f2eb] font-medium text-sm cursor-pointer"
              >
                Simpen menyang Cloud Online
              </button>
              <button
                type="button"
                onClick={() => {
                  engine?.setScreen('playing');
                  setDrawerTab('settings');
                }}
                className="w-full py-3 rounded-xl bg-[#1c231f] hover:bg-[#27312b] border border-white/10 text-[#f5f2eb] font-medium text-sm cursor-pointer"
              >
                {t(UI_STRINGS.settings, hud.language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  engine?.saveGame(true);
                  engine?.setScreen('menu');
                }}
                className="w-full py-3 rounded-xl bg-[#1c231f] hover:bg-red-950/60 border border-white/10 text-[#f5f2eb] font-medium text-sm cursor-pointer"
              >
                {t(UI_STRINGS.backToMenu, hud.language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
