# Sistema de Clientes — Clínica de Estética

Sistema web (computador e celular) para guardar clientes, sessões, pacotes e pagamentos.
Feito com **React + Vite**, banco de dados **Supabase** e hospedagem no **Render**.

## O que o sistema faz

- **Clientes**: cadastro com nome, telefone/WhatsApp, e-mail, nascimento e observações (alergias etc.).
  Pesquisa por nome **sem precisar de acento ou maiúscula** (também acha pelo telefone).
  Filtros: com pagamento pendente, com sessão marcada, sem vir há 60+ dias.
- **Sessões**: data/hora, tratamento, valor, situação (agendado, realizado, faltou, cancelado).
  “Dias que veio” = histórico; “dias que vai vir” = próximas sessões.
- **Pacotes**: ex. “Drenagem · 10 sessões”. Mostra quantas foram feitas, quantas faltam e quanto falta pagar.
- **Pagamentos parciais**: cada sessão ou pacote pode receber vários pagamentos. O sistema calcula
  sozinho se está *Pago*, *Parcial* ou *Não pago*.
- **Financeiro**: recebido no mês, total a receber, por forma de pagamento, exportar planilha (CSV/Excel).
- **Tratamentos**: lista de serviços com preço padrão (preenche o valor automaticamente).
- **Acesso restrito**: só pessoas que você liberar conseguem entrar.

Tudo é editável e pode ser excluído.

---

## Passo 1 — Criar o banco no Supabase

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
   Escolha a região **South America (São Paulo)**.
2. No menu do projeto, abra **SQL Editor → New query**, cole todo o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. **Bloquear cadastros públicos** (importante):
   **Authentication → Sign In / Providers → Email** → desligue **“Allow new users to sign up”**.
   Assim ninguém cria conta sozinho.
4. **Criar as pessoas que vão usar**:
   **Authentication → Users → Add user → Create new user** (e-mail + senha, marque *Auto Confirm User*).
5. **Liberar cada pessoa** no SQL Editor (troque nome e e-mail):

   ```sql
   insert into public.membros (user_id, nome)
   select id, 'Ana Paula' from auth.users where email = 'ana@email.com';
   ```

   Quem tem login mas não está em `membros` vê a mensagem “Acesso não autorizado” e não acessa nenhum dado.

6. Pegue as chaves em **Project Settings → API**:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

   > A chave *anon* pode ficar no site: a proteção vem das regras de segurança (RLS) do `schema.sql`.
   > **Nunca** use a chave `service_role` no site.

## Passo 2 — Rodar no seu computador (opcional)

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
cp .env.example .env      # depois edite o .env com as chaves do Supabase
npm install
npm run dev
```

Abra <http://localhost:5173>.

## Passo 3 — Publicar no Render

1. Envie esta pasta para um repositório no **GitHub** (pode ser privado).
2. No Render: **New → Blueprint**, escolha o repositório. Ele lê o `render.yaml` e cria um *Static Site*
   (plano gratuito).
3. Quando pedir, preencha as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_NOME_CLINICA`.
4. Após o deploy, o Render mostra o endereço (ex.: `https://clinica-estetica.onrender.com`).
   Abra no celular e use **“Adicionar à tela inicial”** para ficar como um app.

> Se mudar alguma variável no Render, faça **Manual Deploy → Clear build cache & deploy**:
> as variáveis `VITE_` entram no site na hora do build.

Opcional: em Supabase → **Authentication → URL Configuration**, coloque o endereço do Render em *Site URL*.

## Backup

O Supabase gratuito não faz backup automático que você possa baixar. Recomendações:
- Exporte os pagamentos do mês pela tela **Financeiro → Exportar planilha**.
- De tempos em tempos, em Supabase → **Table Editor**, abra cada tabela e use **Export → CSV**.

## LGPD

Os dados incluem informações de saúde (alergias, procedimentos). Mantenha poucas pessoas com acesso,
use senhas fortes, remova o acesso de quem sair da equipe (apague da tabela `membros`) e peça
autorização da cliente para guardar os dados.

## Estrutura

```
supabase/schema.sql      tabelas, segurança (RLS) e cálculos de saldo
src/pages/               telas: Painel, Clientes, ClienteDetalhe, Agenda, Financeiro, Tratamentos, Login
src/components/          formulários, itens de lista, componentes visuais
src/lib/                 conexão com Supabase, formatação de datas/moeda, login
src/styles.css           visual (cores no topo do arquivo, em :root)
render.yaml              configuração do Render
```

Para mudar as cores, edite as variáveis no começo de `src/styles.css` (ex.: `--accent`).
