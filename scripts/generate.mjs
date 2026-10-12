import { mkdir, writeFile, cp } from "node:fs/promises";
process.env.NODE_ENV = "production";
const { prerender } = await import("../dist/rsc/index.js");
const paths = ["/", "/about"];
await mkdir("static", { recursive: true });
await cp("dist/client", "static", { recursive: true });
for (const path of paths) {
  const output = `static${path === "/" ? "" : path}`;
  await mkdir(output, { recursive: true });
  const { html, flight } = await prerender(path, paths);
  await writeFile(`${output}/index.html`, html);
  await writeFile(`${output}/index.rsc`, flight);
  console.log(`Generated ${path}: HTML + Flight from one render`);
}
