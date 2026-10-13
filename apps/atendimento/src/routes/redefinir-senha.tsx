import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/redefinir-senha")({
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirma, setMostrarConfirma] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erroLink, setErroLink] = useState<string | null>(null);

  useEffect(() => {
    // O Supabase processa o token do link de recuperação e dispara PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPronto(true);
      }
    });

    // Verifica se já existe sessão (link já processado)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });

    // Detecta erro no hash da URL (link expirado/inválido)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("error")) {
        const params = new URLSearchParams(hash.replace("#", ""));
        setErroLink(params.get("error_description")?.replace(/\+/g, " ") ?? "Link inválido ou expirado.");
      }
    }

    return () => subscription.unsubscribe();
  }, []);

  const regras = [
    { label: "Mínimo de 8 caracteres", ok: senha.length >= 8 },
    { label: "Diferente da senha provisória", ok: senha !== "LarSeuLuiz@2026" && senha.length > 0 },
    { label: "Senhas coincidem", ok: senha === confirma && senha.length > 0 },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres");
    if (senha !== confirma) return toast.error("As senhas não coincidem");
    if (senha === "LarSeuLuiz@2026") return toast.error("Escolha uma senha diferente da provisória");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      // Garante que must_change_password fique false
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", userData.user.id);
      }
      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao redefinir senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Defina sua nova senha pessoal.</CardDescription>
        </CardHeader>
        <CardContent>
          {erroLink ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                {erroLink}
              </div>
              <Link to="/recuperar-senha" className="block text-center text-sm text-primary underline">
                Solicitar novo link
              </Link>
            </div>
          ) : !pronto ? (
            <p className="text-sm text-muted-foreground text-center">Validando link de recuperação...</p>
          ) : (
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
                        <Check size={16} className="text-green-500 shrink-0" />
                      ) : (
                        <X size={16} className="text-red-500 shrink-0" />
                      )}
                      <span className={regra.ok ? "text-green-700" : "text-muted-foreground"}>
                        {regra.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Salvando..." : "Redefinir senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
