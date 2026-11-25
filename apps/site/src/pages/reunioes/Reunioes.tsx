import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, MapPin, NotebookPen, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import GuardaReunioes from "@/components/reunioes/GuardaReunioes";
import { CabecalhoPagina, type LinkLslProps } from "@/compartilhado";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { criarReuniao, dataPorExtenso, listarReunioes, type ResumoReuniao } from "@/lib/reunioes";

// Reuniões da casa: lista das próximas e das já realizadas. Cada reunião abre a ficha com pauta e anotações.

const LinkRR = ({ href, className, title, onClick, children }: LinkLslProps) => (
  <Link to={href} className={className} title={title} onClick={onClick}>{children}</Link>
);

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Cartao({ r }: { r: ResumoReuniao }) {
  return (
    <Link to={`/app/reunioes/${r.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="py-4 flex items-center gap-4">
          <div className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center shrink-0" style={{ background: "hsl(var(--primary-muted))" }}>
            <NotebookPen className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[17px] truncate">{r.titulo || "Reunião sem título"}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" />{dataPorExtenso(r.data_hora)}</span>
              {r.local && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{r.local}</span>}
              {r.participantes.length > 0 && (
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{r.participantes.length} {r.participantes.length === 1 ? "participante" : "participantes"}</span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

function Lista() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const { data: reunioes = [], isLoading, error } = useQuery({ queryKey: ["reunioes"], queryFn: listarReunioes });

  const nova = async () => {
    setCriando(true);
    try {
      navigate(`/app/reunioes/${await criarReuniao()}`);
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível criar a reunião.");
      setCriando(false);
    }
  };

  const { proximas, realizadas } = useMemo(() => {
    const termo = semAcento(busca.trim());
    const filtradas = termo
      ? reunioes.filter((r) => semAcento(`${r.titulo} ${r.local ?? ""} ${r.participantes.join(" ")}`).includes(termo))
      : reunioes;
    // Conta como "próxima" até 3 horas depois do horário marcado, para não sumir da frente durante a reunião
    const corte = Date.now() - 3 * 60 * 60 * 1000;
    const futura = (r: ResumoReuniao) => !r.data_hora || new Date(r.data_hora).getTime() >= corte;
    return {
      proximas: filtradas.filter(futura).sort((a, b) => (a.data_hora ?? "").localeCompare(b.data_hora ?? "")),
      realizadas: filtradas.filter((r) => !futura(r)),
    };
  }, [reunioes, busca]);

  return (
    <AppLayout>
      <CabecalhoPagina titulo="Reuniões" Link={LinkRR}
        descricao="Prepare a pauta antes, anote tudo durante a conversa e guarde a transcrição. Cada reunião fica registrada aqui."
        acoes={<Button onClick={nova} disabled={criando} className="h-11"><Plus className="w-4 h-4 mr-2" /> Nova reunião</Button>} />

      {reunioes.length > 4 && (
        <div className="relative mb-5 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-11" placeholder="Procurar por título, local ou participante" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : error ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Não foi possível carregar as reuniões. Atualize a página para tentar de novo.</CardContent></Card>
      ) : reunioes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <NotebookPen className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma reunião registrada ainda.</p>
            <Button onClick={nova} disabled={criando} className="h-11"><Plus className="w-4 h-4 mr-2" /> Registrar a primeira reunião</Button>
          </CardContent>
        </Card>
      ) : proximas.length + realizadas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma reunião encontrada com essa busca.</p>
      ) : (
        <div className="space-y-8">
          {proximas.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Próximas</h2>
              <div className="grid gap-3">{proximas.map((r) => <Cartao key={r.id} r={r} />)}</div>
            </section>
          )}
          {realizadas.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Realizadas</h2>
              <div className="grid gap-3">{realizadas.map((r) => <Cartao key={r.id} r={r} />)}</div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default function Reunioes() {
  return <GuardaReunioes><Lista /></GuardaReunioes>;
}
