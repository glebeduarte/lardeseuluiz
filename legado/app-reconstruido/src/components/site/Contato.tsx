import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso } from "@/components/ContaLayout";

export function FormContato() {
  const [f, setF] = useState({ nome: "", email: "", telefone: "", assunto: "", mensagem: "" });
  const [estado, setEstado] = useState<"livre" | "enviando" | "ok" | "erro">("livre");
  const [erro, setErro] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (f.nome.trim().length < 2) return falhar("Informe seu nome.");
    if (!f.email.trim() && !f.telefone.trim()) return falhar("Deixe um e-mail ou WhatsApp para resposta.");
    if (f.mensagem.trim().length < 5) return falhar("Escreva sua mensagem.");
    setEstado("enviando");
    const { error } = await supabase.from("mensagens_contato").insert({
      nome: f.nome.trim(),
      email: f.email.trim() || null,
      telefone: f.telefone.trim() || null,
      assunto: f.assunto.trim() || null,
      mensagem: f.mensagem.trim(),
    });
    if (error) return falhar("Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp.");
    setEstado("ok");
  }
  function falhar(m: string) {
    setErro(m);
    setEstado("erro");
  }

  if (estado === "ok") return <Aviso tipo="ok">Mensagem enviada. A Secretaria de Comunicação responde em breve.</Aviso>;

  const campo = (id: keyof typeof f, rotulo: string, tipo = "text", auto?: string) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`ct-${id}`}>{rotulo}</Label>
      <Input id={`ct-${id}`} type={tipo} autoComplete={auto} value={f[id]} onChange={(e) => setF({ ...f, [id]: e.target.value })} />
    </div>
  );

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {campo("nome", "Nome", "text", "name")}
        {campo("assunto", "Assunto")}
        {campo("email", "E-mail", "email", "email")}
        {campo("telefone", "WhatsApp", "tel", "tel")}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-mensagem">Mensagem</Label>
        <textarea
          id="ct-mensagem"
          rows={4}
          maxLength={4000}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={f.mensagem}
          onChange={(e) => setF({ ...f, mensagem: e.target.value })}
        />
      </div>
      {estado === "erro" && <Aviso tipo="erro">{erro}</Aviso>}
      <div>
        <Button type="submit" disabled={estado === "enviando"}>{estado === "enviando" ? "Enviando…" : "Enviar mensagem"}</Button>
      </div>
    </form>
  );
}
