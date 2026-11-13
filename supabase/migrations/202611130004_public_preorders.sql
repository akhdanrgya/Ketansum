-- Public checkout uses server-only RPCs. Neither customers nor browser roles gain table access.
begin;
alter table public.orders alter column cashier_id drop not null;
create table public.preorder_quotes (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 order_id uuid not null unique default gen_random_uuid(),
 payload jsonb not null,
 created_at timestamptz not null default now(),
 submitted_at timestamptz,
 reviewed_at timestamptz, reviewed_by uuid references public.profiles(id), review_status text check(review_status in ('approved','rejected')), review_reason text
);
create table public.payment_proofs (
 order_id uuid primary key references public.preorder_quotes(order_id),
 image_base64 text not null check(length(image_base64) between 1 and 2000000),
 created_at timestamptz not null default now()
);
alter table public.preorder_quotes enable row level security;
alter table public.payment_proofs enable row level security;
revoke all on public.preorder_quotes,public.payment_proofs from public,anon,authenticated;
grant select on public.payment_proofs to service_role;

create function public.checkout_summary(q public.preorder_quotes) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('number','KS-'||upper(replace(q.order_id::text,'-','')),'total',(q.payload->>'total')::bigint,'items',(select jsonb_agg(item-'cost') from jsonb_array_elements(q.payload->'items') item),'scheduledAt',q.payload->'preorder'->>'scheduledAt','submitted',q.submitted_at is not null,'reviewStatus',coalesce(q.review_status,'pending'));
$$;
revoke all on function public.checkout_summary(public.preorder_quotes) from public,anon,authenticated;

create function public.public_preorder_quote(token_hash text, request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare q public.preorder_quotes%rowtype; item jsonb; p public.products%rowtype; cost bigint; qty integer; total bigint:=0; count_units integer:=0; entries jsonb:='[]'; scheduled timestamptz; local_day date; clock time; settings jsonb; seen uuid[]:='{}';
begin
 if token_hash !~ '^[a-f0-9]{64}$' or token_hash is null then raise exception 'Token tidak valid.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(token_hash,0));
 select * into q from public.preorder_quotes x where x.token_hash=token_hash;
 if found then return public.checkout_summary(q); end if;
 if jsonb_typeof(request) is distinct from 'object' or length(trim(coalesce(request->>'customer',''))) not between 1 and 100 then raise exception 'Nama pelanggan wajib diisi.'; end if;
 if coalesce(request->>'phone','') !~ '^(08|628)[0-9]{7,12}$' then raise exception 'Nomor WhatsApp tidak valid.'; end if;
 if length(trim(coalesce(request->>'meetingPoint',''))) not between 1 and 300 or length(coalesce(request->>'notes',''))>500 then raise exception 'Isi titik temu di Kampus C, maksimal 300 karakter.'; end if;
 if coalesce(request->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(request->>'time','') not in ('11:00','12:00','13:00','14:00','15:00','16:00','17:00') then raise exception 'Jadwal pengiriman tidak valid.'; end if;
 local_day:=(request->>'date')::date; clock:=(request->>'time')::time;
 if extract(isodow from local_day) not in (2,4) or local_day<=(now() at time zone 'Asia/Jakarta')::date or local_day>(now() at time zone 'Asia/Jakarta')::date+60 then raise exception 'Pilih Selasa/Kamis mulai besok hingga 60 hari ke depan.'; end if;
 scheduled:=(local_day+clock) at time zone 'Asia/Jakarta';
 select value into settings from public.settings where id=1;
 if coalesce(settings->>'qris','')='' then raise exception 'Pembayaran QRIS belum tersedia.'; end if;
 if jsonb_typeof(request->'items') is distinct from 'array' or jsonb_array_length(request->'items') not between 1 and 20 then raise exception 'Pilih menu terlebih dahulu.'; end if;
 for item in select * from jsonb_array_elements(request->'items') loop
  if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^[0-9]+$' then raise exception 'Jumlah tidak valid.'; end if;
  qty:=(item->>'quantity')::integer;
  if qty not between 1 and 50 then raise exception 'Jumlah harus 1–50 porsi.'; end if;
  select * into p from public.products where id=(item->>'productId')::uuid and active and available for share;
  if not found or p.id=any(seen) then raise exception 'Menu tidak tersedia atau duplikat.'; end if;
  seen:=array_append(seen,p.id);
  select c.cost into cost from public.product_costs c where c.product_id=p.id for share;
  if cost is null then raise exception 'Menu belum siap dipesan.'; end if;
  count_units:=count_units+qty; total:=total+p.price*qty;
  entries:=entries||jsonb_build_array(jsonb_build_object('productId',p.id,'name',p.name,'quantity',qty,'price',p.price,'cost',cost));
 end loop;
 if count_units>50 or total<=0 then raise exception 'Maksimal 50 porsi per preorder.'; end if;
 if jsonb_typeof(request->'expectedTotal') is distinct from 'number' or (request->>'expectedTotal')::numeric<>total then raise exception 'Harga menu berubah. Muat ulang halaman sebelum membayar.'; end if;
 insert into public.preorder_quotes(token_hash,payload) values(token_hash,jsonb_build_object('source','public','kind','preorder','customer',trim(request->>'customer'),'items',entries,'total',total,'method','qris','status','pending','received',0,'paymentProof',true,'preorder',jsonb_build_object('scheduledAt',to_char(scheduled at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'address','Kampus C Telkom University — '||trim(request->>'meetingPoint'),'phone',request->>'phone','notes',coalesce(request->>'notes',''),'status','pending','version',1))) returning * into q;
 return public.checkout_summary(q);
end;$$;
revoke all on function public.public_preorder_quote(text,jsonb) from public,anon,authenticated;
grant execute on function public.public_preorder_quote(text,jsonb) to service_role;

create function public.public_preorder_submit(token_hash text,image_base64 text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare q public.preorder_quotes%rowtype; value jsonb;
begin
 select * into q from public.preorder_quotes x where x.token_hash=token_hash for update;
 if not found then raise exception 'Sesi pesanan tidak ditemukan.'; end if;
 if q.submitted_at is not null then return public.checkout_summary(q); end if;
 if image_base64 is null or length(image_base64) not between 1 and 2000000 then raise exception 'Bukti pembayaran wajib diunggah.'; end if;
 value:=q.payload||jsonb_build_object('id',q.order_id,'number','KS-'||upper(replace(q.order_id::text,'-','')),'createdAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));

 insert into public.payment_proofs(order_id,image_base64) values(q.order_id,image_base64);
 update public.preorder_quotes x set submitted_at=now() where x.token_hash=token_hash returning * into q;
 insert into public.audit_logs(actor_id,action,entity_id) values(null,'public_preorder_requested',q.order_id::text);
 return public.checkout_summary(q);
end;$$;
revoke all on function public.public_preorder_submit(text,text) from public,anon,authenticated;
grant execute on function public.public_preorder_submit(text,text) to service_role;

-- Staff cannot reschedule a public order outside the published campus/day/time constraints.
create function public.check_public_delivery() returns trigger language plpgsql set search_path='' as $$
declare scheduled timestamp;
begin
 if new.payload->>'source'='public' then
  scheduled:=(new.payload->'preorder'->>'scheduledAt')::timestamptz at time zone 'Asia/Jakarta';
  if scheduled is null or extract(isodow from scheduled) not in (2,4) or scheduled::time<'11:00'::time or scheduled::time>'17:00'::time or coalesce(new.payload->'preorder'->>'address','') not like 'Kampus C Telkom University — %' then raise exception 'Pengiriman publik hanya Kampus C, Selasa/Kamis pukul 11.00–17.00 WIB.'; end if;
 end if;
 return new;
end;$$;
revoke all on function public.check_public_delivery() from public,anon,authenticated;
create trigger public_delivery_rule before insert or update on public.orders for each row execute function public.check_public_delivery();
create or replace function public.read_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare team_role text := public.current_team_role(); result jsonb;
begin
 if team_role is null then raise exception 'Akses tim diperlukan.'; end if;
 select jsonb_build_object(
 'schemaVersion',4,
 'preorderRequests',coalesce((select jsonb_agg(jsonb_build_object('id',q.order_id,'number','KS-'||upper(replace(q.order_id::text,'-','')),'customer',q.payload->>'customer','total',q.payload->'total','preorder',q.payload->'preorder','items',(select jsonb_agg(item-'cost') from jsonb_array_elements(q.payload->'items') item),'submittedAt',q.submitted_at,'reviewStatus',coalesce(q.review_status,'pending'),'reviewReason',q.review_reason) order by q.submitted_at) from public.preorder_quotes q where q.submitted_at is not null and q.review_status is distinct from 'approved'),'[]'::jsonb),
 'role',team_role,
 'products',coalesce((select jsonb_agg(to_jsonb(p)-'created_at'||jsonb_build_object('cost',case when team_role='admin' then c.cost else case when c.cost is null then null else 0 end end) order by p.created_at,p.art,p.id) from public.products p left join public.product_costs c on p.id=c.product_id),'[]'::jsonb),
 'orders',coalesce((select jsonb_agg(case when team_role='admin' then o.payload else o.payload||jsonb_build_object('items',(select jsonb_agg(item-'cost'||jsonb_build_object('cost',0)) from jsonb_array_elements(o.payload->'items') item)) end order by o.created_at desc) from public.orders o where team_role='admin' or o.cashier_id=auth.uid() or o.payload->>'kind'='preorder'),'[]'::jsonb),
 'expenses',case when team_role='admin' then coalesce((select jsonb_agg(to_jsonb(e)-'created_by' order by e.date desc) from public.expenses e),'[]'::jsonb) else '[]'::jsonb end,
 'settings',(select value from public.settings where id=1)
 ) into result;
 return result;
end;
$$;
revoke all on function public.read_workspace() from public,anon;
grant execute on function public.read_workspace() to authenticated;


create function public.review_public_preorder(request_id uuid, decision text, reason text default '') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare q public.preorder_quotes%rowtype; value jsonb;
begin
 if public.current_team_role() is null then raise exception 'Akses tim diperlukan.'; end if;
 if decision not in ('approved','rejected') or decision is null then raise exception 'Keputusan tidak valid.'; end if;
 if length(coalesce(reason,''))>500 or (decision='rejected' and length(trim(coalesce(reason,'')))=0) then raise exception 'Alasan penolakan wajib diisi, maksimal 500 karakter.'; end if;
 select * into q from public.preorder_quotes where order_id=request_id for update;
 if not found or q.submitted_at is null then raise exception 'Pengajuan tidak ditemukan.'; end if;
 if q.review_status is not null then
  if q.review_status=decision then return public.read_workspace(); end if;
  raise exception 'Pengajuan sudah diputuskan oleh tim. Muat ulang data.';
 end if;
 if decision='approved' then
  value:=q.payload||jsonb_build_object('id',q.order_id,'number','KS-'||upper(replace(q.order_id::text,'-','')),'createdAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'approvedBy',auth.uid());
  insert into public.orders(id,cashier_id,payload) values(q.order_id,null,value);
 end if;
 update public.preorder_quotes set review_status=decision,reviewed_at=now(),reviewed_by=auth.uid(),review_reason=coalesce(reason,'') where order_id=request_id;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'preorder_'||decision,request_id::text);
 return public.read_workspace();
end;$$;
revoke all on function public.review_public_preorder(uuid,text,text) from public,anon;
grant execute on function public.review_public_preorder(uuid,text,text) to authenticated;
commit;
