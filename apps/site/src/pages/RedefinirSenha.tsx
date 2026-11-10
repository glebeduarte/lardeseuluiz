import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoLSL from "@/assets/logo-lsl-new.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Página aberta pelo link do e-mail de recuperação: cria a senha nova e libera o acesso.
const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [erroLink, setErroLink] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const busca = new URLSearchParams(window.location.search);
    const falha = hash.get("error_description") || busca.get("error_description");
    if (falha) setErroLink(falha.replace(/\+/g, " "));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if ((evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") && sessao) setPronto(true);
    });
    // Links no formato ?code=... (PKCE)
    const code = busca.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setErroLink("Link inválido ou expirado.");
        else setPronto(true);
      });
    } else {
      supabase.auth.getSession().then(({ data }) => { if (data.session) setPronto(true); });
    }
    return () => subscription.unsubscribe();
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setLoading(false);
      return setErro(/different|same/i.test(error.message) ? "A nova senha precisa ser diferente da atual." : error.message);
    }
    await (supabase.schema("public") as any).rpc("concluir_troca_senha");
    setLoading(false);
    toast.success("Senha criada. Você já está dentro.");
    navigate("/app/perfil", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)), hsl(var(--secondary)))" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="mx-auto mb-4 w-12 h-12 rounded-xl object-contain" />
          <CardTitle className="font-['Playfair_Display'] text-2xl">Criar senha nova</CardTitle>
          <CardDescription>A senha vale para o site, a Formação e o Atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          {erroLink && !pronto ? (
            <div className="space-y-4 text-sm">
              <p className="text-destructive">{erroLink}</p>
              <p className="text-muted-foreground">Peça um link novo e use o mais recente que chegar no seu e-mail.</p>
              <Button asChild className="w-full"><Link to="/recuperar-senha">Pedir outro link</Link></Button>
            </div>
          ) : !pronto ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Conferindo o link do e-mail...</p>
              <p>Se esta tela não mudar, o link pode ter expirado. <Link to="/recuperar-senha" className="underline">Pedir outro link</Link>.</p>
            </div>
          ) : (
            <form onSubmit={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input id="senha" type={mostrar ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" placeholder="Pelo menos 8 caracteres" required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirma">Repita a nova senha</Label>
                <Input id="confirma" type={mostrar ? "text" : "password"} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" required />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar senha
              </label>
              {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Salvar senha e entrar"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedefinirSenha;
