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

  // 13. Woven Denim / Chino Fabric
  const [denC, denCtx] = createCanvas(128);
  denCtx.fillStyle = '#cbd5e1';
  denCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    const shade = 175 + Math.floor(Math.random() * 45);
    denCtx.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
    denCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 3);
  }
  const denim = finalizeColorTexture(denC, aniso, 2, 2);

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
  };
}
