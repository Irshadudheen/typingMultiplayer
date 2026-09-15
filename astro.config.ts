import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss(), tsconfigPaths()],
  },
});