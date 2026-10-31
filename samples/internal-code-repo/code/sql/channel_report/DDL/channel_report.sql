-- sanitized sample: DDL for the channel report demo
CREATE TABLE <SCHEMA>.channel_report_demo (
  dt date NOT NULL,
  channel_id varchar(64) NOT NULL,
  order_cnt bigint,
  gmv decimal(18,2)
);
