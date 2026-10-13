export type DesignacaoStatus = {
  status: string;
  sessoes_realizadas?: number;
  sessoes_totais?: number;
};

export function consulenteCardClasses(d: DesignacaoStatus | null | undefined): string {
  if (!d || d.status !== "ativa") {
    // encerrado / inativo
    return "border-brand-teal bg-brand-teal-muted hover:border-brand-teal-dark";
  }
  const realizadas = d.sessoes_realizadas ?? 1;
  const total = d.sessoes_totais ?? 1;
  const restantes = total - realizadas;
  if (restantes <= 1) {
    return "border-brand-gold bg-brand-gold-muted hover:border-brand-gold-dark";
  }
  return "";
}

export function consulenteStatusLabel(d: DesignacaoStatus | null | undefined): string | null {
  if (!d || d.status !== "ativa") return "Encerrado";
  const realizadas = d.sessoes_realizadas ?? 1;
  const total = d.sessoes_totais ?? 1;
  const restantes = total - realizadas;
  if (restantes <= 1) return "Próximo do término";
  return null;
}
