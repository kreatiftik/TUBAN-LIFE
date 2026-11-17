import * as THREE from 'three';

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export const ROAD_TEX_LAYER = {
  ASPHALT_MARKED: 0,
  ASPHALT_PLAIN: 1,
  DIRT_ROAD: 2,
  DIRT_JUNCTION: 3,
} as const;

function drawAsphaltLayer(ctx: CanvasRenderingContext2D, size: number, withMarkings: boolean, seedOffset: number) {
  ctx.fillStyle = '#2b2f35';
  ctx.fillRect(0, 0, size, size);

  // Subtle deterministic aggregate speckle (low-contrast to prevent distance moire)
  let seed = 918273 + seedOffset * 4099;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 6500; i++) {
    const v = 38 + Math.floor(rand() * 20);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    ctx.fillRect(x, y, 2, 2);
  }

  if (withMarkings) {
    // Subtle worn wheel tracks along both lanes
    const trackGradL = ctx.createLinearGradient(size * 0.16, 0, size * 0.4, 0);
    trackGradL.addColorStop(0, 'rgba(18, 20, 24, 0)');
    trackGradL.addColorStop(0.5, 'rgba(18, 20, 24, 0.22)');
    trackGradL.addColorStop(1, 'rgba(18, 20, 24, 0)');
    ctx.fillStyle = trackGradL;
    ctx.fillRect(size * 0.16, 0, size * 0.24, size);

    const trackGradR = ctx.createLinearGradient(size * 0.6, 0, size * 0.84, 0);
    trackGradR.addColorStop(0, 'rgba(18, 20, 24, 0)');
    trackGradR.addColorStop(0.5, 'rgba(18, 20, 24, 0.22)');
    trackGradR.addColorStop(1, 'rgba(18, 20, 24, 0)');
    ctx.fillStyle = trackGradR;
    ctx.fillRect(size * 0.6, 0, size * 0.24, size);

    // Anti-aliased dashed yellow center line
    const cx = size * 0.5;
    ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
    ctx.fillRect(cx - 8, 24, 16, 190);
    ctx.fillRect(cx - 8, 280, 16, 190);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(cx - 6, 26, 12, 186);
    ctx.fillRect(cx - 6, 282, 12, 186);

    // Anti-aliased white shoulder lines
    ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.fillRect(20, 0, 11, size);
    ctx.fillRect(size - 31, 0, 11, size);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(22, 0, 7, size);
    ctx.fillRect(size - 29, 0, 7, size);
  } else {
    // Seamless multi-directional intersection wear patch
    const centerWear = ctx.createRadialGradient(size * 0.5, size * 0.5, 20, size * 0.5, size * 0.5, size * 0.48);
    centerWear.addColorStop(0, 'rgba(18, 20, 24, 0.22)');
    centerWear.addColorStop(1, 'rgba(18, 20, 24, 0)');
    ctx.fillStyle = centerWear;
    ctx.fillRect(0, 0, size, size);
  }
}

function drawDirtLayer(ctx: CanvasRenderingContext2D, size: number, isJunction: boolean, seedOffset: number) {
  ctx.fillStyle = '#8b6f4e';
  ctx.fillRect(0, 0, size, size);

  let seed = 445566 + seedOffset * 7919;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 6000; i++) {
    const r = 118 + Math.floor(rand() * 38);
    const g = 92 + Math.floor(rand() * 30);
    const b = 60 + Math.floor(rand() * 24);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 3, 3);
  }

  if (!isJunction) {
    // Soft compacted wheel ruts & subtle grassy shoulder tint on far edges
    const rutL = ctx.createLinearGradient(size * 0.2, 0, size * 0.42, 0);
    rutL.addColorStop(0, 'rgba(92, 68, 42, 0)');
    rutL.addColorStop(0.5, 'rgba(92, 68, 42, 0.28)');
    rutL.addColorStop(1, 'rgba(92, 68, 42, 0)');
    ctx.fillStyle = rutL;
    ctx.fillRect(size * 0.2, 0, size * 0.22, size);

    const rutR = ctx.createLinearGradient(size * 0.58, 0, size * 0.8, 0);
    rutR.addColorStop(0, 'rgba(92, 68, 42, 0)');
    rutR.addColorStop(0.5, 'rgba(92, 68, 42, 0.28)');
    rutR.addColorStop(1, 'rgba(92, 68, 42, 0)');
    ctx.fillStyle = rutR;
    ctx.fillRect(size * 0.58, 0, size * 0.22, size);

    const edgeL = ctx.createLinearGradient(0, 0, 36, 0);
    edgeL.addColorStop(0, 'rgba(82, 118, 52, 0.45)');
    edgeL.addColorStop(1, 'rgba(82, 118, 52, 0)');
    ctx.fillStyle = edgeL;
    ctx.fillRect(0, 0, 36, size);

    const edgeR = ctx.createLinearGradient(size - 36, 0, size, 0);
    edgeR.addColorStop(0, 'rgba(82, 118, 52, 0)');
    edgeR.addColorStop(1, 'rgba(82, 118, 52, 0.45)');
    ctx.fillStyle = edgeR;
    ctx.fillRect(size - 36, 0, 36, size);
  }
}

function createRoadTextureArray(anisotropy: number): THREE.DataArrayTexture {
  const size = 512;
  const depth = 4;
  const data = new Uint8Array(size * size * 4 * depth);
  const [canvas, ctx] = createCanvas(size);

  const painters = [
    () => drawAsphaltLayer(ctx, size, true, 0),
    () => drawAsphaltLayer(ctx, size, false, 1),
    () => drawDirtLayer(ctx, size, false, 2),
    () => drawDirtLayer(ctx, size, true, 3),
  ];

  const layerSize = size * size * 4;
  for (let layer = 0; layer < depth; layer++) {
    painters[layer]();
    const img = ctx.getImageData(0, 0, size, size).data;
    data.set(img, layer * layerSize);
  }

  const texArray = new THREE.DataArrayTexture(data, size, size, depth);
  texArray.format = THREE.RGBAFormat;
  texArray.type = THREE.UnsignedByteType;
  // Keep RGBA8 internal format for universal WebGL2 generateMipmap compatibility; decoded sRGB->Linear in shader
  texArray.colorSpace = THREE.NoColorSpace;
  texArray.wrapS = THREE.RepeatWrapping;
  texArray.wrapT = THREE.RepeatWrapping;
  texArray.minFilter = THREE.LinearMipmapLinearFilter;
  texArray.magFilter = THREE.LinearFilter;
  texArray.generateMipmaps = true;
  texArray.anisotropy = anisotropy;
  texArray.needsUpdate = true;
  return texArray;
}

function seededNoise(x: number, y: number, seed = 1337): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function heightMapToNormalTexture(
  heights: Float32Array,
  size: number,
  strength: number,
  repeatX = 1,
  repeatY = 1,
  anisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const sample = (x: number, y: number) => {
    const wx = ((x % size) + size) % size;
    const wy = ((y % size) + size) % size;
    return heights[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const u = sample(x, y - 1);
      const d = sample(x, y + 1);
      const dx = (l - r) * strength;
      const dy = (u - d) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz) || 1;
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((dx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTexturePack {
  roadArray: THREE.DataArrayTexture;
  asphalt: THREE.CanvasTexture;
  dirtRoad: THREE.CanvasTexture;
  grass: THREE.CanvasTexture;
  sawah: THREE.CanvasTexture;
  roofTile: THREE.CanvasTexture;
  woodPlank: THREE.CanvasTexture;
  batikWall: THREE.CanvasTexture;
  redBrick: THREE.CanvasTexture;
  sand: THREE.CanvasTexture;
  cobblestone: THREE.CanvasTexture;
  water: THREE.CanvasTexture;
  lurik: THREE.CanvasTexture;
  denim: THREE.CanvasTexture;
  stuccoWall: THREE.CanvasTexture;
  skinNormal: THREE.CanvasTexture;
  clothNormal: THREE.CanvasTexture;
  denimNormal: THREE.CanvasTexture;
  hairNormal: THREE.CanvasTexture;
  eyeIris: THREE.CanvasTexture;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTexturePack {
  const aniso = Math.min(8, Math.max(2, maxAnisotropy));
  const roadArray = createRoadTextureArray(aniso);

  // 1. Bridge Asphalt Texture (clean single-tile repeat)
  const [asphC, asphCtx] = createCanvas(256);
  drawAsphaltLayer(asphCtx, 256, true, 10);
  const asphalt = finalizeColorTexture(asphC, aniso, 1, 2);

  // 2. Village Dirt/Gravel Road
  const [dirtC, dirtCtx] = createCanvas(256);
  drawDirtLayer(dirtCtx, 256, false, 11);
  const dirtRoad = finalizeColorTexture(dirtC, aniso, 1, 2);

  // 3. Tropical Grass Texture
  const [grassC, grassCtx] = createCanvas(256);
  grassCtx.fillStyle = '#3f6e2d';
  grassCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const g = 88 + Math.floor(Math.random() * 52);
    grassCtx.fillStyle = `rgb(${48 + Math.floor(Math.random() * 30)},${g},${32 + Math.floor(Math.random() * 20)})`;
    grassCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
  }
  const grass = finalizeColorTexture(grassC, aniso, 24, 24);

  // 4. Sawah Rice Paddy Texture
  const [sawahC, sawahCtx] = createCanvas(256);
  sawahCtx.fillStyle = '#4d7c0f';
  sawahCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    sawahCtx.fillStyle = '#365314';
    sawahCtx.fillRect(0, y, 256, 3);
    sawahCtx.fillStyle = '#84cc16';
    for (let x = 0; x < 256; x += 8) {
      sawahCtx.fillRect(x + (y % 32 === 0 ? 0 : 4), y + 4, 3, 9);
    }
  }
  const sawah = finalizeColorTexture(sawahC, aniso, 6, 6);

  // 5. Javanese Terracotta Roof Tiles (Genteng Sokka)
  const [roofC, roofCtx] = createCanvas(256);
  roofCtx.fillStyle = '#9a3412';
  roofCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 16; row++) {
    const y = row * 16;
    roofCtx.fillStyle = row % 2 === 0 ? '#7c2d12' : '#8c3214';
    roofCtx.fillRect(0, y, 256, 15);
    roofCtx.fillStyle = '#431407';
    roofCtx.fillRect(0, y + 14, 256, 2);
    for (let col = 0; col < 16; col++) {
      const x = col * 16 + (row % 2) * 8;
      roofCtx.fillStyle = 'rgba(255,210,170,0.12)';
      roofCtx.fillRect(x, y + 2, 10, 8);
    }
  }
  const roofTile = finalizeColorTexture(roofC, aniso, 3, 3);

  // 6. Teak Wood Planks (Kayu Jati)
  const [woodC, woodCtx] = createCanvas(256);
  woodCtx.fillStyle = '#5c3a21';
  woodCtx.fillRect(0, 0, 256, 256);
  for (let p = 0; p < 8; p++) {
    const y = p * 32;
    woodCtx.fillStyle = p % 2 === 0 ? '#654126' : '#53331c';
    woodCtx.fillRect(0, y, 256, 30);
    woodCtx.fillStyle = '#331d0d';
    woodCtx.fillRect(0, y + 30, 256, 2);
    for (let g = 0; g < 18; g++) {
      woodCtx.fillStyle = 'rgba(25,12,4,0.18)';
      woodCtx.fillRect(0, y + Math.random() * 28, 256, 1);
    }
  }
  const woodPlank = finalizeColorTexture(woodC, aniso, 2, 2);

  // 7. Batik / Javanese Wall Accent
  const [batikC, batikCtx] = createCanvas(256);
  batikCtx.fillStyle = '#fef3c7';
  batikCtx.fillRect(0, 0, 256, 256);
  batikCtx.strokeStyle = '#78350f';
  batikCtx.lineWidth = 3;
  for (let i = -256; i < 512; i += 32) {
    batikCtx.beginPath();
    batikCtx.moveTo(i, 0);
    batikCtx.lineTo(i + 256, 256);
    batikCtx.stroke();
    batikCtx.beginPath();
    batikCtx.arc(i + 128, 128, 10, 0, Math.PI * 2);
    batikCtx.stroke();
  }
  const batikWall = finalizeColorTexture(batikC, aniso, 2, 2);

  // 8. Majapahit Red Brick (Bata Merah Candi)
  const [brickC, brickCtx] = createCanvas(256);
  brickCtx.fillStyle = '#7f1d1d';
  brickCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) {
    const y = row * 21;
    for (let col = 0; col < 6; col++) {
      const x = col * 44 + (row % 2) * 22 - 12;
      const shade = 125 + Math.floor(Math.random() * 35);
      brickCtx.fillStyle = `rgb(${shade}, 46, 36)`;
      brickCtx.fillRect(x, y, 41, 18);
    }
  }
  const redBrick = finalizeColorTexture(brickC, aniso, 3, 3);

  // 9. Beach Sand
  const [sandC, sandCtx] = createCanvas(256);
  sandCtx.fillStyle = '#e6cc9a';
  sandCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const s = 205 + Math.floor(Math.random() * 38);
    sandCtx.fillStyle = `rgb(${s},${s - 18},${s - 55})`;
    sandCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const sand = finalizeColorTexture(sandC, aniso, 12, 12);

  // 10. Cobblestone Alun-Alun
  const [cobC, cobCtx] = createCanvas(256);
  cobCtx.fillStyle = '#64748b';
  cobCtx.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const v = 110 + Math.floor(Math.random() * 30);
      cobCtx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
      cobCtx.fillRect(c * 32 + 2, r * 32 + 2, 28, 28);
    }
  }
  const cobblestone = finalizeColorTexture(cobC, aniso, 10, 10);

  // 11. Water Ripples
  const [watC, watCtx] = createCanvas(256);
  watCtx.fillStyle = '#0284c7';
  watCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    watCtx.fillStyle = 'rgba(186, 230, 253, 0.16)';
    watCtx.fillRect(Math.random() * 256, Math.random() * 256, 26, 3);
  }
  const water = finalizeColorTexture(watC, aniso, 14, 14);

  // 12. Traditional Javanese Lurik Striped Weave
  const [lurC, lurCtx] = createCanvas(128);
  lurCtx.fillStyle = '#44403c';
  lurCtx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 8) {
    lurCtx.fillStyle = x % 16 === 0 ? '#292524' : '#78716c';
    lurCtx.fillRect(x, 0, 3, 128);
    lurCtx.fillStyle = '#d97706';
    lurCtx.fillRect(x + 4, 0, 1, 128);
  }
  for (let y = 0; y < 128; y += 4) {
    lurCtx.fillStyle = 'rgba(0,0,0,0.12)';
    lurCtx.fillRect(0, y, 128, 1);
  }
  const lurik = finalizeColorTexture(lurC, aniso, 2, 2);

  // 13. Woven Denim / Chino Fabric (neutral brightness so material.color tint stays rich)
  const [denC, denCtx] = createCanvas(256);
  const denImg = denCtx.createImageData(256, 256);
  const dd = denImg.data;
  const denHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const twill = Math.sin((x + y) * 1.15) * 0.5 + 0.5;
      const slub = (seededNoise(Math.floor(x * 0.5), y, 88) - 0.5) * 18;
      const fold = Math.sin((y / 256) * Math.PI * 8 + Math.sin(x * 0.04) * 0.9) * 0.55;
      const v = Math.max(178, Math.min(248, 212 + twill * 16 + slub + fold * 10));
      const idx = (y * 256 + x) * 4;
      dd[idx] = v;
      dd[idx + 1] = v + 2;
      dd[idx + 2] = Math.min(255, v + 6);
      dd[idx + 3] = 255;
      denHeights[y * 256 + x] = twill * 0.52 + fold * 0.9;
    }
  }
  denCtx.putImageData(denImg, 0, 0);
  const denim = finalizeColorTexture(denC, aniso, 2, 2);
  const denimNormal = heightMapToNormalTexture(denHeights, 256, 1.8, 2, 2, aniso);

  // 14. Clean Architectural Plaster & Panel Facade
  const [stuC, stuCtx] = createCanvas(256);
  stuCtx.fillStyle = '#e5e7eb';
  stuCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const v = 218 + Math.floor(Math.random() * 24);
    stuCtx.fillStyle = `rgb(${v},${v},${v - 2})`;
    stuCtx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
  }
  stuCtx.fillStyle = 'rgba(15, 23, 42, 0.08)';
  for (let y = 0; y < 256; y += 64) {
    stuCtx.fillRect(0, y, 256, 2);
  }
  for (let x = 0; x < 256; x += 64) {
    stuCtx.fillRect(x, 0, 2, 256);
  }
  const stuccoWall = finalizeColorTexture(stuC, aniso, 2, 2);

  // 15. Character Epidermal Micro-Pore Skin Normal Map
  const skinHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const cx = Math.floor(x / 4);
      const cy = Math.floor(y / 4);
      const jx = (seededNoise(cx, cy, 3) - 0.5) * 2.0;
      const jy = (seededNoise(cx, cy, 7) - 0.5) * 2.0;
      const dx = (x % 4) - 2 + jx;
      const dy = (y % 4) - 2 + jy;
      const pore = Math.max(0, 1 - Math.hypot(dx, dy) / 1.6) * -0.35;
      const fine = (seededNoise(x * 0.7, y * 0.7, 51) - 0.5) * 0.2;
      skinHeights[y * 256 + x] = pore + fine;
    }
  }
  const skinNormal = heightMapToNormalTexture(skinHeights, 256, 1.15, 3, 3, aniso);

  // 16. Woven Cotton / Jacket Cloth Crease Normal Map
  const clothHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const weave = (Math.sin(x * 1.45) * 0.5 + Math.cos(y * 1.45) * 0.5) * 0.28;
      const drape =
        Math.sin((x / 256) * Math.PI * 6 + Math.sin(y * 0.03) * 1.1) * 0.42 +
        Math.sin((y / 256) * Math.PI * 4) * 0.16;
      clothHeights[y * 256 + x] = weave + drape;
    }
  }
  const clothNormal = heightMapToNormalTexture(clothHeights, 256, 1.4, 2, 2, aniso);

  // 17. Directional Hair Strand Normal Map
  const hairHeights = new Float32Array(256 * 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const strand = Math.sin(x * 1.9 + Math.sin(y * 0.08) * 2.4) * 0.55;
      const micro = (seededNoise(x, y * 0.15, 61) - 0.5) * 0.42;
      hairHeights[y * 256 + x] = strand + micro;
    }
  }
  const hairNormal = heightMapToNormalTexture(hairHeights, 256, 1.6, 3, 2, aniso);

  // 18. Detailed Human Iris + Sclera Eyeball Texture
  const [eyeC, eyeCtx] = createCanvas(256);
  const scleraGrad = eyeCtx.createRadialGradient(128, 128, 40, 128, 128, 128);
  scleraGrad.addColorStop(0, '#f7f4f0');
  scleraGrad.addColorStop(0.68, '#efe8e2');
  scleraGrad.addColorStop(1, '#d8b4ad');
  eyeCtx.fillStyle = scleraGrad;
  eyeCtx.fillRect(0, 0, 256, 256);

  eyeCtx.save();
  eyeCtx.translate(128, 128);
  const irisR = 46;
  const irisGrad = eyeCtx.createRadialGradient(0, 0, irisR * 0.24, 0, 0, irisR);
  irisGrad.addColorStop(0, '#5a361a');
  irisGrad.addColorStop(0.45, '#432512');
  irisGrad.addColorStop(0.84, '#29150a');
  irisGrad.addColorStop(1, '#120a07');
  eyeCtx.fillStyle = irisGrad;
  eyeCtx.beginPath();
  eyeCtx.arc(0, 0, irisR, 0, Math.PI * 2);
  eyeCtx.fill();

  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const tone = seededNoise(i, 9, 42);
    eyeCtx.strokeStyle = tone > 0.5 ? 'rgba(168, 114, 58, 0.42)' : 'rgba(34, 18, 9, 0.45)';
    eyeCtx.lineWidth = 1.0 + tone * 0.8;
    eyeCtx.beginPath();
    eyeCtx.moveTo(Math.cos(a) * irisR * 0.34, Math.sin(a) * irisR * 0.34);
    eyeCtx.lineTo(Math.cos(a + 0.02) * irisR * 0.92, Math.sin(a + 0.02) * irisR * 0.92);
    eyeCtx.stroke();
  }
  eyeCtx.fillStyle = '#070606';
  eyeCtx.beginPath();
  eyeCtx.arc(0, 0, irisR * 0.38, 0, Math.PI * 2);
  eyeCtx.fill();
  eyeCtx.fillStyle = 'rgba(255, 255, 255, 0.20)';
  eyeCtx.beginPath();
  eyeCtx.arc(-irisR * 0.26, -irisR * 0.26, irisR * 0.11, 0, Math.PI * 2);
  eyeCtx.fill();
  eyeCtx.restore();
  const eyeIris = finalizeColorTexture(eyeC, aniso, 1, 1);
  eyeIris.wrapS = THREE.ClampToEdgeWrapping;
  eyeIris.wrapT = THREE.ClampToEdgeWrapping;

  return {
    roadArray,
    asphalt,
    dirtRoad,
    grass,
    sawah,
    roofTile,
    woodPlank,
    batikWall,
    redBrick,
    sand,
    cobblestone,
    water,
    lurik,
    denim,
    stuccoWall,
    skinNormal,
    clothNormal,
    denimNormal,
    hairNormal,
    eyeIris,
  };
}
