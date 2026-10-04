# 🍳 Cozinha da Tere

Loja de cantina para o trabalho: o funcionário se cadastra, pega o que quiser na cozinha, anota no carrinho e paga todo dia 1. A administradora acompanha os pedidos **em tempo real** e gera o fechamento do mês em PDF, separado por equipe.

**Tecnologias:** React + Vite (HTML, CSS e JavaScript) · Bootstrap 5 (layout responsivo: celular, tablet e desktop) · Vercel (hospedagem e API) · Neon (banco PostgreSQL).

## Como funciona

| Aba | O que faz |
|---|---|
| Cadastro | Nome, número, equipe (EVA, VIVA, ED, BANCAR, DEV), foto e senha. Login = número + senha. |
| Meus gastos | Escolhe o mês e vê tudo o que consumiu; cria uma nova senha. |
| Loja | Almoço da semana, 4 categorias, carrinho. Foto do usuário no canto superior direito. |
| Administração | Pedidos em tempo real com aviso, almoço da semana, novo produto, **remover produto**, fechamento em PDF/CSV, troca de login e senha. |

Tempo real: a página consulta a API a cada poucos segundos (4 s na administração). Quando um produto é removido, **todo mundo recebe o aviso** "🗑️ produto foi removido da loja".

## Estrutura

```
api/index.js      → API (login, pedidos, produtos...). Roda na Vercel.
api/_lib.js       → conexão com o Neon, criação automática das tabelas, login (JWT)
api/_catalog.js   → lista inicial de produtos e preços
src/App.jsx       → telas em React + Bootstrap
src/styles.css    → cores da marca sobre o Bootstrap
```

## Passo a passo

### 1. Instalar as ferramentas
- [Node.js 18+](https://nodejs.org) e [Git](https://git-scm.com)
- Conta grátis no [GitHub](https://github.com) e na [Vercel](https://vercel.com) (entre com o GitHub)

### 2. Rodar o projeto no seu computador
```bash
npm install
npm run build   # confere se compila
```

### 3. Subir para o GitHub
1. No GitHub: **New repository** → nome `cozinha-da-tere` → **Create** (sem README).
2. Na pasta do projeto:
```bash
git init
git add .
git commit -m "Primeira versão da Cozinha da Tere"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/cozinha-da-tere.git
git push -u origin main
```

### 4. Publicar na Vercel
1. Em vercel.com: **Add New → Project** → escolha o repositório → **Import**.
2. A Vercel reconhece o Vite sozinha. **Ainda não clique em Deploy** se for criar o banco antes; ou faça o deploy e redeploy no passo 6.

### 5. Criar o banco Neon dentro da Vercel
1. No projeto, aba **Storage → Create Database → Neon** (Postgres) → crie e **Connect to Project**.
2. A Vercel cria a variável `DATABASE_URL` automaticamente. Não precisa criar tabelas: o sistema cria na primeira vez que for aberto.

### 6. Variáveis de ambiente
Em **Settings → Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `JWT_SECRET` | um texto grande e aleatório (ex.: 40 letras e números) |
| `ADMIN_LOGIN` | login da administradora |
| `ADMIN_PASSWORD` | senha da administradora (mín. 6) |

Depois, **Deployments → ⋯ → Redeploy**.

### 7. Primeiro acesso
1. Abra o link da Vercel e crie seu cadastro.
2. Na aba **Administração**, entre com `ADMIN_LOGIN` e `ADMIN_PASSWORD`. No primeiro login a senha é guardada criptografada no banco; depois você pode trocá-la na própria tela (e apagar `ADMIN_PASSWORD` da Vercel se quiser).
3. Passe o link para a equipe.

### 8. Testar localmente com a API (opcional)
```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

### 9. Atualizações
Mexeu no código? `git add . && git commit -m "mensagem" && git push` — a Vercel publica sozinha.

## Dicas e problemas comuns
- **"Erro no servidor"**: confira se `DATABASE_URL` e `JWT_SECRET` existem e se fez Redeploy.
- **Produto removido volta?** Não volta: ele é apagado do banco. Para recolocar, use "Novo produto".
- Fotos são reduzidas e guardadas no próprio banco (plano grátis do Neon aguenta bem uma cantina).
- Senhas dos usuários são criptografadas (bcrypt); quem esqueceu a senha precisa estar logado para trocá-la.
