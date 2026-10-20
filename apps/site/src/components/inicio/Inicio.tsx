import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, MessageCircle, Mail, Instagram, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hojeISO, MESES, usePalestras, useProjetos, type Palestra } from "@/lib/site-dados";
import { SEMANA, diaDeHojeNoLar, useSituacaoDaCasa } from "./agenda-casa";
import logoLSL from "@/assets/logo-lsl.png";
import jardim from "@/assets/hero-bg.jpg";

// Página inicial do site. A forma que conduz tudo é o sol dourado do logo do Lar:
// ele recorta as fotos, marca os dias da semana, indica se a casa está aberta e fecha a página.

const WHATS = "https://wa.me/5584991432639";
const MAPA = "https://www.google.com/maps/search/?api=1&query=Lar+de+Seu+Luiz+Rua+da+Mata+N%C3%ADsia+Floresta+RN";

const surgir = (atraso = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: { duration: 0.7, delay: atraso, ease: [0.22, 1, 0.36, 1] as const },
});

const irPara = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ───────── 1. Abertura ───────── */
function Abertura({ palestras }: { palestras: Palestra[] }) {
  const situacao = useSituacaoDaCasa(palestras);
  const aberta = situacao.tipo === "aberta";
  return (
    <section className="ini-abertura" aria-labelledby="ini-titulo">
      <div className="ini-abertura__foto">
        <img src={jardim} alt="O jardim do Lar de Seu Luiz, com palmeiras e a casa ao fundo, numa tarde de sol" width={1920} height={1080} />
      </div>
      <motion.div className="ini-abertura__cartao" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
        <span className="ini-sol ini-abertura__sol" aria-hidden="true" />
        <img src={logoLSL} alt="Lar de Seu Luiz" className="ini-abertura__logo" width={72} height={88} />
        <h1 id="ini-titulo" className="ini-display">Venha como você&nbsp;é.</h1>
        <p className="ini-abertura__frase">
          O Lar de Seu Luiz é uma casa espiritualista na Colônia do Pium, em Nísia Floresta/RN.
          Acolhimento, passe e estudo para todos, sempre de graça.
        </p>
        <a href="#semana" onClick={irPara("semana")} className={`ini-agora${aberta ? " ini-agora--aberta" : ""}`}>
          <span className="ini-agora__sol" aria-hidden="true" />
          <span>
            <strong>{situacao.texto}</strong>
            {situacao.trabalho && <em>{situacao.trabalho.nome}</em>}
          </span>
        </a>
        <div className="ini-abertura__acoes">
          <a href="#visite" onClick={irPara("visite")} className="ini-botao">Quero visitar a casa</a>
          <Link to="/atendimentos" className="ini-botao ini-botao--claro">Quero ser atendido</Link>
        </div>
        <nav className="ini-abertura__links" aria-label="Atalhos">
          <a href="#primeira-visita" onClick={irPara("primeira-visita")}>Primeira visita</a>
          <a href="#acoes" onClick={irPara("acoes")}>Ações sociais</a>
          <Link to="/voluntariado">Seja voluntário</Link>
        </nav>
      </motion.div>
    </section>
  );
}

/* ───────── 2. Convite ───────── */
const Miniatura = ({ src, alt }: { src: string; alt: string }) => (
  <span className="ini-mini"><img src={src} alt={alt} width={80} height={80} loading="lazy" /></span>
);

function Convite() {
  return (
    <section className="ini-convite" aria-labelledby="ini-convite-t">
      <h2 id="ini-convite-t" className="ini-oculto">O que você encontra aqui</h2>
      <motion.p className="ini-convite__texto" {...surgir()}>
        Aqui ninguém paga nada. Tem acolhimento <Miniatura src={jardim} alt="O jardim da casa" />, cuidado
        com a saúde <Miniatura src="/imagens/saude-lar-event.jpg" alt="Voluntárias atendendo na ação Saúde no Lar" />, festa
        das crianças <Miniatura src="/imagens/dia-criancas-event.jpg" alt="Crianças brincando no Dia das Crianças" /> e
        sopa quente.
      </motion.p>
    </section>
  );
}

/* ───────── 3. Primeira visita ───────── */
const PASSOS: { nome: string; texto: string; foto?: string; alt?: string }[] = [
  { nome: "Chegue", foto: jardim, alt: "O jardim do Lar de Seu Luiz, com a casa ao fundo", texto: "Não precisa marcar nem trazer nada. Venha num dia de trabalho: o atendimento segue a ordem de chegada e alguém da recepção te recebe na porta." },
  { nome: "Diálogo Fraterno", texto: "Uma conversa em sigilo com um dialogador. Você conta o que te trouxe e ele te orienta. Todo atendimento começa aqui." },
  { nome: "Palestra e passe", texto: "Uma palestra curta sobre o Evangelho e, depois, o passe: imposição de mãos feita por médiuns preparados, para equilíbrio e alívio." },
  { nome: "Macas", texto: "Quando o Diálogo Fraterno indica, você recebe tratamento espiritual individual, deitado na maca, com uma equipe preparada. A desobsessão passa antes por avaliação." },
  { nome: "Volte quando quiser", texto: "Ao final há a água fluidificada. A porta fica aberta toda semana, e você pode voltar quantas vezes precisar." },
];

// No computador, a seção fica presa na tela e a rolagem vai abrindo um passo de cada vez.
// Clicar num passo leva a rolagem até ele, então as duas formas andam juntas. No celular, só o toque.
function useRolagemGuiada() {
  const [ativa, setAtiva] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
    const ver = () => setAtiva(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, []);
  return ativa;
}

function PrimeiraVisita() {
  const [aberto, setAberto] = useState(0);
  const guiada = useRolagemGuiada();
  const trilho = useRef<HTMLDivElement>(null);
  const palco = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!guiada) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      const t = trilho.current, p = palco.current;
      if (!t || !p) return;
      const curso = t.offsetHeight - p.offsetHeight;
      if (curso <= 0) return;
      const andou = Math.min(Math.max(-t.getBoundingClientRect().top + 84, 0), curso - 1);
      setAberto(Math.floor((andou / curso) * PASSOS.length));
    };
    const aoRolar = () => { if (!quadro) quadro = requestAnimationFrame(medir); };
    medir();
    window.addEventListener("scroll", aoRolar, { passive: true });
    window.addEventListener("resize", aoRolar);
    return () => { window.removeEventListener("scroll", aoRolar); window.removeEventListener("resize", aoRolar); cancelAnimationFrame(quadro); };
  }, [guiada]);

  const escolher = (i: number) => {
    const t = trilho.current, p = palco.current;
    if (!guiada || !t || !p) { setAberto(i); return; }
    const curso = t.offsetHeight - p.offsetHeight;
    const topo = t.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: topo + ((i + 0.5) / PASSOS.length) * curso, behavior: "smooth" });
  };

  return (
    <section className="ini-visita" id="primeira-visita" aria-labelledby="ini-visita-t">
      <div ref={trilho} className={guiada ? "ini-visita__trilho ini-visita__trilho--guiado" : "ini-visita__trilho"}
        style={guiada ? { height: `calc(100vh + ${PASSOS.length * 55}vh)` } : undefined}>
        <div ref={palco} className="ini-visita__palco">
          <div className="ini-visita__intro">
            <h2 id="ini-visita-t" className="ini-titulo">Sua primeira visita</h2>
            <div>
              <p className="ini-corpo">
                Todos os atendimentos são gratuitos e abertos a qualquer pessoa, sem distinção de religião, raça ou condição
                social. É assim que funciona, do portão até a volta para casa.
              </p>
              <Link to="/atendimentos" className="ini-link">Saiba como funciona cada atendimento <ArrowRight size={18} /></Link>
            </div>
          </div>
          <ol className="ini-sanfona">
            {PASSOS.map((p, i) => (
              <li key={p.nome} className={`ini-sanfona__item ini-tom-${i}${aberto === i ? " ini-sanfona__item--aberto" : ""}`}>
                <button type="button" className="ini-sanfona__botao" aria-expanded={aberto === i} onClick={() => escolher(i)}>
                  <span className="ini-sanfona__nome">{p.nome}</span>
                </button>
                <div className="ini-sanfona__conteudo" hidden={aberto !== i}>
                  <div className="ini-sanfona__texto">
                    <span className="ini-sanfona__passo">Passo {i + 1} de {PASSOS.length}</span>
                    <h3 className="ini-titulo">{p.nome}</h3>
                    <p className="ini-corpo">{p.texto}</p>
                  </div>
                  {p.foto && <img src={p.foto} alt={p.alt ?? ""} className="ini-sanfona__foto" width={700} height={500} loading="lazy" />}
                </div>
              </li>
            ))}
          </ol>
          {guiada && (
            <div className="ini-visita__pontos" aria-hidden="true">
              {PASSOS.map((p, i) => <span key={p.nome} className={i === aberto ? "ativo" : i < aberto ? "feito" : ""} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────── 4. A semana da casa ───────── */
// "15:30h" vira "15h30"; "18H" vira "18h".
const horaBonita = (h: string) => {
  const m = h.match(/(\d{1,2})\D?(\d{2})?/);
  if (!m) return h;
  return `${Number(m[1])}h${m[2] && m[2] !== "00" ? m[2] : ""}`;
};

const DIA_CURTO: Record<string, string> = { DOM: "Dom", SEG: "Seg", TER: "Ter", QUA: "Qua", QUI: "Qui", SEX: "Sex", SAB: "Sáb", "SÁB": "Sáb" };

function Semana({ palestras }: { palestras: Palestra[] }) {
  const hoje = diaDeHojeNoLar();
  return (
    <section className="ini-semana" id="semana" aria-labelledby="ini-semana-t">
      <div className="ini-semana__cabeca">
        <motion.h2 id="ini-semana-t" className="ini-titulo" {...surgir()}>A semana da casa</motion.h2>
        <span className="ini-semana__conta">{SEMANA.length} encontros, todos gratuitos</span>
      </div>
      <ul className="ini-lista">
        {SEMANA.map((t, i) => (
          <motion.li key={t.id} className="ini-lista__item" {...surgir(0.05 * i)}>
            <span className={`ini-lista__sol${t.dia === hoje ? " ini-lista__sol--hoje" : ""}`} aria-hidden="true">
              {t.rotuloDia.slice(0, 3)}
            </span>
            <div>
              <div className="ini-lista__linha">
                <strong>{t.nome}</strong>
                <span>{t.horario}</span>
              </div>
              <p>{t.rotuloDia}{t.dia === hoje ? ", hoje" : ""}. {t.descricao}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="ini-semana__cabeca ini-semana__cabeca--segunda">
        <h3 className="ini-titulo">Próximas palestras</h3>
        <Link to="/agenda" className="ini-link">Ver a agenda completa <ArrowRight size={18} /></Link>
      </div>
      {palestras.length === 0 ? (
        <p className="ini-corpo">As próximas palestras serão publicadas em breve.</p>
      ) : (
        <ul className="ini-lista">
          {palestras.slice(0, 6).map((p, i) => {
            const [, mes, dia] = p.data.split("-");
            const meta = [DIA_CURTO[p.dia_semana.toUpperCase()] ?? p.dia_semana, p.palestrante !== "-" ? p.palestrante : null].filter(Boolean).join(", com ");
            return (
              <motion.li key={p.id} className="ini-lista__item" {...surgir(0.05 * i)}>
                <span className="ini-lista__sol ini-lista__sol--data" aria-hidden="true">
                  <b>{dia}</b>{MESES[Number(mes) - 1]}
                </span>
                <div>
                  <div className="ini-lista__linha">
                    <strong>{p.tema}</strong>
                    {p.hora !== "-" && <span>{horaBonita(p.hora)}</span>}
                  </div>
                  <p>{Number(dia)} de {MESES[Number(mes) - 1].toLowerCase()}, {meta}.</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ───────── 5. Ações sociais ───────── */
// Uma faixa de cartões que desliza para o lado (dedo, roda do mouse ou setas).
// Cada ação é um sol com a foto dentro; os pontinhos embaixo mostram onde você está e levam direto a uma ação.
function Acoes() {
  const { data: acoes = [] } = useProjetos();
  const faixa = useRef<HTMLUListElement>(null);
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    const el = faixa.current;
    if (!el) return;
    const medir = () => {
      const passo = (el.children[1] as HTMLElement | undefined)?.offsetLeft ?? 0;
      const base = (el.children[0] as HTMLElement | undefined)?.offsetLeft ?? 0;
      const largura = passo - base;
      if (largura <= 0) return;
      const fim = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      setAtual(fim ? acoes.length - 1 : Math.round(el.scrollLeft / largura));
    };
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    return () => el.removeEventListener("scroll", medir);
  }, [acoes.length]);

  const irPara = (i: number) => {
    const el = faixa.current;
    const alvo = el?.children[Math.max(0, Math.min(i, acoes.length - 1))] as HTMLElement | undefined;
    if (el && alvo) el.scrollTo({ left: alvo.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  if (acoes.length === 0) return null;
  return (
    <section className="ini-acoes" id="acoes" aria-labelledby="ini-acoes-t">
      <div className="ini-acoes__cabeca">
        <div>
          <motion.h2 id="ini-acoes-t" className="ini-titulo" {...surgir()}>Ações sociais</motion.h2>
          <motion.p className="ini-corpo" {...surgir(0.1)}>
            Toda a arrecadação volta para a comunidade. Escolha uma ação, entre no grupo e venha ajudar.
          </motion.p>
        </div>
        <div className="ini-acoes__setas">
          <button type="button" onClick={() => irPara(atual - 1)} disabled={atual === 0} aria-label="Ação anterior"><ArrowLeft size={22} /></button>
          <button type="button" onClick={() => irPara(atual + 1)} disabled={atual >= acoes.length - 1} aria-label="Próxima ação"><ArrowRight size={22} /></button>
        </div>
      </div>

      <ul ref={faixa} className="ini-acoes__faixa" aria-label="Ações sociais do Lar">
        {acoes.map((a, i) => (
          <li key={a.id} className={`ini-acao${i === atual ? " ini-acao--atual" : ""}`}>
            <div className="ini-acao__sol">
              <img src={a.cover_url ?? jardim} alt={a.name} width={600} height={600} loading="lazy" />
            </div>
            <div className="ini-acao__texto">
              <h3 className="ini-lead">{a.name}</h3>
              <p>{a.summary ?? a.description}</p>
              {a.schedule && <p className="ini-acao__quando">{a.schedule}</p>}
              <div className="ini-acao__botoes">
                <Link to={`/projetos/${a.slug}`} className="ini-botao">Quero participar</Link>
                {a.whatsapp_group_url && (
                  <a href={a.whatsapp_group_url} target="_blank" rel="noopener noreferrer" className="ini-botao ini-botao--claro">Grupo no WhatsApp</a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="ini-acoes__pontos" role="tablist" aria-label="Escolher ação">
        {acoes.map((a, i) => (
          <button key={a.id} type="button" role="tab" aria-selected={i === atual} aria-label={a.name}
            className={i === atual ? "ativo" : ""} onClick={() => irPara(i)}>
            <span>{a.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ───────── 6. Estudos ───────── */
const CURSOS_FIXOS = [
  { id: "esde", title: "ESDE", desc: "Estudo Sistematizado da Doutrina Espírita, o curso fundamental de dois anos.", href: "/formacao/" },
  { id: "dialogo", title: "Diálogo Fraterno", desc: "Formação de quem acolhe e orienta os frequentadores.", href: "/formacao/" },
  { id: "evangelizacao", title: "Evangelização", desc: "Preparação de evangelizadores para crianças e jovens.", href: "/formacao/" },
];

function Estudos() {
  const { data } = useQuery({
    queryKey: ["site-cursos-abertos"],
    queryFn: async () => {
      const { data } = await supabase.schema("formacao" as never).from("courses")
        .select("id, title, description, audience")
        .eq("status", "published").eq("enrollment_open", true).neq("audience", "trabalhadores").limit(6);
      return (data ?? []) as { id: string; title: string; description: string | null }[];
    },
  });
  const cursos = data && data.length > 0
    ? data.map((c) => ({ id: c.id, title: c.title, desc: c.description ?? "", href: `/formacao/inscricao/curso/${c.id}` }))
    : CURSOS_FIXOS;
  return (
    <section className="ini-estudos" id="formacao" aria-labelledby="ini-estudos-t">
      <div className="ini-estudos__lado">
        <motion.h2 id="ini-estudos-t" className="ini-titulo" {...surgir()}>Estude com a gente</motion.h2>
        <motion.p className="ini-corpo" {...surgir(0.1)}>
          Cursos gratuitos para quem quer entender a Doutrina Espírita e para quem quer servir na casa. As aulas
          online acontecem às quintas.
        </motion.p>
        <a href="/formacao/" className="ini-botao">Ver todos os cursos</a>
      </div>
      <ul className="ini-estudos__lista">
        {cursos.map((c, i) => (
          <motion.li key={c.id} {...surgir(0.05 * i)}>
            <a href={c.href}>
              <span className="ini-estudos__ponto" aria-hidden="true" />
              <span>
                <strong>{c.title}</strong>
                {c.desc && <em>{c.desc}</em>}
              </span>
              <ArrowRight size={22} aria-hidden="true" />
            </a>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* ───────── 7. Voluntariado ───────── */
const SolComMuda = () => (
  <svg viewBox="0 0 400 400" className="ini-muda" aria-hidden="true">
    <circle cx="200" cy="200" r="200" fill="#ffc116" />
    <g fill="#c0392b">
      <rect x="192" y="120" width="16" height="300" />
      <path d="M200 250 C160 240 130 215 120 180 C160 185 190 210 200 250Z" />
      <path d="M200 210 C240 200 268 175 278 140 C238 146 210 170 200 210Z" />
      <path d="M200 175 C168 166 146 146 138 118 C170 122 192 142 200 175Z" />
      <path d="M200 140 C226 132 244 114 250 90 C224 94 206 112 200 140Z" />
    </g>
  </svg>
);

function Voluntariar() {
  return (
    <section className="ini-voluntario" aria-labelledby="ini-vol-t">
      <div className="ini-voluntario__forma"><SolComMuda /></div>
      <motion.div className="ini-voluntario__texto" {...surgir()}>
        <h2 id="ini-vol-t" className="ini-titulo">Ajude a manter a luz acesa</h2>
        <p className="ini-corpo">
          Toda a casa funciona com voluntários: na recepção, na cozinha da sopa, no estudo com as crianças e nos
          atendimentos. Há um lugar para o seu jeito de ajudar.
        </p>
        <p className="ini-voluntario__fato">O caminho começa por uma conversa e um curso de formação.</p>
        <Link to="/voluntariado" className="ini-botao">Quero ser voluntário</Link>
      </motion.div>
    </section>
  );
}

/* ───────── 8. A casa ───────── */
function ACasa() {
  return (
    <section className="ini-casa" aria-labelledby="ini-casa-t">
      <div className="ini-casa__painel">
        <div className="ini-casa__esq">
          <motion.h2 id="ini-casa-t" className="ini-display ini-display--menor" {...surgir()}>Uma casa sem preço</motion.h2>
          <div className="ini-casa__foto">
            <img src="/imagens/saude-lar-event.jpg" alt="Voluntárias atendendo moradores na ação Saúde no Lar" width={1024} height={768} loading="lazy" />
          </div>
        </div>
        <div className="ini-casa__dir">
          <motion.div {...surgir(0.1)}>
            <h3 className="ini-lead">Quem somos</h3>
            <p className="ini-corpo">
              Fundado em 12 de setembro de 2025, o Lar de Seu Luiz é uma organização religiosa sem fins lucrativos, com
              CNPJ e Estatuto Social aprovado em Assembleia Geral.
            </p>
          </motion.div>
          <motion.div {...surgir(0.2)}>
            <h3 className="ini-lead">Como cuidamos</h3>
            <p className="ini-corpo">
              Nenhum dirigente recebe salário: todo recurso vai para a casa e para a comunidade. Atendemos a todos, sem
              distinção de raça, cor, credo ou classe, e prestamos contas em assembleias abertas.
            </p>
          </motion.div>
          <motion.blockquote className="ini-casa__frase" {...surgir(0.3)}>
            “Fora da caridade não há salvação.” <cite>Allan Kardec</cite>
          </motion.blockquote>
          <Link to="/a-casa" className="ini-botao ini-botao--ouro">Conhecer a casa</Link>
        </div>
      </div>
    </section>
  );
}

/* ───────── 9. Visite ───────── */
const Linha = ({ href, icone, children, externo }: { href: string; icone: ReactNode; children: ReactNode; externo?: boolean }) => (
  <a href={href} className="ini-cupom__linha" {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
    {icone}<span>{children}</span><ArrowRight size={18} aria-hidden="true" />
  </a>
);

function Visite() {
  return (
    <section className="ini-visite" id="visite" aria-labelledby="ini-visite-t">
      <motion.div className="ini-cupom" {...surgir()}>
        <div className="ini-cupom__esq">
          <h2 id="ini-visite-t" className="ini-titulo">Venha nos visitar</h2>
          <div className="ini-cupom__foto">
            <img src="/imagens/litoral-nisia-floresta.jpg" alt="Coqueiros na beira do mar em Nísia Floresta" width={1400} height={1046} loading="lazy" />
          </div>
          <p className="ini-corpo">
            Rua da Mata, s/n, Colônia do Pium, Nísia Floresta/RN, CEP 59164-000. Estamos de portas abertas, sem
            julgamentos, sem cobranças, sem requisitos. A casa é sua.
          </p>
          <p className="ini-cupom__horas">Terças às 14h, sextas às 15h30 e sábados alternados às 14h30.</p>
        </div>
        <div className="ini-cupom__dir">
          <Linha href={MAPA} externo icone={<MapPin size={20} />}>Abrir o caminho no mapa</Linha>
          <Linha href={WHATS} externo icone={<MessageCircle size={20} />}>WhatsApp (84) 99143-2639</Linha>
          <Linha href="mailto:contato@lardeseuluiz.com.br" icone={<Mail size={20} />}>contato@lardeseuluiz.com.br</Linha>
          <div className="ini-cupom__redes">
            <a href="https://www.instagram.com/lardeseuluiz/" target="_blank" rel="noopener noreferrer"><Instagram size={20} /> Instagram</a>
            <a href="https://www.youtube.com/@LardeSeuLuiz" target="_blank" rel="noopener noreferrer"><Youtube size={20} /> YouTube</a>
          </div>
          <Link to="/atendimentos" className="ini-cupom__fim">Quero ser atendido</Link>
        </div>
      </motion.div>
      <div className="ini-mapa">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3943.5!2d-35.209!3d-6.08!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zUnVhIGRhIE1hdGEsIE7DrXNpYSBGbG9yZXN0YSAtIFJO!5e0!3m2!1spt-BR!2sbr!4v1"
          title="Mapa com a localização do Lar de Seu Luiz"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}

/* ───────── Página ───────── */
export default function Inicio() {
  const { data: palestras = [] } = usePalestras({ desde: hojeISO(), limite: 12 });
  const lista = useMemo(() => palestras, [palestras]);
  // Links como /#acoes, vindos de outras páginas, rolam até a seção certa.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 300);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <main className="ini">
      <Abertura palestras={lista} />
      <Convite />
      <PrimeiraVisita />
      <Semana palestras={lista} />
      <Acoes />
      <Estudos />
      <Voluntariar />
      <ACasa />
      <Visite />
    </main>
  );
}
