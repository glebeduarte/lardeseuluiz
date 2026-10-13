// Palavras que devem ficar em minúsculas (exceto se forem a primeira palavra).
const LOWER = new Set([
  "da", "de", "di", "do", "du",
  "das", "des", "dos", "dus",
  "e", "y",
  "a", "o", "as", "os",
  "na", "no", "nas", "nos",
  "em",
]);

/**
 * Normaliza um nome próprio para "Primeira Maiúscula".
 * - Trata múltiplos espaços.
 * - Mantém preposições comuns (da, de, do, dos, das, e...) em minúsculas.
 * - Preserva apóstrofos e hifens (ex: D'Ávila, Maria-José).
 */
export function toTitleCaseName(input: string): string {
  if (!input) return input;
  const cleaned = input.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
  if (!cleaned) return cleaned;

  const capitalizeChunk = (chunk: string) =>
    chunk
      .split("-")
      .map((seg) =>
        seg
          .split("'")
          .map((s) => (s ? s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1) : s))
          .join("'"),
      )
      .join("-");

  return cleaned
    .split(" ")
    .map((word, idx) => {
      if (idx > 0 && LOWER.has(word)) return word;
      return capitalizeChunk(word);
    })
    .join(" ");
}
