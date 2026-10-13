import { useState, type FormEvent } from "react";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/ContaLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

const AREAS = ["Acolhimento", "Passes e macas", "Ações sociais", "Evangelização", "Comunicação", "Cultura e Artes", "Infraestrutura", "Ainda não sei"];
const ETAPAS = [
  ["Conversa no Acolhimento", "Para conhecer você, sua disponibilidade e suas áreas de interesse."],
  ["Curso de preparação", "O Trabalho Voluntário na Casa Espírita, aos sábados pela manhã, a cada dois meses."],
  ["Estágio de 8 semanas", "Rodízio acompanhado por um tutor, conhecendo na prática o trabalho da casa."],
  ["Integração oficial", "Na roda de preparação antes de uma reunião pública."],
];

export default function Voluntariado() {
  const { pessoa } = useAuth();
  const [f, setF] = useState({ nome: "", email: "", telefone: "", disponibilidade: "", mensagem: "" });
  const [areas, setAreas] = useState<string[]>([]);
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [erro, setErro] = useState("");

  const nome = pessoa ? pessoa.nome : f.nome;
  const email = pessoa ? pessoa.email ?? "" : f.email;
  const telefone = pessoa ? pessoa.telefone ?? f.telefone : f.telefone;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nome.trim().length < 2) return falhar("Informe seu nome.");
    if (!email.trim() && !telefone.trim()) return falhar("Deixe um e-mail ou WhatsApp para o Acolhimento falar com você.");
    setEstado("enviando");
    const { error } = await supabase.from("interesses_voluntariado").insert({
      pessoa_id: pessoa?.id ?? null,
      nome: nome.trim(),
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      areas_interesse: areas,
      disponibilidade: f.disponibilidade.trim() || null,
      mensagem: f.mensagem.trim() || null,
    });
    if (error) return falhar("Não foi possível enviar agora. Tente de novo em instantes.");
    setEstado("ok");
  }
  function falhar(m: string) {
    setErro(m);
    setEstado("erro");
  }

  return (
    <SiteLayout>
      <Secao eyebrow="Chamamento" titulo="Quero ser voluntário"
        intro="Servir na casa é um compromisso de amor. O caminho tem quatro etapas, para que você chegue preparado e acolhido.">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPAS.map(([t, d], i) => (
            <li key={t} className="rounded-lg border bg-card p-5 flex flex-col gap-2">
              <span className="font-display text-3xl text-primary tabular-nums">{i + 1}</span>
              <h2 className="font-semibold">{t}</h2>
              <p className="text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Secao>
      <Secao titulo="Manifeste seu interesse" tom="card" intro="O Acolhimento entra em contato para marcar a primeira conversa.">
        {estado === "ok" ? (
          <Aviso tipo="ok">Recebemos seu interesse. O Acolhimento vai falar com você em breve.</Aviso>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-5 max-w-2xl" noValidate>
            {!pessoa && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2 sm:col-span-3">
                  <Label htmlFor="v-nome">Nome completo</Label>
                  <Input id="v-nome" autoComplete="name" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="v-email">E-mail</Label>
                  <Input id="v-email" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="v-tel">WhatsApp</Label>
                  <Input id="v-tel" type="tel" autoComplete="tel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
                </div>
              </div>
            )}
            {pessoa && <p className="text-sm text-muted-foreground">Enviando como {pessoa.nome}.</p>}
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium mb-2">Áreas que despertam seu interesse</legend>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => {
                  const marcado = areas.includes(a);
                  return (
                    <label key={a} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${marcado ? "border-secondary bg-secondary/10 text-secondary" : "bg-background"}`}>
                      <input type="checkbox" className="sr-only" checked={marcado} onChange={() => setAreas(marcado ? areas.filter((x) => x !== a) : [...areas, a])} />
                      {a}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <Label htmlFor="v-disp">Dias e horários em que você pode servir</Label>
              <Input id="v-disp" placeholder="Ex.: terças à tarde e sábados" value={f.disponibilidade} onChange={(e) => setF({ ...f, disponibilidade: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="v-msg">Conte um pouco sobre você (opcional)</Label>
              <textarea id="v-msg" rows={4} maxLength={2000}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} />
            </div>
            {estado === "erro" && <Aviso tipo="erro">{erro}</Aviso>}
            <div><Button type="submit" variant="secondary" disabled={estado === "enviando"}>{estado === "enviando" ? "Enviando…" : "Enviar interesse"}</Button></div>
          </form>
        )}
      </Secao>
    </SiteLayout>
  );
}
