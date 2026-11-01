import { useState } from "react";
import { Link } from "react-router-dom";
import logoLSL from "@/assets/logo-lsl-new.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Esqueci minha senha: envia por e-mail um link para criar uma senha nova (vale para todas as áreas).
const RecuperarSenha = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    // Por segurança, a mensagem é a mesma exista ou não a conta; só erros de envio aparecem.
    if (error && !/not found|user/i.test(error.message)) return setErro(/rate|seconds/i.test(error.message) ? "Aguarde um minuto antes de pedir outro link." : error.message);
    setEnviado(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)), hsl(var(--secondary)))" }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="mx-auto mb-4 w-12 h-12 rounded-xl object-contain" />
          <CardTitle className="font-['Playfair_Display'] text-2xl">Recuperar senha</CardTitle>
          <CardDescription>
            {enviado ? "Confira a sua caixa de entrada" : "Informe o e-mail da sua conta e enviaremos um link para criar uma senha nova"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>Se existir uma conta com <b className="text-foreground">{email}</b>, você vai receber um e-mail com o link para criar uma senha nova. Veja também a pasta de spam.</p>
              <p>O link vale por pouco tempo. Se ele expirar, peça outro aqui.</p>
              <Button asChild className="w-full"><Link to="/login">Voltar para o login</Link></Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
              </div>
              {erro && <p className="text-sm text-destructive" role="alert">{erro}</p>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary hover:underline underline-offset-4">Voltar para o login</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecuperarSenha;
