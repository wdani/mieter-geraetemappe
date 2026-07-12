import { access, copyFile, cp, mkdir, rm } from "node:fs/promises";
import { constants } from "node:fs";

const templateFiles = [
  ["templates/package.template.json", "package.json"],
  ["templates/netlify.template.toml", "netlify.toml"],
  ["templates/tsconfig.template.json", "tsconfig.json"]
];

for (const [source, target] of templateFiles) {
  try {
    await access(target, constants.F_OK);
    await copyFile(source, target);
    console.log(`Updated ${target} from ${source}.`);
  } catch {
    await copyFile(source, target);
    console.log(`Created ${target} from ${source}.`);
  }
}

await rm("public", { recursive: true, force: true });
await rm("netlify", { recursive: true, force: true });
await mkdir("public", { recursive: true });
await mkdir("netlify", { recursive: true });
await cp("source/public", "public", { recursive: true, force: true });
await cp("source/netlify", "netlify", { recursive: true, force: true });

console.log("Synchronized public/ and netlify/ with the application source.");
console.log("Next steps: npm install, npm run build, npm run check.");
