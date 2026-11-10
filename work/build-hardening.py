from pathlib import Path
base=Path('supabase/migrations/202611090001_initial.sql').read_text()
start=base.index('create function public.workspace_command(')
end=base.index("\ninsert into public.products",start)
fn=base[start:end].replace('create function public.workspace_command(', 'create or replace function public.workspace_command(')
validation='''
 if jsonb_typeof(command) is distinct from 'object' then raise exception 'Request tidak valid.'; end if;
 if kind is null or kind not in ('product','expense','settings','create','pay','cancel') then raise exception 'Operasi tidak didukung.'; end if;
 if kind in ('create','pay','cancel') and (coalesce(command->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') then raise exception 'ID transaksi tidak valid.'; end if;
 if kind='product' then
  if jsonb_typeof(command->'product') is distinct from 'object' then raise exception 'Produk tidak valid.'; end if;
  if jsonb_typeof(command->'product'->'price') is distinct from 'number' or coalesce(command->'product'->>'price','') !~ '^[0-9]+$' then raise exception 'Harga harus rupiah bulat.'; end if;
  if command->'product'->'cost' is distinct from 'null'::jsonb and (jsonb_typeof(command->'product'->'cost') is distinct from 'number' or coalesce(command->'product'->>'cost','') !~ '^[0-9]+$') then raise exception 'HPP harus rupiah bulat atau belum diisi.'; end if;
  if length(coalesce(command->'product'->>'name','')) not between 1 and 100 or length(coalesce(command->'product'->>'description',''))>2000 then raise exception 'Nama atau deskripsi produk tidak valid.'; end if;
  if jsonb_typeof(command->'product'->'active') is distinct from 'boolean' or jsonb_typeof(command->'product'->'available') is distinct from 'boolean' then raise exception 'Status produk tidak valid.'; end if;
  if command->'product'->>'cost'='0' and command->'zeroCostConfirmed' is distinct from 'true'::jsonb then raise exception 'Konfirmasi HPP nol terlebih dahulu.'; end if;
 end if;
 if kind='expense' then
  if jsonb_typeof(command->'expense') is distinct from 'object' or jsonb_typeof(command->'expense'->'amount') is distinct from 'number' or coalesce(command->'expense'->>'amount','') !~ '^[0-9]+$' then raise exception 'Nominal pengeluaran harus rupiah bulat.'; end if;
  if length(coalesce(command->'expense'->>'description','')) not between 1 and 1000 then raise exception 'Deskripsi pengeluaran tidak valid.'; end if;
 end if;
 if kind='pay' and (jsonb_typeof(command->'received') is distinct from 'number' or coalesce(command->>'received','') !~ '^[0-9]+$') then raise exception 'Nominal pembayaran wajib rupiah bulat.'; end if;
 if kind='cancel' and length(coalesce(command->>'reason','')) not between 1 and 1000 then raise exception 'Alasan pembatalan wajib diisi, maksimal 1000 karakter.'; end if;
'''
fn=fn.replace(" case kind\n",validation+" case kind\n",1)
fn=fn.replace("if (item->>'quantity') !~ '^[0-9]+$'", "if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^[0-9]+$'")
fn=fn.replace("  received:=(command->>'received')::bigint;", "  if value->>'method'='qris' and command->'paymentVerified' is distinct from 'true'::jsonb then raise exception 'Periksa pembayaran masuk di aplikasi merchant terlebih dahulu.'; end if;\n  received:=(command->>'received')::bigint;")
fn=fn.replace("'confirmedBy',auth.uid())", "'confirmedBy',auth.uid(),'paymentReference',left(coalesce(command->>'paymentReference',''),100))")
fn=fn.replace("if team_role<>'admin' then raise exception 'Pembatalan lunas khusus admin.'; end if;", "if team_role<>'admin' then raise exception 'Pembatalan lunas khusus admin.'; end if;\n   if command->'refundConfirmed' is distinct from 'true'::jsonb then raise exception 'Konfirmasi pengembalian dana manual terlebih dahulu.'; end if;")
fn=fn.replace("  value:=command->'settings';", "  value:=command->'settings';\n  if jsonb_typeof(value) is distinct from 'object' then raise exception 'Pengaturan tidak valid.'; end if;")
header='''-- Incremental security hardening. Safe to reapply. No business records are removed.
begin;
create table if not exists public.login_attempts (
 bucket text primary key, attempts integer not null default 0,
 started_at timestamptz not null default now()
);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from public,anon,authenticated;
grant all on public.login_attempts to service_role;
create or replace function public.consume_login_attempt(bucket text) returns boolean
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare attempt_count integer;
begin
 if bucket !~ '^[a-f0-9]{64}$' then raise exception 'Invalid bucket'; end if;
 delete from public.login_attempts a where a.started_at < now()-interval '1 day';
 insert into public.login_attempts as a(bucket,attempts,started_at) values(bucket,1,now())
 on conflict on constraint login_attempts_pkey do update set
 attempts=case when a.started_at < now()-interval '15 minutes' then 1 else a.attempts+1 end,
 started_at=case when a.started_at < now()-interval '15 minutes' then now() else a.started_at end
 returning attempts into attempt_count;
 return attempt_count<=8;
end;$$;
revoke all on function public.consume_login_attempt(text) from public,anon,authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;
-- Explicit service grants for server-side provisioning; never granted to browser roles.
grant select,insert,update on public.profiles to service_role;
grant select,insert on public.audit_logs to service_role;
grant usage,select on sequence public.audit_logs_id_seq to service_role;
'''
Path('supabase/migrations/202611100002_security.sql').write_text(header+fn+'\ncommit;\n')
