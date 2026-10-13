#!/usr/bin/env python3
"""
Importa a cópia dos dados de um sistema antigo para o schema dele no banco novo,
com os mesmos ids e colunas. Usa a função temporária importar_modulo (protegida por token).

Uso: python3 -I scripts/modulos/importar.py <sistema> <arquivo-do-token> tabela1 tabela2 ...
"""
import json, sys, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
NOVO = "https://pbwyxunwteaocqssqpuv.supabase.co"
CHAVE = [l.split("=", 1)[1].strip() for l in (RAIZ / ".env").read_text().splitlines() if l.startswith("VITE_SUPABASE_PUBLISHABLE_KEY")][0]
TROCAS = {
    "formacao": [("https://ffzchmpezpamxiglpwug.supabase.co/storage/v1/object/public/course-assets/",
                  NOVO + "/storage/v1/object/public/formacao/migrado/")],
}
sistema, token = sys.argv[1], Path(sys.argv[2]).read_text().strip()


def trocar(v):
    if isinstance(v, str):
        for a, b in TROCAS.get(sistema, []):
            v = v.replace(a, b)
        return v
    if isinstance(v, list):
        return [trocar(x) for x in v]
    if isinstance(v, dict):
        return {k: trocar(x) for k, x in v.items()}
    return v


for tabela in sys.argv[3:]:
    linhas = trocar(json.loads((RAIZ / "backups" / sistema / "data" / f"{tabela}.json").read_text()))
    total = 0
    for i in range(0, len(linhas), 400):
        corpo = json.dumps({"p_token": token, "p_schema": sistema, "p_tabela": tabela, "p_linhas": linhas[i:i + 400]}).encode()
        req = urllib.request.Request(f"{NOVO}/rest/v1/rpc/importar_modulo", data=corpo, method="POST",
                                     headers={"apikey": CHAVE, "Content-Type": "application/json"})
        try:
            total += json.loads(urllib.request.urlopen(req, timeout=300).read().decode())
        except urllib.error.HTTPError as e:
            raise SystemExit(f"{tabela}: erro {e.code} {e.read().decode()[:300]}")
    print(f"{tabela}: {total} de {len(linhas)}")
