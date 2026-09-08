-- Migration to add event start and end times to news table
-- Run this migration to add the new fields

-- Add event_start_time column
ALTER TABLE news ADD COLUMN event_start_time time;

-- Add event_end_time column  
ALTER TABLE news ADD COLUMN event_end_time time;

-- Add indexes for the new time columns
CREATE INDEX news_event_start_time_key ON news USING btree (event_start_time);
CREATE INDEX news_event_end_time_key ON news USING btree (event_end_time);
