-- Delivery schedule: Monday/Thursday, 10:30–13:00 Asia/Jakarta.
begin;
create or replace function public.public_preorder_quote(token_hash text, request jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if coalesce(request->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(request->>'time','') not in ('10:30','11:00','11:30','12:00','12:30','13:00') then raise exception 'Jadwal pengiriman tidak valid.'; end if;
 local_day:=(request->>'date')::date; clock:=(request->>'time')::time;
 if extract(isodow from local_day) not in (1,4) or local_day<=(now() at time zone 'Asia/Jakarta')::date or local_day>(now() at time zone 'Asia/Jakarta')::date+60 then raise exception 'Pilih Senin/Kamis mulai besok hingga 60 hari ke depan.'; end if;
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

create or replace function public.check_public_delivery() returns trigger language plpgsql set search_path='' as $$
declare scheduled timestamp;
begin
 -- Keep existing confirmed schedules usable for payment/status updates.
 if TG_OP='UPDATE' then
  if new.payload->>'source' is not distinct from old.payload->>'source'
   and new.payload->'preorder'->>'scheduledAt' is not distinct from old.payload->'preorder'->>'scheduledAt'
   and new.payload->'preorder'->>'address' is not distinct from old.payload->'preorder'->>'address' then return new; end if;
 end if;
 -- Honor schedules already quoted to customers, including requests awaiting review.
 if TG_OP='INSERT' and exists (
  select 1 from public.preorder_quotes q where q.order_id=new.id and q.submitted_at is not null
   and q.payload->'preorder'->>'scheduledAt'=new.payload->'preorder'->>'scheduledAt'
   and q.payload->'preorder'->>'address'=new.payload->'preorder'->>'address'
 ) then return new; end if;
 if new.payload->>'source'='public' then
  scheduled:=(new.payload->'preorder'->>'scheduledAt')::timestamptz at time zone 'Asia/Jakarta';
  if scheduled is null or extract(isodow from scheduled) not in (1,4) or scheduled::time<'10:30'::time or scheduled::time>'13:00'::time or coalesce(new.payload->'preorder'->>'address','') not like 'Kampus C Telkom University — %' then raise exception 'Pengiriman publik hanya Kampus C, Senin/Kamis pukul 10.30–13.00 WIB.'; end if;
 end if;
 return new;
end;$$;
revoke all on function public.check_public_delivery() from public,anon,authenticated;

commit;
