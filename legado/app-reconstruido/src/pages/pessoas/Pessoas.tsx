import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";

type Linha = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  pessoa_estagios: { estagio: string; fim: string | null }[];
};

export default function Pessoas() {
  const [busca, setBusca] = useState("");
  const termo = busca.trim();

  const lista = useQuery({
    queryKey: ["pessoas", termo],
    queryFn: async () => {
      let q = supabase
        .from("pessoas")
        .select("id, nome, email, telefone, pessoa_estagios(estagio, fim)")
        .order("nome")
        .limit(100);
      if (termo) {
        const t = termo.replace(/[%,()]/g, " ");
        const digitos = t.replace(/\D/g, "");
        q = q.or([`nome.ilike.%${t}%`, `email.ilike.%${t}%`, ...(digitos.length >= 4 ? [`telefone.ilike.%${digitos}%`] : [])].join(","));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as Linha[];
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold">Pessoas</h1>
        <p className="text-muted-foreground">Cadastros da casa. Abra uma pessoa para ver estágio, cargos e funções.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          id="busca-pessoas"
          aria-label="Buscar por nome, e-mail ou telefone"
          placeholder="Buscar por nome, e-mail ou telefone"
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Estágio</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lista.isLoading && (
              <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">Carregando…</td></tr>
            )}
            {lista.data?.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-muted-foreground">Nenhuma pessoa encontrada.</td></tr>
            )}
            {lista.data?.map((p) => {
              const estagio = p.pessoa_estagios.find((e) => !e.fim)?.estagio;
              return (
                <tr key={p.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link to={`/pessoas/${p.id}`} className="font-medium text-primary hover:underline">{p.nome}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {estagio === "voluntario" ? (
                      <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">Voluntário</span>
                    ) : estagio === "frequentador" ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Frequentador</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem estágio</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground break-all">{p.email}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{p.telefone}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {lista.data?.length === 100 && <p className="text-sm text-muted-foreground">Mostrando as 100 primeiras. Use a busca para refinar.</p>}
    </div>
  );
}
