import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Search } from "lucide-react";
import { SiteLayout, Secao } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { FormacaoNav } from "@/components/formacao/FormacaoUi";

type Livro = { id: string; titulo: string; autor: string; espirito: string | null; descricao: string | null; capa_url: string | null; pdf_url: string | null; etiquetas: string[] };

export default function Biblioteca() {
  const [busca, setBusca] = useState("");
  const livros = useQuery({
    queryKey: ["livros"],
    queryFn: async () => {
      const { data, error } = await supabase.from("livros").select("*").order("titulo");
      if (error) throw error;
      return data as Livro[];
    },
  });
  const t = busca.trim().toLowerCase();
  const lista = (livros.data ?? []).filter((l) => !t || [l.titulo, l.autor, l.espirito, ...(l.etiquetas ?? [])].join(" ").toLowerCase().includes(t));

  return (
    <SiteLayout>
      <Secao eyebrow="Formação" titulo="Biblioteca" intro="Obras de referência para o estudo da Doutrina Espírita.">
        <FormacaoNav />
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input id="busca-livros" aria-label="Buscar por título, autor ou tema" placeholder="Buscar por título, autor ou tema" className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((l) => (
            <li key={l.id} className="rounded-lg border bg-card p-4 flex gap-3">
              {l.capa_url ? <img src={l.capa_url} alt="" loading="lazy" className="h-24 w-16 shrink-0 rounded object-cover bg-muted" /> : <div className="h-24 w-16 shrink-0 rounded bg-primary grid place-items-center border-b-4 border-lsl-dourado"><BookOpen className="h-5 w-5 text-primary-foreground" aria-hidden /></div>}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-display font-semibold leading-snug">{l.titulo}</span>
                <span className="text-sm text-muted-foreground">{l.autor}{l.espirito && ` · Espírito ${l.espirito}`}</span>
                {l.pdf_url && <a href={l.pdf_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline mt-auto">Abrir o livro</a>}
              </div>
            </li>
          ))}
        </ul>
        {livros.data && lista.length === 0 && <p className="text-muted-foreground">Nenhum livro encontrado.</p>}
      </Secao>
    </SiteLayout>
  );
}
