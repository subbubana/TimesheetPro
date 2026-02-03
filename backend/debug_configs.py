import os
from app.database import SessionLocal
from app.models import IntegrationConfig, IntegrationType
from datetime import datetime

from sqlalchemy import inspect
from app.database import engine

print(f"DATABASE_URL: {os.getenv('DATABASE_URL')}")

# Check tables
insp = inspect(engine)
tables = insp.get_table_names()
print(f"Tables: {tables}")

db = SessionLocal()
try:
    configs = db.query(IntegrationConfig).all()
    print(f"Found {len(configs)} configs:")
    for c in configs:
        print(f"ID: {c.id}, Type: {c.type}, Active: {c.is_active}")

    # Try inserting a dummy config to test persistence
    # dummy = IntegrationConfig(
    #    type=IntegrationType.EMAIL,
    #    config_data="test",
    #    is_active=False
    # )
    # db.add(dummy)
    # db.commit()
    # print("Successfully inserted dummy config")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
