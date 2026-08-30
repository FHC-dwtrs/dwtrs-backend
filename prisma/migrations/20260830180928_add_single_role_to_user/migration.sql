/*
  Migrate User from UserRole (many-to-many)
  to User.roleId (single role).

  Existing role assignments are preserved.
*/

-- 1. Add roleId as nullable first
ALTER TABLE "user"
ADD COLUMN "roleId" UUID;

-- 2. Copy the existing role assignment from user_role
UPDATE "user" u
SET "roleId" = ur."roleId"
FROM "user_role" ur
WHERE ur."userId" = u."userId";

-- 3. Make sure every existing user received a role
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "user"
    WHERE "roleId" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Migration aborted: one or more users do not have a role assignment in user_role.';
  END IF;
END $$;

-- 4. Now make roleId required
ALTER TABLE "user"
ALTER COLUMN "roleId" SET NOT NULL;

-- 5. Remove the old UserRole foreign keys
ALTER TABLE "user_role"
DROP CONSTRAINT "user_role_roleId_fkey";

ALTER TABLE "user_role"
DROP CONSTRAINT "user_role_userId_fkey";

-- 6. Remove the old many-to-many table
DROP TABLE "user_role";

-- 7. Index the new roleId column
CREATE INDEX "user_roleId_idx"
ON "user"("roleId");

-- 8. Add the new User → Role foreign key
ALTER TABLE "user"
ADD CONSTRAINT "user_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "role"("roleId")
ON DELETE RESTRICT
ON UPDATE CASCADE;