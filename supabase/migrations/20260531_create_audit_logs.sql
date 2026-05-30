-- Migration: create audit_logs table
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_audit_logs_actor_id on audit_logs(actor_id);
