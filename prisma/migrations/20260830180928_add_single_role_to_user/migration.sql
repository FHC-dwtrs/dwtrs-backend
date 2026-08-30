/*
  Migrate from the old many-to-many user_role structure
  to the new single role relationship on user.

  Old:
    user -> user_role -> role

  New:
    user -> role
*/


-- ============================================================
-- 1. Add roleId as nullable temporarily
-- ============================================================

ALTER TABLE "user"
ADD COLUMN "roleId" UUID;


-- ============================================================
-- 2. Copy existing role assignments
-- ============================================================

UPDATE "user" u
SET "roleId" = ur."roleId"
FROM "user_role" ur
WHERE ur."userId" = u."userId";


-- ============================================================
-- 3. Handle users that do not have a role assignment
-- ============================================================
--
-- At this point any user whose roleId is still NULL
-- does not have a corresponding user_role record.
--
-- For the existing bootstrap/admin user, assign SYSTEM_ADMIN.
--
-- IMPORTANT:
-- This should only affect users that have no role assignment.
--

UPDATE "user" u
SET "roleId" = r."roleId"
FROM "role" r
WHERE r."name" = 'SYSTEM_ADMIN'
  AND u."roleId" IS NULL;


-- ============================================================
-- 4. Verify that every user now has a role
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user"
    WHERE "roleId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration aborted: one or more users could not be assigned a role.';
  END IF;
END $$;


-- ============================================================
-- 5. Remove old foreign keys
-- ============================================================

ALTER TABLE "user_role"
DROP CONSTRAINT IF EXISTS "user_role_roleId_fkey";

ALTER TABLE "user_role"
DROP CONSTRAINT IF EXISTS "user_role_userId_fkey";


-- ============================================================
-- 6. Make roleId required
-- ============================================================

ALTER TABLE "user"
ALTER COLUMN "roleId" SET NOT NULL;


-- ============================================================
-- 7. Remove old user_role table
-- ============================================================

DROP TABLE "user_role";


-- ============================================================
-- 8. Index roleId
-- ============================================================

CREATE INDEX "user_roleId_idx"
ON "user"("roleId");


-- ============================================================
-- 9. Add new foreign key
-- ============================================================

ALTER TABLE "user"
ADD CONSTRAINT "user_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "role"("roleId")
ON DELETE RESTRICT
ON UPDATE CASCADE;