// Copia a moldura e o design únicos (compartilhado/design) para src/compartilhado de cada app.
// Roda antes do build (npm run build) e pode ser chamado à mão depois de editar compartilhado/design.
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origem = join(raiz, "compartilhado", "design");
const aviso = "// Cópia gerada por scripts/sincronizar-compartilhado.mjs. Edite em compartilhado/design.\n";

for (const app of ["site", "formacao", "atendimento"]) {
  const destino = join(raiz, "apps", app, "src", "compartilhado");
  mkdirSync(destino, { recursive: true });
  for (const nome of readdirSync(origem)) {
    const de = join(origem, nome);
    const para = join(destino, nome);
    if (/\.(tsx?|css)$/.test(nome)) {
      const texto = readFileSync(de, "utf8");
      writeFileSync(para, (nome.endsWith(".css") ? aviso.replace("//", "/*").replace("\n", " */\n") : aviso) + texto);
    } else {
      cpSync(de, para);
    }
  }
  console.log(`compartilhado/design → apps/${app}/src/compartilhado`);
}
