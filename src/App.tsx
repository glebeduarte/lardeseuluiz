import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import Home from "@/pages/site/Home";
import Entrar from "@/pages/conta/Entrar";
import Cadastro from "@/pages/conta/Cadastro";
import RecuperarSenha from "@/pages/conta/RecuperarSenha";
import RedefinirSenha from "@/pages/conta/RedefinirSenha";
import MinhaArea from "@/pages/minha-area/MinhaArea";
import Pessoas from "@/pages/pessoas/Pessoas";
import PessoaDetalhe from "@/pages/pessoas/PessoaDetalhe";
import Atendimentos from "@/pages/site/Atendimentos";
import ACasa from "@/pages/site/ACasa";
import AgendaPagina from "@/pages/site/AgendaPagina";
import Projeto from "@/pages/site/Projeto";
import Voluntariado from "@/pages/site/Voluntariado";
import Privacidade from "@/pages/site/Privacidade";
import PainelSite from "@/pages/painel-site/PainelSite";
import Interessados from "@/pages/pessoas/Interessados";
import NaoEncontrada from "@/pages/NaoEncontrada";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

// Mapa de rotas:
//   /                site institucional (público)
//   /entrar, /cadastro, /recuperar-senha, /redefinir-senha   conta
//   /minha-area      portal da pessoa
//   /pessoas         cadastros, cargos e funções (pessoas.ler)
//   /formacao/*      Formação (Fase 6) · /atendimento/* (Fase 7) · /governanca/* (Fase 8) · /acoes/* (Fase 10)
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/agenda" element={<AgendaPagina />} />
            <Route path="/atendimentos" element={<Atendimentos />} />
            <Route path="/a-casa" element={<ACasa />} />
            <Route path="/projetos/:slug" element={<Projeto />} />
            <Route path="/voluntariado" element={<Voluntariado />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />

            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/minha-area" element={<MinhaArea />} />
              <Route path="/pessoas" element={<RequireAuth permissao="pessoas.ler"><Pessoas /></RequireAuth>} />
              <Route path="/pessoas/:id" element={<RequireAuth permissao="pessoas.ler"><PessoaDetalhe /></RequireAuth>} />
              <Route path="/interessados" element={<RequireAuth permissao="chamamento.entrevistar"><Interessados /></RequireAuth>} />
              <Route path="/painel-site" element={<RequireAuth permissao="site.publicar"><PainelSite /></RequireAuth>} />
            </Route>

            <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
