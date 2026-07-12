import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const source = new URL("../assets/app-icon.svg", import.meta.url);
const outputDir = new URL("../public/icons/", import.meta.url);

await mkdir(outputDir, { recursive: true });

const variants = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-192.png", 192],
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["favicon-32.png", 32]
];

await Promise.all(
  variants.map(([filename, size]) =>
    sharp(source)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(new URL(filename, outputDir))
  )
);

console.log(`Generated ${variants.length} icon files.`);
