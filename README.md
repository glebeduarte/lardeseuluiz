# Plataforma LSL

Sistema único do Lar de Seu Luiz: site institucional, login único e os módulos de Formação, Atendimento, Governança e Ações sociais, sobre uma base comum de pessoas, cargos e funções.

## Base técnica
Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, react-router e TanStack Query no frontend. Supabase (Auth, Postgres, Storage, Edge Functions) no backend. Hospedagem estática na Vercel. Motivos em [docs/decisoes.md](docs/decisoes.md).

## Rodar localmente
```bash
cp .env.example .env   # preencha a chave publicável do Supabase
npm install
npm run dev            # http://localhost:8080
```

## Estrutura
```
src/
  pages/site/      site institucional (público)
  pages/conta/     login e Minha área
  components/ui/   componentes de interface (shadcn/ui)
  lib/             cliente Supabase e utilitários
supabase/
  migrations/      estrutura do banco, em ordem
  functions/       Edge Functions
docs/
  decisoes.md      decisões do projeto
  vocabulario.md   termos institucionais obrigatórios
  identidade.md    cores, fontes e logo
  inventario/      levantamento dos sistemas antigos no Lovable
```

## Regras do repositório
- Repositório privado. Nenhum dado pessoal, cópia de banco, senha ou chave entra no Git.
- Toda mudança no banco é uma migração em `supabase/migrations`.
- Textos de interface seguem [docs/vocabulario.md](docs/vocabulario.md).
