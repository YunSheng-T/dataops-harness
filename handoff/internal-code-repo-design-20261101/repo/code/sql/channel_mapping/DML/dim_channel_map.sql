-- sanitized sample: dimension seed / merge
MERGE INTO <SCHEMA>.dim_channel_map t
USING (
  SELECT '<CHANNEL_ID>' AS channel_id, '<CHANNEL_NAME>' AS channel_name, 'paid' AS channel_type
) s ON t.channel_id = s.channel_id
WHEN MATCHED THEN UPDATE SET channel_name = s.channel_name, channel_type = s.channel_type
WHEN NOT MATCHED THEN INSERT (channel_id, channel_name, channel_type, is_valid)
VALUES (s.channel_id, s.channel_name, s.channel_type, 1);
