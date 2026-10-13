import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { traduzErroAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aviso, ContaLayout } from "@/components/ContaLayout";

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().split(/\s+/).length < 2) return setErro("Informe nome e sobrenome.");
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    if (!aceite) return setErro("Para criar a conta, é preciso concordar com o uso dos seus dados descrito abaixo.");
    setEnviando(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/minha-area`,
        data: { nome: nome.trim(), telefone: telefone.trim(), aceite_dados: true },
      },
    });
    setEnviando(false);
    if (error) return setErro(traduzErroAuth(error.message));
    setEnviado(true);
  }

  if (enviado) {
    return (
      <ContaLayout titulo="Confirme seu e-mail">
        <p className="text-center text-muted-foreground">
          Enviamos um link para <strong className="text-foreground">{email}</strong>. Abra o e-mail e clique no link para ativar sua conta.
          Se não encontrar, confira a caixa de spam.
        </p>
        <Link to="/entrar" className="text-center text-sm text-primary hover:underline">Voltar para Entrar</Link>
      </ContaLayout>
    );
  }

  return (
    <ContaLayout titulo="Criar conta" subtitulo="Para se inscrever em cursos e ações da casa.">
      <form onSubmit={cadastrar} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" autoComplete="name" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">WhatsApp</Label>
          <Input id="telefone" type="tel" autoComplete="tel" placeholder="(84) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" autoComplete="new-password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} />
          <span className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</span>
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground" htmlFor="aceite">
          <input id="aceite" type="checkbox" className="mt-1" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            Concordo que o Lar de Seu Luiz guarde meus dados para organizar cursos, inscrições e contato comigo. Posso pedir a correção ou exclusão a qualquer momento.
          </span>
        </label>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Button type="submit" disabled={enviando}>{enviando ? "Criando conta…" : "Criar conta"}</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta? <Link to="/entrar" className="text-primary hover:underline">Entrar</Link>
      </p>
    </ContaLayout>
  );
}
