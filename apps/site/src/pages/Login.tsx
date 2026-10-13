import { useState } from "react";
import logoLSL from "@/assets/logo-lsl-new.png";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar.");
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        // Redirect based on role
        const userId = data.user?.id;
        if (userId) {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
          const roleList = roles?.map(r => r.role) || [];
          if (roleList.includes("admin") || roleList.includes("gestor")) {
            navigate("/app");
          } else {
            navigate("/meu-painel");
          }
        } else {
          navigate("/app");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)), hsl(var(--secondary)))" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="mx-auto mb-4 w-12 h-12 rounded-xl object-contain" />
          <CardTitle className="font-['Playfair_Display'] text-2xl">Lar de Seu Luiz</CardTitle>
          <CardDescription>{isSignUp ? "Crie sua conta" : "Área Administrativa"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processando..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button type="button" className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
