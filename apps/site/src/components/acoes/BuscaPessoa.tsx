import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useBuscaPessoas, type PessoaBasica } from "@/lib/acoes";

/** Campo de busca no cadastro único de pessoas (mostra só nome e telefone). */
export default function BuscaPessoa({
  valor, onEscolher, placeholder = "Digite ao menos 2 letras do nome",
}: { valor: PessoaBasica | null; onEscolher: (p: PessoaBasica | null) => void; placeholder?: string }) {
  const [busca, setBusca] = useState("");
  const { data: opcoes = [], isFetching } = useBuscaPessoas(busca);

  if (valor) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
        <div className="min-w-0">
          <div className="font-medium truncate">{valor.full_name}</div>
          {valor.phone && <div className="text-xs text-muted-foreground">{valor.phone}</div>}
        </div>
        <button type="button" onClick={() => onEscolher(null)} className="text-muted-foreground hover:text-foreground" aria-label="Trocar pessoa">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={placeholder} />
      {busca.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-y-auto">
          {isFetching && opcoes.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Buscando...</div>
          ) : opcoes.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Ninguém encontrado no cadastro de pessoas.</div>
          ) : opcoes.map((p) => (
            <button key={p.id} type="button" onClick={() => { onEscolher(p); setBusca(""); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
              <div className="font-medium">{p.full_name}</div>
              {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
