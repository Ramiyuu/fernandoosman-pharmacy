#!/usr/bin/env node
// Generates the site's brand assets from the source artwork in
// identidade_fernandoosman_portfolio/. Re-run after changing the artwork:
//
//   npm run brand:assets
//
// Outputs
//   public/brand/fo-logo.png      FO mark, transparent (header, footer, login)
//   public/brand/fo-icon.png      primary icon (navy rounded square), transparent corners
//   src/app/icon.png              favicon / browser icon (256 px)
//   src/app/apple-icon.png        home-screen icon (180 px, solid background)

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = join(root, 'identidade_fernandoosman_portfolio');
const LOGO = join(source, 'fernando_osman_logo_FO.png');
const ICON = join(source, '8cd2bc04-34e8-458c-a59d-3316185da298.png');
const NAVY = { r: 2, g: 26, b: 69 };

mkdirSync(join(root, 'public/brand'), { recursive: true });

/** Corner radius of the rounded square in the icon artwork (its corners are black). */
async function cornerRadius(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width / 2; i += 1) {
    const offset = (i * info.width + i) * info.channels;
    if (data[offset] + data[offset + 1] + data[offset + 2] > 30) {
      // Along the diagonal, a rounded corner of radius r starts at r·(1 − 1/√2).
      return { radius: i / (1 - Math.SQRT1_2), size: info.width };
    }
  }
  throw new Error('Could not find the icon corner');
}

function roundedMask(size, radius) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
}

async function main() {
  // 1. Transparent FO mark, trimmed, 2× the largest size it is shown at.
  await sharp(LOGO).trim().resize({ height: 160 }).png({ palette: true, quality: 95, effort: 10 }).toFile(join(root, 'public/brand/fo-logo.png'));

  // 2. Primary icon with the black corners cut away (slightly larger radius + 1 % inset).
  const { radius, size } = await cornerRadius(ICON);
  const inset = Math.round(size * 0.01);
  const inner = size - inset * 2;
  const iconBuffer = await sharp(ICON)
    .extract({ left: inset, top: inset, width: inner, height: inner })
    .composite([{ input: roundedMask(inner, radius * 1.08), blend: 'dest-in' }])
    .png()
    .toBuffer();

  await sharp(iconBuffer).resize(192).png({ palette: true, quality: 95, effort: 10 }).toFile(join(root, 'public/brand/fo-icon.png'));
  await sharp(iconBuffer).resize(256).png({ palette: true, quality: 95, effort: 10 }).toFile(join(root, 'src/app/icon.png'));

  // 3. Apple touch icon: iOS rounds the corners itself, so it needs a solid square.
  // (sharp resizes before compositing, so flatten first, then resize.)
  const solid = await sharp(iconBuffer).flatten({ background: NAVY }).png().toBuffer();
  await sharp(solid).resize(180).png({ compressionLevel: 9 }).toFile(join(root, 'src/app/apple-icon.png'));

  console.log('✓ Brand assets written to public/brand and src/app');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
