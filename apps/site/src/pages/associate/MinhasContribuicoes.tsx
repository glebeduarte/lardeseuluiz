import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AssociateLayout from "@/components/app/AssociateLayout";

const MinhasContribuicoes = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: person } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
      if (person) {
        const { data } = await supabase
          .from("contributions")
          .select("*")
          .eq("person_id", person.id)
          .order("reference_month", { ascending: false });
        setContributions(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const fmtCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  if (authLoading || loading) return (
    <AssociateLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AssociateLayout>
  );

  return (
    <AssociateLayout>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-6">Minhas Contribuições</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Contribuições</CardTitle></CardHeader>
        <CardContent>
          {contributions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma contribuição registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.reference_month}</TableCell>
                    <TableCell>{fmtCurrency(Number(c.amount))}</TableCell>
                    <TableCell>
                      <Badge variant={c.paid_at ? "default" : "outline"} className={c.paid_at ? "bg-secondary/10 text-secondary" : "text-accent-dark"}>
                        {c.paid_at ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.paid_at ? new Date(c.paid_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AssociateLayout>
  );
};

export default MinhasContribuicoes;
