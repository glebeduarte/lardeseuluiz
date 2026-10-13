import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";
import { useServerFn } from "@/lib/server-fn";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import logoLSL from "@/assets/logo-lsl.png";
import { concluirTrocaSenha } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/trocar-senha")({
  component: TrocarSenhaPage,
});

function TrocarSenhaPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const concluir = useServerFn(concluirTrocaSenha);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirma, setMostrarConfirma] = useState(false);
  const [busy, setBusy] = useState(false);

  const regras = [
    { label: "Mínimo de 8 caracteres", ok: senha.length >= 8 },
    { label: "Diferente da senha provisória", ok: senha !== "LarSeuLuiz@2026" && senha.length > 0 },
    { label: "Senhas coincidem", ok: senha === confirma && senha.length > 0 },
  ];

  if (!loading && !user) return <Navigate to="/login" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres");
    if (senha !== confirma) return toast.error("As senhas não coincidem");
    if (senha === "LarSeuLuiz@2026") return toast.error("Escolha uma senha diferente da provisória");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      await concluir();
      toast.success("Senha atualizada!");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao trocar senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md rounded-2xl border bg-card shadow-sm">
        <CardHeader className="text-center">
          <img src={logoLSL} alt="Lar de Seu Luiz" className="mx-auto mb-3 h-14 w-14 object-contain rounded-xl" />
          <CardTitle className="font-['Playfair_Display'] text-2xl">Trocar senha</CardTitle>
          <CardDescription>
            Este é seu primeiro acesso. Defina uma nova senha pessoal para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s1">Nova senha</Label>
              <div className="relative">
                <Input
                  id="s1"
                  type={mostrarSenha ? "text" : "password"}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s2">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  id="s2"
                  type={mostrarConfirma ? "text" : "password"}
                  required
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirma((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarConfirma ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck size={16} className="text-primary" />
                <span>Requisitos da senha</span>
              </div>
              <ul className="space-y-1.5">
                {regras.map((regra) => (
                  <li key={regra.label} className="flex items-center gap-2 text-sm">
                    {regra.ok ? (
                      <Check size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <X size={16} className="text-destructive shrink-0" />
                    )}
                    <span className={regra.ok ? "text-emerald-800" : "text-muted-foreground"}>
                      {regra.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Salvando..." : "Salvar nova senha"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => signOut()}>
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
