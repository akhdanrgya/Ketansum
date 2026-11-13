-- Preorders share order snapshots and payment ledger; no duplicate revenue.
begin;
create or replace function public.validate_preorder(details jsonb, customer text) returns void language plpgsql set search_path='' as $$
begin
 if jsonb_typeof(details) is distinct from 'object' or length(trim(coalesce(customer,''))) not between 1 and 100 then raise exception 'Nama pelanggan wajib diisi (maksimal 100 karakter).'; end if;
 if length(coalesce(details->>'address','')) not between 1 and 1000 or length(coalesce(details->>'phone',''))>40 or length(coalesce(details->>'notes',''))>1000 then raise exception 'Isi alamat antar; catatan maksimal 1000 karakter.'; end if;
 if coalesce(details->>'scheduledAt','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then raise exception 'Jadwal antar tidak valid.'; end if;
 perform (details->>'scheduledAt')::timestamptz;
end;$$;
revoke all on function public.validate_preorder(jsonb,text) from public,anon,authenticated;
create or replace function public.read_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare team_role text := public.current_team_role(); result jsonb;
begin
 if team_role is null then raise exception 'Akses tim diperlukan.'; end if;
 select jsonb_build_object(
 'schemaVersion',3,
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

create or replace function public.workspace_command(command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare
 team_role text := public.current_team_role(); kind text := command->>'type';
 value jsonb; item jsonb; entries jsonb := '[]'::jsonb; entry public.products%rowtype;
 order_row public.orders%rowtype; target_id uuid; unit_cost bigint; qty integer;
 total bigint := 0; received bigint; event_time text := to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if team_role is null then raise exception 'Akses tim diperlukan.'; end if;
 if kind in ('product','expense','settings') and team_role<>'admin' then raise exception 'Akses khusus admin.'; end if;

 if jsonb_typeof(command) is distinct from 'object' then raise exception 'Request tidak valid.'; end if;
 if kind is null or kind not in ('product','expense','settings','create','pay','cancel','preorder_update') then raise exception 'Operasi tidak didukung.'; end if;
 if kind in ('create','pay','cancel','preorder_update') and (coalesce(command->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') then raise exception 'ID transaksi tidak valid.'; end if;
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
  if jsonb_typeof(value) is distinct from 'object' then raise exception 'Pengaturan tidak valid.'; end if;
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
   if jsonb_typeof(item->'quantity') is distinct from 'number' or coalesce(item->>'quantity','') !~ '^[0-9]+$' then raise exception 'Jumlah harus bilangan bulat.'; end if;
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
  if command ? 'preorder' then
   perform public.validate_preorder(command->'preorder',command->>'customer');
   value:=value||jsonb_build_object('kind','preorder','preorder',(command->'preorder')||jsonb_build_object('status','pending','version',1));
  end if;
  insert into public.orders(id,cashier_id,payload) values(target_id,auth.uid(),value);
 when 'preorder_update' then
  target_id:=(command->>'id')::uuid;
  select * into order_row from public.orders where id=target_id for update;
  if not found or order_row.payload->>'kind' is distinct from 'preorder' then raise exception 'Preorder tidak ditemukan.'; end if;
  value:=order_row.payload;
  if value->>'status' in ('cancelled','voided') then raise exception 'Preorder sudah dibatalkan.'; end if;
  if command->'version' is distinct from value->'preorder'->'version' then raise exception 'Preorder telah diubah oleh tim lain. Muat ulang halaman.'; end if;
  perform public.validate_preorder(command->'preorder',command->>'customer');
  if coalesce(command->'preorder'->>'status','') not in ('pending','preparing','delivering','completed') then raise exception 'Status preorder tidak valid.'; end if;
  if command->'preorder'->>'status'='completed' and value->>'status'<>'paid' then raise exception 'Konfirmasi pembayaran sebelum menyelesaikan preorder.'; end if;
  if command->>'method' not in ('cash','qris') or command->>'method' is null then raise exception 'Metode pembayaran tidak valid.'; end if;
  if command->>'method'='qris' and coalesce((select s.value->>'qris' from public.settings s where s.id=1),'')='' then raise exception 'QRIS belum tersedia.'; end if;
  if value->>'status'='paid' and command->>'method'<>value->>'method' then raise exception 'Metode pembayaran lunas tidak dapat diubah.'; end if;
  update public.orders set payload=value||jsonb_build_object('customer',trim(command->>'customer'),'method',command->>'method','preorder',(command->'preorder')||jsonb_build_object('version',(value->'preorder'->>'version')::integer+1),'updatedAt',event_time,'updatedBy',auth.uid()) where id=target_id;
 when 'pay' then
  target_id:=(command->>'id')::uuid;
  select * into order_row from public.orders where id=target_id for update;
  if not found or (team_role<>'admin' and order_row.cashier_id<>auth.uid() and coalesce(order_row.payload->>'kind','')<>'preorder') then raise exception 'Transaksi tidak ditemukan.'; end if;
  value:=order_row.payload;
  if value->>'status'='paid' then return public.read_workspace(); end if;
  if value->>'status'<>'pending' then raise exception 'Status transaksi tidak dapat diubah.'; end if;
  if (command->>'received') !~ '^[0-9]+$' then raise exception 'Nominal tidak valid.'; end if;
  if value->>'method'='qris' and command->'paymentVerified' is distinct from 'true'::jsonb then raise exception 'Periksa pembayaran masuk di aplikasi merchant terlebih dahulu.'; end if;
  received:=(command->>'received')::bigint;
  if received<0 or received>9007199254740991 or (value->>'method'='cash' and received<(value->>'total')::bigint) then raise exception 'Nominal pembayaran tidak valid atau kurang.'; end if;
  update public.orders set payload=value||jsonb_build_object('status','paid','paidAt',event_time,'received',case when value->>'method'='cash' then received else (value->>'total')::bigint end,'confirmedBy',auth.uid(),'paymentReference',left(coalesce(command->>'paymentReference',''),100)) where id=target_id;
 when 'cancel' then
  target_id:=(command->>'id')::uuid;
  select * into order_row from public.orders where id=target_id for update;
  if not found or (team_role<>'admin' and order_row.cashier_id<>auth.uid() and coalesce(order_row.payload->>'kind','')<>'preorder') then raise exception 'Transaksi tidak ditemukan.'; end if;
  value:=order_row.payload;
  if value->>'status' in ('voided','cancelled') then return public.read_workspace(); end if;
  if length(trim(coalesce(command->>'reason','')))=0 then raise exception 'Alasan wajib diisi.'; end if;
  if value->>'status'='paid' then
   if team_role<>'admin' then raise exception 'Pembatalan lunas khusus admin.'; end if;
   if command->'refundConfirmed' is distinct from 'true'::jsonb then raise exception 'Konfirmasi pengembalian dana manual terlebih dahulu.'; end if;
   insert into public.reversals(order_id,actor_id,reason) values(target_id,auth.uid(),command->>'reason');
   value:=value||jsonb_build_object('status','voided','voidedAt',event_time);
  else value:=value||jsonb_build_object('status','cancelled'); end if;
  if value->>'kind'='preorder' then value:=jsonb_set(value,'{preorder,status}','"cancelled"'::jsonb); end if;
  update public.orders set payload=value||jsonb_build_object('reason',command->>'reason') where id=target_id;
 else raise exception 'Operasi tidak didukung.';
 end case;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),kind,target_id::text);
 return public.read_workspace();
end;
$$;
revoke all on function public.workspace_command(jsonb) from public,anon;
grant execute on function public.workspace_command(jsonb) to authenticated;


commit;
