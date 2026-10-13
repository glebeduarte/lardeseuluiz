#!/usr/bin/env python3
"""
Fase 4 · Migração de pessoas.

Lê as cópias das três bases antigas (backups/, fora do Git), junta os registros
que são da mesma pessoa e gera:
  backups/migracao/lote_pessoas.json   lote para importar no núcleo
  backups/migracao/revisao.csv         casos para conferência manual
  backups/migracao/resumo.json         contagens (sem dados pessoais)

Regras de junção, em ordem:
  1. mesmo CPF
  2. mesmo e-mail
  3. mesmo telefone (últimos 11 dígitos) e mesmo primeiro nome
  4. mesmo nome completo normalizado e mesma data de nascimento
Mesmo nome completo sem nenhuma outra coincidência vai para revisão, sem juntar.

Uso: python3 scripts/migracao/pessoas.py
"""
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
B = RAIZ / "backups"
SAIDA = B / "migracao"


def carregar(caminho):
    return json.loads((B / caminho).read_text())


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def nome_limpo(s):
    return re.sub(r"\s+", " ", (s or "").strip())


def nome_chave(s):
    return sem_acento(nome_limpo(s)).lower()


def primeiro_nome(s):
    n = nome_chave(s).split(" ")
    return n[0] if n and n[0] else ""


def tel(s):
    d = re.sub(r"\D", "", s or "")
    if d.startswith("55") and len(d) > 11:
        d = d[2:]
    return d[-11:] if len(d) >= 10 else (d or None)


def email(s):
    s = (s or "").strip().lower()
    return s if "@" in s else None


def cpf(s):
    d = re.sub(r"\D", "", s or "")
    return d if len(d) == 11 else None


def data(s):
    return (s or "")[:10] or None


# ---------------------------------------------------------------- registros
registros = []  # cada um: dict com fonte, id, nome, email, cpf, tel, nasc, ...


def add(fonte, rid, nome, **kw):
    r = {"fonte": fonte, "id": rid, "nome": nome_limpo(nome), **kw}
    r["email"] = email(kw.get("email"))
    r["cpf"] = cpf(kw.get("cpf"))
    r["tel"] = tel(kw.get("tel"))
    r["nasc"] = data(kw.get("nasc"))
    registros.append(r)
    return r


gov_people = carregar("governanca/data/people.json")
gov_assoc = carregar("governanca/data/associates.json")
gov_roles = carregar("governanca/data/person_roles.json")
gov_memb = carregar("governanca/data/associate_memberships.json")
gov_wa = carregar("governanca/data/worker_assignments.json")
gov_fn = {f["id"]: f["name"] for f in carregar("governanca/data/functions.json")}
gov_sec = {s["id"]: s["name"] for s in carregar("governanca/data/secretarias.json")}
gov_secm = carregar("governanca/data/secretaria_members.json")
at_prof = carregar("atendimento/data/profiles.json")
at_roles = carregar("atendimento/data/user_roles.json")
at_cons = carregar("atendimento/data/consulentes.json")
fo_prof = carregar("formacao/data/profiles.json")

for p in gov_people:
    add("governanca", p["id"], p["full_name"], email=p["email"], cpf=p["cpf"], tel=p["phone"], nasc=p["birth_date"],
        endereco=p["address"], criado=p["created_at"])
for a in gov_assoc:
    add("governanca_associado", a["id"], a["full_name"], email=a["email"], cpf=a["cpf"], tel=a["phone"], nasc=a["birth_date"],
        criado=a["created_at"])
for p in at_prof:
    add("atendimento_equipe", p["id"], p["nome"], email=p["email"], tel=p["telefone"], nasc=p["data_nascimento"],
        apelido=p.get("como_chamar"), ativo=p["ativo"], criado=p["created_at"])
for c in at_cons:
    add("atendimento_consulente", c["id"], c["nome"], tel=c["telefone"], nasc=c["data_nascimento"],
        trabalhador=bool(c["trabalhador"]), inicio=data(c["data_dialogo"]) or data(c["created_at"]),
        alta=data(c["alta_at"]), criado=c["created_at"])
for p in fo_prof:
    add("formacao", p["id"], p["full_name"], email=p["email"], tel=p["phone"], tipo=p["user_type"], papel=p["role"],
        criado=p["created_at"])

# ---------------------------------------------------------------- junção (union-find)
pai = list(range(len(registros)))


def raiz(i):
    while pai[i] != i:
        pai[i] = pai[pai[i]]
        i = pai[i]
    return i


def unir(i, j, motivo):
    a, b = raiz(i), raiz(j)
    if a != b:
        pai[b] = a
        motivos[(min(i, j), max(i, j))] = motivo


motivos = {}
indices = defaultdict(list)
for i, r in enumerate(registros):
    if r["cpf"]:
        indices[("cpf", r["cpf"])].append(i)
    if r["email"]:
        indices[("email", r["email"])].append(i)
    if r["tel"] and primeiro_nome(r["nome"]):
        indices[("tel", r["tel"], primeiro_nome(r["nome"]))].append(i)
    if r["nasc"] and r["nome"]:
        indices[("nomenasc", nome_chave(r["nome"]), r["nasc"])].append(i)

for chave, idx in indices.items():
    for j in idx[1:]:
        unir(idx[0], j, chave[0])

grupos = defaultdict(list)
for i in range(len(registros)):
    grupos[raiz(i)].append(i)

# ---------------------------------------------------------------- revisão
revisao = []
por_nome = defaultdict(set)
for g, idx in grupos.items():
    for i in idx:
        por_nome[nome_chave(registros[i]["nome"])].add(g)
for n, gs in por_nome.items():
    if n and len(gs) > 1:
        revisao.append(("mesmo nome, contatos diferentes: confirmar se é a mesma pessoa", sorted(gs)))

tel_grupos = defaultdict(set)
for g, idx in grupos.items():
    for i in idx:
        if registros[i]["tel"]:
            tel_grupos[registros[i]["tel"]].add(g)
for t, gs in tel_grupos.items():
    if len(gs) > 1:
        revisao.append(("mesmo telefone, nomes diferentes: pode ser família ou mesma pessoa", sorted(gs)))

# ---------------------------------------------------------------- consolidação
FUNCAO_GOV = {
    "Recepção": "acolhimento", "Passista": "passista", "Médium de Maca": "medium-maca",
    "Dialogador": "dialogador", "Coordenador de Passe": "coordenador-passe",
}
FUNCAO_AT = {"medium": "medium-maca", "dialogador": "dialogador", "recepcao": "acolhimento"}
AREA_SEC = {
    "Formação": "formacao", "Social": "social", "Mediúnica": "mediunica", "Financeira": "financeira",
    "Cultura e Artes": "cultura-e-artes", "Comunicação": "comunicacao", "Diretoria Geral": "direcao",
    "Infraestrutura": "infraestrutura", "Acolhimento": "acolhimento",
}
CATEGORIA = {"fundador": "fundador", "efetivo": "efetivo", "colaborador": "colaborador"}

roles_gov = defaultdict(list)
for r in gov_roles:
    if r["ended_at"] is None:
        roles_gov[r["person_id"]].append(r)
memb_gov = defaultdict(list)
for m in gov_memb:
    memb_gov[m["person_id"]].append(m)
wa_gov = defaultdict(list)
for w in gov_wa:
    if w["ended_at"] is None:
        wa_gov[w["person_id"]].append(w)
secm_gov = defaultdict(list)
for m in gov_secm:
    if m["person_id"]:
        secm_gov[m["person_id"]].append(m)
roles_at = defaultdict(set)
for r in at_roles:
    roles_at[r["user_id"]].add(r["role"])

PRIORIDADE = {"governanca": 0, "formacao": 1, "atendimento_equipe": 2, "governanca_associado": 3, "atendimento_consulente": 4}

lote = []
ids_grupo = {}
contagem = Counter()
for g, idx in grupos.items():
    rs = sorted((registros[i] for i in idx), key=lambda r: PRIORIDADE[r["fonte"]])
    nome = max((r["nome"] for r in rs if r["nome"]), key=lambda n: (len(n.split()), len(n)), default="")
    if len(nome) < 2:
        revisao.append(("registro sem nome: não importado", [g]))
        continue
    pegar = lambda campo: next((r[campo] for r in rs if r.get(campo)), None)
    origem = defaultdict(list)
    for r in rs:
        origem[r["fonte"]].append(r["id"])

    estagio, motivo_est, inicio = "frequentador", "Migrado dos sistemas antigos", None
    funcoes, cargos, vinculos, notas = set(), set(), [], []
    for r in rs:
        c = data(r.get("criado"))
        inicio = min(filter(None, [inicio, c])) if c else inicio
        if r["fonte"] == "governanca":
            if any(x["role"] == "trabalhador" for x in roles_gov[r["id"]]):
                estagio = "voluntario"
            for m in memb_gov[r["id"]]:
                if m["category"] in CATEGORIA:
                    vinculos.append({"tipo": "associado", "categoria": CATEGORIA[m["category"]], "situacao": m["status"],
                                     "inicio": data(m["admission_date"]) or c, "fim": data(m["exit_date"])})
            for w in wa_gov[r["id"]]:
                nome_fn = gov_fn.get(w["function_id"], "")
                if nome_fn in FUNCAO_GOV:
                    funcoes.add(FUNCAO_GOV[nome_fn])
                elif nome_fn not in ("Voluntário Geral",):
                    notas.append(f"função antiga '{nome_fn}' sem área definida")
            for m in secm_gov[r["id"]]:
                area = AREA_SEC.get(gov_sec.get(m["secretaria_id"], ""))
                if area:
                    cargos.add((area, "diretor" if area == "direcao" else ("coordenador" if m["member_role"] == "coordenador" else "membro")))
        elif r["fonte"] == "formacao":
            if r.get("tipo") == "trabalhador":
                estagio = "voluntario"
            if r.get("papel") == "admin":
                notas.append("era administrador da Formação")
        elif r["fonte"] == "atendimento_equipe":
            if r.get("ativo"):
                estagio = "voluntario"
            papeis = roles_at[r["id"]]
            for p in papeis:
                if p in FUNCAO_AT:
                    funcoes.add(FUNCAO_AT[p])
            if "admin" in papeis:
                notas.append("era administrador do Atendimento")
        elif r["fonte"] == "atendimento_consulente":
            vinculos.append({"tipo": "consulente", "categoria": None, "situacao": "alta" if r.get("alta") else "ativo",
                             "inicio": r.get("inicio"), "fim": r.get("alta")})
            if r.get("trabalhador"):
                estagio = "voluntario"
                notas.append("marcado como trabalhador na ficha de consulente")

    if estagio != "voluntario":
        funcoes, cargos = set(), set()
    pessoa = {
        "chave": f"g{g}",
        "nome": nome,
        "email": pegar("email"),
        "cpf": pegar("cpf"),
        "telefone": pegar("tel"),
        "data_nascimento": pegar("nasc"),
        "endereco": pegar("endereco"),
        "origem": dict(origem),
        "estagio": estagio,
        "estagio_inicio": inicio,
        "estagio_motivo": motivo_est,
        "vinculos": vinculos,
        "funcoes": sorted(funcoes),
        "cargos": [{"area": a, "cargo": c} for a, c in sorted(cargos)],
    }
    lote.append(pessoa)
    ids_grupo[g] = pessoa
    contagem["pessoas"] += 1
    contagem[f"estagio_{estagio}"] += 1
    contagem["com_email"] += bool(pessoa["email"])
    contagem["com_cpf"] += bool(pessoa["cpf"])
    contagem["juntadas_de_mais_de_um_registro"] += len(rs) > 1
    for v in vinculos:
        contagem[f"vinculo_{v['tipo']}"] += 1
    contagem["funcoes_atribuidas"] += len(funcoes)
    contagem["cargos_atribuidos"] += len(cargos)
    for n in notas:
        revisao.append((n, [g]))

# ---------------------------------------------------------------- saída
SAIDA.mkdir(exist_ok=True)
(SAIDA / "lote_pessoas.json").write_text(json.dumps(lote, ensure_ascii=False))

with open(SAIDA / "revisao.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["motivo", "pessoas", "nomes", "fontes"])
    for motivo, gs in revisao:
        ps = [ids_grupo[x] for x in gs if x in ids_grupo]
        w.writerow([motivo, len(ps), " | ".join(p["nome"] for p in ps), " | ".join(",".join(p["origem"]) for p in ps)])

contagem["registros_lidos"] = len(registros)
contagem["casos_para_revisao"] = len(revisao)
for motivo, _ in revisao:
    contagem["revisao: " + motivo.split(":")[0]] += 1
(SAIDA / "resumo.json").write_text(json.dumps(dict(contagem), ensure_ascii=False, indent=2))
print(json.dumps(dict(sorted(contagem.items())), ensure_ascii=False, indent=2))
