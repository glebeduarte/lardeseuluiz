import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ClipboardList, GraduationCap, HeartPulse, Landmark, Ticket, UserPlus } from "lucide-react";
import type { AreasLsl } from "./BarraSistemas";

// Sino de avisos da gestão, na barra de sistemas de todas as áreas logadas.
// Lê public.meus_avisos (cada pessoa vê só os avisos das áreas que cuida) e escuta avisos novos em tempo real.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteSupabase = any;

export interface AvisoLsl {
  id: string;
  area: string;
  tipo: string;
  titulo: string;
  descricao: string;
  link: string | null;
  criado_em: string;
  lido: boolean;
}

const NOME_AREA: Record<string, string> = {
  geral: "Geral", governanca: "Governança", formacao: "Formação", atendimento: "Atendimento", rifas: "Rifas",
};

const ICONE_AREA: Record<string, typeof Bell> = {
  geral: Bell, governanca: Landmark, formacao: GraduationCap, atendimento: HeartPulse, rifas: Ticket,
};

function iconeDoAviso(a: AvisoLsl) {
  if (a.tipo === "inscricao") return ClipboardList;
  if (a.tipo === "cadastro_aluno" || a.tipo === "nova_pessoa") return UserPlus;
  return ICONE_AREA[a.area] ?? Bell;
}

function haQuanto(data: string) {
  const s = Math.max(0, (Date.now() - new Date(data).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? "s" : ""}`;
  return new Date(data).toLocaleDateString("pt-BR");
}

/** Mostra o sino só para quem cuida de alguma área. */
export function veAvisos(areas: AreasLsl | null) {
  if (!areas?.logado) return false;
  const a = areas as AreasLsl & { direcao?: boolean; rifas?: { opera?: boolean }; atendimento_papeis?: string[] };
  return !!(a.admin || a.gestao || a.direcao || a.formacao_admin || a.rifas?.opera || a.atendimento_papeis?.includes("admin"));
}

export function SinoAvisos({ cliente, navegar }: { cliente: ClienteSupabase; navegar?: (href: string) => boolean }) {
  const [avisos, setAvisos] = useState<AvisoLsl[]>([]);
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<string>("todas");
  const caixa = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    const { data } = await cliente.schema("public").rpc("meus_avisos", { p_limite: 60 });
    if (Array.isArray(data)) setAvisos(data as AvisoLsl[]);
  }, [cliente]);

  useEffect(() => {
    carregar();
    const canal = cliente
      .channel(`lsl-avisos-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "avisos" }, (payload: { new: Omit<AvisoLsl, "lido"> }) => {
        setAvisos((v) => (v.some((x) => x.id === payload.new.id) ? v : [{ ...payload.new, lido: false }, ...v]));
      })
      .subscribe();
    const aoVoltar = () => { if (document.visibilityState === "visible") carregar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { cliente.removeChannel(canal); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [cliente, carregar]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: Event) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const marcar = async (ids: string[] | null) => {
    setAvisos((v) => v.map((a) => (ids === null || ids.includes(a.id) ? { ...a, lido: true } : a)));
    await cliente.schema("public").rpc("marcar_avisos_lidos", { p_ids: ids });
  };

  const abrir = (a: AvisoLsl) => {
    if (!a.lido) marcar([a.id]);
    setAberto(false);
    if (!a.link) return;
    if (!navegar?.(a.link)) window.location.href = a.link;
  };

  const naoLidos = avisos.filter((a) => !a.lido).length;
  const areasPresentes = Array.from(new Set(avisos.map((a) => a.area)));
  const lista = filtro === "todas" ? avisos : avisos.filter((a) => a.area === filtro);

  return (
    <div className="lsl-avisos" ref={caixa}>
      <button type="button" className="lsl-avisos__sino" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}
        aria-label={naoLidos ? `Avisos: ${naoLidos} não lidos` : "Avisos"} title="Avisos">
        <Bell size={20} />
        {naoLidos > 0 && <span className="lsl-avisos__selo">{naoLidos > 99 ? "99+" : naoLidos}</span>}
      </button>
      {aberto && (
        <div className="lsl-avisos__painel" role="dialog" aria-label="Avisos">
          <div className="lsl-avisos__topo">
            <strong>Avisos</strong>
            {naoLidos > 0 && (
              <button type="button" onClick={() => marcar(null)}><CheckCheck size={14} /> Marcar todos como lidos</button>
            )}
          </div>
          {areasPresentes.length > 1 && (
            <div className="lsl-avisos__filtros">
              {["todas", ...areasPresentes].map((f) => (
                <button key={f} type="button" className={filtro === f ? "ativo" : ""} onClick={() => setFiltro(f)}>
                  {f === "todas" ? "Todas" : NOME_AREA[f] ?? f}
                </button>
              ))}
            </div>
          )}
          <div className="lsl-avisos__lista">
            {lista.length === 0 ? (
              <p className="lsl-avisos__vazio">Nenhum aviso por enquanto.</p>
            ) : lista.map((a) => {
              const Icone = iconeDoAviso(a);
              return (
                <button key={a.id} type="button" onClick={() => abrir(a)} className={`lsl-avisos__item${a.lido ? "" : " lsl-avisos__item--novo"}`}>
                  <span className={`lsl-avisos__icone lsl-avisos__icone--${a.area}`}><Icone size={16} /></span>
                  <span className="lsl-avisos__texto">
                    <strong>{a.titulo}</strong>
                    <span>{a.descricao}</span>
                    <small>{NOME_AREA[a.area] ?? a.area} · {haQuanto(a.criado_em)}</small>
                  </span>
                  {!a.lido && <span className="lsl-avisos__ponto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
