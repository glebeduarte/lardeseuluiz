#!/usr/bin/env python3
"""
Recria a estrutura original de um sistema (tabelas, enums, funções, gatilhos, RLS)
num schema próprio do banco novo, a partir da cópia em backups/<sistema>/schema.

Assim o código original de cada sistema continua falando com as mesmas tabelas,
sem conflito de nomes entre eles (os três têm profiles e user_roles).

Uso: python3 -I scripts/modulos/gerar_schema.py <sistema> <schema> > saida.sql
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SISTEMA, SCHEMA = sys.argv[1], sys.argv[2]
S = RAIZ / "backups" / SISTEMA / "schema"


def ler(nome):
    return json.loads((S / f"{nome}.json").read_text())


def lista_enums():
    e = ler("enums")
    if isinstance(e, dict):
        return list(e.items())
    return [(x.get("typname") or x.get("enum_name"), x["valores"]) for x in e]


def q(s):
    return "'" + s.replace("'", "''") + "'"


def troca_public(txt):
    return re.sub(r"\bpublic\.", f"{SCHEMA}.", txt)


enums = lista_enums()
nomes_enum = {n for n, _ in enums}
colunas = ler("columns")
restricoes = ler("constraints")
indices = ler("indexes")
politicas = ler("policies")
gatilhos = ler("triggers")

tabelas = {}
for c in sorted(colunas, key=lambda c: (c["table_name"], c["ordinal_position"])):
    tabelas.setdefault(c["table_name"], []).append(c)

out = [f"-- Gerado por scripts/modulos/gerar_schema.py a partir de backups/{SISTEMA}/schema",
       f"create schema if not exists {SCHEMA};",
       f"set local search_path = {SCHEMA}, public, extensions;"]

for nome, valores in enums:
    out.append(f"create type {SCHEMA}.{nome} as enum ({', '.join(q(v) for v in valores)});")


def tipo(c):
    dt, udt = c["data_type"], c["udt_name"]
    if dt == "USER-DEFINED":
        return f"{SCHEMA}.{udt}" if udt in nomes_enum else udt
    if dt == "ARRAY":
        base = udt.lstrip("_")
        return (f"{SCHEMA}.{base}" if base in nomes_enum else base) + "[]"
    return dt


for t, cols in tabelas.items():
    linhas = []
    for c in cols:
        l = f"  {c['column_name']} {tipo(c)}"
        if c["column_default"] is not None:
            l += f" default {troca_public(c['column_default'])}"
        if c["is_nullable"] == "NO":
            l += " not null"
        linhas.append(l)
    for r in restricoes:
        if r["tabela"] == t and not r["def"].startswith("FOREIGN"):
            linhas.append(f"  constraint {r['conname']} {troca_public(r['def'])}")
    out.append(f"create table {SCHEMA}.{t} (\n" + ",\n".join(linhas) + "\n);")

ignoradas = []
for r in restricoes:
    if r["def"].startswith("FOREIGN") and r["tabela"] in tabelas:
        if "auth.users" in r["def"]:
            ignoradas.append(f"{r['tabela']}.{r['conname']}")
            continue
        out.append(f"alter table {SCHEMA}.{r['tabela']} add constraint {r['conname']} {troca_public(r['def'])};")

nomes_restricao = {r["conname"] for r in restricoes}
for i in indices:
    if i["indexname"] in nomes_restricao or i["tablename"] not in tabelas:
        continue
    out.append(troca_public(i["indexdef"]) + ";")

funcoes = (S / "functions.sql").read_text()
funcoes = troca_public(funcoes)
funcoes = re.sub(r"SET search_path TO '?public'?(, '?extensions'?)?", f"SET search_path TO '{SCHEMA}', 'public', 'extensions'", funcoes)
funcoes = re.sub(r"SET search_path TO ''", f"SET search_path TO '{SCHEMA}', 'public', 'extensions'", funcoes)
out.append(funcoes.strip().rstrip(";") + ";")

for g in gatilhos:
    tabela = g.get("tabela") or g.get("tgrelid")
    definicao = g.get("def") or g.get("pg_get_triggerdef")
    if tabela.replace("public.", "") not in tabelas:
        ignoradas.append(f"gatilho {g['tgname']} em {tabela}")
        continue
    definicao = re.sub(r" ON (public\.)?(\w+) ", lambda m: f" ON {SCHEMA}.{m.group(2)} ", definicao, count=1)
    out.append(troca_public(definicao) + ";")

for t in tabelas:
    out.append(f"alter table {SCHEMA}.{t} enable row level security;")

for p in politicas:
    if p["tablename"] not in tabelas or p.get("schemaname", "public") != "public":
        continue
    roles = p["roles"]
    if isinstance(roles, str):
        roles = [r for r in roles.strip("{}").split(",") if r]
    l = f"create policy {json.dumps(p['policyname'])} on {SCHEMA}.{p['tablename']} as {p['permissive'].lower()} for {p['cmd'].lower()} to {', '.join(roles)}"
    if p["qual"]:
        l += f" using ({troca_public(p['qual'])})"
    if p["with_check"]:
        l += f" with check ({troca_public(p['with_check'])})"
    out.append(l + ";")

out += [
    f"grant usage on schema {SCHEMA} to anon, authenticated, service_role;",
    f"grant all on all tables in schema {SCHEMA} to anon, authenticated, service_role;",
    f"grant all on all sequences in schema {SCHEMA} to anon, authenticated, service_role;",
    f"grant execute on all functions in schema {SCHEMA} to anon, authenticated, service_role;",
    f"alter default privileges in schema {SCHEMA} grant all on tables to anon, authenticated, service_role;",
    f"alter default privileges in schema {SCHEMA} grant all on sequences to anon, authenticated, service_role;",
    f"alter default privileges in schema {SCHEMA} grant execute on functions to anon, authenticated, service_role;",
]
print("\n".join(out))
print("\n-- Não recriados (contas antigas ou objetos fora do schema): " + "; ".join(ignoradas), file=sys.stderr)
