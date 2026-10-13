import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { traduzErroAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso, ContaLayout } from "@/components/ContaLayout";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviando(false);
    if (error) return setErro(traduzErroAuth(error.message));
    setEnviado(true);
  }

  return (
    <ContaLayout titulo="Criar ou trocar senha" subtitulo="Serve também para quem tinha conta nos sistemas antigos.">
      {enviado ? (
        <Aviso tipo="ok">
          Se houver uma conta com {email}, você vai receber um link para definir a senha. Confira também a caixa de spam.
        </Aviso>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail da sua conta</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <Button type="submit" disabled={enviando || !email}>{enviando ? "Enviando…" : "Enviar link"}</Button>
        </form>
      )}
      <Link to="/entrar" className="text-center text-sm text-primary hover:underline">Voltar para Entrar</Link>
    </ContaLayout>
  );
}
