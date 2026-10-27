CREATE TYPE "TouristServiceType" AS ENUM (
  'AIRPORT_TRANSFER',
  'CRUISE_TRANSFER',
  'POINT_TO_POINT',
  'HALF_DAY_TOUR',
  'FULL_DAY_TOUR',
  'CUSTOM_ITINERARY'
);

CREATE TYPE "TouristRequestStatus" AS ENUM (
  'REQUESTED',
  'QUOTED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'DECLINED'
);

CREATE TYPE "TouristQuoteStatus" AS ENUM ('SENT', 'ACCEPTED', 'WITHDRAWN', 'EXPIRED');
CREATE TYPE "CashPaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

CREATE TABLE "tourist_service_profiles" (
  "id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "service_area" TEXT NOT NULL DEFAULT 'Port Vila',
  "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "approved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tourist_service_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourist_destinations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "island" TEXT NOT NULL DEFAULT 'Efate',
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tourist_destinations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourist_requests" (
  "id" TEXT NOT NULL,
  "guest_reference" TEXT NOT NULL,
  "access_token_hash" TEXT NOT NULL,
  "requester_id" TEXT,
  "assigned_driver_id" TEXT NOT NULL,
  "assigned_vehicle_id" TEXT,
  "requester_name" TEXT NOT NULL,
  "contact_email" TEXT,
  "contact_phone" TEXT NOT NULL,
  "service_type" "TouristServiceType" NOT NULL,
  "pickup_location" TEXT NOT NULL,
  "travel_at" TIMESTAMP(3) NOT NULL,
  "passenger_count" INTEGER NOT NULL,
  "luggage_count" INTEGER NOT NULL DEFAULT 0,
  "flight_number" TEXT,
  "cruise_ship_name" TEXT,
  "special_requests" TEXT,
  "status" "TouristRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tourist_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourist_request_stops" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "destination_id" TEXT,
  "name" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  CONSTRAINT "tourist_request_stops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourist_quotes" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'VUV',
  "duration_hours" DECIMAL(4,1) NOT NULL,
  "included_services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "excluded_services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "waiting_terms" TEXT,
  "cancellation_terms" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "status" "TouristQuoteStatus" NOT NULL DEFAULT 'SENT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tourist_quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourist_bookings" (
  "id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "quote_id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "vehicle_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3) NOT NULL,
  "end_at" TIMESTAMP(3) NOT NULL,
  "status" "TouristRequestStatus" NOT NULL DEFAULT 'CONFIRMED',
  "payment_status" "CashPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tourist_bookings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "vehicles"
  ADD COLUMN "tourist_service_profile_id" TEXT,
  ADD COLUMN "tourist_capacity" INTEGER,
  ADD COLUMN "luggage_capacity" INTEGER;

CREATE UNIQUE INDEX "tourist_service_profiles_driver_id_key" ON "tourist_service_profiles"("driver_id");
CREATE UNIQUE INDEX "tourist_destinations_name_key" ON "tourist_destinations"("name");
CREATE UNIQUE INDEX "tourist_requests_guest_reference_key" ON "tourist_requests"("guest_reference");
CREATE INDEX "tourist_requests_assigned_driver_id_status_travel_at_idx"
  ON "tourist_requests"("assigned_driver_id", "status", "travel_at");
CREATE UNIQUE INDEX "tourist_request_stops_request_id_sequence_key"
  ON "tourist_request_stops"("request_id", "sequence");
CREATE INDEX "tourist_quotes_request_id_status_idx" ON "tourist_quotes"("request_id", "status");
CREATE UNIQUE INDEX "tourist_bookings_request_id_key" ON "tourist_bookings"("request_id");
CREATE UNIQUE INDEX "tourist_bookings_quote_id_key" ON "tourist_bookings"("quote_id");
CREATE INDEX "tourist_bookings_driver_id_start_at_end_at_idx"
  ON "tourist_bookings"("driver_id", "start_at", "end_at");
CREATE INDEX "tourist_bookings_vehicle_id_start_at_end_at_idx"
  ON "tourist_bookings"("vehicle_id", "start_at", "end_at");

ALTER TABLE "tourist_service_profiles"
  ADD CONSTRAINT "tourist_service_profiles_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tourist_requests"
  ADD CONSTRAINT "tourist_requests_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_requests_assigned_driver_id_fkey"
  FOREIGN KEY ("assigned_driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_requests_assigned_vehicle_id_fkey"
  FOREIGN KEY ("assigned_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tourist_request_stops"
  ADD CONSTRAINT "tourist_request_stops_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "tourist_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_request_stops_destination_id_fkey"
  FOREIGN KEY ("destination_id") REFERENCES "tourist_destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tourist_quotes"
  ADD CONSTRAINT "tourist_quotes_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "tourist_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_quotes_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_quotes_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tourist_bookings"
  ADD CONSTRAINT "tourist_bookings_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "tourist_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_bookings_quote_id_fkey"
  FOREIGN KEY ("quote_id") REFERENCES "tourist_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_bookings_driver_id_fkey"
  FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tourist_bookings_vehicle_id_fkey"
  FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_tourist_service_profile_id_fkey"
  FOREIGN KEY ("tourist_service_profile_id") REFERENCES "tourist_service_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "tourist_destinations" ("id", "name", "island", "description", "updated_at") VALUES
  ('dest-blue-lagoon', 'Blue Lagoon', 'Efate', 'Entrance fees, opening times and access require local confirmation.', CURRENT_TIMESTAMP),
  ('dest-mele-cascades', 'Mele Cascades', 'Efate', 'Entrance fees, opening times and access require local confirmation.', CURRENT_TIMESTAMP),
  ('dest-eton-beach', 'Eton Beach', 'Efate', 'Road and beach access require local confirmation.', CURRENT_TIMESTAMP),
  ('dest-havannah-harbour', 'Havannah Harbour', 'Efate', 'Access and local conditions require confirmation.', CURRENT_TIMESTAMP),
  ('dest-port-vila-markets', 'Port Vila town and local markets', 'Efate', 'Market opening hours vary and should be confirmed.', CURRENT_TIMESTAMP),
  ('dest-efate-tour', 'Efate island sightseeing route', 'Efate', 'Itinerary and destination access require driver confirmation.', CURRENT_TIMESTAMP);
