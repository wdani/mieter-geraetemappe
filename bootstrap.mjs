import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const files = [
  ["templates/package.template.json", "package.json"],
  ["templates/netlify.template.toml", "netlify.toml"],
];

for (const [source, target] of files) {
  try {
    await access(target, constants.F_OK);
    console.log(`${target} already exists; leaving it unchanged.`);
  } catch {
    await copyFile(source, target);
    console.log(`Created ${target} from ${source}.`);
  }
}
