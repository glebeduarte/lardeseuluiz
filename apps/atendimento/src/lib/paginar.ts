// O banco devolve no máximo 1000 linhas por consulta. Para listas que passam disso
// (presenças, por exemplo), buscamos em páginas até acabar.
const PAGINA = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buscarTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await consulta(de, de + PAGINA - 1);
    if (error) throw error;
    const linhas = (data ?? []) as T[];
    todas.push(...linhas);
    if (linhas.length < PAGINA) return todas;
  }
}
