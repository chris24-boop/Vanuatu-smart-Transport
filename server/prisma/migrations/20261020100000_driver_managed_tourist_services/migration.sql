UPDATE "tourist_service_profiles" AS profile
SET
  "approved" = true,
  "enabled" = true,
  "approved_at" = COALESCE(profile."approved_at", CURRENT_TIMESTAMP)
FROM "users" AS app_user
JOIN "drivers" AS driver ON driver."user_id" = app_user."id"
WHERE profile."driver_id" = app_user."id"
  AND app_user."role" = 'DRIVER'
  AND app_user."status" = 'ACTIVE'
  AND driver."verification_status" = 'VERIFIED';
