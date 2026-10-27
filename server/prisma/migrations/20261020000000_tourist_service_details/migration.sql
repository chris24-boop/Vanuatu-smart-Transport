ALTER TYPE "TouristServiceType" ADD VALUE IF NOT EXISTS 'SIGHTSEEING_TRIP';

ALTER TABLE "tourist_service_profiles"
  ADD COLUMN "service_types" "TouristServiceType"[] NOT NULL DEFAULT ARRAY[]::"TouristServiceType"[],
  ADD COLUMN "pricing_description" TEXT,
  ADD COLUMN "available_from" TIMESTAMP(3),
  ADD COLUMN "available_until" TIMESTAMP(3);

INSERT INTO "tourist_destinations" ("id", "name", "island", "description", "updated_at") VALUES
  ('dest-champagne-beach', 'Champagne Beach', 'Espiritu Santo', 'Access and local conditions require confirmation.', CURRENT_TIMESTAMP),
  ('dest-port-olry', 'Port Olry', 'Espiritu Santo', 'Access and local conditions require confirmation.', CURRENT_TIMESTAMP),
  ('dest-nanda-blue-hole', 'Nanda Blue Hole', 'Espiritu Santo', 'Opening times, fees and local access require confirmation.', CURRENT_TIMESTAMP),
  ('dest-millennium-cave', 'Millennium Cave', 'Espiritu Santo', 'Guided access, opening times and fees require local confirmation.', CURRENT_TIMESTAMP),
  ('dest-mount-yasur', 'Mount Yasur', 'Tanna', 'Volcano access and safety conditions require local confirmation.', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
