-- sanitized sample: daily aggregation
INSERT INTO <SCHEMA>.dws_channel_daily
  (dt, channel_id, channel_name, order_cnt, paid_cnt, gmv, refund_amt, updated_at)
SELECT
  '${bizdate}' AS dt,
  o.channel_id,
  c.channel_name,
  count(DISTINCT o.order_id) AS order_cnt,
  count(DISTINCT CASE WHEN o.status = 'paid' THEN o.order_id END) AS paid_cnt,
  sum(CASE WHEN o.status = 'paid' THEN o.amount ELSE 0 END) AS gmv,
  sum(CASE WHEN o.status = 'refund' THEN o.amount ELSE 0 END) AS refund_amt,
  current_timestamp
FROM <SCHEMA>.dwd_orders_demo o
LEFT JOIN <SCHEMA>.dim_channel_map c ON o.channel_id = c.channel_id
WHERE o.dt = '${bizdate}'
GROUP BY o.channel_id, c.channel_name;
