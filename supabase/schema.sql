-- =====================================================================
--  Clínica de Estética — esquema do banco de dados (Supabase / Postgres)
--  Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Membros: lista de pessoas autorizadas a usar o sistema
--    Só quem estiver nesta tabela consegue ver ou alterar qualquer dado.
-- ---------------------------------------------------------------------
create table if not exists public.membros (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nome       text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_membro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.membros where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2. Tabelas principais
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id               bigint generated always as identity primary key,
  nome             text not null,
  telefone         text,
  email            text,
  data_nascimento  date,
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.tratamentos (
  id            bigint generated always as identity primary key,
  nome          text not null unique,
  preco_padrao  numeric(10,2) not null default 0 check (preco_padrao >= 0),
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.pacotes (
  id              bigint generated always as identity primary key,
  cliente_id      bigint not null references public.clientes (id) on delete cascade,
  tratamento_id   bigint references public.tratamentos (id) on delete set null,
  descricao       text not null,
  total_sessoes   integer not null check (total_sessoes > 0),
  valor_total     numeric(10,2) not null default 0 check (valor_total >= 0),
  data_compra     date not null default current_date,
  observacoes     text,
  created_at      timestamptz not null default now()
);

create table if not exists public.atendimentos (
  id             bigint generated always as identity primary key,
  cliente_id     bigint not null references public.clientes (id) on delete cascade,
  tratamento_id  bigint references public.tratamentos (id) on delete set null,
  pacote_id      bigint references public.pacotes (id) on delete set null,
  data_hora      timestamptz not null,
  status         text not null default 'agendado'
                 check (status in ('agendado', 'realizado', 'faltou', 'cancelado')),
  -- valor cobrado por esta sessão avulsa (sessões de pacote costumam ser 0,
  -- porque o pagamento é feito no pacote)
  valor          numeric(10,2) not null default 0 check (valor >= 0),
  observacoes    text,
  created_at     timestamptz not null default now()
);

-- Um pagamento pode ser de um atendimento OU de um pacote.
-- Pagamentos parciais = vários pagamentos para o mesmo atendimento/pacote.
create table if not exists public.pagamentos (
  id              bigint generated always as identity primary key,
  cliente_id      bigint not null references public.clientes (id) on delete cascade,
  atendimento_id  bigint references public.atendimentos (id) on delete cascade,
  pacote_id       bigint references public.pacotes (id) on delete cascade,
  valor           numeric(10,2) not null check (valor > 0),
  data            date not null default current_date,
  forma           text not null default 'pix'
                  check (forma in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia', 'outro')),
  observacoes     text,
  created_at      timestamptz not null default now(),
  constraint pagamento_um_destino check (
    (atendimento_id is not null)::int + (pacote_id is not null)::int = 1
  )
);

create index if not exists idx_atendimentos_cliente  on public.atendimentos (cliente_id);
create index if not exists idx_atendimentos_data     on public.atendimentos (data_hora);
create index if not exists idx_atendimentos_pacote   on public.atendimentos (pacote_id);
create index if not exists idx_pacotes_cliente       on public.pacotes (cliente_id);
create index if not exists idx_pagamentos_cliente    on public.pagamentos (cliente_id);
create index if not exists idx_pagamentos_atend      on public.pagamentos (atendimento_id);
create index if not exists idx_pagamentos_pacote     on public.pagamentos (pacote_id);

-- updated_at automático em clientes
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Segurança (Row Level Security): só membros acessam
-- ---------------------------------------------------------------------
alter table public.membros      enable row level security;
alter table public.clientes     enable row level security;
alter table public.tratamentos  enable row level security;
alter table public.pacotes      enable row level security;
alter table public.atendimentos enable row level security;
alter table public.pagamentos   enable row level security;

drop policy if exists "membro ve a si mesmo" on public.membros;
create policy "membro ve a si mesmo" on public.membros
  for select to authenticated using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['clientes', 'tratamentos', 'pacotes', 'atendimentos', 'pagamentos'] loop
    execute format('drop policy if exists "membros acesso total" on public.%I', t);
    execute format(
      'create policy "membros acesso total" on public.%I for all to authenticated using (public.is_membro()) with check (public.is_membro())',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. Views com totais calculados (respeitam o RLS via security_invoker)
-- ---------------------------------------------------------------------
create or replace view public.v_atendimentos
with (security_invoker = true) as
select
  a.*,
  c.nome  as cliente_nome,
  t.nome  as tratamento_nome,
  p.descricao as pacote_descricao,
  coalesce(pg.total, 0) as valor_pago,
  greatest(a.valor - coalesce(pg.total, 0), 0) as saldo,
  case
    when a.valor = 0 then 'na'                         -- não se aplica (ex.: sessão de pacote)
    when coalesce(pg.total, 0) >= a.valor then 'pago'
    when coalesce(pg.total, 0) > 0 then 'parcial'
    else 'pendente'
  end as status_pagamento
from public.atendimentos a
join public.clientes c on c.id = a.cliente_id
left join public.tratamentos t on t.id = a.tratamento_id
left join public.pacotes p on p.id = a.pacote_id
left join lateral (
  select sum(valor) as total from public.pagamentos where atendimento_id = a.id
) pg on true;

create or replace view public.v_pacotes
with (security_invoker = true) as
select
  p.*,
  c.nome as cliente_nome,
  t.nome as tratamento_nome,
  coalesce(s.realizadas, 0) as sessoes_realizadas,
  coalesce(s.agendadas, 0)  as sessoes_agendadas,
  greatest(p.total_sessoes - coalesce(s.realizadas, 0), 0) as sessoes_restantes,
  coalesce(pg.total, 0) as valor_pago,
  greatest(p.valor_total - coalesce(pg.total, 0), 0) as saldo,
  case
    when p.valor_total = 0 then 'na'
    when coalesce(pg.total, 0) >= p.valor_total then 'pago'
    when coalesce(pg.total, 0) > 0 then 'parcial'
    else 'pendente'
  end as status_pagamento
from public.pacotes p
join public.clientes c on c.id = p.cliente_id
left join public.tratamentos t on t.id = p.tratamento_id
left join lateral (
  select
    count(*) filter (where status = 'realizado') as realizadas,
    count(*) filter (where status = 'agendado')  as agendadas
  from public.atendimentos where pacote_id = p.id
) s on true
left join lateral (
  select sum(valor) as total from public.pagamentos where pacote_id = p.id
) pg on true;

create or replace view public.v_clientes
with (security_invoker = true) as
select
  c.*,
  (select max(data_hora) from public.atendimentos
     where cliente_id = c.id and status = 'realizado') as ultima_visita,
  (select min(data_hora) from public.atendimentos
     where cliente_id = c.id and status = 'agendado'
       -- a partir de hoje (fuso de Brasília)
       and (data_hora at time zone 'America/Sao_Paulo')::date >= (now() at time zone 'America/Sao_Paulo')::date
  ) as proxima_sessao,
  coalesce((select sum(saldo) from public.v_atendimentos
     where cliente_id = c.id and status <> 'cancelado'), 0)
  + coalesce((select sum(saldo) from public.v_pacotes where cliente_id = c.id), 0) as saldo_devedor
from public.clientes c;

grant select on public.v_atendimentos, public.v_pacotes, public.v_clientes to authenticated;

-- ---------------------------------------------------------------------
-- 5. Alguns tratamentos de exemplo (edite ou apague depois pelo sistema)
-- ---------------------------------------------------------------------
insert into public.tratamentos (nome, preco_padrao) values
  ('Limpeza de pele', 180),
  ('Drenagem linfática', 150),
  ('Peeling', 250),
  ('Toxina botulínica', 900),
  ('Preenchimento labial', 1200)
on conflict (nome) do nothing;

-- =====================================================================
--  DEPOIS DE RODAR: para liberar uma pessoa
--  1) Supabase > Authentication > Users > "Add user" (e-mail + senha)
--  2) Rode (trocando o e-mail e o nome):
--
--     insert into public.membros (user_id, nome)
--     select id, 'Nome da Pessoa' from auth.users where email = 'pessoa@email.com';
--
--  Para remover o acesso:
--     delete from public.membros where user_id =
--       (select id from auth.users where email = 'pessoa@email.com');
-- =====================================================================
