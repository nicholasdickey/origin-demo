import { build } from "vite";
import path from "path";
import fs from "fs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const outDir = "assets";

const bundles: { html: string; surface: "dashboard" | "familyLogin" | "emailApproval" }[] = [
  { html: "mcp-app-dashboard.html", surface: "dashboard" },
  { html: "mcp-app-family.html", surface: "familyLogin" },
  { html: "mcp-app-email.html", surface: "emailApproval" },
];

for (const b of bundles) {
  const p = path.resolve(b.html);
  if (!fs.existsSync(p)) {
    console.error(`Missing ${b.html}`);
    process.exit(1);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const b of bundles) {
  const htmlPath = path.resolve(b.html);
  const baseName = b.html.replace(/\.html$/, "");
  console.log(`Building ${b.html} (VITE_ORIGIN_SURFACE=${b.surface})`);
  await build({
    root: path.resolve("."),
    plugins: [react(), tailwindcss(), viteSingleFile()],
    esbuild: { jsx: "automatic", jsxImportSource: "react", target: "es2022" },
    define: {
      "import.meta.env.VITE_ORIGIN_SURFACE": JSON.stringify(b.surface),
    },
    build: {
      outDir,
      emptyOutDir: false,
      target: "es2022",
      minify: "esbuild",
      cssCodeSplit: false,
      rollupOptions: {
        input: htmlPath,
        output: {
          entryFileNames: `${baseName}.js`,
          assetFileNames: `${baseName}.[ext]`,
        },
      },
    },
  });
  console.log(`Built assets/${b.html}`);
}
