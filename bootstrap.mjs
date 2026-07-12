import { access, copyFile, cp, mkdir } from "node:fs/promises";
import { constants } from "node:fs";

const templateFiles = [
  ["templates/package.template.json", "package.json"],
  ["templates/netlify.template.toml", "netlify.toml"],
  ["templates/tsconfig.template.json", "tsconfig.json"]
];

for (const [source, target] of templateFiles) {
  try {
    await access(target, constants.F_OK);
    console.log(`${target} already exists; leaving it unchanged.`);
  } catch {
    await copyFile(source, target);
    console.log(`Created ${target} from ${source}.`);
  }
}

await mkdir("public", { recursive: true });
await mkdir("netlify", { recursive: true });
await cp("source/public", "public", { recursive: true, force: true });
await cp("source/netlify", "netlify", { recursive: true, force: true });

console.log("Copied application source to public/ and netlify/.");
console.log("Next steps: npm install, npm run build, npm run check.");
