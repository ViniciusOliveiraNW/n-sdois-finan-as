import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG base para ícones padrão
const baseSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8f9ff"/>
      <stop offset="100%" stop-color="#e6f4ea"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)"/>
  <rect width="512" height="512" rx="100" fill="none" stroke="#d0e1d4" stroke-width="8"/>
  <g>
    <circle cx="210" cy="256" r="115" stroke="#0051d5" stroke-width="38" fill="none" opacity="0.95"/>
    <circle cx="302" cy="256" r="115" stroke="#712ae2" stroke-width="38" fill="none" opacity="0.95"/>
    <path d="M256 200 V312 M200 256 H312" stroke="#006948" stroke-width="26" stroke-linecap="round"/>
  </g>
</svg>
`;

// SVG com margem segura de 15% para Maskable icon (Android)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgMask" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8f9ff"/>
      <stop offset="100%" stop-color="#e6f4ea"/>
    </linearGradient>
  </defs>
  <!-- Full-bleed background -->
  <rect width="512" height="512" fill="url(#bgMask)"/>
  <!-- Ícone escalado com padding seguro de 15% (80% safe-zone) -->
  <g transform="translate(64, 64) scale(0.75)">
    <circle cx="210" cy="256" r="115" stroke="#0051d5" stroke-width="38" fill="none" opacity="0.95"/>
    <circle cx="302" cy="256" r="115" stroke="#712ae2" stroke-width="38" fill="none" opacity="0.95"/>
    <path d="M256 200 V312 M200 256 H312" stroke="#006948" stroke-width="26" stroke-linecap="round"/>
  </g>
</svg>
`;

async function generate() {
  console.log('Gerando ícones PWA...');
  
  // 1. pwa-192x192.png
  await sharp(Buffer.from(baseSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ pwa-192x192.png gerado');

  // 2. pwa-512x512.png
  await sharp(Buffer.from(baseSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ pwa-512x512.png gerado');

  // 3. pwa-maskable-512x512.png
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ pwa-maskable-512x512.png gerado');

  // 4. apple-touch-icon.png (180x180 para iOS Safari)
  await sharp(Buffer.from(baseSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png gerado');

  // 5. favicon.ico
  await sharp(Buffer.from(baseSvg))
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ favicon.ico gerado');

  console.log('Todos os ícones PWA foram criados com sucesso!');
}

generate().catch(console.error);
