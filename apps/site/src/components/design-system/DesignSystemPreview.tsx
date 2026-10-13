import { useState } from "react";

import {
  alerts,
  associates,
  colorFamilies,
  infoCards,
  navLinks,
  radiusScale,
  secretarias,
  siteSections,
  spacingScale,
  statCards,
  typeScale,
} from "./design-system-data";

const DesignSystemPreview = () => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard?.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((current) => (current === hex ? null : current)), 800);
    } catch {
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((current) => (current === hex ? null : current)), 800);
    }
  };

  return (
    <main className="ds-shell">
      <nav className="ds-nav" aria-label="Seções do design system">
        <a className="ds-nav-brand" href="#top">
          Design System <span>LSL</span>
        </a>
        <ul className="ds-nav-links">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="ds-page" id="top">
        <section className="ds-hero">
          <div className="ds-hero-badge">✦ Design System v1.0</div>
          <h1>Lar de <em>Seu Luiz</em><br />Design System</h1>
          <p>
            Guia visual completo para o Site Institucional e o Sistema de Governança — identidade coerente,
            moderna e fiel aos valores da casa.
          </p>
        </section>

        <section className="ds-section" id="cores">
          <h2 className="ds-section-title">🎨 Paleta de Cores</h2>
          <p className="ds-section-sub">
            Derivada diretamente da logo institucional. Cada cor carrega um papel semântico no sistema.
          </p>

          <div className="color-grid">
            {colorFamilies.map((family) => (
              <div key={family.label} className={`color-family${family.wide ? " is-wide" : ""}`}>
                <div className="color-family-label">{family.label}</div>
                <div className={`color-swatches${family.wide ? " neutral-grid" : ""}`}>
                  {family.swatches.map((swatch) => (
                    <button
                      key={swatch.hex}
                      type="button"
                      className={`color-swatch swatch-${swatch.tone}${copiedHex === swatch.hex ? " is-copied" : ""}`}
                      onClick={() => handleCopy(swatch.hex)}
                      aria-label={`Copiar ${swatch.hex}`}
                    >
                      <span className="color-swatch-name">{swatch.name}</span>
                      <span className="color-swatch-hex">{swatch.hex}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ds-section" id="tipografia">
          <h2 className="ds-section-title">✍️ Tipografia</h2>
          <p className="ds-section-sub">
            Dois pesos tipográficos: <strong>Playfair Display</strong> para títulos e <strong>DM Sans</strong> para corpo,
            com <strong>DM Mono</strong> para tokens e metadados.
          </p>

          <div className="type-showcase-grid">
            <article className="type-showcase-card">
              <div className="type-showcase-label">Display — Playfair Display</div>
              <div className="type-showcase-display">Amor, Luz e<br />Evolução</div>
              <div className="type-showcase-alpha">abcdefghijklmnopqrstuvwxyz<br />ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />0123456789</div>
            </article>
            <article className="type-showcase-card">
              <div className="type-showcase-label">Body — DM Sans</div>
              <div className="type-showcase-body">
                O Lar de Seu Luiz é um espaço de acolhimento, estudo e prática da Doutrina Espírita, aberto a todos
                que buscam crescimento espiritual e fraternidade.
              </div>
              <div className="type-showcase-alpha">abcdefghijklmnopqrstuvwxyz<br />ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
            </article>
          </div>

          <div className="type-scale-board">
            {typeScale.map((item) => (
              <div key={item.name} className="type-row">
                <div className="type-meta">
                  <div className="type-meta-name">{item.name}</div>
                  <div className="type-meta-spec">{item.spec}</div>
                </div>
                <div className={item.className}>{item.preview}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ds-section" id="componentes">
          <h2 className="ds-section-title">🔘 Componentes</h2>
          <p className="ds-section-sub">
            Botões, badges, status, formulários e alertas — building blocks do sistema.
          </p>

          <div className="comp-group-title">Botões</div>
          <div className="comp-row ds-gap-bottom">
            <button className="ds-btn ds-btn-primary" type="button">✦ Ação Principal</button>
            <button className="ds-btn ds-btn-secondary" type="button">Confirmar</button>
            <button className="ds-btn ds-btn-gold" type="button">Destaque</button>
            <button className="ds-btn ds-btn-danger" type="button">Excluir</button>
            <button className="ds-btn ds-btn-outline" type="button">Saiba mais</button>
            <button className="ds-btn ds-btn-ghost" type="button">Cancelar</button>
          </div>
          <div className="comp-row ds-gap-large">
            <button className="ds-btn ds-btn-primary ds-btn-sm" type="button">Pequeno</button>
            <button className="ds-btn ds-btn-primary" type="button">Normal</button>
            <button className="ds-btn ds-btn-primary ds-btn-lg" type="button">Grande</button>
          </div>

          <div className="comp-group-title">Badges</div>
          <div className="comp-row ds-gap-large">
            <span className="badge badge-blue">Aprovado</span>
            <span className="badge badge-teal">Em andamento</span>
            <span className="badge badge-gold">Pendente</span>
            <span className="badge badge-red">Urgente</span>
            <span className="badge badge-grey">Arquivado</span>
          </div>

          <div className="comp-group-title">Status de Associados</div>
          <div className="comp-row ds-gap-large">
            <span className="pill pill-fundador">Fundador</span>
            <span className="pill pill-efetivo">Efetivo</span>
            <span className="pill pill-colaborador">Colaborador</span>
            <span className="pill pill-frequentador">Frequentador</span>
            <span className="pill pill-ativo">Ativo</span>
            <span className="pill pill-inativo">Inadimplente</span>
          </div>

          <div className="comp-group-title">Avatares</div>
          <div className="comp-row ds-gap-large">
            <div className="avatar avatar-sm avatar-blue">ML</div>
            <div className="avatar avatar-md avatar-teal">AL</div>
            <div className="avatar avatar-lg avatar-gold">RG</div>
            <div className="avatar avatar-md avatar-red">CB</div>
          </div>

          <div className="comp-group-title">Alertas</div>
          <div className="alerts-stack ds-gap-large">
            {alerts.map((alert) => (
              <div key={alert.title} className={`alert alert-${alert.tone}`}>
                <span className="alert-icon" aria-hidden="true">{alert.icon}</span>
                <div>
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-text">{alert.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="comp-group-title">Formulário</div>
          <form className="form-demo" onSubmit={(event) => event.preventDefault()}>
            <div className="field">
              <label className="field-label" htmlFor="nome-completo">
                Nome completo <span>*</span>
              </label>
              <input className="field-input" id="nome-completo" type="text" placeholder="Ex: Maria da Silva" />
              <span className="field-hint">Conforme documento de identidade</span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label className="field-label" htmlFor="cpf">
                  CPF <span>*</span>
                </label>
                <input className="field-input error" id="cpf" type="text" defaultValue="123.456.789" placeholder="000.000.000-00" />
                <span className="field-error">CPF inválido</span>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="nascimento">Data de nascimento</label>
                <input className="field-input" id="nascimento" type="date" />
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="categoria">
                Categoria <span>*</span>
              </label>
              <select className="field-select" id="categoria" defaultValue="Selecione uma categoria">
                <option>Selecione uma categoria</option>
                <option>Associado Fundador</option>
                <option>Associado Efetivo</option>
                <option>Colaborador</option>
                <option>Frequentador</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="observacoes">Observações</label>
              <textarea className="field-textarea" id="observacoes" placeholder="Informações adicionais..." />
            </div>
            <div className="comp-row">
              <button className="ds-btn ds-btn-primary" type="button">Salvar associado</button>
              <button className="ds-btn ds-btn-ghost" type="button">Cancelar</button>
            </div>
          </form>
        </section>

        <section className="ds-section" id="cards">
          <h2 className="ds-section-title">🃏 Cards e Painéis</h2>
          <p className="ds-section-sub">Stat cards para o painel gerencial e information cards para listas e módulos.</p>

          <div className="comp-group-title ds-tight-title">Stat Cards — Painel da Diretoria</div>
          <div className="stat-grid ds-gap-large">
            {statCards.map((card) => (
              <article key={card.label} className={`stat-card stat-${card.tone}`}>
                <div className="stat-label">{card.label}</div>
                <div className={`stat-value stat-value-${card.tone}`}>{card.value}</div>
                <div className={`stat-delta ${card.deltaTone}`}>{card.delta}</div>
              </article>
            ))}
          </div>

          <div className="comp-group-title ds-tight-title">Information Cards</div>
          <div className="card-grid">
            {infoCards.map((card) => (
              <article key={card.title} className={`card card-accent-${card.accent}`}>
                <div className="card-body">
                  <div className={`card-icon card-icon-${card.iconTone}`}>{card.icon}</div>
                  <div className="card-title">{card.title}</div>
                  <div className="card-text">{card.text}</div>
                </div>
                <div className="card-footer">
                  <span className="card-footer-meta">{card.footer}</span>
                  <button className={`ds-btn ds-btn-sm ${card.buttonClass}`} type="button">Acessar →</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ds-section" id="tabela">
          <h2 className="ds-section-title">📊 Tabelas</h2>
          <p className="ds-section-sub">Padrão de listagem para associados, financeiro e eventos.</p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Associado</th>
                  <th>Categoria</th>
                  <th>Ingresso</th>
                  <th>Situação</th>
                  <th>Contribuição</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {associates.map((associate) => (
                  <tr key={associate.email}>
                    <td>
                      <div className="table-person">
                        <div className={`avatar avatar-sm avatar-${associate.avatar}`}>{associate.initials}</div>
                        <div>
                          <div className="td-name">{associate.name}</div>
                          <div className="td-sub">{associate.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pill ${associate.category.className}`}>{associate.category.label}</span>
                    </td>
                    <td><span className="table-meta">{associate.ingresso}</span></td>
                    <td>
                      <span className={`pill ${associate.status.className}`}>{associate.status.label}</span>
                    </td>
                    <td><span className={associate.contributionClass}>{associate.contribution}</span></td>
                    <td><button className="ds-btn ds-btn-sm ds-btn-ghost" type="button">···</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ds-section" id="secretarias">
          <h2 className="ds-section-title">🏛️ Cards de Secretarias</h2>
          <p className="ds-section-sub">Padrão visual para o módulo de Secretarias — presente no sistema e no site.</p>

          <div className="sec-grid">
            {secretarias.map((item) => (
              <article key={item.name} className="sec-card">
                <div className={`sec-icon ${item.iconClass}`}>{item.icon}</div>
                <div className="sec-body">
                  <div className="sec-name">{item.name}</div>
                  <div className="sec-coord">{item.coord}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ds-section" id="site">
          <h2 className="ds-section-title">🌐 Prévia do Site — Identidade Paralax</h2>
          <p className="ds-section-sub">
            Direção visual para o site institucional: fundo escuro no hero, revelação de conteúdo, cores da marca como destaques.
          </p>

          <div className="parallax-preview">
            <div className="parallax-content">
              <div className="parallax-brand-row">
                <div className="parallax-brand-icon">🌳</div>
                <span className="parallax-brand-name">Lar de Seu Luiz</span>
              </div>
              <h2>
                Um lugar de <em>Luz</em>,<br />Caridade e Evolução
              </h2>
              <p>Centro espírita de acolhimento, estudo e serviço — aberto a todos que buscam a verdade.</p>
              <div className="comp-row parallax-actions">
                <button className="ds-btn ds-btn-gold ds-btn-lg" type="button">Conheça nossa missão</button>
                <button className="ds-btn ds-btn-ghost-inverse ds-btn-lg" type="button">Ver agenda →</button>
              </div>
            </div>
            <div className="parallax-sections" aria-hidden="true">
              <div className="parallax-dot active" />
              <div className="parallax-dot" />
              <div className="parallax-dot" />
              <div className="parallax-dot" />
              <div className="parallax-dot" />
            </div>
          </div>

          <div className="site-flow-card">
            <div className="site-flow-label">Seções do Site — Ordem de Scroll</div>
            <div className="site-flow-list">
              {siteSections.map((section, index) => (
                <div key={section.step} className="site-flow-row">
                  <div className="site-flow-marker">
                    <div className={`site-flow-step ${section.tone}`}>{section.step}</div>
                    {index < siteSections.length - 1 ? <div className="site-flow-line" /> : null}
                  </div>
                  <div className="site-flow-copy">
                    <div className="site-flow-title">{section.title}</div>
                    <div className="site-flow-text">{section.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dark-preview">
            <div className="dark-preview-label">Modo Escuro — Header / Hero do Sistema</div>
            <div className="dark-preview-header">
              <div className="parallax-brand-icon">🌳</div>
              <div>
                <div className="dark-preview-brand">Lar de Seu Luiz</div>
                <div className="dark-preview-sub">Área Restrita — Diretoria</div>
              </div>
              <div className="dark-preview-meta">
                <span className="badge badge-teal">Sistema v1.0</span>
                <div className="avatar avatar-sm avatar-gold">ML</div>
              </div>
            </div>
          </div>
        </section>

        <section className="ds-section" id="espacamento">
          <h2 className="ds-section-title">📐 Espaçamento & Bordas</h2>
          <p className="ds-section-sub">Grid de 8px. Tokens de espaçamento para consistência em toda a interface.</p>

          <div className="spacing-layout">
            <div>
              <div className="comp-group-title ds-tight-title">Escala de Espaçamento</div>
              <div className="spacing-demo">
                {spacingScale.map((space) => (
                  <div key={space.label} className="spacing-row">
                    <div className="spacing-block" style={{ width: `${space.width}px`, height: "20px" }} />
                    <div className="spacing-info">{space.label}: {space.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="comp-group-title ds-tight-title">Bordas Arredondadas</div>
              <div className="radius-demo-list">
                {radiusScale.map((radius) => (
                  <div key={radius.label} className="spacing-row">
                    <div className={`radius-shape ${radius.className}`} />
                    <div className="spacing-info">{radius.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="ds-footer">
          <div className="ds-footer-brand">Lar de Seu Luiz</div>
          Design System v1.0 — Para validação antes do PDR Lovable
        </footer>
      </div>
    </main>
  );
};

export default DesignSystemPreview;
