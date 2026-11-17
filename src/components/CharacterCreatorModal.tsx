import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Check,
  Glasses,
  RefreshCw,
  RotateCw,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { CharacterProfile } from '../game/types';
import {
  HAIR_COLOR_SWATCHES,
  HIJAB_COLOR_SWATCHES,
  PANTS_COLOR_SWATCHES,
  SHIRT_COLOR_SWATCHES,
  SHOE_COLOR_SWATCHES,
  SKIN_TONE_SWATCHES,
  sanitizeCharacterName,
  sanitizeCharacterProfile,
} from '../game/characterPresets';
import {
  CharacterRig,
  characterProfileToBuildOptions,
  createCharacterRig,
} from '../game/models';

interface CharacterCreatorModalProps {
  initialProfile: CharacterProfile;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  allowClose?: boolean;
  onSave: (profile: CharacterProfile) => void;
  onClose: () => void;
}

const HAIR_OPTIONS: Array<{ id: CharacterProfile['hairStyle']; label: string }> = [
  { id: 'short_part', label: 'Belah Rapi' },
  { id: 'spiky', label: 'Spiky' },
  { id: 'fade', label: 'Cepak Fade' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'curly', label: 'Kriwil / Ikal' },
  { id: 'bob', label: 'Bob Pendek' },
  { id: 'ponytail', label: 'Kuncir Ekor' },
  { id: 'bun_konde', label: 'Sanggul / Konde' },
  { id: 'elder', label: 'Rapi Klasik' },
];

const SHIRT_OPTIONS: Array<{ id: CharacterProfile['shirtStyle']; label: string }> = [
  { id: 'tshirt', label: 'Kaos Kasual' },
  { id: 'kemeja', label: 'Kemeja' },
  { id: 'batik', label: 'Batik Gedog' },
  { id: 'kebaya', label: 'Kebaya Jawa' },
  { id: 'jaket', label: 'Jaket Motor' },
  { id: 'lurik', label: 'Baju Lurik' },
  { id: 'seragam', label: 'Seragam Kerja' },
];

const PANTS_OPTIONS: Array<{ id: CharacterProfile['pantsStyle']; label: string }> = [
  { id: 'jeans', label: 'Jeans' },
  { id: 'celana_kain', label: 'Celana Kain' },
  { id: 'cargo', label: 'Cargo' },
  { id: 'shorts', label: 'Celana Pendek' },
  { id: 'kulot', label: 'Rok / Kulot' },
  { id: 'sarung', label: 'Sarung / Jarik' },
];

const SHOE_OPTIONS: Array<{ id: CharacterProfile['shoeStyle']; label: string }> = [
  { id: 'sneakers', label: 'Sneakers' },
  { id: 'pantofel', label: 'Pantofel' },
  { id: 'sandal', label: 'Sandal' },
];

const HAT_OPTIONS: Array<{ id: CharacterProfile['hatType']; label: string }> = [
  { id: 'none', label: 'Tanpa Topi' },
  { id: 'peci', label: 'Peci' },
  { id: 'caping', label: 'Caping' },
  { id: 'topi', label: 'Topi Kasual' },
  { id: 'helm', label: 'Helm' },
];

function colorIntToCss(hexInt: number): string {
  return `#${Math.max(0, Math.min(0xffffff, Math.floor(hexInt)))
    .toString(16)
    .padStart(6, '0')}`;
}

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  initialProfile,
  title = 'Gawe Karakter Dhewe',
  subtitle = 'Atur jeneng, gender, kerudung/rambut, klambi, celana, lan sepatu kanggo ketemu warga online ing Tuban.',
  submitLabel = 'Simpen Karakter',
  allowClose = true,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<CharacterProfile>(() =>
    sanitizeCharacterProfile(initialProfile, initialProfile.name || 'Warga Tuban')
  );
  const [nameInput, setNameInput] = useState<string>(initialProfile.name || 'Bagas');
  const [nameError, setNameError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const rigHolderRef = useRef<THREE.Group | null>(null);
  const currentRigRef = useRef<CharacterRig | null>(null);
  const yawRef = useRef<number>(0.32);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });

  // Setup Three.js 3D Preview Stage once
  useEffect(() => {
    const mount = previewRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141a17);

    const w = Math.max(220, mount.clientWidth || 280);
    const h = Math.max(240, mount.clientHeight || 320);

    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 30);
    camera.position.set(0, 1.18, 3.05);
    camera.lookAt(0, 0.92, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xfef3c7, 0x1e293b, 1.1);
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.5);
    keyLight.position.set(2.4, 3.8, 3.0);
    const rimLight = new THREE.DirectionalLight(0x6ee7b7, 0.55);
    rimLight.position.set(-2.5, 2.2, -2.0);
    scene.add(hemi, keyLight, rimLight);

    // Tuban stone pedestal under character
    const pedGeo = new THREE.CylinderGeometry(0.68, 0.76, 0.1, 28);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x262d29,
      roughness: 0.72,
      metalness: 0.12,
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = -0.05;
    const ringGeo = new THREE.TorusGeometry(0.69, 0.014, 8, 36);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.35,
      metalness: 0.65,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ped, ring);

    const holder = new THREE.Group();
    scene.add(holder);
    rigHolderRef.current = holder;

    const handleResize = () => {
      if (!mount) return;
      const nw = Math.max(200, mount.clientWidth);
      const nh = Math.max(220, mount.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      holder.rotation.y = yawRef.current;
      const rig = currentRigRef.current;
      if (rig) {
        rig.spineGroup.rotation.x = Math.sin(t * 2.1) * 0.018;
        rig.head.rotation.y = Math.sin(t * 0.9) * 0.06;
        rig.leftArm.rotation.x = Math.sin(t * 1.6) * 0.04;
        rig.rightArm.rotation.x = -Math.sin(t * 1.6) * 0.04;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      pedGeo.dispose();
      pedMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      rigHolderRef.current = null;
      currentRigRef.current = null;
    };
  }, []);

  // Rebuild 3D rig whenever character profile draft changes (never disposes shared CHAR_GEOS)
  useEffect(() => {
    const holder = rigHolderRef.current;
    if (!holder) return;
    if (currentRigRef.current) {
      holder.remove(currentRigRef.current.group);
      currentRigRef.current = null;
    }
    const nextRig = createCharacterRig(characterProfileToBuildOptions(draft));
    holder.add(nextRig.group);
    currentRigRef.current = nextRig;
  }, [draft]);

  const handleGenderChange = (nextGender: CharacterProfile['gender']) => {
    setDraft((prev) => {
      if (prev.gender === nextGender) return prev;
      const switchingToFemale = nextGender === 'perempuan';
      let nextHair = prev.hairStyle;
      let nextShirt = prev.shirtStyle;
      let nextPants = prev.pantsStyle;
      if (switchingToFemale) {
        if (nextHair === 'short_part' || nextHair === 'fade' || nextHair === 'spiky') {
          nextHair = 'ponytail';
        }
      } else {
        if (nextHair === 'ponytail' || nextHair === 'bun_konde' || nextHair === 'bob') {
          nextHair = 'short_part';
        }
        if (nextShirt === 'kebaya') nextShirt = 'batik';
        if (nextPants === 'kulot') nextPants = 'jeans';
      }
      return {
        ...prev,
        gender: nextGender,
        hairStyle: nextHair,
        shirtStyle: nextShirt,
        pantsStyle: nextPants,
        hijab: switchingToFemale ? prev.hijab : false,
        hasMustache: switchingToFemale ? false : prev.hasMustache,
      };
    });
  };

  const handleRandomize = () => {
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const genders: Array<'laki' | 'perempuan'> = ['laki', 'perempuan'];
    const g = pick(genders);
    const useHijab = g === 'perempuan' && Math.random() < 0.45;
    const femaleHairs: CharacterProfile['hairStyle'][] = ['ponytail', 'bob', 'bun_konde', 'curly'];
    const maleHairs: CharacterProfile['hairStyle'][] = ['short_part', 'spiky', 'fade', 'undercut', 'curly'];
    const shirts: CharacterProfile['shirtStyle'][] =
      g === 'perempuan'
        ? ['tshirt', 'kemeja', 'batik', 'kebaya', 'jaket', 'lurik']
        : ['tshirt', 'kemeja', 'batik', 'jaket', 'lurik', 'seragam'];
    const pants: CharacterProfile['pantsStyle'][] =
      g === 'perempuan'
        ? ['jeans', 'celana_kain', 'kulot', 'cargo']
        : ['jeans', 'celana_kain', 'cargo', 'shorts', 'sarung'];
    const shoes: CharacterProfile['shoeStyle'][] = ['sneakers', 'pantofel', 'sandal'];
    const hats: CharacterProfile['hatType'][] = ['none', 'none', 'none', 'peci', 'topi', 'caping'];

    setDraft((prev) => ({
      ...prev,
      gender: g,
      skinColor: pick(SKIN_TONE_SWATCHES).color,
      hairStyle: pick(g === 'perempuan' ? femaleHairs : maleHairs),
      hairColor: pick(HAIR_COLOR_SWATCHES).color,
      hijab: useHijab,
      hijabColor: pick(HIJAB_COLOR_SWATCHES).color,
      shirtStyle: pick(shirts),
      shirtColor: pick(SHIRT_COLOR_SWATCHES).color,
      pantsStyle: pick(pants),
      pantsColor: pick(PANTS_COLOR_SWATCHES).color,
      shoeStyle: pick(shoes),
      shoeColor: pick(SHOE_COLOR_SWATCHES).color,
      hatType: useHijab ? 'none' : pick(hats),
      hasGlasses: Math.random() < 0.28,
      hasMustache: g === 'laki' && Math.random() < 0.25,
      hasBackpack: Math.random() < 0.35,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.replace(/[^\p{L}\p{N}_\-. ]/gu, '').trim().slice(0, 20);
    if (cleaned.length < 2) {
      setNameError('Jeneng karakter minimal 2 huruf/angka.');
      return;
    }
    setNameError(null);
    const finalProfile = sanitizeCharacterProfile(
      { ...draft, name: sanitizeCharacterName(cleaned, 'Warga Tuban') },
      cleaned
    );
    onSave(finalProfile);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-4 bg-black/75">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-4xl bg-[#121614] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 bg-[#161b18] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#f5b942] text-xs font-mono-tabular">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>KUSTOMISASI AVATAR 3D · TUBAN ONLINE</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#f8f5ee] truncate">
              {title}
            </h2>
            <p className="text-[11px] sm:text-xs text-[#a8a195] truncate">{subtitle}</p>
          </div>
          {allowClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="p-2 rounded-lg bg-white/8 hover:bg-white/15 text-[#f5f2eb] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Two-Column Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          {/* Left: Live 3D Character Preview */}
          <div className="md:col-span-5 bg-[#0e1311] border-b md:border-b-0 md:border-r border-white/10 p-3 sm:p-4 flex flex-col gap-2.5 shrink-0">
            <div
              ref={previewRef}
              onPointerDown={(e) => {
                dragRef.current = { active: true, lastX: e.clientX };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!dragRef.current.active) return;
                const dx = e.clientX - dragRef.current.lastX;
                dragRef.current.lastX = e.clientX;
                yawRef.current += dx * 0.015;
              }}
              onPointerUp={() => {
                dragRef.current.active = false;
              }}
              onPointerCancel={() => {
                dragRef.current.active = false;
              }}
              className="relative w-full h-[210px] sm:h-[260px] md:flex-1 md:min-h-[300px] rounded-xl overflow-hidden border border-white/10 cursor-grab active:cursor-grabbing touch-none"
            >
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#121614]/88 border border-white/10 text-[10px] text-[#cfc9bc] pointer-events-none whitespace-nowrap">
                <RotateCw className="w-3 h-3 text-[#f5b942]" />
                <span>Geser kanggo muter 3D</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-[#161b18] border border-white/10 rounded-xl p-2.5">
              <div className="truncate">
                <span className="text-[#8e877b]">Jeneng: </span>
                <span className="font-semibold text-[#f5f2eb]">{nameInput || 'Warga'}</span>
              </div>
              <div className="truncate">
                <span className="text-[#8e877b]">Gender: </span>
                <span className="font-semibold text-[#f5b942]">
                  {draft.gender === 'perempuan' ? 'Perempuan' : 'Laki-laki'}
                </span>
              </div>
              <div className="truncate">
                <span className="text-[#8e877b]">Kepala: </span>
                <span className="text-[#e5e0d5]">
                  {draft.hijab
                    ? 'Berkerudung'
                    : HAIR_OPTIONS.find((h) => h.id === draft.hairStyle)?.label}
                </span>
              </div>
              <div className="truncate">
                <span className="text-[#8e877b]">Gaya: </span>
                <span className="text-[#e5e0d5]">
                  {SHIRT_OPTIONS.find((s) => s.id === draft.shirtStyle)?.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Scrollable Customization Controls */}
          <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Nama & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#d6d0c4]">
                  Jeneng / Nama Karakter
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={20}
                  placeholder="Cth: Bagas, Siti, Raka..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0c100e] border border-white/15 focus:border-[#d99b26] focus:outline-none text-sm text-[#f5f2eb] placeholder:text-[#726d64]"
                />
                {nameError && <p className="text-[11px] text-red-400">{nameError}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#d6d0c4]">
                  Jenis Kelamin
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'laki', label: 'Laki-laki' },
                      { id: 'perempuan', label: 'Perempuan' },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleGenderChange(g.id)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        draft.gender === g.id
                          ? 'bg-[#d99b26] text-[#111311] border-[#d99b26]'
                          : 'bg-[#181d1a] text-[#cfc9bc] border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Warna Kulit */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#d6d0c4]">Warna Kulit</label>
              <div className="flex flex-wrap gap-2">
                {SKIN_TONE_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    title={sw.label}
                    onClick={() => setDraft((p) => ({ ...p, skinColor: sw.color }))}
                    className={`w-7 h-7 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                      draft.skinColor === sw.color ? 'border-[#f5b942] scale-110' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: colorIntToCss(sw.color) }}
                  >
                    {draft.skinColor === sw.color && <Check className="w-3.5 h-3.5 text-[#111311]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Kerudung / Hijab & Rambut */}
            <div className="p-3 rounded-xl bg-[#181d1a] border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#f5f2eb]">
                  Kerudung / Hijab
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-[#0e1210] border border-white/10">
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, hijab: false }))}
                    className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      !draft.hijab ? 'bg-[#d99b26] text-[#111311]' : 'text-[#cfc9bc]'
                    }`}
                  >
                    Ora Nganggo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        hijab: true,
                        hatType: p.hatType === 'caping' ? 'caping' : 'none',
                      }))
                    }
                    className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      draft.hijab ? 'bg-emerald-500 text-[#0c140e]' : 'text-[#cfc9bc]'
                    }`}
                  >
                    Berkerudung
                  </button>
                </div>
              </div>

              {draft.hijab ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-[#b8b1a3]">Warna Kerudung:</div>
                  <div className="flex flex-wrap gap-2">
                    {HIJAB_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.color}
                        type="button"
                        title={sw.label}
                        onClick={() => setDraft((p) => ({ ...p, hijabColor: sw.color }))}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                          draft.hijabColor === sw.color
                            ? 'border-[#f5b942] scale-110'
                            : 'border-white/25'
                        }`}
                        style={{ backgroundColor: colorIntToCss(sw.color) }}
                      >
                        {draft.hijabColor === sw.color && (
                          <Check className="w-3.5 h-3.5 text-[#111311] drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[#b8b1a3]">Model Rambut:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {HAIR_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraft((p) => ({ ...p, hairStyle: opt.id }))}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer ${
                            draft.hairStyle === opt.id
                              ? 'bg-[#d99b26] text-[#111311] border-[#d99b26] font-semibold'
                              : 'bg-[#121614] text-[#cfc9bc] border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-[#b8b1a3]">Warna Rambut:</div>
                    <div className="flex flex-wrap gap-2">
                      {HAIR_COLOR_SWATCHES.map((sw) => (
                        <button
                          key={sw.color}
                          type="button"
                          title={sw.label}
                          onClick={() => setDraft((p) => ({ ...p, hairColor: sw.color }))}
                          className={`w-7 h-7 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                            draft.hairColor === sw.color
                              ? 'border-[#f5b942] scale-110'
                              : 'border-white/25'
                          }`}
                          style={{ backgroundColor: colorIntToCss(sw.color) }}
                        >
                          {draft.hairColor === sw.color && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pakaian / Baju */}
            <div className="p-3 rounded-xl bg-[#181d1a] border border-white/10 space-y-2.5">
              <div className="text-xs font-semibold text-[#f5f2eb]">Pakaian / Baju</div>
              <div className="flex flex-wrap gap-1.5">
                {SHIRT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, shirtStyle: opt.id }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer ${
                      draft.shirtStyle === opt.id
                        ? 'bg-[#d99b26] text-[#111311] border-[#d99b26] font-semibold'
                        : 'bg-[#121614] text-[#cfc9bc] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-[#b8b1a3] mr-1">Warna:</span>
                {SHIRT_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    title={sw.label}
                    onClick={() => setDraft((p) => ({ ...p, shirtColor: sw.color }))}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                      draft.shirtColor === sw.color
                        ? 'border-[#f5b942] scale-110'
                        : 'border-white/25'
                    }`}
                    style={{ backgroundColor: colorIntToCss(sw.color) }}
                  >
                    {draft.shirtColor === sw.color && (
                      <Check className="w-3 h-3 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Celana / Bawahan */}
            <div className="p-3 rounded-xl bg-[#181d1a] border border-white/10 space-y-2.5">
              <div className="text-xs font-semibold text-[#f5f2eb]">Celana / Bawahan</div>
              <div className="flex flex-wrap gap-1.5">
                {PANTS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, pantsStyle: opt.id }))}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer ${
                      draft.pantsStyle === opt.id
                        ? 'bg-[#d99b26] text-[#111311] border-[#d99b26] font-semibold'
                        : 'bg-[#121614] text-[#cfc9bc] border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-[#b8b1a3] mr-1">Warna:</span>
                {PANTS_COLOR_SWATCHES.map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    title={sw.label}
                    onClick={() => setDraft((p) => ({ ...p, pantsColor: sw.color }))}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                      draft.pantsColor === sw.color
                        ? 'border-[#f5b942] scale-110'
                        : 'border-white/25'
                    }`}
                    style={{ backgroundColor: colorIntToCss(sw.color) }}
                  >
                    {draft.pantsColor === sw.color && (
                      <Check className="w-3 h-3 text-white drop-shadow" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sepatu & Aksesori */}
            <div className="p-3 rounded-xl bg-[#181d1a] border border-white/10 space-y-3">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#f5f2eb]">Sepatu / Alas Kaki</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {SHOE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, shoeStyle: opt.id }))}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer ${
                        draft.shoeStyle === opt.id
                          ? 'bg-[#d99b26] text-[#111311] border-[#d99b26] font-semibold'
                          : 'bg-[#121614] text-[#cfc9bc] border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {SHOE_COLOR_SWATCHES.map((sw) => (
                      <button
                        key={sw.color}
                        type="button"
                        title={sw.label}
                        onClick={() => setDraft((p) => ({ ...p, shoeColor: sw.color }))}
                        className={`w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center ${
                          draft.shoeColor === sw.color
                            ? 'border-[#f5b942] scale-110'
                            : 'border-white/25'
                        }`}
                        style={{ backgroundColor: colorIntToCss(sw.color) }}
                      >
                        {draft.shoeColor === sw.color && (
                          <Check className="w-3 h-3 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-white/8">
                <div className="text-xs font-semibold text-[#f5f2eb]">Topi & Aksesori</div>
                <div className="flex flex-wrap gap-1.5">
                  {HAT_OPTIONS.map((opt) => {
                    const disabled = draft.hijab && opt.id !== 'none' && opt.id !== 'caping';
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setDraft((p) => ({ ...p, hatType: opt.id }))}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                          draft.hatType === opt.id
                            ? 'bg-[#d99b26] text-[#111311] border-[#d99b26] font-semibold'
                            : 'bg-[#121614] text-[#cfc9bc] border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, hasGlasses: !p.hasGlasses }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      draft.hasGlasses
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#121614] border-white/10 text-[#cfc9bc]'
                    }`}
                  >
                    <Glasses className="w-3.5 h-3.5" />
                    <span>Kacamata</span>
                  </button>

                  {draft.gender === 'laki' && (
                    <button
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, hasMustache: !p.hasMustache }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                        draft.hasMustache
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-[#121614] border-white/10 text-[#cfc9bc]'
                      }`}
                    >
                      Kumis
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDraft((p) => ({ ...p, hasBackpack: !p.hasBackpack }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                      draft.hasBackpack
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#121614] border-white/10 text-[#cfc9bc]'
                    }`}
                  >
                    Tas Ransel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 border-t border-white/10 bg-[#161b18] shrink-0">
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1c231f] hover:bg-[#27312b] border border-white/12 text-xs font-semibold text-[#f5f2eb] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#f5b942]" />
            <span>Acak Gaya</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {allowClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#1c231f] hover:bg-[#27312b] border border-white/12 text-xs font-medium text-[#cfc9bc] cursor-pointer"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] text-xs sm:text-sm font-bold cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitLabel}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
