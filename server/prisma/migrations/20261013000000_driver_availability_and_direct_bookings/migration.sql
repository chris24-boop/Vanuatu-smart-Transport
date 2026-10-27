CREATE TYPE "DriverAvailability" AS ENUM ('AVAILABLE', 'ON_TRIP', 'NOT_AVAILABLE');

ALTER TYPE "VehicleType" ADD VALUE 'PUBLIC_TRANSPORT';

ALTER TABLE "drivers"
  ADD COLUMN "availability" "DriverAvailability" NOT NULL DEFAULT 'NOT_AVAILABLE';

ALTER TABLE "bookings"
  ADD COLUMN "driver_id" TEXT,
  ADD COLUMN "pickup_location" TEXT,
  ADD COLUMN "dropoff_location" TEXT;

UPDATE "bookings" AS booking
SET "driver_id" = trip."driver_id"
FROM "trips" AS trip
WHERE booking."trip_id" = trip."id";

ALTER TABLE "bookings"
  ALTER COLUMN "trip_id" DROP NOT NULL,
  ALTER COLUMN "pickup_stop_id" DROP NOT NULL,
  ALTER COLUMN "dropoff_stop_id" DROP NOT NULL,
  ALTER COLUMN "driver_id" SET NOT NULL;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
