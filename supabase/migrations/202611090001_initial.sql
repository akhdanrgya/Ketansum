-- Ketansum baseline. Run on a new Supabase project via SQL Editor or CLI.
-- No production users, transactions, or invented cost values are seeded.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '', role text not null check(role in ('admin','cashier')),
 active boolean not null default true
);
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 category text not null check(category in ('Ketan Susu','Dimsum')), description text not null default '',
 price bigint not null check(price between 0 and 100000000), active boolean not null default true,
 available boolean not null default true, art integer not null default 0 check(art between 0 and 5),
 image text not null default '', created_at timestamptz not null default now()
);
create table public.product_costs (
 product_id uuid primary key references public.products(id), cost bigint check(cost between 0 and 100000000)
);
create table public.orders (
 id uuid primary key, cashier_id uuid not null references public.profiles(id),
 payload jsonb not null, created_at timestamptz not null default now()
);
create index orders_cashier_idx on public.orders(cashier_id,created_at desc);
create table public.reversals (
 order_id uuid primary key references public.orders(id), actor_id uuid not null references public.profiles(id),
 reason text not null, created_at timestamptz not null default now()
);
create table public.expenses (
 id uuid primary key, date date not null, category text not null, description text not null check(length(trim(description))>0),
 amount bigint not null check(amount between 1 and 100000000000), created_by uuid not null references public.profiles(id)
);
create table public.settings (
 id integer primary key check(id=1), value jsonb not null
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
 action text not null, entity_id text, created_at timestamptz not null default now()
);
-- Every table has RLS. Transaction mutations only occur through restricted RPCs.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.orders enable row level security;
alter table public.reversals enable row level security;
alter table public.expenses enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.profiles,public.products,public.product_costs,public.orders,public.reversals,public.expenses,public.settings,public.audit_logs from anon,authenticated;
grant select on public.profiles,public.products,public.settings to authenticated;
grant select on public.products,public.settings to anon;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy public_menu on public.products for select to anon,authenticated using(active=true);
create policy public_settings on public.settings for select to anon,authenticated using(true);

create function public.current_team_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid() and active=true;
$$;
revoke all on function public.current_team_role() from public,anon;
grant execute on function public.current_team_role() to authenticated;

create function public.read_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare team_role text := public.current_team_role(); result jsonb;
begin
 if team_role is null then raise exception 'Akses tim diperlukan.'; end if;
 select jsonb_build_object(
 'role',team_role,
 'products',coalesce((select jsonb_agg(to_jsonb(p)-'created_at'||jsonb_build_object('cost',case when team_role='admin' then c.cost else case when c.cost is null then null else 0 end end) order by p.created_at,p.art,p.id) from public.products p left join public.product_costs c on p.id=c.product_id),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(case when team_role='admin' then o.payload else o.payload||jsonb_build_object('items',(select jsonb_agg(item-'cost'||jsonb_build_object('cost',0)) from jsonb_array_elements(o.payload->'items') item)) end order by o.created_at desc) from public.orders o where team_role='admin' or o.cashier_id=auth.uid()),'[]'::jsonb),
 'expenses',case when team_role='admin' then coalesce((select jsonb_agg(to_jsonb(e)-'created_by' order by e.date desc) from public.expenses e),'[]'::jsonb) else '[]'::jsonb end,
 'settings',(select value from public.settings where id=1)
 ) into result;
 return result;
end;
$$;
revoke all on function public.read_workspace() from public,anon;
grant execute on function public.read_workspace() to authenticated;

create function public.workspace_command(command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare
 team_role text := public.current_team_role(); kind text := command->>'type';
 value jsonb; item jsonb; entries jsonb := '[]'::jsonb; entry public.products%rowtype;
 order_row public.orders%rowtype; target_id uuid; unit_cost bigint; qty integer;
 total bigint := 0; received bigint; event_time text := to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if team_role is null then raise exception 'Akses tim diperlukan.'; end if;
 if kind in ('product','expense','settings') and team_role<>'admin' then raise exception 'Akses khusus admin.'; end if;
 case kind
 when 'product' then
  value:=command->'product'; target_id:=(value->>'id')::uuid;
  if (value->>'image')<>'' and (value->>'image') !~ '^https://' then raise exception 'URL foto harus HTTPS.'; end if;
  insert into public.products(id,name,category,description,price,active,available,art,image)
  values(target_id,value->>'name',value->>'category',coalesce(value->>'description',''),(value->>'price')::bigint,(value->>'active')::boolean,(value->>'available')::boolean,coalesce((value->>'art')::integer,0),coalesce(value->>'image',''))
  on conflict(id) do update set name=excluded.name,category=excluded.category,description=excluded.description,price=excluded.price,active=excluded.active,available=excluded.available,art=excluded.art,image=excluded.image;
  insert into public.product_costs(product_id,cost) values(target_id,(value->>'cost')::bigint)
  on conflict(product_id) do update set cost=excluded.cost;
 when 'expense' then
  value:=command->'expense';target_id:=(value->>'id')::uuid;
  insert into public.expenses(id,date,category,description,amount,created_by)
  values(target_id,(value->>'date')::date,value->>'category',value->>'description',(value->>'amount')::bigint,auth.uid()) on conflict(id) do nothing;
 when 'settings' then
  value:=command->'settings';
  if length(value::text)>2200000 then raise exception 'Ukuran pengaturan terlalu besar.'; end if;
  if coalesce(value->>'qris','')<>'' and (value->>'qris') !~ '^data:image/(png|jpeg|webp);base64,' then raise exception 'Format gambar QRIS tidak valid.'; end if;
  if coalesce(value->>'contact','')<>'' and (value->>'contact') !~ '^62[0-9]{8,13}$' then raise exception 'Format kontak tidak valid.'; end if;
  if length(trim(coalesce(value->>'merchant','')))=0 then raise exception 'Nama merchant wajib diisi.'; end if;
  update public.settings set value=jsonb_build_object('merchant',value->>'merchant','qris',coalesce(value->>'qris',''),'contact',coalesce(value->>'contact',''),'story',coalesce(value->>'story',''),'reflection',coalesce(value->>'reflection',''),'team',coalesce(value->>'team','')) where id=1;
 when 'create' then
  target_id:=(command->>'id')::uuid;
  -- Serialize retries of the same key before building the immutable snapshot.
  perform pg_advisory_xact_lock(hashtextextended(target_id::text,0));
  select * into order_row from public.orders where id=target_id;
  if found then
   if order_row.cashier_id<>auth.uid() then raise exception 'Kunci transaksi tidak valid.'; end if;
   return public.read_workspace();
  end if;
  if command->>'method' not in ('cash','qris') or command->>'method' is null then raise exception 'Metode pembayaran tidak valid.'; end if;
  if command->>'method'='qris' and coalesce((select s.value->>'qris' from public.settings s where s.id=1),'')='' then raise exception 'QRIS belum tersedia.'; end if;
  if jsonb_typeof(command->'items') is distinct from 'array' or jsonb_array_length(command->'items') not between 1 and 100 then raise exception 'Keranjang tidak valid.'; end if;
  for item in select * from jsonb_array_elements(command->'items') loop
   if (item->>'quantity') !~ '^[0-9]+$' then raise exception 'Jumlah harus bilangan bulat.'; end if;
   qty:=(item->>'quantity')::integer;
   if qty not between 1 and 999 then raise exception 'Jumlah harus 1–999.'; end if;
   select * into entry from public.products where id=(item->>'productId')::uuid and active and available for share;
   if not found then raise exception 'Produk tidak tersedia.'; end if;
   select cost into unit_cost from public.product_costs where product_id=entry.id for share;
   if unit_cost is null then raise exception 'HPP produk belum diisi.'; end if;
   entries:=entries||jsonb_build_array(jsonb_build_object('productId',entry.id,'name',entry.name,'quantity',qty,'price',entry.price,'cost',unit_cost));
   total:=total+entry.price*qty;
  end loop;
  value:=jsonb_build_object('id',target_id,'number','KS-'||upper(replace(target_id::text,'-','')),'items',entries,'total',total,'method',command->>'method','status','pending','createdAt',event_time,'received',0,'customer',left(coalesce(command->>'customer',''),100),'cashierId',auth.uid());
  insert into public.orders(id,cashier_id,payload) values(target_id,auth.uid(),value);
 when 'pay' then
  target_id:=(command->>'id')::uuid;
  select * into order_row from public.orders where id=target_id for update;
  if not found or (team_role<>'admin' and order_row.cashier_id<>auth.uid()) then raise exception 'Transaksi tidak ditemukan.'; end if;
  value:=order_row.payload;
  if value->>'status'='paid' then return public.read_workspace(); end if;
  if value->>'status'<>'pending' then raise exception 'Status transaksi tidak dapat diubah.'; end if;
  if (command->>'received') !~ '^[0-9]+$' then raise exception 'Nominal tidak valid.'; end if;
  received:=(command->>'received')::bigint;
  if received<0 or received>9007199254740991 or (value->>'method'='cash' and received<(value->>'total')::bigint) then raise exception 'Nominal pembayaran tidak valid atau kurang.'; end if;
  update public.orders set payload=value||jsonb_build_object('status','paid','paidAt',event_time,'received',case when value->>'method'='cash' then received else (value->>'total')::bigint end,'confirmedBy',auth.uid()) where id=target_id;
 when 'cancel' then
  target_id:=(command->>'id')::uuid;
  select * into order_row from public.orders where id=target_id for update;
  if not found or (team_role<>'admin' and order_row.cashier_id<>auth.uid()) then raise exception 'Transaksi tidak ditemukan.'; end if;
  value:=order_row.payload;
  if value->>'status' in ('voided','cancelled') then return public.read_workspace(); end if;
  if length(trim(coalesce(command->>'reason','')))=0 then raise exception 'Alasan wajib diisi.'; end if;
  if value->>'status'='paid' then
   if team_role<>'admin' then raise exception 'Pembatalan lunas khusus admin.'; end if;
   insert into public.reversals(order_id,actor_id,reason) values(target_id,auth.uid(),command->>'reason');
   value:=value||jsonb_build_object('status','voided','voidedAt',event_time);
  else value:=value||jsonb_build_object('status','cancelled'); end if;
  update public.orders set payload=value||jsonb_build_object('reason',command->>'reason') where id=target_id;
 else raise exception 'Operasi tidak didukung.';
 end case;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),kind,target_id::text);
 return public.read_workspace();
end;
$$;
revoke all on function public.workspace_command(jsonb) from public,anon;
grant execute on function public.workspace_command(jsonb) to authenticated;

insert into public.products(id,name,category,description,price,art) values
('11111111-1111-4111-8111-111111111111','Ketan Susu','Ketan Susu','Ketan pulen dengan susu yang manis. Simpel, selalu bikin kangen.',10000,0),
('22222222-2222-4222-8222-222222222222','Ketan Susu Keju','Ketan Susu','Manisnya susu ketemu gurihnya taburan keju.',12000,1),
('33333333-3333-4333-8333-333333333333','Ketan Susu Choco Crunch','Ketan Susu','Cokelat crunchy, keju, dan ketan dalam satu suapan.',15000,2),
('44444444-4444-4444-8444-444444444444','Ketan Susu Oreo','Ketan Susu','Ketan susu dengan remahan Oreo dan keju yang melimpah.',15000,3),
('55555555-5555-4555-8555-555555555555','Dimsum Original','Dimsum','Dimsum gurih dengan saus pendamping. Teman ngemil yang pas.',12000,4),
('66666666-6666-4666-8666-666666666666','Dimsum Chilli Oil','Dimsum','Dimsum gurih bertemu chilli oil. Buat tim yang suka pedas!',15000,5);
insert into public.product_costs(product_id) select id from public.products;
insert into public.settings(id,value) values(1,'{"merchant":"Ketansum","qris":"","contact":"","story":"Berawal dari tugas kewirausahaan, Ketansum mempertemukan dua rasa favorit: ketan susu yang manis dan dimsum yang gurih. Kami belajar membangun usaha dari ide, membuat produk, sampai melayani pembeli.","reflection":"Perjalanan kami masih berjalan. Dokumentasi, hasil penjualan, dan cerita pembelajaran akan kami bagikan di sini.","team":""}');
commit;
