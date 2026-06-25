import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      // Proxy ReceitaWS para evitar CORS em dev (mesmo comportamento que Vercel Edge Function)
      '/api/receitaws': {
        target: 'https://www.receitaws.com.br/v1/cnpj',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/receitaws/, ''),
        secure: true,
      },
    },
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }

          if (id.includes("xlsx")) {
            return "xlsx";
          }

          if (id.includes("dexie")) {
            return "data";
          }

          if (id.includes("react-router") || id.includes("@tanstack")) {
            return "app-core";
          }

          if (id.includes("react-dom") || id.includes("react")) {
            return "react-core";
          }

          if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("framer-motion")) {
            return "ui";
          }

          return "vendor";
        },
      },
    },
  },
}));
