-- sanitized sample: member dimension merge
MERGE INTO <SCHEMA>.dim_member_profile t
USING (SELECT '<MEMBER_ID>' AS member_id, 'gold' AS member_level, '<CHANNEL_ID>' AS channel_id) s
ON t.member_id = s.member_id
WHEN MATCHED THEN UPDATE SET member_level = s.member_level, channel_id = s.channel_id, updated_at = current_timestamp
WHEN NOT MATCHED THEN INSERT (member_id, member_level, channel_id, updated_at)
VALUES (s.member_id, s.member_level, s.channel_id, current_timestamp);
