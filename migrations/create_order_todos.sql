-- Migration: Create order_todos table
-- Run this in Supabase SQL Editor

create table if not exists order_todos (
  id          bigserial primary key,
  order_id    int references orders(id) on delete cascade,
  task_key    text not null,
  label       text not null,
  done        boolean default false,
  skipped     boolean default false,
  parent_key  text,
  sort_order  int default 0,
  meta        jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_order_todos_order_id on order_todos(order_id);
create index if not exists idx_order_todos_done on order_todos(done);

-- Enable RLS (adjust policies as needed for your auth setup)
alter table order_todos enable row level security;

create policy "Allow all for authenticated users"
  on order_todos
  for all
  to authenticated
  using (true)
  with check (true);
