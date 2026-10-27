UPDATE "vehicles"
SET "vehicle_type" = 'PUBLIC_TRANSPORT'
WHERE "vehicle_type" = 'CAR'
   OR LOWER(COALESCE("model", '')) LIKE '%camion%';
