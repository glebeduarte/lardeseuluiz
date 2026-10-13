import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Simulacao } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tipo = "gestor" | "voluntario" | "funcao" | "frequentador" | "pessoa";

const TIPOS: { valor: Tipo; rotulo: string; ajuda: string }[] = [
  { valor: "gestor", rotulo: "Gestor", ajuda: "Diretoria e coordenação geral, sem ser administrador." },
  { valor: "funcao", rotulo: "Voluntário com uma função", ajuda: "Vê os módulos liberados pela função escolhida." },
  { valor: "voluntario", rotulo: "Voluntário sem função", ajuda: "Trabalhador da casa ainda sem função atribuída." },
  { valor: "frequentador", rotulo: "Frequentador ou associado", ajuda: "Conta comum: perfil, painel do associado e cursos." },
  { valor: "pessoa", rotulo: "Uma pessoa específica", ajuda: "Usa os papéis, funções e o perfil dessa pessoa." },
];

/** Botão e janela do "Visualizar como", disponíveis só para administradores. */
export default function VisualizarComo({ compacto = false, className = "" }: { compacto?: boolean; className?: string }) {
  const { isRealAdmin, simulacao, setSimulacao } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<Tipo>("frequentador");
  const [funcaoId, setFuncaoId] = useState("");
  const [busca, setBusca] = useState("");
  const [pessoaId, setPessoaId] = useState("");
  const [aplicando, setAplicando] = useState(false);

  const funcoes = useQuery({
    queryKey: ["simulacao-funcoes"],
    enabled: aberto && isRealAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("functions").select("id, name, function_permissions ( permission )").eq("is_active", true).order("name");
      return (data ?? []) as unknown as { id: string; name: string; function_permissions: { permission: string }[] }[];
    },
  });
  const pessoas = useQuery({
    queryKey: ["simulacao-pessoas"],
    enabled: aberto && isRealAdmin && tipo === "pessoa",
    queryFn: async () => {
      const { data } = await supabase.from("people").select("id, full_name, email, user_id").order("full_name").limit(1000);
      return data ?? [];
    },
  });
  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (pessoas.data ?? []).filter((p) => !t || `${p.full_name} ${p.email ?? ""}`.toLowerCase().includes(t)).slice(0, 50);
  }, [pessoas.data, busca]);

  if (!isRealAdmin) return null;

  const aplicar = async () => {
    setAplicando(true);
    let s: Simulacao | null = null;
    if (tipo === "gestor") s = { rotulo: "Gestor", roles: ["gestor"], permissions: [] };
    if (tipo === "voluntario") s = { rotulo: "Voluntário sem função", roles: ["trabalhador"], permissions: [] };
    if (tipo === "frequentador") s = { rotulo: "Frequentador ou associado", roles: [], permissions: [] };
    if (tipo === "funcao") {
      const f = funcoes.data?.find((x) => x.id === funcaoId);
      if (f) s = { rotulo: `Voluntário · ${f.name}`, roles: ["trabalhador"], permissions: f.function_permissions.map((p) => p.permission) };
    }
    if (tipo === "pessoa") {
      const p = pessoas.data?.find((x) => x.id === pessoaId);
      if (p) {
        const [{ data: papeis }, { data: perms }] = await Promise.all([
          p.user_id ? supabase.from("user_roles").select("role").eq("user_id", p.user_id) : Promise.resolve({ data: [] as { role: string }[] }),
          supabase.rpc("get_person_permissions", { _person_id: p.id }),
        ]);
        s = {
          rotulo: p.full_name,
          roles: (papeis ?? []).map((r) => r.role as string),
          permissions: ((perms as unknown[]) ?? []).map((r) => (typeof r === "string" ? r : (r as { get_person_permissions: string }).get_person_permissions)),
          userId: p.user_id, personId: p.id,
        };
      }
    }
    setAplicando(false);
    if (s) { setSimulacao(s); setAberto(false); }
  };

  return (
    <>
      <Button variant="ghost" size="sm" className={className} onClick={() => setAberto(true)} title="Visualizar como outro papel">
        <Eye className="w-4 h-4 shrink-0" />
        {!compacto && <span>{simulacao ? "Trocar visualização" : "Visualizar como…"}</span>}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Visualizar como</DialogTitle>
            <DialogDescription>
              Veja o site e a área administrativa como outra pessoa veria. Os dados continuam protegidos pelas suas permissões reais, e as alterações ficam bloqueadas durante a simulação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Papel</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{TIPOS.find((t) => t.valor === tipo)?.ajuda}</p>
            </div>
            {tipo === "funcao" && (
              <div className="grid gap-2">
                <Label>Função</Label>
                <Select value={funcaoId} onValueChange={setFuncaoId}>
                  <SelectTrigger><SelectValue placeholder="Escolha a função" /></SelectTrigger>
                  <SelectContent>
                    {(funcoes.data ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tipo === "pessoa" && (
              <div className="grid gap-2">
                <Label>Pessoa</Label>
                <Input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {filtradas.map((p) => (
                    <button key={p.id} type="button" onClick={() => setPessoaId(p.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${pessoaId === p.id ? "bg-muted font-medium" : ""}`}>
                      {p.full_name}{p.email && <span className="block text-xs text-muted-foreground">{p.email}{!p.user_id && " · sem conta"}</span>}
                    </button>
                  ))}
                  {pessoas.data && filtradas.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Ninguém encontrado.</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {simulacao && <Button variant="outline" onClick={() => { setSimulacao(null); setAberto(false); }}>Voltar a ser administrador</Button>}
            <Button onClick={aplicar} disabled={aplicando || (tipo === "funcao" && !funcaoId) || (tipo === "pessoa" && !pessoaId)}>
              {aplicando ? "Aplicando…" : "Visualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
