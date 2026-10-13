import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { traduzErroAuth, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso, ContaLayout } from "@/components/ContaLayout";

export default function Entrar() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const voltar = params.get("voltar") || "/minha-area";

  if (session) return <Navigate to={voltar} replace />;

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) return setErro(traduzErroAuth(error.message));
    navigate(voltar, { replace: true });
  }

  return (
    <ContaLayout titulo="Entrar" subtitulo="Uma conta para cursos, inscrições e áreas de trabalho da casa.">
      {params.get("migrado") && (
        <Aviso tipo="ok">
          A plataforma mudou. Se você já tinha cadastro em algum sistema da casa, clique em Criar conta e use o mesmo e-mail: seus dados serão reconhecidos.
        </Aviso>
      )}
      <form onSubmit={entrar} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha">Senha</Label>
            <Link to="/recuperar-senha" className="text-sm text-primary hover:underline">Esqueci minha senha</Link>
          </div>
          <Input id="senha" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Button type="submit" disabled={enviando || !email || !senha}>{enviando ? "Entrando…" : "Entrar"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta? <Link to="/cadastro" className="text-primary hover:underline">Criar conta</Link>
      </p>
    </ContaLayout>
  );
}
