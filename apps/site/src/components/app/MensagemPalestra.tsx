import { useState } from "react";
import { parse, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Gerador da mensagem de WhatsApp de uma palestra (antes lar-seu-luiz-whatsapp.vercel.app).
 * Usa os dados já cadastrados na agenda: não precisa enviar o cartaz.
 * A IA escreve só o parágrafo de introdução; o resto é fixo.
 */

export interface PalestraMensagem {
  dia_semana: string;
  data: string; // yyyy-MM-dd
  hora: string;
  palestrante: string;
  tema: string;
}

const DIA_EXTENSO: Record<number, string> = {
  0: "domingo", 1: "segunda-feira", 2: "terça-feira", 3: "quarta-feira",
  4: "quinta-feira", 5: "sexta-feira", 6: "sábado",
};

const HORARIOS_SABADO = [
  "15h00 - Início do diálogo fraterno por ordem de chegada",
  "16h00 - Encerramento do diálogo fraterno",
  "16h20 - Preleção e prece inicial",
  "16h30 - Palestra pública",
  "16h40 - Fluidoterapia espiritual (passes e macas) e musicoterapia",
  "19h00 - Prece de encerramento",
];
const HORARIOS_TERCA = [
  "14h00 - Início do diálogo fraterno por ordem de chegada",
  "15h00 - Encerramento do diálogo fraterno",
  "15h30 - Preleção, leitura das psicografias e prece inicial",
  "16h00 - Palestra pública",
  "16h50 - Fluidoterapia espiritual (passes e macas) e musicoterapia",
  "18h30 - Prece de encerramento",
];

export function montarMensagem(p: PalestraMensagem, intro: string) {
  const d = parse(p.data, "yyyy-MM-dd", new Date());
  const sabado = d.getDay() === 6;
  const dia = DIA_EXTENSO[d.getDay()];
  const hora = p.hora && p.hora !== "-" ? `, às ${p.hora}` : "";
  const artigo = sabado || d.getDay() === 0 ? "Neste" : "Nesta";
  const comPalestrante = p.palestrante && p.palestrante !== "-" ? `\nCom ${p.palestrante}` : "";
  return [
    "Queridos amigos do Lar de Seu Luiz,",
    "",
    `${artigo} ${dia}, ${format(d, "dd/MM")}${hora}, teremos um encontro especial com o tema:`,
    "",
    `*${p.tema}*${comPalestrante}`,
    "",
    intro,
    "",
    "*Horários dos Trabalhos:*",
    ...(sabado ? HORARIOS_SABADO : HORARIOS_TERCA),
    "",
    "*Informações e agendamentos:*",
    "Fale com Ana Luísa: (84) 99143-2639",
    "",
    "Venha partilhar conosco desse momento de fé, esperança e consolo que só o Evangelho pode oferecer.",
    "",
    "Com carinho,",
    "Equipe do Lar de Seu Luiz",
  ].join("\n");
}

export default function MensagemPalestra({ palestra }: { palestra: PalestraMensagem }) {
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);

  const gerar = async () => {
    setGerando(true);
    const { data, error } = await supabase.functions.invoke("supabase-functions-deploy-gerar-mensagem-palestra---project-ref-pbwyxunwteaocqssqpuv", { body: { tema: palestra.tema } });
    setGerando(false);
    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível gerar a introdução. A mensagem saiu sem ela; você pode escrever à mão.");
      setMensagem(montarMensagem(palestra, ""));
      return;
    }
    setMensagem(montarMensagem(palestra, data.intro));
  };

  const abrir = () => {
    setAberto(true);
    if (!mensagem) gerar();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      toast.success("Mensagem copiada. É só colar no WhatsApp.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <>
      <button
        onClick={abrir}
        className="text-muted-foreground hover:text-[hsl(var(--primary))] transition-colors"
        title="Gerar mensagem de WhatsApp"
        aria-label="Gerar mensagem de WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
      </button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mensagem de WhatsApp</DialogTitle>
            <DialogDescription>{palestra.tema}</DialogDescription>
          </DialogHeader>
          {gerando && !mensagem ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Escrevendo a introdução…
            </div>
          ) : (
            <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={18} className="text-sm font-mono" />
          )}
          <p className="text-xs text-muted-foreground">Você pode ajustar o texto antes de copiar.</p>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={gerar} disabled={gerando}>
              <RefreshCw className={`w-4 h-4 mr-1 ${gerando ? "animate-spin" : ""}`} /> Nova introdução
            </Button>
            <Button onClick={copiar} disabled={!mensagem}>
              {copiado ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copiado ? "Copiado!" : "Copiar mensagem"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
