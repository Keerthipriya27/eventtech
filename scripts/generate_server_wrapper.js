import fs from "fs";
import path from "path";

// This script creates dist/server/server.js that re-exports the built server entry.
const distServer = path.resolve(process.cwd(), "dist", "server");
const target = path.join(distServer, "server.js");
const indexRel = "./index.js";

try {
  if (!fs.existsSync(distServer)) {
    console.error("dist/server not found; run build first");
    process.exit(1);
  }
  const content = `export * from '${indexRel}';\nexport { default } from '${indexRel}';\n`;
  fs.writeFileSync(target, content, "utf8");
  console.log("Wrote", target);
} catch (e) {
  console.error(e);
  process.exit(1);
}
