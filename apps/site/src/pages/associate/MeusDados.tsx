import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AssociateLayout from "@/components/app/AssociateLayout";

const consentTypeLabels: Record<string, string> = {
  dados_pessoais: "Dados Pessoais", comunicacao: "Comunicação", imagem: "Imagem", dados_saude: "Dados de Saúde", cookies: "Cookies"
};
const consentStatusLabels: Record<string, string> = { concedido: "Concedido", revogado: "Revogado", pendente: "Pendente" };

const MeusDados = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [consents, setConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data: person } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
      if (person) {
        const { data } = await supabase
          .from("lgpd_consents")
          .select("*")
          .eq("person_id", person.id)
          .order("created_at", { ascending: false });
        setConsents(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (authLoading || loading) return (
    <AssociateLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AssociateLayout>
  );

  return (
    <AssociateLayout>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-6">Meus Dados</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consentimentos LGPD</CardTitle>
          <CardDescription>Gerencie seus consentimentos de tratamento de dados</CardDescription>
        </CardHeader>
        <CardContent>
          {consents.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum consentimento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{consentTypeLabels[c.consent_type] || c.consent_type}</TableCell>
                    <TableCell>
                      <Badge variant={c.consent_status === "concedido" ? "default" : "outline"} className={c.consent_status === "concedido" ? "bg-secondary/10 text-secondary" : "text-destructive"}>
                        {consentStatusLabels[c.consent_status] || c.consent_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.consent_date ? new Date(c.consent_date).toLocaleDateString("pt-BR") : "—"}
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

export default MeusDados;
