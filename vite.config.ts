import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
export default defineConfig(({ mode }) => {
  const plugins = [react()];
  if (mode === "development") {
    try {
      // Optional Lovable tagger in dev mode
      const { componentTagger } = require("lovable-tagger");
      if (typeof componentTagger === "function") plugins.push(componentTagger());
    } catch {
      // Standalone mode without lovable-tagger
    }
  }
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
