import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  output: "server",
  vite: {
    optimizeDeps: {
      exclude: ["oslo"]
    }
  },
  integrations: [tailwind()],
});
