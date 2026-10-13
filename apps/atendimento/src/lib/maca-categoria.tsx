import { Badge } from "@/components/ui/badge";

export type MacaCategoria = "interna" | "externa";

export function getMacaCategoria(numero: number): MacaCategoria {
  return numero >= 10 ? "externa" : "interna";
}

export function MacaCategoriaTag({
  numero,
  categoria,
  className,
}: {
  numero: number;
  categoria?: string | null;
  className?: string;
}) {
  const cat: MacaCategoria =
    categoria === "interna" || categoria === "externa"
      ? categoria
      : getMacaCategoria(numero);
  const isExterna = cat === "externa";
  return (
    <Badge
      variant={isExterna ? "secondary" : "outline"}
      className={className}
    >
      {isExterna ? "Externa" : "Interna"}
    </Badge>
  );
}
