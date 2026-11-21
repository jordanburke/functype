import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://functype.org",
  outDir: "../dist-site",
  trailingSlash: "always",

  build: {
    assets: "assets",
  },

  vite: {
    plugins: [tailwindcss()],
  },

  markdown: {
    shikiConfig: {
      transformers: [
        {
          // A ```ts ignore fence opts its sample out of scripts/check-examples.ts. Carry that to the HTML,
          // where the check reads it, as data-typecheck="ignore" on the <pre>.
          pre(node) {
            const meta = this.options.meta?.__raw;
            if (meta !== undefined && /\bignore\b/.test(meta)) {
              node.properties["data-typecheck"] = "ignore";
            }
          },
        },
      ],
    },
  },

  integrations: [react(), mdx(), sitemap()],
});
