"""
Doctor Seeding Script
Adds sample doctors to the database with proper credentials
Run this script once to initialize the doctor database
python backend/seed_doctors.py
"""

import asyncio
import sys
from pathlib import Path
from app.database import Database, settings
from app.auth import get_password_hash
from bson import ObjectId
from datetime import datetime

# Sample doctors data
SAMPLE_DOCTORS = [
    {
        "first_name": "Sarah",
        "last_name": "Johnson",
        "email": "sarah.johnson@gmail.com",
        "password": "123456789",
        "specialty": "Neurologist",
        "license_number": "LIC-2024-001",
        "clinic_name": "Neuro Care Clinic",
        "experience": "12 years",
        "rating": 4.8,
        "appointment_fee": 450,
    },
    {
        "first_name": "Michael",
        "last_name": "Chen",
        "email": "michael.chen@gmail.com",
        "password": "123456789",
        "specialty": "Physiotherapist",
        "license_number": "LIC-2024-002",
        "clinic_name": "Movement Therapy Center",
        "experience": "8 years",
        "rating": 4.9,
        "appointment_fee": 300,
    },
    {
        "first_name": "Emily",
        "last_name": "Watson",
        "email": "emily.watson@gmail.com",
        "password": "123456789",
        "specialty": "Cardiologist",
        "license_number": "LIC-2024-003",
        "clinic_name": "Cardiac Health Institute",
        "experience": "15 years",
        "rating": 4.7,
        "appointment_fee": 500,
    },
    {
        "first_name": "James",
        "last_name": "Rodriguez",
        "email": "james.rodriguez@gmail.com",
        "password": "123456789",
        "specialty": "Therapist",
        "license_number": "LIC-2024-004",
        "clinic_name": "Mental Wellness Clinic",
        "experience": "10 years",
        "rating": 4.6,
        "appointment_fee": 250,
    },
    {
        "first_name": "Lisa",
        "last_name": "Kumar",
        "email": "lisa.kumar@gmail.com",
        "password": "123456789",
        "specialty": "Neurologist",
        "license_number": "LIC-2024-005",
        "clinic_name": "Advanced Neurology",
        "experience": "14 years",
        "rating": 4.85,
        "appointment_fee": 480,
    },
    {
        "first_name": "David",
        "last_name": "Thompson",
        "email": "david.thompson@gmail.com",
        "password": "123456789",
        "specialty": "Physiatrist",
        "license_number": "LIC-2024-006",
        "clinic_name": "Rehabilitation Center",
        "experience": "11 years",
        "rating": 4.7,
        "appointment_fee": 320,
    },
]


async def seed_doctors():
    """Add sample doctors to the database"""
    try:
        # Connect to database
        await Database.connect_db()
        db = Database.get_db()

        # Check existing doctors
        existing_count = await db["doctors"].count_documents({})
        print(f"✓ Existing doctors: {existing_count}")

        # Add new doctors if they don't exist
        added_count = 0
        for doctor_data in SAMPLE_DOCTORS:
            # Check if doctor already exists
            existing = await db["doctors"].find_one({"email": doctor_data["email"]})
            if existing:
                print(f"  ⚠ Doctor {doctor_data['email']} already exists, skipping...")
                continue

            # Create doctor record
            doctor_doc = {
                "doctor_id": f"DOC-{ObjectId()}",
                "first_name": doctor_data["first_name"],
                "last_name": doctor_data["last_name"],
                "email": doctor_data["email"],
                "password_hash": get_password_hash(doctor_data["password"]),
                "specialty": doctor_data["specialty"],
                "clinic_name": doctor_data.get("clinic_name"),
                "license_number": doctor_data["license_number"],
                "appointment_fee": doctor_data.get("appointment_fee", 0),
                "experience": doctor_data.get("experience"),
                "rating": doctor_data.get("rating", 4.5),
                "is_active": True,
                "patients_assigned": [],
                "patients_count": 0,
                "bio": f"Specializes in {doctor_data['specialty']} with {doctor_data.get('experience', 'extensive')} experience",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            result = await db["doctors"].insert_one(doctor_doc)
            added_count += 1
            print(f"  ✅ Added: {doctor_data['first_name']} {doctor_data['last_name']} ({doctor_data['email']})")

        # Get total count
        total_count = await db["doctors"].count_documents({})
        print(f"\n✓ Total doctors in database: {total_count}")
        print(f"✓ Newly added: {added_count}")

        print("\n" + "="*60)
        print("🎯 DOCTOR CREDENTIALS")
        print("="*60)
        print("\nUse these credentials for testing:\n")
        for doctor in SAMPLE_DOCTORS:
            print(f"Email: {doctor['email']}")
            print(f"Pass:  {doctor['password']}")
            print(f"Role:  Doctor ({doctor['specialty']})")
            print()

        print("="*60)
        print("✓ Doctor seeding completed successfully!")
        print("="*60)

    except Exception as e:
        print(f"❌ Error seeding doctors: {e}")
        raise
    finally:
        if Database.client:
            Database.client.close()
            print("\n✓ Database connection closed")


if __name__ == "__main__":
    print("🌱 Starting Doctor Database Seeding...\n")
    asyncio.run(seed_doctors())
