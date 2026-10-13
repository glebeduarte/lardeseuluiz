// Traduz erros do banco em mensagens amigáveis para o usuário final.
export function friendlyDbError(err: unknown): string {
  const raw =
    (err as { message?: string } | null)?.message ??
    (typeof err === "string" ? err : "") ??
    "";

  if (raw.includes("uniq_designacao_ativa")) {
    return "Este consulente já está designado em uma maca ativa. Encerre a designação atual antes de criar uma nova.";
  }
  if (raw.includes("duplicate key") && raw.includes("profiles_email")) {
    return "Já existe um cadastro com este e-mail.";
  }
  if (raw.includes("duplicate key")) {
    return "Já existe um registro com estes dados. Verifique e tente novamente.";
  }
  if (raw.includes("violates foreign key")) {
    return "Não foi possível concluir: existe um vínculo com outro registro.";
  }
  if (raw.includes("violates row-level security")) {
    return "Você não tem permissão para realizar esta ação.";
  }

  return raw || "Ocorreu um erro inesperado. Tente novamente.";
}
