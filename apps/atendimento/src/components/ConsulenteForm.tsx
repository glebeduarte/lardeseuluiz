import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { maskPhone, maskDate, parseDateBRToISO, isValidDateBR } from "@/lib/masks";
import { toast } from "sonner";

export type ConsulenteForm = {
  nome: string;
  data_dialogo: string;
  data_nascimento: string;
  telefone: string;
  conhece_doutrina: boolean | null;
  evangelho_no_lar: boolean | null;
  pratica_religiosa: boolean;
  pratica_religiosa_descricao: string;
  motivo_saude_fisica: boolean;
  motivo_saude_fisica_especificacao: string;
  motivo_saude_fisica_diagnostico: boolean;
  motivo_saude_fisica_diagnostico_obs: string;
  motivo_saude_fisica_tratamento: boolean;
  motivo_saude_fisica_tratamento_obs: string;
  motivo_saude_mental: boolean;
  motivo_saude_mental_especificacao: string;
  motivo_saude_mental_diagnostico: boolean;
  motivo_saude_mental_diagnostico_obs: string;
  motivo_saude_mental_tratamento: boolean;
  motivo_saude_mental_tratamento_obs: string;
  motivo_saude_espiritual: boolean;
  motivo_saude_espiritual_especificacao: string;
  motivo_conflitos_familiares: boolean;
  uso_medicacoes: boolean;
  uso_medicacoes_especificacao: string;
  ideias_suicidas: boolean;
  ideacao_criminosa: boolean;
  uso_drogas: boolean;
  uso_alcool: boolean;
  uso_cigarro: boolean;
  conflito_genero: boolean;
  encaminhamento_passes: boolean;
  encaminhamento_passes_qtd: string;
  encaminhamento_maca: boolean;
  encaminhamento_maca_categoria: "" | "interna" | "externa";
  indicacao_saude: boolean;
  indicacao_saude_texto: string;
  indicacao_chakras: boolean;
  indicacao_harmonizacao: boolean;
  indicacao_mediunidade: boolean;
  indicacao_desobsessao_leve: boolean;
  indicacao_desobsessao: boolean;
  outras_informacoes: string;
  dialogador_id: string | null;
  trabalhador: boolean;
  tratamento_distancia: boolean;
  frequencia: "" | "semanal" | "quinzenal";
};

export const emptyConsulenteForm: ConsulenteForm = {
  nome: "", data_dialogo: "", data_nascimento: "", telefone: "",
  conhece_doutrina: null, evangelho_no_lar: null,
  pratica_religiosa: false, pratica_religiosa_descricao: "",
  motivo_saude_fisica: false, motivo_saude_fisica_especificacao: "",
  motivo_saude_fisica_diagnostico: false, motivo_saude_fisica_diagnostico_obs: "",
  motivo_saude_fisica_tratamento: false, motivo_saude_fisica_tratamento_obs: "",
  motivo_saude_mental: false, motivo_saude_mental_especificacao: "",
  motivo_saude_mental_diagnostico: false, motivo_saude_mental_diagnostico_obs: "",
  motivo_saude_mental_tratamento: false, motivo_saude_mental_tratamento_obs: "",
  motivo_saude_espiritual: false, motivo_saude_espiritual_especificacao: "",
  motivo_conflitos_familiares: false,
  uso_medicacoes: false, uso_medicacoes_especificacao: "",
  ideias_suicidas: false, ideacao_criminosa: false,
  uso_drogas: false, uso_alcool: false,
  uso_cigarro: false, conflito_genero: false,
  encaminhamento_passes: false, encaminhamento_passes_qtd: "",
  encaminhamento_maca: false, encaminhamento_maca_categoria: "",
  indicacao_saude: false, indicacao_saude_texto: "",
  indicacao_chakras: false, indicacao_harmonizacao: false,
  indicacao_mediunidade: false, indicacao_desobsessao_leve: false,
  indicacao_desobsessao: false, outras_informacoes: "",
  dialogador_id: null,
  trabalhador: false,
  tratamento_distancia: false,
  frequencia: "",
};


export function ConsulenteFormFields({
  initial,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: {
  initial: ConsulenteForm;
  busy: boolean;
  onSubmit: (f: ConsulenteForm) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [f, setF] = useState<ConsulenteForm>(initial);
  const set = <K extends keyof ConsulenteForm>(k: K, v: ConsulenteForm[K]) =>
    setF((s) => ({ ...s, [k]: v }));

  const { data: dialogadores } = useQuery({
    queryKey: ["dialogadores-ativos"],
    queryFn: async () => {
      const { data: roles, error: rerr } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["dialogador", "admin"]);
      if (rerr) throw rerr;
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, como_chamar, ativo")
        .in("id", ids)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const out = { ...f };
        if (f.data_nascimento.trim()) {
          if (!isValidDateBR(f.data_nascimento)) {
            toast.error("Data de nascimento inválida. Use o formato dd/mm/aaaa com uma data real.");
            return;
          }
          out.data_nascimento = parseDateBRToISO(f.data_nascimento)!;
        } else {
          out.data_nascimento = "";
        }
        if (f.data_dialogo.trim()) {
          if (!isValidDateBR(f.data_dialogo)) {
            toast.error("Data do diálogo inválida. Use o formato dd/mm/aaaa com uma data real.");
            return;
          }
          out.data_dialogo = parseDateBRToISO(f.data_dialogo)!;
        } else {
          out.data_dialogo = "";
        }
        const digitosTel = f.telefone.replace(/\D/g, "");
        if (f.telefone.trim() && (digitosTel.length < 10 || digitosTel.length > 11)) {
          toast.error("Telefone inválido. Informe DDD + número (10 ou 11 dígitos).");
          return;
        }
        if (!f.frequencia) {
          toast.error("Informe a frequência do atendimento: semanal ou quinzenal.");
          return;
        }
        onSubmit(out);
      }}
      className="space-y-4"
    >
      <Card>
        <CardHeader><CardTitle>Dados pessoais</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome completo *">
            <Input id="consulente-nome" required value={f.nome} onChange={(e) => set("nome", e.target.value)} />
          </Field>
          <Field label="Data do diálogo *">
            <Input
              required
              value={f.data_dialogo}
              onChange={(e) => set("data_dialogo", maskDate(e.target.value))}
              placeholder="dd/mm/aaaa"
              inputMode="numeric"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Dia em que o diálogo realmente aconteceu — pode ser anterior a hoje.
            </p>
          </Field>
          <Field label="Data de nascimento">
            <Input
              value={f.data_nascimento}
              onChange={(e) => set("data_nascimento", maskDate(e.target.value))}
              placeholder="dd/mm/aaaa"
              inputMode="numeric"
              maxLength={10}
            />
          </Field>
          <Field label="Telefone">
            <Input value={f.telefone} onChange={(e) => set("telefone", maskPhone(e.target.value))} placeholder="(11) 90000-0000" inputMode="numeric" />
          </Field>
          <div className="sm:col-span-2">
            <DuplicadosAviso nome={f.nome} telefone={f.telefone} />
          </div>
          <div className="space-y-2">
            <Label>Conhece a Doutrina Espírita?</Label>
            <div className="flex items-center gap-2">
              <Switch checked={!!f.conhece_doutrina} onCheckedChange={(v) => set("conhece_doutrina", v)} />
              <span className="text-sm text-muted-foreground">{f.conhece_doutrina ? "Sim" : "Não"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pratica o Evangelho no Lar?</Label>
            <div className="flex items-center gap-2">
              <Switch checked={!!f.evangelho_no_lar} onCheckedChange={(v) => set("evangelho_no_lar", v)} />
              <span className="text-sm text-muted-foreground">{f.evangelho_no_lar ? "Sim" : "Não"}</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Prática religiosa?</Label>
            <div className="flex items-center gap-2">
              <Switch checked={f.pratica_religiosa} onCheckedChange={(v) => set("pratica_religiosa", v)} />
              <span className="text-sm text-muted-foreground">{f.pratica_religiosa ? "Sim" : "Não"}</span>
            </div>
            {f.pratica_religiosa && (
              <Input
                placeholder="Qual prática religiosa?"
                value={f.pratica_religiosa_descricao}
                onChange={(e) => set("pratica_religiosa_descricao", e.target.value)}
              />
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Dialogador responsável</Label>
            <Select
              value={f.dialogador_id ?? ""}
              onValueChange={(v) => set("dialogador_id", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um dialogador" />
              </SelectTrigger>
              <SelectContent>
                {(dialogadores ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.como_chamar || d.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Por padrão fica quem está cadastrando; você pode designar outro dialogador.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Trabalhador da casa?</Label>
            <div className="flex items-center gap-2">
              <Switch checked={f.trabalhador} onCheckedChange={(v) => set("trabalhador", v)} />
              <span className="text-sm text-muted-foreground">{f.trabalhador ? "Sim" : "Não"}</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Tratamento à distância?</Label>
            <div className="flex items-center gap-2">
              <Switch checked={f.tratamento_distancia} onCheckedChange={(v) => set("tratamento_distancia", v)} />
              <span className="text-sm text-muted-foreground">{f.tratamento_distancia ? "Sim" : "Não"}</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Frequência do atendimento *</Label>
            <Select
              value={f.frequencia}
              onValueChange={(v) => set("frequencia", v as "semanal" | "quinzenal")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="quinzenal">Quinzenal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              No quinzenal o consulente comparece a cada duas datas de atendimento — nas datas
              intermediárias ele não é contado como falta.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>

        <CardHeader><CardTitle>Motivos do atendimento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Check label="Saúde física" checked={f.motivo_saude_fisica} onChange={(v) => set("motivo_saude_fisica", v)} />
          {f.motivo_saude_fisica && (
            <div className="ml-6 space-y-2 border-l-2 pl-3">
              <Input required placeholder="Observação *" value={f.motivo_saude_fisica_especificacao} onChange={(e) => set("motivo_saude_fisica_especificacao", e.target.value)} />
              <SimNao
                label="Tem diagnóstico médico?"
                value={f.motivo_saude_fisica_diagnostico}
                onChange={(v) => set("motivo_saude_fisica_diagnostico", v)}
              />
              {f.motivo_saude_fisica_diagnostico && (
                <Input required placeholder="Qual diagnóstico? *" value={f.motivo_saude_fisica_diagnostico_obs} onChange={(e) => set("motivo_saude_fisica_diagnostico_obs", e.target.value)} />
              )}
              <SimNao
                label="Está em tratamento?"
                value={f.motivo_saude_fisica_tratamento}
                onChange={(v) => set("motivo_saude_fisica_tratamento", v)}
              />
              {f.motivo_saude_fisica_tratamento && (
                <Input required placeholder="Qual tratamento? *" value={f.motivo_saude_fisica_tratamento_obs} onChange={(e) => set("motivo_saude_fisica_tratamento_obs", e.target.value)} />
              )}
            </div>
          )}
          <Check label="Saúde mental" checked={f.motivo_saude_mental} onChange={(v) => set("motivo_saude_mental", v)} />
          {f.motivo_saude_mental && (
            <div className="ml-6 space-y-2 border-l-2 pl-3">
              <Input required placeholder="Observação *" value={f.motivo_saude_mental_especificacao} onChange={(e) => set("motivo_saude_mental_especificacao", e.target.value)} />
              <SimNao
                label="Tem diagnóstico médico?"
                value={f.motivo_saude_mental_diagnostico}
                onChange={(v) => set("motivo_saude_mental_diagnostico", v)}
              />
              {f.motivo_saude_mental_diagnostico && (
                <Input required placeholder="Qual diagnóstico? *" value={f.motivo_saude_mental_diagnostico_obs} onChange={(e) => set("motivo_saude_mental_diagnostico_obs", e.target.value)} />
              )}
              <SimNao
                label="Está em tratamento?"
                value={f.motivo_saude_mental_tratamento}
                onChange={(v) => set("motivo_saude_mental_tratamento", v)}
              />
              {f.motivo_saude_mental_tratamento && (
                <Input required placeholder="Qual tratamento? *" value={f.motivo_saude_mental_tratamento_obs} onChange={(e) => set("motivo_saude_mental_tratamento_obs", e.target.value)} />
              )}
            </div>
          )}
          <Check label="Saúde espiritual" checked={f.motivo_saude_espiritual} onChange={(v) => set("motivo_saude_espiritual", v)} />
          {f.motivo_saude_espiritual && (
            <Input required placeholder="Observação *" value={f.motivo_saude_espiritual_especificacao} onChange={(e) => set("motivo_saude_espiritual_especificacao", e.target.value)} />
          )}
          <Check label="Conflitos familiares/pessoais" checked={f.motivo_conflitos_familiares} onChange={(v) => set("motivo_conflitos_familiares", v)} />

        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle>Dados de atenção</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Check label="Uso de drogas ilícitas" checked={f.uso_drogas} onChange={(v) => set("uso_drogas", v)} />
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Check label="⚠ Ideias suicidas" checked={f.ideias_suicidas} onChange={(v) => set("ideias_suicidas", v)} />
            <p className="text-xs text-destructive mt-1">Campo sensível — gera alerta na ficha.</p>
          </div>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <Check label="⚠ Ideação criminosa" checked={f.ideacao_criminosa} onChange={(v) => set("ideacao_criminosa", v)} />
            <p className="text-xs text-destructive mt-1">Campo sensível — gera alerta na ficha.</p>
          </div>
          <Check label="Uso de bebidas alcoólicas" checked={f.uso_alcool} onChange={(v) => set("uso_alcool", v)} />
          <Check label="Uso de cigarro / eletrônico" checked={f.uso_cigarro} onChange={(v) => set("uso_cigarro", v)} />
          <Check label="Conflito de gênero" checked={f.conflito_genero} onChange={(v) => set("conflito_genero", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Encaminhamento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label>Encaminhar para *</Label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="encaminhamento"
                checked={f.encaminhamento_passes && !f.encaminhamento_maca}
                onChange={() => setF((s) => ({ ...s, encaminhamento_passes: true, encaminhamento_maca: false, encaminhamento_maca_categoria: "" }))}
              />
              <span>Passe</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="encaminhamento"
                checked={f.encaminhamento_maca && f.encaminhamento_maca_categoria === "interna"}
                onChange={() => setF((s) => ({ ...s, encaminhamento_passes: false, encaminhamento_passes_qtd: "", encaminhamento_maca: true, encaminhamento_maca_categoria: "interna" }))}
              />
              <span>Maca Interna (saúde)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="encaminhamento"
                checked={f.encaminhamento_maca && f.encaminhamento_maca_categoria === "externa"}
                onChange={() => setF((s) => ({ ...s, encaminhamento_passes: false, encaminhamento_passes_qtd: "", encaminhamento_maca: true, encaminhamento_maca_categoria: "externa" }))}
              />
              <span>Maca Externa</span>
            </label>
          </div>
          {f.encaminhamento_passes && !f.encaminhamento_maca && (
            <div className="ml-6 space-y-2 border-l-2 pl-3">
              <Label>Número de passes *</Label>
              <Input
                type="number"
                min={1}
                required
                className="w-32"
                value={f.encaminhamento_passes_qtd}
                onChange={(e) => set("encaminhamento_passes_qtd", e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Outras informações</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={4} value={f.outras_informacoes} onChange={(e) => set("outras_informacoes", e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] md:bottom-2 bg-background/95 p-2 rounded backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} className="border-2">
          Cancelar
        </Button>
        <Button type="submit" disabled={busy} className="shadow-sm hover:shadow-md transition-shadow bg-brand-blue text-white hover:bg-brand-blue-dark">
          {busy ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span>{label}</span>
    </label>
  );
}

function SimNao({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
      <span className="text-muted-foreground">{value ? "Sim" : "Não"}</span>
    </div>
  );
}

function DuplicadosAviso({ nome, telefone }: { nome: string; telefone: string }) {
  const termoNome = nome.trim();
  const digitos = telefone.replace(/\D/g, "");
  const ativo = termoNome.length >= 4 || digitos.length >= 8;

  const { data } = useQuery({
    queryKey: ["consulentes-duplicados", termoNome.toLowerCase(), digitos],
    enabled: ativo,
    queryFn: async () => {
      const filtros: string[] = [];
      if (termoNome.length >= 4) filtros.push(`nome.ilike.%${termoNome}%`);
      if (digitos.length >= 8) filtros.push(`telefone.ilike.%${digitos.slice(-8)}%`);
      const { data, error } = await supabase
        .from("consulentes")
        .select("id, nome, telefone")
        .or(filtros.join(","))
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!ativo || !data || data.length === 0) return null;

  return (
    <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-3 space-y-2">
      <p className="text-sm font-medium text-amber-900">
        Já existe cadastro parecido — confirme antes de criar um novo.
      </p>
      <ul className="space-y-1">
        {data.map((c) => (
          <li key={c.id} className="text-sm flex items-center justify-between gap-2">
            <span>
              {c.nome}
              {c.telefone ? ` · ${c.telefone}` : ""}
            </span>
            <a
              href={`/consulentes/${c.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-blue underline underline-offset-2 shrink-0"
            >
              Abrir cadastro
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
