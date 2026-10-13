// Junta os builds em dist/: o site na raiz e cada sistema no seu caminho (/formacao, ...).
import { cpSync, rmSync } from "node:fs";
rmSync("dist", { recursive: true, force: true });
cpSync("apps/site/dist", "dist", { recursive: true });
cpSync("apps/formacao/dist", "dist/formacao", { recursive: true });
console.log("dist montado: / (site e Governança), /formacao");
