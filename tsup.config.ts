// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  minify: true,
  splitting: false,
  injectStyle: true,     // injects CSS automatically
  loader: {
    ".css": "css"
  },
  external: ["react", "react-dom"],
  outExtension: () => ({ js: ".mjs" }),
});
