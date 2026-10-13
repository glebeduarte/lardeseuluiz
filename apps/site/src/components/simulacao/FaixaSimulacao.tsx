import { Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

/** Faixa fixa no alto da tela enquanto o administrador visualiza como outro papel. */
export default function FaixaSimulacao() {
  const { simulacao, setSimulacao } = useAuth();
  if (!simulacao) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 rounded-full px-4 py-2 text-sm shadow-lg"
      style={{ background: "hsl(var(--accent))", color: "hsl(var(--primary-dark))" }}>
      <Eye className="w-4 h-4 shrink-0" />
      <span>Visualizando como <strong>{simulacao.rotulo}</strong> · alterações bloqueadas</span>
      <button type="button" className="rounded-full bg-white/70 px-3 py-0.5 font-semibold hover:bg-white" onClick={() => setSimulacao(null)}>
        Sair da simulação
      </button>
    </div>
  );
}
