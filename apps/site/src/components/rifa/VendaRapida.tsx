import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, MessageCircle, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradeNumeros, { escolherAoAcaso, type Situacao } from "@/components/rifa/GradeNumeros";
import { db } from "@/lib/acoes";
import { erroAmigavel, linkWhats, mensagemCobranca, pad, reais, useRifaPublica, type Reserva } from "@/lib/rifas";
import "./rifa.css";

// Venda feita por voluntário ou pela coordenação: escolhe os números, anota o comprador e diz se já recebeu.
export default function VendaRapida({ rifaId, slug, total, preco, maximo, coordenacao, aoConcluir }: {
  rifaId: string; slug?: string; total: number; preco: number; maximo: number; coordenacao?: boolean; aoConcluir?: () => void;
}) {
  const qc = useQueryClient();
  const { data: pub } = useRifaPublica(slug ?? undefined);
  const [slugAtual] = useState(slug);
  const ocupados = useMemo(() => new Map<number, Situacao>((pub?.numeros ?? []).map(([n, s]) => [n, s])), [pub]);
  const [escolhidos, setEscolhidos] = useState<Set<number>>(new Set());
  const [digitados, setDigitados] = useState("");
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [recebido, setRecebido] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<(Reserva & { nome: string; tel: string }) | null>(null);

  const daDigitacao = digitados.split(/[^0-9]+/).map(Number).filter((n) => n >= 1 && n <= total);
  const lista = [...new Set([...escolhidos, ...daDigitacao])].sort((a, b) => a - b);

  const alternar = (n: number) => setEscolhidos((s) => {
    const novo = new Set(s);
    if (novo.has(n)) novo.delete(n); else if (novo.size < maximo) novo.add(n);
    return novo;
  });

  const vender = async () => {
    setEnviando(true);
    const { data, error } = await db.rpc("rifa_vender", { p_raffle: rifaId, p_numeros: lista, p_nome: nome, p_telefone: tel, p_recebido: recebido });
    setEnviando(false);
    qc.invalidateQueries({ queryKey: ["rifa-publica", slugAtual] });
    qc.invalidateQueries({ queryKey: ["minhas-rifas-venda"] });
    if (error) return toast.error(erroAmigavel(error));
    setFeito({ ...(data as Reserva), nome, tel });
    toast.success("Venda registrada.");
  };

  if (feito) {
    const nums = feito.numeros.map((n) => pad(n, total)).join(", ");
    const msg = feito.status === "pago" || recebido
      ? `Olá, ${feito.nome.split(" ")[0]}! Seus números na rifa do Lar de Seu Luiz estão garantidos: ${nums}. Código ${feito.codigo}. Boa sorte!`
      : mensagemCobranca({ nome: feito.nome, codigo: feito.codigo, titulo: pub?.titulo ?? "rifa do Lar de Seu Luiz", numeros: feito.numeros, total, valor: Number(feito.valor),
          chave: pub?.pix_chave ?? null, recebedor: pub?.pix_nome ?? null, cidade: pub?.pix_cidade ?? null, slug: slugAtual });
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl bg-emerald-50 text-emerald-900 p-4">
          <p className="font-semibold">Venda registrada: código {feito.codigo}</p>
          <p className="text-sm">{feito.nome} · {nums} · {reais(feito.valor)}{feito.status === "pago" ? " · pago" : recebido ? " · você recebeu, falta repassar à coordenação" : " · esperando pagamento"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><a href={linkWhats(feito.tel, msg)} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-4 h-4 mr-2" /> Mandar os números ao comprador</a></Button>
          <Button variant="outline" onClick={() => { setFeito(null); setEscolhidos(new Set()); setDigitados(""); setNome(""); setTel(""); }}>Nova venda</Button>
          {aoConcluir && <Button variant="ghost" onClick={aoConcluir}>Fechar</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label>Números</Label>
        {slug ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos((s) => new Set([...s, ...escolherAoAcaso(total, ocupados, s, 1)]))}><Shuffle className="w-4 h-4 mr-1" /> Um ao acaso</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEscolhidos((s) => new Set([...s, ...escolherAoAcaso(total, ocupados, s, 5)]))}><Shuffle className="w-4 h-4 mr-1" /> Cinco ao acaso</Button>
            </div>
            <GradeNumeros total={total} ocupados={ocupados} selecionados={escolhidos} aoTocar={alternar} />
          </>
        ) : (
          <Input value={digitados} onChange={(e) => setDigitados(e.target.value)} placeholder="Digite os números separados por vírgula, ex.: 7, 12, 45" />
        )}
      </div>
      {lista.length > 0 && <p className="text-sm"><strong>{lista.length}</strong> {lista.length === 1 ? "número" : "números"}: {lista.map((n) => pad(n, total)).join(", ")} · <strong>{reais(lista.length * preco)}</strong></p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-2"><Label>Nome do comprador</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="grid gap-2"><Label>WhatsApp do comprador</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="(84) 99999-9999" /></div>
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4 cursor-pointer">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-[#0059b1]" checked={recebido} onChange={(e) => setRecebido(e.target.checked)} />
        <span><strong>Já recebi o pagamento</strong><br />
          <span className="text-sm text-muted-foreground">{coordenacao ? "O pedido entra como pago." : "Fica marcado como recebido por você, até a coordenação confirmar o repasse."}</span></span>
      </label>
      <div><Button onClick={vender} disabled={enviando || lista.length === 0 || nome.trim().length < 3 || tel.replace(/\D/g, "").length < 10}>
        <Check className="w-4 h-4 mr-2" /> {enviando ? "Registrando..." : `Registrar venda${lista.length ? ` de ${reais(lista.length * preco)}` : ""}`}
      </Button></div>
    </div>
  );
}
