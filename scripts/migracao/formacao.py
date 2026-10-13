#!/usr/bin/env python3
"""
Fase 6 · Migração da Formação.

Lê a cópia da base antiga (backups/formacao) e envia cada tabela ao banco novo,
mantendo os mesmos ids (cursos, módulos, aulas etc.) e trocando as contas antigas
pelas pessoas do núcleo. Os arquivos dos cursos já foram copiados para o bucket
`formacao/migrado/`; as URLs são reescritas para o endereço novo.

Uso: python3 -I scripts/migracao/formacao.py <arquivo-do-token>
"""
import json
import sys
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
B = RAIZ / "backups" / "formacao" / "data"
NOVO = "https://pbwyxunwteaocqssqpuv.supabase.co"
ANTIGO_ASSETS = "https://ffzchmpezpamxiglpwug.supabase.co/storage/v1/object/public/course-assets/"
NOVO_ASSETS = NOVO + "/storage/v1/object/public/formacao/migrado/"

TOKEN = Path(sys.argv[1]).read_text().strip()
CHAVE = [l.split("=", 1)[1].strip() for l in (RAIZ / ".env").read_text().splitlines() if l.startswith("VITE_SUPABASE_PUBLISHABLE_KEY")][0]


def rpc(nome, corpo):
    req = urllib.request.Request(f"{NOVO}/rest/v1/rpc/{nome}", data=json.dumps(corpo).encode(), method="POST",
                                 headers={"apikey": CHAVE, "Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=300).read().decode())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{nome} falhou: {e.code} {e.read().decode()[:400]}")


def ler(nome):
    return json.loads((B / f"{nome}.json").read_text())


def url(u):
    return u.replace(ANTIGO_ASSETS, NOVO_ASSETS) if isinstance(u, str) else u


def data_br(s):
    try:
        return datetime.strptime(s.strip(), "%d/%m/%Y").date().isoformat()
    except Exception:
        return None


mapa = rpc("migracao_mapa_pessoas", {"p_token": TOKEN, "p_sistema": "formacao"})
sem_pessoa = Counter()


def pessoa(uid, contexto):
    if uid is None:
        return None
    p = mapa.get(uid)
    if not p:
        sem_pessoa[contexto] += 1
    return p


area_formacao = None  # preenchido depois pelo SQL (cursos sem área)

STATUS_CURSO = {"published": "publicado", "draft": "rascunho", "archived": "arquivado"}
PUBLICO = {"trabalhadores": "voluntarios", "ambos": "todos", "frequentadores": "todos"}
SIT_AVAL = {"published": "publicada", "draft": "rascunho", "archived": "arquivada"}
POSICAO = {"after_module": "depois_do_modulo", "before_module": "antes_do_modulo", "end_of_course": "fim_do_curso", "between_lessons": "entre_aulas"}
MOSTRAR = {"always": "sempre", "never": "nunca", "on_pass": "apos_aprovacao"}
TIPO_Q = {"multiple_choice": "multipla_escolha", "true_false": "verdadeiro_falso", "multiple_answer": "multiplas_respostas",
          "ordering": "ordenacao", "fill_blank": "lacuna", "essay": "dissertativa"}
SIT_MAT = {"approved": "aprovada", "rejected": "recusada", "pending": "pendente", "cancelled": "cancelada"}

tabelas = {}

tabelas["cursos"] = [{
    "id": c["id"], "titulo": c["title"], "descricao": c["description"], "descricao_longa": c["long_description"],
    "categoria": c["category"], "publico": PUBLICO.get(c["audience"], "todos"),
    "situacao": STATUS_CURSO.get(c["status"], "rascunho"), "inscricoes_abertas": bool(c["enrollment_open"]),
    "exige_aprovacao": False, "linhas_estudo": c["study_lines"] or [], "topicos": c["learning_topics"] or [],
    "inicio": c["start_date"], "fim": c["end_date"], "horario": c["schedule"], "facilitadores": c["facilitator"],
    "duracao_minutos": c["estimated_duration_minutes"], "capa_url": url(c["cover_url"]), "miniatura_url": url(c["thumbnail_url"]),
    "pagina_inscricao": bool(c["registration_page_enabled"]), "area_id": None,
    "criado_em": c["created_at"], "atualizado_em": c["updated_at"],
} for c in ler("courses")]

tabelas["turmas"] = [{
    "id": t["id"], "curso_id": t["course_id"], "nome": t["name"],
    "vagas_tipo": "limitada" if "limit" in (t["vacancy_type"] or "") else "ilimitada",
    "vagas_max": t["max_students"], "link_encontro": None, "criado_em": t["created_at"], "atualizado_em": t["updated_at"],
} for t in ler("class_groups")]

tabelas["modulos"] = [{
    "id": m["id"], "curso_id": m["course_id"], "titulo": m["title"], "descricao": m["description"], "ordem": m["order_index"],
    "criado_em": m["created_at"], "atualizado_em": m["updated_at"],
} for m in ler("modules")]

tabelas["aulas"] = [{
    "id": a["id"], "modulo_id": a["module_id"], "titulo": a["title"], "descricao": a["description"], "video_url": a["video_url"],
    "miniatura_url": url(a["thumbnail_url"]), "embed_url": a["embed_url"], "embed_titulo": a["embed_title"], "ordem": a["order_index"],
    "criado_em": a["created_at"], "atualizado_em": a["updated_at"],
} for a in ler("lessons")]

tabelas["matriculas"] = [r for r in ({
    "id": e["id"], "pessoa_id": pessoa(e["user_id"], "matriculas"), "curso_id": e["course_id"], "turma_id": e["class_group_id"],
    "situacao": SIT_MAT.get(e["status"], "pendente"), "decidido_por": None, "criado_em": e["created_at"], "atualizado_em": e["created_at"],
} for e in ler("enrollments")) if r["pessoa_id"]]

tabelas["progresso_aulas"] = [r for r in ({
    "pessoa_id": pessoa(p["user_id"], "progresso"), "aula_id": p["lesson_id"], "concluida_em": p["completed_at"] or p["created_at"],
} for p in ler("lesson_progress") if p["completed"]) if r["pessoa_id"]]

tabelas["links_presenca"] = [{
    "id": l["id"], "aula_id": l["lesson_id"], "token": l["token"], "url_destino": l["redirect_url"], "expira_em": l["expires_at"],
    "criado_por": pessoa(l["created_by"], "links"), "criado_em": l["created_at"] or l["expires_at"],
} for l in ler("attendance_links")]

vistos = set()
tabelas["presencas"] = []
for r in sorted(ler("attendance_records"), key=lambda x: x["confirmed_at"] or ""):
    p = pessoa(r["user_id"], "presencas")
    if not p or (r["lesson_id"], p) in vistos:
        continue
    vistos.add((r["lesson_id"], p))
    tabelas["presencas"].append({"id": r["id"], "aula_id": r["lesson_id"], "pessoa_id": p, "situacao": "presente", "forma": "migracao",
                                 "link_id": r["link_id"], "observacao": None, "registrado_por": None, "registrado_em": r["confirmed_at"]})

tabelas["avaliacoes"] = [{
    "id": a["id"], "curso_id": a["course_id"], "titulo": a["title"], "descricao": a["description"], "situacao": SIT_AVAL.get(a["status"], "rascunho"),
    "posicao": POSICAO.get(a["position_type"], "fim_do_curso"), "modulo_id": a["position_module_id"], "depois_da_aula_id": a["position_lesson_after_id"],
    "obrigatoria": bool(a["requires_completion"]), "nota_minima": a["passing_score"], "max_tentativas": a["max_attempts"],
    "tempo_limite_minutos": a["time_limit_minutes"], "embaralhar_questoes": bool(a["shuffle_questions"]),
    "embaralhar_alternativas": bool(a["shuffle_alternatives"]), "mostrar_respostas": MOSTRAR.get(a["show_answers_after"], "apos_aprovacao"),
    "criado_por": pessoa(a["created_by"], "avaliacoes"), "criado_em": a["created_at"], "atualizado_em": a["updated_at"],
} for a in ler("assessments")]

tabelas["questoes"] = [{
    "id": q["id"], "avaliacao_id": q["assessment_id"], "tipo": TIPO_Q.get(q["question_type"], "multipla_escolha"), "enunciado": q["statement"],
    "alternativas": q["alternatives"], "resposta_correta": q["correct_answer"], "explicacao": q["explanation"], "ordem": q["order_index"],
    "revisar": bool(q["needs_review"]), "gerada_por_ia": bool(q["ai_generated"]), "criado_em": q["created_at"],
} for q in ler("assessment_questions")]

tabelas["avaliacao_fontes"] = [{
    "id": f["id"], "avaliacao_id": f["assessment_id"], "tipo": f["source_type"], "aula_id": f["lesson_id"], "arquivo": f["file_path"], "texto": f["content_text"],
} for f in ler("assessment_content_sources")]

respostas = defaultdict(list)
for r in ler("assessment_answers"):
    respostas[r["attempt_id"]].append({"questao_id": r["question_id"], "resposta": r["answer_given"], "correta": r["is_correct"], "pontos": r["points_earned"]})
tabelas["tentativas"] = [r for r in ({
    "id": t["id"], "avaliacao_id": t["assessment_id"], "pessoa_id": pessoa(t["user_id"], "tentativas"), "numero": t["attempt_number"],
    "iniciada_em": t["started_at"], "enviada_em": t["submitted_at"], "nota": t["score"], "aprovada": t["passed"],
    "tempo_segundos": t["time_spent_seconds"], "respostas": respostas.get(t["id"], []),
} for t in ler("assessment_attempts")) if r["pessoa_id"]]
# Pessoas que tinham duas contas antigas: tentativas com o mesmo número viram as próximas da sequência
usados = defaultdict(set)
for t in tabelas["tentativas"]:
    chave = (t["avaliacao_id"], t["pessoa_id"])
    if t["numero"] in usados[chave]:
        t["numero"] = max(usados[chave]) + 1
    usados[chave].add(t["numero"])

tabelas["calendario_estudos"] = [{
    "id": c["id"], "codigo_curso": c["course_code"], "data": data_br(c["date_label"]), "rotulo_data": c["date_label"], "ordem": c["sort_order"],
    "roteiro": c["roteiro"], "tema": c["tema"], "modulo": c["modulo"], "facilitador": c["facilitador"], "tipo": c["tipo"],
    "criado_em": c["created_at"], "atualizado_em": c["updated_at"],
} for c in ler("esde_calendar_entries")]

tabelas["livros"] = [{
    "id": b["id"], "titulo": b["title"], "autor": b["author"], "espirito": b["spirit"], "descricao": b["description"],
    "capa_url": url(b["cover_url"]), "pdf_url": url(b["pdf_url"]), "etiquetas": b["tags"] or [], "linhas_estudo": b["study_lines"] or [],
    "criado_em": b["created_at"], "atualizado_em": b["updated_at"],
} for b in ler("books")]

tabelas["paginas_inscricao"] = [{
    "id": p["id"], "slug": p["slug"], "titulo": p["title"], "subtitulo": p["subtitle"], "info_dia": p["info_day"], "info_horario": p["info_time"],
    "info_formato": p["info_format"], "info_extra": p["info_extra"], "texto_livre": p["free_text"], "curso_ids": p["course_ids"] or [],
    "mostrar_capas": bool(p["show_course_covers"]), "ativa": bool(p["is_active"]), "capa_url": url(p["cover_url"]),
    "grupo_whatsapp": p["whatsapp_group_url"], "texto_agradecimento": p["thanks_text"], "criado_em": p["created_at"], "atualizado_em": p["updated_at"],
} for p in ler("registration_pages")]

ORDEM = ["cursos", "turmas", "modulos", "aulas", "matriculas", "progresso_aulas", "links_presenca", "presencas",
         "avaliacoes", "questoes", "avaliacao_fontes", "tentativas", "calendario_estudos", "livros", "paginas_inscricao"]
resumo = {}
for t in ORDEM:
    linhas = tabelas[t]
    total = 0
    for i in range(0, len(linhas), 500):
        total += rpc("migracao_inserir", {"p_token": TOKEN, "p_tabela": t, "p_linhas": linhas[i:i + 500]})
    resumo[t] = {"preparadas": len(linhas), "inseridas": total}

resumo["contas_sem_pessoa"] = dict(sem_pessoa)
resumo["anexos_pendentes_reenvio"] = len(ler("attachments"))
print(json.dumps(resumo, ensure_ascii=False, indent=2))
