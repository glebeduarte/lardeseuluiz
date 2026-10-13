import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { traduzErroAuth, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso, ContaLayout } from "@/components/ContaLayout";
import { Carregando } from "@/components/RequireAuth";

export default function RedefinirSenha() {
  const { session, carregando } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <Carregando />;

  if (!session) {
    return (
      <ContaLayout titulo="Link expirado">
        <p className="text-center text-muted-foreground">Este link não vale mais. Peça um novo para definir sua senha.</p>
        <Button asChild><Link to="/recuperar-senha">Pedir novo link</Link></Button>
      </ContaLayout>
    );
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro(traduzErroAuth(error.message));
    navigate("/minha-area", { replace: true });
  }

  return (
    <ContaLayout titulo="Definir nova senha">
      <form onSubmit={salvar} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="senha">Nova senha</Label>
          <Input id="senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirma">Repita a senha</Label>
          <Input id="confirma" type="password" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Button type="submit" disabled={enviando}>{enviando ? "Salvando…" : "Salvar senha"}</Button>
      </form>
    </ContaLayout>
  );
}
