import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/site/Home";
import Entrar from "@/pages/conta/Entrar";
import NaoEncontrada from "@/pages/NaoEncontrada";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

// Mapa de rotas da plataforma:
//   /              site institucional (público)
//   /entrar        login único
//   /minha-area    portal da pessoa (Fase 3)
//   /formacao/*    módulo Formação (Fase 6)
//   /atendimento/* módulo Atendimento (Fase 7)
//   /governanca/*  módulo Governança (Fase 8)
//   /acoes/*       módulo Ações sociais (Fase 10)
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
