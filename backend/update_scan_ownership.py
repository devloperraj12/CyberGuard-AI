from sqlalchemy import text

from database import engine


print("========================================")
print("CyberGuard AI - Updating Scan Ownership")
print("========================================")

with engine.begin() as connection:

    # -----------------------------------------------------
    # 1. Add user_id column if it does not already exist
    # -----------------------------------------------------

    connection.execute(
        text(
            """
            ALTER TABLE scans
            ADD COLUMN IF NOT EXISTS user_id INTEGER;
            """
        )
    )

    print("user_id column checked/created.")

    # -----------------------------------------------------
    # 2. Assign existing scans to User ID 1
    # -----------------------------------------------------

    connection.execute(
        text(
            """
            UPDATE scans
            SET user_id = 1
            WHERE user_id IS NULL;
            """
        )
    )

    print("Existing scans assigned to User ID 1.")

    # -----------------------------------------------------
    # 3. Add foreign key if it does not already exist
    # -----------------------------------------------------

    connection.execute(
        text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'scans_user_id_fkey'
                ) THEN
                    ALTER TABLE scans
                    ADD CONSTRAINT scans_user_id_fkey
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE;
                END IF;
            END
            $$;
            """
        )
    )

    print("Foreign key checked/created.")

    # -----------------------------------------------------
    # 4. Make user_id mandatory
    # -----------------------------------------------------

    connection.execute(
        text(
            """
            ALTER TABLE scans
            ALTER COLUMN user_id SET NOT NULL;
            """
        )
    )

    print("user_id set to NOT NULL.")


print("========================================")
print("Scan ownership update completed.")
print("========================================")