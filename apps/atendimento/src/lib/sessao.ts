import { supabase } from "@/integrations/supabase/client";

export type DiaTrabalho = "terca" | "sabado";

export function diaFromDate(d: Date): DiaTrabalho {
  // 0=dom..6=sáb. Padrão terça; sábado quando dow=6.
  return d.getDay() === 6 ? "sabado" : "terca";
}

export function diaLabel(d: DiaTrabalho) {
  return d === "terca" ? "Terça-feira" : "Sábado";
}

// Retorna a sessão de hoje (terça/sábado), criando se necessário.
export async function getOrCreateTodaySessao(diaOverride?: DiaTrabalho) {
  return getOrCreateSessaoForDate(new Date(), diaOverride);
}

// Retorna (criando se necessário) a sessão para uma data específica.
export async function getOrCreateSessaoForDate(date: Date, diaOverride?: DiaTrabalho) {
  const tipo: DiaTrabalho = diaOverride ?? diaFromDate(date);
  const isoDate = date.toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("sessoes")
    .select("*")
    .eq("data", isoDate)
    .eq("tipo", tipo)
    .maybeSingle();
  if (existing) return existing;

  const userRes = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("sessoes")
    .insert({ data: isoDate, tipo, created_by: userRes.data.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

