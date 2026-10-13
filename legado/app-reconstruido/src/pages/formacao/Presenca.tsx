import { useEffect, useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Aviso, ContaLayout } from "@/components/ContaLayout";
import { Carregando } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";

export default function Presenca() {
  const { token } = useParams<{ token: string }>();
  const { session, carregando } = useAuth();
  const disparou = useRef(false);

  const confirmar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("confirmar_presenca", { p_token: token });
      if (error) throw error;
      return data as { aula_id: string; url_destino: string | null };
    },
    onSuccess: (r) => {
      if (r.url_destino) window.setTimeout(() => window.location.assign(r.url_destino!), 1200);
    },
  });

  useEffect(() => {
    if (session && !disparou.current) {
      disparou.current = true;
      confirmar.mutate();
    }
  }, [session, confirmar]);

  if (carregando) return <Carregando />;
  if (!session) return <Navigate to={`/entrar?voltar=/presenca/${token}`} replace />;

  return (
    <ContaLayout titulo="Presença na aula">
      {confirmar.isPending && <p className="text-center text-muted-foreground">Registrando sua presença…</p>}
      {confirmar.isSuccess && (
        <>
          <Aviso tipo="ok">Presença registrada.{confirmar.data.url_destino ? " Levando você para a sala…" : ""}</Aviso>
          {confirmar.data.url_destino && <Button asChild><a href={confirmar.data.url_destino}>Entrar na sala agora</a></Button>}
        </>
      )}
      {confirmar.isError && <Aviso tipo="erro">{(confirmar.error as Error).message || "Não foi possível registrar a presença."}</Aviso>}
      <Link to="/minha-area" className="text-center text-sm text-primary hover:underline">Ir para Minha área</Link>
    </ContaLayout>
  );
}
