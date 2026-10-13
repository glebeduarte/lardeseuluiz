import { createFileRoute, useNavigate, Navigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import logoLSL from "@/assets/logo-lsl.png";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return toast.error(error.message); }
    // Verifica se precisa trocar senha
    if (data.user) {
      const { data: prof } = await supabase.from("profiles").select("must_change_password").eq("id", data.user.id).maybeSingle();
      setBusy(false);
      if (prof?.must_change_password) {
        toast.info("Defina sua nova senha");
        return navigate({ to: "/trocar-senha" });
      }
    } else {
      setBusy(false);
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-20 w-20 flex items-center justify-center">
            <img src={logoLSL} alt="Lar de Seu Luiz" className="h-20 w-20 object-contain" />
          </div>
          <CardTitle>Centro Espiritualista Lar de Seu Luiz</CardTitle>
          <CardDescription>Sistema de Controle de Macas</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={signIn} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd">Senha</Label>
              <div className="relative">
                <Input
                  id="pwd"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-sm text-center">
              <Link to="/recuperar-senha" className="text-primary underline">
                Esqueci minha senha
              </Link>
            </p>

            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
              <p className="text-sm text-amber-800">
                Use o mesmo e-mail e senha da plataforma do Lar de Seu Luiz (site, Formação e Atendimento usam uma conta só).
                Primeiro acesso? Use "Esqueci minha senha" com o e-mail que você já usava aqui.
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Ainda não tem acesso?{" "}
              <Link to="/cadastro" className="text-primary underline">Solicitar cadastro</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
