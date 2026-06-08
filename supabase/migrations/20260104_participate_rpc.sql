-- =============================================================================
-- 20260101_participate_rpc.sql
--  - participate_in_deal: 딜 참여 + current_qty 증가를 한 트랜잭션으로 처리
--  - 20260101_init_b2buy_schema.sql 보다 "이후"에 실행되어야 함
-- =============================================================================

create or replace function public.participate_in_deal(
  p_deal_id       uuid,
  p_user_id       uuid,
  p_qty           integer,
  p_unit_price    integer,
  p_shipping_addr text,
  p_shipping_type shipping_type
)
returns table (
  participation_id uuid,
  new_current_qty  integer,
  unit_price       integer
)
language plpgsql
security definer
as $$
declare
  v_current integer;
  v_part_id uuid;
begin
  -- 1) deals 행 잠금
  select current_qty into v_current
    from public.group_buy_deals
   where id = p_deal_id
   for update;

  if v_current is null then
    raise exception 'deal not found';
  end if;

  -- 2) participation insert
  insert into public.group_buy_participations (
    user_id, deal_id, requested_qty, initial_price,
    escrow_status, shipping_addr, shipping_type
  ) values (
    p_user_id, p_deal_id, p_qty, p_unit_price,
    '입금대기', p_shipping_addr, p_shipping_type
  )
  returning id into v_part_id;

  -- 3) deals current_qty 증가
  update public.group_buy_deals
     set current_qty = v_current + p_qty,
         updated_at  = now()
   where id = p_deal_id;

  participation_id := v_part_id;
  new_current_qty  := v_current + p_qty;
  unit_price       := p_unit_price;
  return next;
end;
$$;
