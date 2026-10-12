import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import rsc from "@vitejs/plugin-rsc";
import { forbidServerFunctions } from "./src/framework/guard.ts";

export default defineConfig({
  plugins: [forbidServerFunctions(), rsc(), react()],
  environments: {
    rsc: {
      build: { rollupOptions: { input: { index: "./src/entry.rsc.tsx" } } },
    },
    ssr: {
      build: { rollupOptions: { input: { index: "./src/entry.ssr.tsx" } } },
    },
    client: {
      build: {
        rollupOptions: { input: { index: "./src/framework/browser.tsx" } },
      },
    },
  },
});
