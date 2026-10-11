from backend.database import Base, engine
from backend.models import Scan


print("========================================")
print("CyberGuard AI - Creating Database Tables")
print("========================================")

Base.metadata.create_all(bind=engine)

print("Database tables created successfully.")
print("Created table: scans")
print("========================================")