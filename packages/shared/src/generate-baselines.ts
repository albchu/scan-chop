/**
 * Generates baseline image artifacts for visual comparison between image-js v0 and v1.
 *
 * Usage:
 *   pnpm --filter @workspace/shared tsx src/generate-baselines.ts <v0|v1> [imagePath]
 *
 * Arguments:
 *   label      - Required. Output directory label: "v0" or "v1".
 *   imagePath  - Optional. Path to a real image to use instead of the synthetic test image.
 *
 * Output:
 *   test-baselines/<label>/   - Directory of artifact PNGs
 *   test-baselines/<label>/manifest.json - Dimensions of each artifact
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  read,
  write,
  encode,
  decode,
  encodeDataURL,
  createImage,
  setPixel,
  crop,
  rotateRightAngle,
  transformRotate,
  resize,
} from './image-adapter.js';
import type { Image } from './image-adapter.js';

// ---------------------------------------------------------------------------
// Synthetic test image: 400x300 RGBA with features at known positions
// ---------------------------------------------------------------------------

function createSyntheticTestImage(): Image {
  const width = 400;
  const height = 300;
  const img = createImage(width, height, { colorModel: 'RGBA' });

  // White background
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setPixel(img, x, y, [255, 255, 255, 255]);
    }
  }

  // Red rectangle: (50,30) to (150,80) — top-left region
  for (let y = 30; y < 80; y++) {
    for (let x = 50; x < 150; x++) {
      setPixel(img, x, y, [220, 40, 40, 255]);
    }
  }

  // Green rectangle: (200,100) to (300,180) — sits inside the crop region
  for (let y = 100; y < 180; y++) {
    for (let x = 200; x < 300; x++) {
      setPixel(img, x, y, [40, 180, 40, 255]);
    }
  }

  // Blue rectangle: (80,200) to (180,260) — bottom-left region
  for (let y = 200; y < 260; y++) {
    for (let x = 80; x < 180; x++) {
      setPixel(img, x, y, [40, 40, 220, 255]);
    }
  }

  // Horizontal gradient band: y=140..160, full width
  // Left edge is red, right edge is blue — exercises interpolation quality
  for (let y = 140; y < 160; y++) {
    for (let x = 0; x < width; x++) {
      const t = Math.round((x / (width - 1)) * 255);
      setPixel(img, x, y, [t, 0, 255 - t, 255]);
    }
  }

  // Checkerboard: (300,20) to (380,100), 4px squares — fine detail for resize/rotate quality
  for (let y = 20; y < 100; y++) {
    for (let x = 300; x < 380; x++) {
      const isBlack =
        (Math.floor((x - 300) / 4) + Math.floor((y - 20) / 4)) % 2 === 0;
      setPixel(img, x, y, isBlack ? [0, 0, 0, 255] : [255, 255, 255, 255]);
    }
  }

  return img;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const label = process.argv[2];
  const imagePath = process.argv[3];

  if (!label || !['v0', 'v1'].includes(label)) {
    console.error('Usage: tsx src/generate-baselines.ts <v0|v1> [imagePath]');
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const outDir = path.join(repoRoot, 'test-baselines', label);
  await fs.mkdir(outDir, { recursive: true });

  // Load or generate the source image
  let image: Image;
  if (imagePath) {
    console.log(`Loading image from ${imagePath}`);
    image = await read(path.resolve(imagePath));
  } else {
    console.log('Generating synthetic 400x300 RGBA test image');
    image = createSyntheticTestImage();
  }
  console.log(`Source image: ${image.width}x${image.height}`);

  const manifest: Record<string, { width: number; height: number }> = {};

  async function writeArtifact(name: string, img: Image) {
    const filePath = path.join(outDir, name);
    await write(filePath, img);
    manifest[name] = { width: img.width, height: img.height };
    console.log(`  ${name}: ${img.width}x${img.height}`);
  }

  console.log(`\nGenerating artifacts in ${outDir}/`);

  // Save the source image itself for reference
  await writeArtifact('source.png', image);

  // 1. Resize to 50%
  const resized = resize(image, { width: Math.round(image.width / 2) });
  await writeArtifact('resize_50pct.png', resized);

  // 2. Crop: origin (100,100), 200x100 — captures part of the green rectangle
  const cropped = crop(image, {
    origin: { column: 100, row: 100 },
    width: 200,
    height: 100,
  });
  await writeArtifact('crop_center.png', cropped);

  // 3. Arbitrary rotation: 15 degrees
  const rotated15 = transformRotate(image, 15);
  await writeArtifact('rotate_15deg.png', rotated15);

  // 4. Arbitrary rotation: 45 degrees
  const rotated45 = transformRotate(image, 45);
  await writeArtifact('rotate_45deg.png', rotated45);

  // 5. Right-angle rotation: 90 degrees
  const rotated90 = rotateRightAngle(image, 90);
  await writeArtifact('rotate_90deg.png', rotated90);

  // 6. encode(png) -> decode -> write roundtrip
  const pngBuffer = encode(image, { format: 'png' });
  const base64 = Buffer.from(pngBuffer).toString('base64');
  const dataURLFromEncode = `data:image/png;base64,${base64}`;
  const decodedFromEncode = await decode(dataURLFromEncode);
  await writeArtifact('encode_roundtrip.png', decodedFromEncode);

  // 7. encodeDataURL -> decode -> write roundtrip
  const dataURL = encodeDataURL(image);
  const decodedFromDataURL = await decode(dataURL);
  await writeArtifact('dataurl_roundtrip.png', decodedFromDataURL);

  // Write manifest
  const manifestPath = path.join(outDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nManifest written to ${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
