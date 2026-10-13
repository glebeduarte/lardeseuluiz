import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import AssociateLayout from "@/components/app/AssociateLayout";

const MeuPainel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [person, setPerson] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: personData } = await supabase.from("people").select("*").eq("user_id", user.id).maybeSingle();
      setPerson(personData);

      if (personData) {
        const [memRes, contribRes] = await Promise.all([
          supabase.from("associate_memberships").select("*").eq("person_id", personData.id).is("exit_date", null).maybeSingle(),
          supabase.from("contributions").select("*").eq("person_id", personData.id),
        ]);
        setMembership(memRes.data);
        setContributions(contribRes.data || []);
      }

      const { data: asmData } = await supabase.from("assemblies").select("*").in("status", ["convocada", "em_andamento"]);
      setAssemblies(asmData || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (authLoading || loading) return (
    <AssociateLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AssociateLayout>
  );

  if (!person) return (
    <AssociateLayout>
      <Card>
        <CardContent className="py-12 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Sua conta ainda não está vinculada a um cadastro de pessoa.</p>
          <p className="text-sm text-muted-foreground mt-1">Entre em contato com a diretoria para vincular seu acesso.</p>
        </CardContent>
      </Card>
    </AssociateLayout>
  );

  const totalPaid = contributions.filter(c => c.paid_at).reduce((s, c) => s + Number(c.amount), 0);
  const totalPending = contributions.filter(c => !c.paid_at).reduce((s, c) => s + Number(c.amount), 0);
  const categoria = membership?.category || "—";

  return (
    <AssociateLayout>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-6">Meu Painel</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--secondary))" }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Total Pago</div>
            <div className="text-2xl font-bold text-secondary mt-1">{fmtCurrency(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--accent))" }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Pendente</div>
            <div className="text-2xl font-bold mt-1" style={{ color: "hsl(var(--accent-dark))" }}>{fmtCurrency(totalPending)}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4" style={{ borderTopColor: "hsl(var(--primary))" }}>
          <CardContent className="pt-5 pb-4">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Categoria</div>
            <div className="text-2xl font-bold text-primary mt-1 capitalize">{categoria}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/meu-painel/contribuicoes")}>
          <CardContent className="pt-5 pb-4">
            <div className="text-base font-semibold">💰 Contribuições</div>
            <div className="text-sm text-muted-foreground mt-1">{contributions.length} registros</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/meu-painel/assembleias")}>
          <CardContent className="pt-5 pb-4">
            <div className="text-base font-semibold">🗳️ Assembleias</div>
            <div className="text-sm text-muted-foreground mt-1">{assemblies.length} abertas</div>
          </CardContent>
        </Card>
      </div>
    </AssociateLayout>
  );
};

export default MeuPainel;
