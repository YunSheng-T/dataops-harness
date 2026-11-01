-- sanitized sample: DWS fact table
CREATE TABLE <SCHEMA>.dws_channel_daily (
  dt date NOT NULL,
  channel_id varchar(64) NOT NULL,
  channel_name varchar(128),
  order_cnt bigint DEFAULT 0,
  paid_cnt bigint DEFAULT 0,
  gmv decimal(18,2) DEFAULT 0,
  refund_amt decimal(18,2) DEFAULT 0,
  updated_at timestamp
);
