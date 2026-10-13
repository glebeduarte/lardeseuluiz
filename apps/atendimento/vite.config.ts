// Atendimento na plataforma unificada: app só no navegador (sem servidor próprio), servido em /atendimento.
// As rotas e telas são as do sistema original; o que rodava no servidor passou para a função "atendimento-equipe" do Supabase.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  base: "/atendimento/",
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss(), tsconfigPaths()],
  resolve: { dedupe: ["react", "react-dom", "@tanstack/react-router"] },
});
