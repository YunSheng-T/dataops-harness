-- sanitized sample: member dimension
CREATE TABLE <SCHEMA>.dim_member_profile (
  member_id varchar(64) PRIMARY KEY,
  member_level varchar(32),
  channel_id varchar(64),
  updated_at timestamp
);
