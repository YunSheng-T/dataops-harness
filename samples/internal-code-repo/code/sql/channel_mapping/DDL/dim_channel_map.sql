-- sanitized sample: channel dimension
CREATE TABLE <SCHEMA>.dim_channel_map (
  channel_id varchar(64) PRIMARY KEY,
  channel_name varchar(128),
  channel_type varchar(32),
  is_valid int DEFAULT 1
);
