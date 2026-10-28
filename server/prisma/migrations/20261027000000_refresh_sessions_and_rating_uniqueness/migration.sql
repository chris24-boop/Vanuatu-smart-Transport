CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens"("user_id", "expires_at");

ALTER TABLE "refresh_tokens"
ADD CONSTRAINT "refresh_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings"
ADD COLUMN "seats_count" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "incidents"
ADD COLUMN "booking_id" TEXT;

UPDATE "incidents"
SET "booking_id" = "trip_id"
WHERE "category" = 'DRIVER_RATING'
  AND "trip_id" IS NOT NULL
  AND "trip_id" IN (
    SELECT "trip_id"
    FROM "incidents"
    WHERE "category" = 'DRIVER_RATING' AND "trip_id" IS NOT NULL
    GROUP BY "trip_id"
    HAVING COUNT(*) = 1
  );

CREATE UNIQUE INDEX "incidents_booking_id_key" ON "incidents"("booking_id");
