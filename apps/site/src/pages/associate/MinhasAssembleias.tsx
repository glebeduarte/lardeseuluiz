import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AssociateLayout from "@/components/app/AssociateLayout";

const MinhasAssembleias = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("assemblies").select("*").in("status", ["convocada", "em_andamento"]).order("scheduled_date", { ascending: false });
      setAssemblies(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (authLoading || loading) return (
    <AssociateLayout><div className="flex items-center justify-center py-20 text-muted-foreground animate-pulse">Carregando...</div></AssociateLayout>
  );

  return (
    <AssociateLayout>
      <h1 className="font-['Playfair_Display'] text-2xl font-bold mb-6">Assembleias</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assembleias Abertas</CardTitle>
          <CardDescription>Acesse a assembleia para registrar presença e votar</CardDescription>
        </CardHeader>
        <CardContent>
          {assemblies.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhuma assembleia em andamento.</p>
          ) : (
            <div className="space-y-3">
              {assemblies.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(a.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      {a.location && ` — ${a.location}`}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{a.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AssociateLayout>
  );
};

export default MinhasAssembleias;
