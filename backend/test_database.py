from sqlalchemy import text

from database import engine


try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database();")
        )

        database_name = result.scalar()

        print("========================================")
        print("CyberGuard AI Database Connection Test")
        print("========================================")
        print(f"Connected database: {database_name}")
        print("Connection successful!")
        print("========================================")

except Exception as error:
    print("========================================")
    print("Database connection failed")
    print("========================================")
    print(error)
    print("========================================")