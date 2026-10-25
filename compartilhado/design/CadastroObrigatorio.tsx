import { useEffect, useState, type FormEvent, type ReactNode } from "react";

// Cadastro obrigatório, igual nas três áreas (Governança, Formação e Atendimento).
// Depois do login, se faltar nome, CPF, telefone ou e-mail (ou no primeiro acesso, ou a cada 12 meses),
// esta tela cobre tudo e só fecha quando os dados forem confirmados. As regras ficam no banco:
// public.meu_cadastro() e public.confirmar_meu_cadastro().

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClienteSupabase = any;

type Cadastro = {
  logado: boolean; precisa: boolean; motivo?: "faltando" | "primeiro" | "renovar"; faltando?: string[];
  nome?: string | null; telefone?: string | null; email?: string | null; email_fixo?: boolean;
  tem_cpf?: boolean; cpf_final?: string | null;
};

// Telas em que a pessoa ainda está entrando ou trocando a senha: ali a janela não aparece
const LIVRE = /(login|cadastro|senha|reset|redefinir|recuperar|auth|entrar)/i;

const soNumeros = (v: string) => v.replace(/\D/g, "");
const mascaraCpf = (v: string) => {
  const d = soNumeros(v).slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};
const mascaraTelefone = (v: string) => {
  const d = soNumeros(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
function cpfValido(v: string) {
  const d = soNumeros(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function CadastroObrigatorio({ cliente }: { cliente: ClienteSupabase }) {
  const [dados, setDados] = useState<Cadastro | null>(null);
  const [caminho, setCaminho] = useState(() => (typeof window === "undefined" ? "" : window.location.pathname));
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Consulta o cadastro ao entrar e a cada troca de sessão
  useEffect(() => {
    let vivo = true;
    const consultar = async () => {
      const { data: s } = await cliente.auth.getSession();
      if (!s?.session) { if (vivo) setDados(null); return; }
      const { data } = await cliente.schema("public").rpc("meu_cadastro");
      if (!vivo || !data) return;
      const c = data as Cadastro;
      setDados(c);
      setNome(c.nome ?? "");
      setTelefone(mascaraTelefone(c.telefone ?? ""));
      setEmail(c.email ?? "");
    };
    consultar();
    const { data: sub } = cliente.auth.onAuthStateChange((evento: string) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT" || evento === "USER_UPDATED") consultar();
    });
    return () => { vivo = false; sub?.subscription?.unsubscribe?.(); };
  }, [cliente]);

  // Acompanha a página atual (cada área usa um roteador diferente)
  useEffect(() => {
    const t = window.setInterval(() => setCaminho(window.location.pathname), 800);
    return () => window.clearInterval(t);
  }, []);

  // Enquanto a janela está aberta, a página de trás não rola
  const aberta = !!dados?.logado && !!dados?.precisa && !LIVRE.test(caminho);
  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [aberta]);

  if (!aberta || !dados) return null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErro("");
    if (nome.trim().split(/\s+/).length < 2) return setErro("Escreva o nome completo, com sobrenome.");
    if (!dados.tem_cpf && !cpfValido(cpf)) return setErro("CPF inválido. Confira os 11 números.");
    if (![10, 11].includes(soNumeros(telefone).length)) return setErro("Telefone com DDD, por exemplo (84) 99999-9999.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErro("Confira o e-mail.");
    setEnviando(true);
    const { data, error } = await cliente.schema("public").rpc("confirmar_meu_cadastro", {
      p_nome: nome.trim(), p_cpf: dados.tem_cpf ? null : soNumeros(cpf), p_telefone: soNumeros(telefone), p_email: email.trim(),
    });
    setEnviando(false);
    if (error) return setErro(String(error.message || "Não foi possível salvar.").replace(/^.*?ERROR:\s*/, ""));
    try { sessionStorage.removeItem("lsl:areas"); } catch { /* sem armazenamento */ }
    setDados(data as Cadastro);
  };

  const sair = async () => { await cliente.auth.signOut(); window.location.assign("/login"); };

  const titulo = dados.motivo === "renovar" ? "Seus dados continuam certos?" : dados.motivo === "faltando" ? "Complete o seu cadastro" : "Antes de começar, confirme seus dados";
  const texto = dados.motivo === "renovar"
    ? "Uma vez por ano pedimos que você confira. Se algo mudou, corrija aqui."
    : "A Casa precisa do seu nome completo, CPF, telefone e e-mail para os cursos, o atendimento e as escalas. Leva um minuto.";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-[#0f1f3d]/70 backdrop-blur-sm p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="lsl-cadastro-titulo">
      <form onSubmit={enviar} className="w-full sm:max-w-lg max-h-[100dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 text-[#0f1f3d]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-[#ffc116] flex items-center justify-center shrink-0" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f1f3d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          </span>
          <h2 id="lsl-cadastro-titulo" className="text-[24px] leading-tight font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{titulo}</h2>
        </div>
        <p className="mt-3 text-[16px] leading-relaxed text-[#334155]">{texto}</p>

        <div className="mt-6 grid gap-4">
          <Campo rotulo="Nome completo">
            <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className="lsl-cad-input" placeholder="Nome e sobrenome" />
          </Campo>
          <Campo rotulo="CPF" ajuda={dados.tem_cpf ? "Já está no seu cadastro. Se estiver errado, fale com a secretaria." : "Só os números, sem pontos."}>
            {dados.tem_cpf
              ? <div className="lsl-cad-input flex items-center text-[#475569]">•••.•••.•••-{dados.cpf_final}</div>
              : <input value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} inputMode="numeric" autoComplete="off" className="lsl-cad-input" placeholder="000.000.000-00" />}
          </Campo>
          <Campo rotulo="WhatsApp ou telefone">
            <input value={telefone} onChange={(e) => setTelefone(mascaraTelefone(e.target.value))} inputMode="tel" autoComplete="tel" className="lsl-cad-input" placeholder="(84) 99999-9999" />
          </Campo>
          <Campo rotulo="E-mail" ajuda={dados.email_fixo ? "Para trocar o e-mail, fale com a secretaria." : undefined}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" readOnly={!!dados.email_fixo}
              className={`lsl-cad-input ${dados.email_fixo ? "text-[#475569]" : ""}`} placeholder="seu@email.com" />
          </Campo>
        </div>

        {erro && <p className="mt-4 rounded-2xl bg-[#fde8e8] text-[#9b1c1c] px-4 py-3 text-[15px]" role="alert">{erro}</p>}

        <button type="submit" disabled={enviando}
          className="mt-6 w-full h-14 rounded-full bg-[#0059b1] text-white text-[17px] font-semibold disabled:opacity-60 hover:bg-[#003c7f] transition-colors">
          {enviando ? "Salvando..." : dados.motivo === "renovar" ? "Está tudo certo" : "Salvar e continuar"}
        </button>
        <p className="mt-4 text-center text-[13px] text-[#64748b]">
          Seus dados ficam só com o Lar de Seu Luiz, como diz a nossa <a href="/privacidade" target="_blank" rel="noreferrer" className="underline">política de privacidade</a>.
          {" "}<button type="button" onClick={sair} className="underline">Sair</button>
        </p>
      </form>
      <style>{`.lsl-cad-input{width:100%;height:52px;border-radius:14px;border:0;background:#f1f5f9;padding:0 16px;font-size:17px;color:#0f1f3d;outline:none}
.lsl-cad-input:focus{outline:3px solid #ffc116;background:#fff}`}</style>
    </div>
  );
}

function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[15px] font-semibold">{rotulo}</span>
      {children}
      {ajuda && <span className="text-[13px] text-[#64748b]">{ajuda}</span>}
    </label>
  );
}
