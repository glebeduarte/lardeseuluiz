import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Copy, Check, Loader2 } from "lucide-react";
import logoLSL from "@/assets/logo-lsl.png";

// ── Passagens ──────────────────────────────────────────────
const passagens = [
  { ref:"Mateus 5:3", verse:"Bem-aventurados os pobres em espírito, porque deles é o reino dos céus." },
  { ref:"Mateus 5:4", verse:"Bem-aventurados os que choram, porque serão consolados." },
  { ref:"Mateus 5:7", verse:"Bem-aventurados os misericordiosos, porque alcançarão misericórdia." },
  { ref:"Mateus 5:8", verse:"Bem-aventurados os puros de coração, porque verão a Deus." },
  { ref:"Mateus 5:9", verse:"Bem-aventurados os pacificadores, porque serão chamados filhos de Deus." },
  { ref:"Mateus 5:14-15", verse:"Vós sois a luz do mundo. Não se pode esconder uma cidade edificada sobre um monte." },
  { ref:"Mateus 5:44", verse:"Amai os vossos inimigos e orai pelos que vos perseguem." },
  { ref:"Mateus 6:33", verse:"Buscai primeiro o Reino de Deus e a sua justiça, e todas essas coisas vos serão acrescentadas." },
  { ref:"Mateus 7:7", verse:"Pedi, e dar-se-vos-á; buscai e achareis; batei, e abrir-se-vos-á." },
  { ref:"Mateus 7:12", verse:"Tudo o que quereis que os homens vos façam, fazei-o vós a eles também." },
  { ref:"Mateus 11:28", verse:"Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei." },
  { ref:"Mateus 18:20", verse:"Onde estiverem dois ou três reunidos em meu nome, aí estou eu no meio deles." },
  { ref:"Mateus 19:26", verse:"Para os homens isso é impossível, mas para Deus tudo é possível." },
  { ref:"Mateus 22:37-39", verse:"Amarás o Senhor teu Deus de todo o teu coração. E o segundo mandamento: Amarás o teu próximo como a ti mesmo." },
  { ref:"Mateus 25:40", verse:"Em verdade vos digo que, quando o fizestes a um destes meus irmãos, os mais pequeninos, a mim o fizestes." },
  { ref:"Marcos 10:27", verse:"Para os homens é impossível, mas não para Deus; porque para Deus todas as coisas são possíveis." },
  { ref:"Marcos 11:24", verse:"Tudo o que pedirdes em oração, crede que o recebereis, e assim será." },
  { ref:"Lucas 6:38", verse:"Dai, e ser-vos-á dado; boa medida, recalcada, sacudida e transbordante vos darão." },
  { ref:"Lucas 10:27", verse:"Amarás o Senhor teu Deus com todo o teu coração, com toda a tua alma, com toda a tua força e com todo o teu entendimento; e ao teu próximo como a ti mesmo." },
  { ref:"Lucas 15:24", verse:"Este meu filho estava morto e reviveu; tinha se perdido e foi achado." },
  { ref:"Lucas 17:21", verse:"O Reino de Deus está dentro de vós." },
  { ref:"João 3:16", verse:"Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna." },
  { ref:"João 5:8", verse:"Levanta-te, toma o teu leito e anda." },
  { ref:"João 8:32", verse:"Conhecereis a verdade, e a verdade vos libertará." },
  { ref:"João 11:25", verse:"Eu sou a ressurreição e a vida; quem crê em mim, ainda que esteja morto, viverá." },
  { ref:"João 13:34", verse:"Amai-vos uns aos outros como eu vos amei." },
  { ref:"João 14:2", verse:"Na casa de meu Pai há muitas moradas. Se assim não fosse, eu vo-lo teria dito." },
  { ref:"João 14:6", verse:"Eu sou o caminho, a verdade e a vida." },
  { ref:"João 14:27", verse:"Deixo-vos a paz, a minha paz vos dou; não a dou como o mundo a dá." },
  { ref:"João 15:13", verse:"Ninguém tem maior amor do que este: de dar alguém a sua vida pelos seus amigos." },
  { ref:"João 16:33", verse:"No mundo tendes tribulações; mas tende bom ânimo, eu venci o mundo." },
  { ref:"Mateus 5:16", verse:"Assim resplandeça a vossa luz diante dos homens, para que vejam as vossas boas obras." },
  { ref:"Mateus 6:12", verse:"Perdoai-nos as nossas dívidas, assim como nós perdoamos os nossos devedores." },
  { ref:"Mateus 10:8", verse:"Dai de graça o que de graça recebestes." },
  { ref:"Lucas 6:31", verse:"Tratai os outros como quereis que eles vos tratem." },
  { ref:"Lucas 12:15", verse:"A vida de alguém não consiste na abundância dos bens que possui." },
  { ref:"Mateus 5:48", verse:"Sede perfeitos como é perfeito o vosso Pai celestial." },
  { ref:"Mateus 25:35", verse:"Tive fome, e destes-me de comer; tive sede, e destes-me de beber; era estrangeiro, e hospedastes-me." },
  { ref:"João 4:24", verse:"Deus é Espírito, e importa que os que o adoram o adorem em espírito e em verdade." },
  { ref:"Lucas 11:9", verse:"Pedi e dar-se-vos-á; buscai e achareis; batei e abrir-se-vos-á." },
];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface StoryResult {
  contexto: string;
  titulo_s2: string;
  corpo_s2: string;
  destaque: string;
  fonte: string;
}

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stories`;

const Stories = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ passage: typeof passagens[0]; ai: StoryResult } | null>(null);
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);
  const [error, setError] = useState("");

  const queueRef = useRef<typeof passagens>([]);
  const hasGenerated = useRef(false);

  const getNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffle(passagens);
    }
    return queueRef.current.pop()!;
  }, []);

  useEffect(() => {
    document.title = "Gerador de Stories — Lar de Seu Luiz";
  }, []);

  const generate = async () => {
    const passage = getNext();
    setLoading(true);
    setError("");
    setStatus("Escolhendo passagem do Evangelho…");

    try {
      setStatus("Gerando reflexão espírita com IA…");
      const res = await fetch(FUNC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ verse: passage.verse, ref: passage.ref }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const ai: StoryResult = await res.json();
      setResult({ passage, ai });
      setStatus("");
      hasGenerated.current = true;
    } catch (e: any) {
      setError(e.message || "Erro ao gerar stories.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const copyStory1 = async () => {
    if (!result) return;
    const text = `[STORY 1 — Passagem do Evangelho]\n\nEVANGELHO DE HOJE\n\n"${result.passage.verse}"\n\n${result.passage.ref}\n\n${result.ai.contexto}\n\n@lardeseuluiz`;
    await navigator.clipboard.writeText(text);
    setCopied1(true);
    setTimeout(() => setCopied1(false), 2500);
  };

  const copyStory2 = async () => {
    if (!result) return;
    const text = `[STORY 2 — Reflexão Espírita]\n\nPARA REFLETIR\n\n${result.ai.titulo_s2}\n\n${result.ai.corpo_s2}\n\n"${result.ai.destaque}"\n— ${result.ai.fonte}\n\n@lardeseuluiz`;
    await navigator.clipboard.writeText(text);
    setCopied2(true);
    setTimeout(() => setCopied2(false), 2500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F4F9", fontFamily: "'Lato', 'DM Sans', sans-serif" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #134880 0%, #1A5FA8 50%, #1B7F79 100%)",
          padding: "48px 24px 40px",
          textAlign: "center",
        }}
      >
        <img
          src={logoLSL}
          alt="Lar de Seu Luiz"
          style={{ width: 90, height: 90, borderRadius: 14, margin: "0 auto 16px", display: "block", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
        />
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 8, fontFamily: "'Lato', sans-serif" }}>
          Lar de Seu Luiz · Nísia Floresta, RN
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: "#fff", fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 700, margin: "0 0 10px" }}>
          Gerador de Stories do Evangelho
        </h1>
        <p style={{ color: "rgba(255,255,255,0.68)", fontSize: 15, maxWidth: 520, margin: "0 auto 20px", lineHeight: 1.6, fontWeight: 300 }}>
          Textos prontos para seus Stories do Instagram, fiéis ao Evangelho segundo o Espiritismo.
        </p>
        <div style={{ width: 48, height: 3, background: "#F5B800", borderRadius: 2, margin: "0 auto" }} />
      </header>

      {/* Body */}
      <main style={{ maxWidth: 700, margin: "0 auto", padding: "40px 20px 60px" }}>
        {/* Generate button */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#1A5FA8", marginBottom: 12, fontWeight: 600 }}>
            CLIQUE PARA GERAR
          </p>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 36px",
              borderRadius: 100,
              background: loading ? "#8aabb8" : "linear-gradient(135deg, #1A5FA8, #1B7F79)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 20px rgba(26,95,168,0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
              fontFamily: "'Lato', sans-serif",
            }}
            onMouseEnter={(e) => { if (!loading) { (e.target as HTMLElement).style.transform = "translateY(-2px)"; (e.target as HTMLElement).style.boxShadow = "0 10px 28px rgba(26,95,168,0.45)"; }}}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = ""; (e.target as HTMLElement).style.boxShadow = "0 6px 20px rgba(26,95,168,0.35)"; }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
            {loading ? "Gerando…" : hasGenerated.current ? "Gerar novos Stories" : "Gerar Stories do Evangelho"}
          </button>

          {status && (
            <p style={{ marginTop: 14, fontSize: 13, fontStyle: "italic", color: "#666" }}>{status}</p>
          )}
          {error && (
            <p style={{ marginTop: 14, fontSize: 13, color: "#C0392B", fontWeight: 500 }}>{error}</p>
          )}
        </div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              key={result.passage.ref}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ display: "flex", flexDirection: "column", gap: 28 }}
            >
              {/* Story 1 */}
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eef2f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#1A5FA8", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>1</span>
                    <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#444" }}>STORY 1 — PASSAGEM DO EVANGELHO</span>
                  </div>
                  <button onClick={copyStory1} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: "1px solid #dde3ea", background: copied1 ? "#1B7F79" : "#fff", color: copied1 ? "#fff" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                    {copied1 ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                  </button>
                </div>
                <div style={{ padding: "24px 24px 28px" }}>
                  <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#1B7F79", fontWeight: 700, marginBottom: 12 }}>EVANGELHO DE HOJE</p>
                  <blockquote style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#1A5FA8", fontSize: 19, lineHeight: 1.55, margin: "0 0 14px", padding: 0, border: "none" }}>
                    "{result.passage.verse}"
                  </blockquote>
                  <p style={{ fontWeight: 700, color: "#1B7F79", fontSize: 14, marginBottom: 14 }}>{result.passage.ref}</p>
                  <p style={{ fontStyle: "italic", color: "#444", fontSize: 14, lineHeight: 1.65 }}>{result.ai.contexto}</p>
                  <p style={{ marginTop: 16, fontSize: 13, color: "#1B7F79", fontWeight: 600 }}>@lardeseuluiz</p>
                </div>
              </div>

              {/* Story 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                style={{ background: "#fff", borderRadius: 16, boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eef2f6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#1B7F79", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>2</span>
                    <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#444" }}>STORY 2 — REFLEXÃO ESPÍRITA</span>
                  </div>
                  <button onClick={copyStory2} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: "1px solid #dde3ea", background: copied2 ? "#1B7F79" : "#fff", color: copied2 ? "#fff" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                    {copied2 ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                  </button>
                </div>
                <div style={{ padding: "24px 24px 28px" }}>
                  <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#1B7F79", fontWeight: 700, marginBottom: 12 }}>PARA REFLETIR</p>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#1A5FA8", fontSize: 21, margin: "0 0 18px", lineHeight: 1.35 }}>
                    {result.ai.titulo_s2}
                  </h2>
                  <div style={{ fontSize: 14.5, lineHeight: 1.75, color: "#333" }}>
                    {result.ai.corpo_s2.split("\n\n").map((p, i) => (
                      <p key={i} style={{ marginBottom: 14 }}>{p}</p>
                    ))}
                  </div>
                  {/* Citação espírita */}
                  <div style={{
                    marginTop: 20,
                    padding: "18px 20px",
                    borderLeft: "4px solid #F5B800",
                    background: "linear-gradient(135deg, rgba(26,95,168,0.04), rgba(27,127,121,0.04))",
                    borderRadius: "0 12px 12px 0",
                  }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", color: "#333", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                      "{result.ai.destaque}"
                    </p>
                    <p style={{ color: "#1B7F79", fontWeight: 700, fontSize: 13, marginTop: 8 }}>— {result.ai.fonte}</p>
                  </div>
                  <p style={{ marginTop: 18, fontSize: 13, color: "#1B7F79", fontWeight: 600 }}>@lardeseuluiz</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Aviso */}
        <div style={{
          marginTop: 40,
          padding: "16px 20px",
          background: "rgba(245,184,0,0.1)",
          border: "1px solid rgba(245,184,0,0.3)",
          borderRadius: 12,
          fontSize: 13,
          color: "#7a6520",
          lineHeight: 1.6,
          textAlign: "center",
        }}>
          ⚠️ Textos gerados por inteligência artificial com base no Evangelho e na Doutrina Espírita. Recomenda-se revisão antes da publicação.
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px 20px 32px", fontSize: 13, color: "#888" }}>
        Desenvolvido para o Lar de Seu Luiz · @lardeseuluiz
      </footer>
    </div>
  );
};

export default Stories;
