import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { modulosVisiveis } from "@/lib/modulos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Aviso } from "@/components/ContaLayout";

const CARGO_NOME: Record<string, string> = { membro: "Membro", coordenador: "Coordenador", diretor: "Diretor" };

const FINALIDADES = [
  { chave: "comunicacao", titulo: "Receber avisos da casa", texto: "Mensagens sobre cursos, palestras e ações por e-mail ou WhatsApp." },
  { chave: "imagem", titulo: "Uso de imagem", texto: "Fotos e vídeos em que eu apareça podem ser usados na comunicação da casa." },
] as const;

export default function MinhaArea() {
  const { pessoa, pode } = useAuth();
  const modulos = modulosVisiveis(pode);

  const vida = useQuery({
    queryKey: ["minha-vida", pessoa?.id],
    enabled: !!pessoa,
    queryFn: async () => {
      const [estagio, funcoes, cargos] = await Promise.all([
        supabase.from("pessoa_estagios").select("estagio, inicio").eq("pessoa_id", pessoa!.id).is("fim", null).maybeSingle(),
        supabase.from("pessoa_funcoes").select("id, funcoes(nome)").eq("pessoa_id", pessoa!.id).is("fim", null),
        supabase.from("pessoa_cargos").select("id, cargo, areas(nome)").eq("pessoa_id", pessoa!.id).is("fim", null),
      ]);
      return {
        estagio: estagio.data,
        funcoes: (funcoes.data ?? []) as unknown as { id: string; funcoes: { nome: string } }[],
        cargos: (cargos.data ?? []) as unknown as { id: string; cargo: string; areas: { nome: string } }[],
      };
    },
  });

  if (!pessoa) {
    return (
      <div className="max-w-xl flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">Minha área</h1>
        <p className="text-muted-foreground">Seu cadastro ainda está sendo preparado. Saia e entre de novo em alguns instantes.</p>
      </div>
    );
  }

  const voluntario = vida.data?.estagio?.estagio === "voluntario";

  return (
    <div className="flex flex-col gap-10 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Olá, {(pessoa.nome_social || pessoa.nome).split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          {voluntario ? "Voluntário" : "Frequentador"} do Lar de Seu Luiz
          {vida.data?.estagio?.inicio && ` desde ${new Date(vida.data.estagio.inicio + "T12:00").toLocaleDateString("pt-BR")}`}.
        </p>
      </div>

      {voluntario && (
        <section className="flex flex-col gap-3" aria-labelledby="atuacao">
          <h2 id="atuacao" className="text-xl font-semibold">Minha atuação</h2>
          <div className="flex flex-wrap gap-2">
            {vida.data?.cargos.map((c) => (
              <span key={c.id} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                {CARGO_NOME[c.cargo]} · {c.areas.nome}
              </span>
            ))}
            {vida.data?.funcoes.map((f) => (
              <span key={f.id} className="rounded-full bg-secondary/10 px-3 py-1 text-sm text-secondary">{f.funcoes.nome}</span>
            ))}
            {!vida.data?.cargos.length && !vida.data?.funcoes.length && (
              <span className="text-sm text-muted-foreground">Nenhum cargo ou função atribuído ainda.</span>
            )}
          </div>
          {modulos.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {modulos.map((m) => (
                <div key={m.rota} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                  <m.icone className="h-5 w-5 mt-0.5 text-primary" aria-hidden />
                  <div className="flex flex-col gap-1 min-w-0">
                    {m.disponivel ? (
                      <Link to={m.rota} className="font-medium hover:underline">{m.nome}</Link>
                    ) : (
                      <span className="font-medium">{m.nome}</span>
                    )}
                    <span className="text-sm text-muted-foreground">{m.disponivel ? m.descricao : "Em breve nesta plataforma"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <MeusCursos />

      <MeusDados />
      <MeusConsentimentos pessoaId={pessoa.id} />
    </div>
  );
}

function MeusDados() {
  const { pessoa } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome_social: "", telefone: "", data_nascimento: "", cidade: "", bairro: "" });
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!pessoa) return;
    setForm({
      nome_social: pessoa.nome_social ?? "",
      telefone: pessoa.telefone ?? "",
      data_nascimento: pessoa.data_nascimento ?? "",
      cidade: pessoa.endereco?.cidade ?? "",
      bairro: pessoa.endereco?.bairro ?? "",
    });
  }, [pessoa]);

  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pessoas")
        .update({
          nome_social: form.nome_social.trim() || null,
          telefone: form.telefone.trim() || null,
          data_nascimento: form.data_nascimento || null,
          endereco: { ...(pessoa?.endereco ?? {}), cidade: form.cidade.trim(), bairro: form.bairro.trim() },
        })
        .eq("id", pessoa!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setOk(true);
      qc.invalidateQueries({ queryKey: ["eu"] });
    },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    setOk(false);
    salvar.mutate();
  }

  const campo = (id: keyof typeof form, rotulo: string, tipo = "text", auto?: string) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} type={tipo} autoComplete={auto} value={form[id]} onChange={(e) => setForm({ ...form, [id]: e.target.value })} />
    </div>
  );

  return (
    <section className="flex flex-col gap-4" aria-labelledby="dados">
      <h2 id="dados" className="text-xl font-semibold">Meus dados</h2>
      <form onSubmit={enviar} className="rounded-lg border bg-card p-5 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Nome</span>
            <span className="text-sm text-muted-foreground">{pessoa?.nome}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">E-mail</span>
            <span className="text-sm text-muted-foreground break-all">{pessoa?.email}</span>
          </div>
          {campo("nome_social", "Como prefere ser chamado")}
          {campo("telefone", "WhatsApp", "tel", "tel")}
          {campo("data_nascimento", "Data de nascimento", "date", "bday")}
          {campo("cidade", "Cidade", "text", "address-level2")}
          {campo("bairro", "Bairro")}
        </div>
        <p className="text-xs text-muted-foreground">Para corrigir nome, e-mail ou CPF, procure a secretaria.</p>
        {salvar.isError && <Aviso tipo="erro">Não foi possível salvar. Confira os campos e tente de novo.</Aviso>}
        {ok && <Aviso tipo="ok">Dados salvos.</Aviso>}
        <div>
          <Button type="submit" disabled={salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar dados"}</Button>
        </div>
      </form>
    </section>
  );
}

function MeusConsentimentos({ pessoaId }: { pessoaId: string }) {
  const qc = useQueryClient();
  const atuais = useQuery({
    queryKey: ["consentimentos", pessoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consentimentos")
        .select("id, finalidade, concedido, revogado_em, registrado_em")
        .eq("pessoa_id", pessoaId)
        .order("registrado_em", { ascending: false });
      if (error) throw error;
      const ultimo: Record<string, { id: string; concedido: boolean; revogado_em: string | null }> = {};
      for (const c of data ?? []) if (!ultimo[c.finalidade]) ultimo[c.finalidade] = c;
      return ultimo;
    },
  });

  const alterar = useMutation({
    mutationFn: async ({ finalidade, concedido }: { finalidade: string; concedido: boolean }) => {
      const atual = atuais.data?.[finalidade];
      if (atual && !atual.revogado_em) {
        const { error } = await supabase.from("consentimentos").update({ revogado_em: new Date().toISOString() }).eq("id", atual.id);
        if (error) throw error;
      }
      const { error } = await supabase
        .from("consentimentos")
        .insert({ pessoa_id: pessoaId, finalidade, concedido, registrado_por: pessoaId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consentimentos", pessoaId] }),
  });

  const ativo = (f: string) => {
    const c = atuais.data?.[f];
    return !!c && c.concedido && !c.revogado_em;
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="privacidade">
      <h2 id="privacidade" className="text-xl font-semibold">Privacidade</h2>
      <div className="rounded-lg border bg-card divide-y">
        {FINALIDADES.map((f) => (
          <div key={f.chave} className="flex items-center justify-between gap-4 p-4">
            <div className="flex flex-col gap-1 min-w-0">
              <Label htmlFor={`c-${f.chave}`}>{f.titulo}</Label>
              <span className="text-sm text-muted-foreground">{f.texto}</span>
            </div>
            <Switch
              id={`c-${f.chave}`}
              checked={ativo(f.chave)}
              disabled={atuais.isLoading || alterar.isPending}
              onCheckedChange={(v) => alterar.mutate({ finalidade: f.chave, concedido: v })}
            />
          </div>
        ))}
      </div>
      {alterar.isError && <Aviso tipo="erro">Não foi possível registrar sua escolha. Tente de novo.</Aviso>}
    </section>
  );
}

function MeusCursos() {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="cursos">
      <h2 id="cursos" className="text-xl font-semibold">Meus cursos</h2>
      <p className="text-sm text-muted-foreground">Seus cursos, aulas e presenças ficam na Área de Formação, com o mesmo login.</p>
      <a href="/formacao/dashboard" className="text-sm text-primary hover:underline w-fit">Abrir a Área de Formação</a>
    </section>
  );
}
