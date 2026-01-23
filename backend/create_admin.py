"""
Script to create the initial admin user.
Run this once to set up your first admin account.

Usage:
    uv run python create_admin.py
"""

from app.database import SessionLocal, engine
from app.models import Base, Employee, UserRole
from app.auth import get_password_hash

def create_admin():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if admin already exists
        existing_admin = db.query(Employee).filter(
            Employee.email == "admin@timesheetpro.com"
        ).first()

        if existing_admin:
            print("❌ Admin user already exists!")
            print(f"   Email: {existing_admin.email}")
            return

        # Create admin user
        admin = Employee(
            email="admin@timesheetpro.com",
            first_name="Admin",
            last_name="User",
            hashed_password=get_password_hash("1234"),
            role=UserRole.ADMIN,
            is_active=True,
            client_id=None
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("✅ Admin user created successfully!")
        print(f"   Email: admin@timesheetpro.com")
        print(f"   Password: 1234")
        print(f"   Role: {admin.role.value}")
        print("\n🚀 You can now login at http://localhost:5173/login")

    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
