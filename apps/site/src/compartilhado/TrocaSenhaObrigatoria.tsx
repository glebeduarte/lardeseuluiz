// Cópia gerada por scripts/sincronizar-compartilhado.mjs. Edite em compartilhado/design.
import { useEffect, useState, type FormEvent } from "react";

// Troca de senha obrigatória, igual nas três áreas (Governança/site, Formação e Atendimento).
// Quem entrou com uma senha provisória vê esta tela por cima de tudo e só continua depois de criar
// uma senha própria. A regra fica no banco: public.precisa_trocar_senha() e public.concluir_troca_senha().

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteSupabase = any;

// Telas em que a pessoa ainda está entrando ou já está trocando a senha: ali a janela não aparece
const LIVRE = /(login|senha|reset|redefinir|recuperar|auth|entrar)/i;

export function TrocaSenhaObrigatoria({ cliente }: { cliente: ClienteSupabase }) {
  const [precisa, setPrecisa] = useState(false);
  const [email, setEmail] = useState("");
  const [caminho, setCaminho] = useState(() => (typeof window === "undefined" ? "" : window.location.pathname));
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const consultar = async () => {
    const { data: s } = await cliente.auth.getSession();
    if (!s?.session) { setPrecisa(false); return; }
    setEmail(s.session.user?.email ?? "");
    const { data } = await cliente.schema("public").rpc("precisa_trocar_senha");
    setPrecisa(data === true);
  };

  useEffect(() => {
    consultar();
    const { data: sub } = cliente.auth.onAuthStateChange((evento: string) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") consultar();
    });
    return () => { sub?.subscription?.unsubscribe?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  // Acompanha a página atual (cada área usa um roteador diferente) e reconsulta ao mudar de página
  useEffect(() => {
    const t = window.setInterval(() => setCaminho(window.location.pathname), 800);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => { consultar(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caminho]);

  const aberta = precisa && !LIVRE.test(caminho);
  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [aberta]);

  if (!aberta) return null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (senha !== confirma) return setErro("As duas senhas não são iguais.");
    if (/^lsl-/i.test(senha)) return setErro("Crie uma senha sua, diferente da provisória.");
    setEnviando(true);
    const { error } = await cliente.auth.updateUser({ password: senha });
    if (error) {
      setEnviando(false);
      const msg = String(error.message || "");
      return setErro(/different|same/i.test(msg) ? "A nova senha precisa ser diferente da atual." : msg || "Não foi possível trocar a senha.");
    }
    const { error: e2 } = await cliente.schema("public").rpc("concluir_troca_senha");
    setEnviando(false);
    if (e2) return setErro("A senha foi trocada, mas não conseguimos registrar. Recarregue a página.");
    setSenha(""); setConfirma(""); setPrecisa(false);
  };

  const sair = async () => { await cliente.auth.signOut(); window.location.assign("/login"); };

  return (
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-[#0f1f3d]/70 backdrop-blur-sm p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="lsl-senha-titulo">
      <form onSubmit={enviar} className="w-full sm:max-w-lg max-h-[100dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 text-[#0f1f3d]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-[#ffc116] flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f1f3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
          <h2 id="lsl-senha-titulo" className="text-[24px] leading-tight font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Crie a sua senha</h2>
        </div>
        <p className="mt-3 text-[16px] leading-relaxed text-[#334155]">
          Você entrou com uma senha provisória{email ? <> em <b>{email}</b></> : null}. Antes de continuar, crie uma senha só sua. Ela vale para o site, a Formação e o Atendimento.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-[15px] font-semibold">Nova senha</span>
            <input type={mostrar ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" className="lsl-senha-input" placeholder="Pelo menos 8 caracteres" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-[15px] font-semibold">Repita a nova senha</span>
            <input type={mostrar ? "text" : "password"} value={confirma} onChange={(e) => setConfirma(e.target.value)} autoComplete="new-password" className="lsl-senha-input" />
          </label>
          <label className="flex items-center gap-2 text-[14px] text-[#475569]">
            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar senha
          </label>
        </div>

        {erro && <p className="mt-4 rounded-2xl bg-[#fde8e8] text-[#9b1c1c] px-4 py-3 text-[15px]" role="alert">{erro}</p>}

        <button type="submit" disabled={enviando}
          className="mt-6 w-full h-14 rounded-full bg-[#0059b1] text-white text-[17px] font-semibold disabled:opacity-60 hover:bg-[#003c7f] transition-colors">
          {enviando ? "Salvando..." : "Salvar senha e continuar"}
        </button>
        <p className="mt-4 text-center text-[13px] text-[#64748b]">
          <button type="button" onClick={sair} className="underline">Sair</button>
        </p>
      </form>
      <style>{`.lsl-senha-input{width:100%;height:52px;border-radius:14px;border:0;background:#f1f5f9;padding:0 16px;font-size:17px;color:#0f1f3d;outline:none}
.lsl-senha-input:focus{outline:3px solid #ffc116;background:#fff}`}</style>
    </div>
  );
}
