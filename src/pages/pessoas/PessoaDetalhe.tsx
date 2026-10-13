import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/ContaLayout";

const CARGO_NOME: Record<string, string> = { membro: "Membro", coordenador: "Coordenador", diretor: "Diretor" };
const hoje = () => new Date().toISOString().slice(0, 10);
const data = (d: string) => new Date(d + "T12:00").toLocaleDateString("pt-BR");
const select = "flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function PessoaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { pode, pessoa: eu } = useAuth();
  const qc = useQueryClient();
  const [erro, setErro] = useState<string | null>(null);

  const dados = useQuery({
    queryKey: ["pessoa", id],
    queryFn: async () => {
      const [p, estagios, funcoes, cargos] = await Promise.all([
        supabase.from("pessoas").select("id, nome, nome_social, email, telefone, data_nascimento, endereco").eq("id", id!).single(),
        supabase.from("pessoa_estagios").select("id, estagio, inicio, fim, motivo").eq("pessoa_id", id!).order("inicio", { ascending: false }),
        supabase.from("pessoa_funcoes").select("id, inicio, contexto, funcoes(nome)").eq("pessoa_id", id!).is("fim", null),
        supabase.from("pessoa_cargos").select("id, cargo, inicio, areas(nome)").eq("pessoa_id", id!).is("fim", null),
      ]);
      if (p.error) throw p.error;
      return {
        pessoa: p.data,
        estagios: estagios.data ?? [],
        funcoes: (funcoes.data ?? []) as unknown as { id: string; inicio: string; funcoes: { nome: string } }[],
        cargos: (cargos.data ?? []) as unknown as { id: string; cargo: string; inicio: string; areas: { nome: string } }[],
      };
    },
  });

  const catalogo = useQuery({
    queryKey: ["catalogo-nucleo"],
    queryFn: async () => {
      const [funcoes, areas] = await Promise.all([
        supabase.from("funcoes").select("id, nome").eq("ativa", true).order("nome"),
        supabase.from("areas").select("id, nome, tipo").eq("ativa", true).order("ordem"),
      ]);
      return { funcoes: funcoes.data ?? [], areas: areas.data ?? [] };
    },
  });

  const recarregar = () => qc.invalidateQueries({ queryKey: ["pessoa", id] });
  const useAcao = <T,>(fn: (v: T) => Promise<void>) =>
    useMutation({
      mutationFn: async (v: T) => {
        setErro(null);
        await fn(v);
      },
      onSuccess: recarregar,
      onError: (e: Error) => setErro(e.message.includes("Só voluntários") ? e.message + "." : "Não foi possível salvar. Confira sua permissão e tente de novo."),
    });

  const mudarEstagio = useAcao(async (novo: "frequentador" | "voluntario") => {
    const aberto = dados.data?.estagios.find((e) => !e.fim);
    if (aberto) {
      const { error } = await supabase.from("pessoa_estagios").update({ fim: hoje() }).eq("id", aberto.id);
      if (error) throw error;
    }
    const { error } = await supabase.from("pessoa_estagios").insert({
      pessoa_id: id,
      estagio: novo,
      aprovado_por: eu?.id,
      motivo: novo === "voluntario" ? "Integração oficial" : "Saída do voluntariado",
    });
    if (error) throw error;
  });

  const [novaFuncao, setNovaFuncao] = useState("");
  const addFuncao = useAcao(async (funcaoId: string) => {
    const { error } = await supabase.from("pessoa_funcoes").insert({ pessoa_id: id, funcao_id: funcaoId, atribuido_por: eu?.id });
    if (error) throw error;
    setNovaFuncao("");
  });
  const fimFuncao = useAcao(async (rowId: string) => {
    const { error } = await supabase.from("pessoa_funcoes").update({ fim: hoje() }).eq("id", rowId);
    if (error) throw error;
  });

  const [novaArea, setNovaArea] = useState("");
  const [novoCargo, setNovoCargo] = useState("membro");
  const addCargo = useAcao(async () => {
    const tipo = catalogo.data?.areas.find((a) => a.id === novaArea)?.tipo;
    const cargo = tipo === "direcao" ? "diretor" : novoCargo === "diretor" ? "membro" : novoCargo;
    const { error } = await supabase.from("pessoa_cargos").insert({ pessoa_id: id, area_id: novaArea, cargo, atribuido_por: eu?.id });
    if (error) throw error;
    setNovaArea("");
  });
  const fimCargo = useAcao(async (rowId: string) => {
    const { error } = await supabase.from("pessoa_cargos").update({ fim: hoje() }).eq("id", rowId);
    if (error) throw error;
  });

  if (dados.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!dados.data) return <p className="text-muted-foreground">Pessoa não encontrada ou sem acesso.</p>;

  const { pessoa, estagios, funcoes, cargos } = dados.data;
  const atual = estagios.find((e) => !e.fim);
  const voluntario = atual?.estagio === "voluntario";
  const podeAtribuir = pode("pessoas.atribuir");
  const areaSel = catalogo.data?.areas.find((a) => a.id === novaArea);

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <Link to="/pessoas" className="flex items-center gap-1 text-sm text-primary hover:underline w-fit">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Pessoas
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">{pessoa.nome}</h1>
        <p className="text-muted-foreground break-all">
          {[pessoa.email, pessoa.telefone].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
        </p>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Estágio na casa</h2>
        <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-medium">{voluntario ? "Voluntário" : atual ? "Frequentador" : "Sem estágio"}</span>
            {atual && <span className="text-sm text-muted-foreground">desde {data(atual.inicio)}</span>}
          </div>
          {pode("pessoas.aprovar_voluntario") && (
            <Button
              variant={voluntario ? "outline" : "secondary"}
              disabled={mudarEstagio.isPending}
              onClick={() => mudarEstagio.mutate(voluntario ? "frequentador" : "voluntario")}
            >
              {voluntario ? "Encerrar voluntariado" : "Registrar integração como voluntário"}
            </Button>
          )}
        </div>
        {voluntario && pode("pessoas.aprovar_voluntario") && (
          <p className="text-xs text-muted-foreground">Encerrar o voluntariado também encerra todos os cargos e funções da pessoa.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Cargos</h2>
        <ul className="flex flex-col gap-2">
          {cargos.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-2">
              <span>{CARGO_NOME[c.cargo]} · {c.areas.nome} <span className="text-sm text-muted-foreground">desde {data(c.inicio)}</span></span>
              {podeAtribuir && (
                <button type="button" onClick={() => fimCargo.mutate(c.id)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`Encerrar cargo ${CARGO_NOME[c.cargo]} em ${c.areas.nome}`}>
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {!cargos.length && <li className="text-sm text-muted-foreground">Nenhum cargo ativo.</li>}
        </ul>
        {podeAtribuir && voluntario && (
          <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="area">Área</Label>
              <select id="area" className={select} value={novaArea} onChange={(e) => setNovaArea(e.target.value)}>
                <option value="">Escolha a área</option>
                {catalogo.data?.areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cargo">Cargo</Label>
              <select id="cargo" className={select} value={novoCargo} onChange={(e) => setNovoCargo(e.target.value)}>
                {areaSel?.tipo === "direcao" ? <option value="diretor">Diretor</option> : (
                  <>
                    <option value="membro">Membro</option>
                    <option value="coordenador">Coordenador</option>
                  </>
                )}
              </select>
            </div>
            <Button
              disabled={!novaArea || addCargo.isPending}
              onClick={() => addCargo.mutate(undefined)}
            >
              Adicionar cargo
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Funções</h2>
        <ul className="flex flex-wrap gap-2">
          {funcoes.map((f) => (
            <li key={f.id} className="flex items-center gap-1 rounded-full bg-secondary/10 pl-3 pr-1 py-1 text-sm text-secondary">
              {f.funcoes.nome}
              {podeAtribuir && (
                <button type="button" onClick={() => fimFuncao.mutate(f.id)} className="rounded-full p-0.5 hover:bg-secondary/20" aria-label={`Encerrar função ${f.funcoes.nome}`}>
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
          {!funcoes.length && <li className="text-sm text-muted-foreground">Nenhuma função ativa.</li>}
        </ul>
        {podeAtribuir && voluntario && (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
            <div className="flex flex-col gap-2">
              <Label htmlFor="funcao">Função</Label>
              <select id="funcao" className={select} value={novaFuncao} onChange={(e) => setNovaFuncao(e.target.value)}>
                <option value="">Escolha a função</option>
                {catalogo.data?.funcoes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <Button disabled={!novaFuncao || addFuncao.isPending} onClick={() => addFuncao.mutate(novaFuncao)}>Adicionar função</Button>
          </div>
        )}
        {!voluntario && <p className="text-sm text-muted-foreground">Cargos e funções ficam disponíveis depois da integração como voluntário.</p>}
      </section>
    </div>
  );
}
