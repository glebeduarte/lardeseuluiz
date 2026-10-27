import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MolduraSimples, type AreasLsl } from '@/compartilhado';
import { useAuth } from '@/contexts/AuthContext';
import './aluno-noite.css';

// Moldura do aluno na Formação: barra de sistemas no topo, menu da Formação logo abaixo e o conteúdo
// em modo noite, sem barra lateral. Quem é admin e abriu a "Visão do aluno" vê a mesma tela.

const LINKS = [
  { href: '/dashboard', rotulo: 'Início' },
  { href: '/explore', rotulo: 'Cursos' },
  { href: '/avisos', rotulo: 'Avisos' },
  { href: '/biblioteca', rotulo: 'Biblioteca' },
  { href: '/minha-frequencia', rotulo: 'Minha frequência' },
];

export function AlunoLayout({ children, areas, usuario, navegar, facilitador, admin }: {
  children: ReactNode;
  areas: AreasLsl | null;
  usuario: { nome?: string | null; foto?: string | null };
  navegar: (href: string) => boolean;
  facilitador?: boolean;
  admin?: boolean;
}) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const sair = async () => { await signOut(); window.location.assign('/login'); };

  // A barra de sistemas e o fundo da página entram no modo noite enquanto a área do aluno está aberta
  useEffect(() => {
    document.body.classList.add('lsl-noite-pagina');
    return () => document.body.classList.remove('lsl-noite-pagina');
  }, []);

  const ativo = (href: string) => (href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/'));

  const menu = (
    <nav className="aluno-menu" aria-label="Formação">
      <div className="aluno-coluna aluno-menu__linha">
        <span className="aluno-menu__nome">Formação</span>
        {LINKS.map((l) => (
          <Link key={l.href} to={l.href} className={`aluno-menu__link ${ativo(l.href) ? 'aluno-menu__link--ativo' : ''}`}
            aria-current={ativo(l.href) ? 'page' : undefined}>
            {l.rotulo}
          </Link>
        ))}
        <span className="aluno-menu__fim" />
        {facilitador && <Link to="/admin/attendance" className="aluno-menu__link">Lançar presença</Link>}
        {admin && <Link to="/admin" className="aluno-menu__link">Voltar à gestão</Link>}
      </div>
    </nav>
  );

  return (
    <MolduraSimples sistema="formacao" areas={areas} usuario={usuario} navegar={navegar} avisos={menu} semOQueFazer aoSair={sair}>
      <div className="lsl-noite min-h-[calc(100vh-108px)]">{children}</div>
    </MolduraSimples>
  );
}
