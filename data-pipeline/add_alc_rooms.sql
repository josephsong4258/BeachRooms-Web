-- Mark Active Learning Classrooms (ALCs) as group-study-friendly rooms,
-- creating classroom rows for ALCs that have no classes scheduled this
-- semester (the scraper only creates rooms that host classes).
-- Source: https://www.csulb.edu/academic-technology-services/classroom-support-services/classroom-types-room
-- Run in the Supabase SQL editor after schema.sql. Idempotent.

-- Column is part of schema.sql; this alter only upgrades databases created
-- before it was added there.
alter table classrooms add column if not exists is_alc boolean not null default false;

-- Room numbers must match the scraper's format where rows already exist
-- (EED stores leading zeros: "040"/"041").
insert into classrooms (building_id, room_number, is_alc)
select b.id, v.room_number, true
from (values
  ('AS',  '235'), ('AS',  '244'),
  ('EED', '040'), ('EED', '041'),
  ('LA2', '101A'), ('LA2', '101B'), ('LA2', '200'),
  ('LA3', '106'), ('LA3', '204'),
  ('HC',  '102'), ('HC',  '106'), ('HC',  '121'), ('HC',  '122'),
  ('HC',  '130'), ('HC',  '131'), ('HC',  '132'), ('HC',  '133'),
  ('HC',  '134'), ('HC',  '135'),
  ('COB', '217'), ('COB', '218')
) as v(building_code, room_number)
join buildings b on b.code = v.building_code
on conflict (building_id, room_number) do update set is_alc = true;

-- Verify: should return all 21 ALC rooms.
select b.code, c.room_number
from classrooms c
join buildings b on b.id = c.building_id
where c.is_alc
order by b.code, c.room_number;
