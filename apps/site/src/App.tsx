import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Design from "./pages/Design";
import Login from "./pages/Login";
import AppDashboard from "./pages/AppDashboard";
import Financeiro from "./pages/Financeiro";
import Documentos from "./pages/Documentos";
import Assembleias from "./pages/Assembleias";
import AssembleiaDetalhe from "./pages/AssembleiaDetalhe";
import Atendimentos from "./pages/Atendimentos";
import AtendimentosPublic from "./pages/AtendimentosPublic";
import LGPD from "./pages/LGPD";
import Usuarios from "./pages/Usuarios";
import MeuPainel from "./pages/MeuPainel";
import MinhasContribuicoes from "./pages/associate/MinhasContribuicoes";
import MinhasAssembleias from "./pages/associate/MinhasAssembleias";
import MeusDados from "./pages/associate/MeusDados";
import SecretariasPage from "./pages/Secretarias";
import SecretariaDetalhePage from "./pages/SecretariaDetalhe";
import SecretariaTarefas from "./pages/SecretariaTarefas";
import Eventos from "./pages/Eventos";
import Stories from "./pages/Stories";
import Associados from "./pages/Associados";
import Frequentadores from "./pages/Frequentadores";
import Pessoas from "./pages/Pessoas";
import PessoaDetalhe from "./pages/PessoaDetalhe";
import Funcoes from "./pages/Funcoes";
import Perfil from "./pages/Perfil";
import Projetos from "./pages/Projetos";
import AcoesSociais from "./pages/acoes/AcoesSociais";
import AcaoDetalhe from "./pages/acoes/AcaoDetalhe";
import EdicaoDetalhe from "./pages/acoes/EdicaoDetalhe";
import Familias from "./pages/acoes/Familias";
import Rifa from "./pages/site/Rifa";
import Rifas from "./pages/site/Rifas";
import RifasGestao from "./pages/rifas/RifasGestao";
import RifaGestao from "./pages/rifas/RifaGestao";
import RifaVender from "./pages/rifas/RifaVender";
import Chamamento from "./pages/chamamento/Chamamento";
import CandidatoChamamento from "./pages/chamamento/Candidato";
import NotFound from "./pages/NotFound";
import Agenda from "./pages/site/Agenda";
import ACasa from "./pages/site/ACasa";
import Projeto from "./pages/site/Projeto";
import Voluntariado from "./pages/site/Voluntariado";
import Privacidade from "./pages/site/Privacidade";
import FaixaSimulacao from "./components/simulacao/FaixaSimulacao";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <FaixaSimulacao />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/design" element={<Design />} />
            <Route path="/login" element={<Login />} />
            <Route path="/atendimentos" element={<AtendimentosPublic />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/a-casa" element={<ACasa />} />
            <Route path="/projetos/:slug" element={<Projeto />} />
            <Route path="/rifas" element={<Rifas />} />
            <Route path="/rifas/:slug" element={<Rifa />} />
            <Route path="/voluntariado" element={<Voluntariado />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/app" element={<AppDashboard />} />
            <Route path="/app/financeiro" element={<Financeiro />} />
            <Route path="/app/documentos" element={<Documentos />} />
            <Route path="/app/assembleias" element={<Assembleias />} />
            <Route path="/app/assembleias/:id" element={<AssembleiaDetalhe />} />
            <Route path="/app/atendimentos" element={<Atendimentos />} />
            <Route path="/app/lgpd" element={<LGPD />} />
            <Route path="/app/usuarios" element={<Usuarios />} />
            <Route path="/app/secretarias" element={<SecretariasPage />} />
            <Route path="/app/eventos" element={<Eventos />} />
            <Route path="/app/associados" element={<Associados />} />
            <Route path="/app/pessoas" element={<Pessoas />} />
            <Route path="/app/pessoas/:id" element={<PessoaDetalhe />} />
            <Route path="/app/frequentadores" element={<Frequentadores />} />
            <Route path="/app/secretarias/:id" element={<SecretariaDetalhePage />} />
            <Route path="/app/secretarias/:id/tarefas" element={<SecretariaTarefas />} />
            <Route path="/app/configuracoes/funcoes" element={<Funcoes />} />
            <Route path="/app/projetos" element={<Projetos />} />
            <Route path="/app/acoes" element={<AcoesSociais />} />
            <Route path="/app/rifas" element={<RifasGestao />} />
            <Route path="/app/rifas/vender" element={<RifaVender />} />
            <Route path="/app/rifas/:id" element={<RifaGestao />} />
            <Route path="/app/acoes/:id" element={<AcaoDetalhe />} />
            <Route path="/app/acoes/edicao/:id" element={<EdicaoDetalhe />} />
            <Route path="/app/familias" element={<Familias />} />
            <Route path="/app/chamamento" element={<Chamamento />} />
            <Route path="/app/chamamento/:id" element={<CandidatoChamamento />} />
            <Route path="/app/perfil" element={<Perfil />} />
            <Route path="/meu-painel" element={<MeuPainel />} />
            <Route path="/meu-painel/contribuicoes" element={<MinhasContribuicoes />} />
            <Route path="/meu-painel/assembleias" element={<MinhasAssembleias />} />
            <Route path="/meu-painel/meus-dados" element={<MeusDados />} />
            <Route path="/palestras" element={<Navigate to="/app/eventos?aba=palestras" replace />} />
            <Route path="/app/palestras" element={<Navigate to="/app/eventos?aba=palestras" replace />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
