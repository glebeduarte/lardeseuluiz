import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import logoLSL from "@/assets/logo-lsl.png";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}redefinir-senha`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setEnviado(true);
    toast.success("E-mail de recuperação enviado!");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 h-20 w-20 flex items-center justify-center">
            <img src={logoLSL} alt="Lar de Seu Luiz" className="h-20 w-20 object-contain" />
          </div>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu e-mail para receber as instruções de redefinição.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enviado ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                Enviamos um link de redefinição para <strong>{email}</strong>. Verifique sua caixa de entrada (e o spam).
              </div>
              <Link to="/login" className="block text-center text-sm text-primary underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                <Link to="/login" className="text-primary underline">Voltar para o login</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
