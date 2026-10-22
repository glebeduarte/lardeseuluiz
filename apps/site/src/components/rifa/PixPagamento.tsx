import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { linkWhats, pixCopiaECola, normalizarChave, reais } from "@/lib/rifas";

// Bloco de pagamento: QR Code e "PIX copia e cola" com o valor exato e o código do pedido.
export default function PixPagamento({ chave, nome, cidade, valor, codigo, whatsapp, mensagem }: {
  chave: string | null; nome: string | null; cidade: string | null; valor: number; codigo: string;
  whatsapp: string | null; mensagem: string;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const codigoPix = chave ? pixCopiaECola({ chave, nome: nome || "LAR DE SEU LUIZ", cidade: cidade || "NISIA FLORESTA", valor, identificador: codigo }) : null;

  useEffect(() => {
    if (!codigoPix) return;
    QRCode.toDataURL(codigoPix, { margin: 1, width: 520, color: { dark: "#0f1f3d", light: "#ffffff" } }).then(setQr).catch(() => setQr(null));
  }, [codigoPix]);

  const copiar = async () => {
    if (!codigoPix) return;
    try {
      await navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      toast.success("Código PIX copiado. Agora é só colar no app do seu banco.");
      window.setTimeout(() => setCopiado(false), 3000);
    } catch {
      toast.error("Não consegui copiar. Segure o dedo sobre o código para copiar.");
    }
  };

  return (
    <div className="rifa-pix">
      {codigoPix ? (
        <>
          <div className="rifa-pix__qr">{qr ? <img src={qr} alt="QR Code do PIX" width={260} height={260} /> : <span>Gerando QR Code…</span>}</div>
          <div className="rifa-pix__passos">
            <p className="rifa-pix__valor">{reais(valor)}</p>
            <ol>
              <li>Abra o app do seu banco e escolha <strong>Pix copia e cola</strong> (ou leia o QR Code).</li>
              <li>Cole o código abaixo e confira o valor.</li>
              <li>Mande o comprovante pelo WhatsApp com o código <strong>{codigo}</strong>.</li>
            </ol>
            <textarea className="rifa-pix__codigo" readOnly value={codigoPix} onFocus={(e) => e.currentTarget.select()} aria-label="Código PIX copia e cola" />
            <button type="button" className="ini-botao" onClick={copiar}>
              {copiado ? <Check size={18} /> : <Copy size={18} />} {copiado ? "Copiado" : "Copiar código PIX"}
            </button>
            <p className="ini-pequeno">Chave PIX: {normalizarChave(chave!)}{nome ? `, em nome de ${nome}` : ""}.</p>
          </div>
        </>
      ) : (
        <p className="ini-corpo">A chave PIX desta rifa ainda não foi cadastrada. Fale com a coordenação pelo WhatsApp para combinar o pagamento.</p>
      )}
      {whatsapp && (
        <a className="ini-botao ini-botao--ouro rifa-pix__whats" href={linkWhats(whatsapp, mensagem)} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={18} /> Enviar comprovante pelo WhatsApp
        </a>
      )}
    </div>
  );
}
