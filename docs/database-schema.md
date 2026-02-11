# Database Schema

## Overview

This document outlines the database structure for the Healthcare Telemedicine Platform.
Database: **Supabase (PostgreSQL)**

---

## Tables

### 1. users (Managed by Supabase Auth)

Supabase Auth handles the core authentication. We extend it with profiles.

---

### 2. profiles

Stores additional user information for all user types.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) | Links to Supabase Auth |
| role | VARCHAR(20) | NOT NULL | 'patient', 'doctor', 'admin' |
| full_name | VARCHAR(255) | NOT NULL | User's full name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User's email |
| phone | VARCHAR(20) | | Phone number |
| avatar_url | TEXT | | Profile picture URL |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation date |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update date |

---

### 3. patients

Extended information for patients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| user_id | UUID | REFERENCES profiles(id), UNIQUE | Links to profile |
| date_of_birth | DATE | | Patient's DOB |
| gender | VARCHAR(20) | | Male/Female/Other |
| address | TEXT | | Full address |
| emergency_contact_name | VARCHAR(255) | | Emergency contact |
| emergency_contact_phone | VARCHAR(20) | | Emergency phone |
| blood_group | VARCHAR(10) | | Blood type |
| allergies | TEXT | | Known allergies |
| medical_history | TEXT | | Past medical history |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### 4. doctors

Extended information for doctors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| user_id | UUID | REFERENCES profiles(id), UNIQUE | Links to profile |
| specialisation | VARCHAR(255) | NOT NULL | Medical specialty |
| license_number | VARCHAR(100) | NOT NULL, UNIQUE | Medical license |
| qualifications | TEXT | | Degrees, certifications |
| experience_years | INTEGER | | Years of experience |
| consultation_fee | DECIMAL(10,2) | | Fee per consultation |
| bio | TEXT | | Doctor's biography |
| available_days | JSONB | | {"mon": true, "tue": true, ...} |
| available_hours | JSONB | | {"start": "09:00", "end": "17:00"} |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### 5. appointments

Manages all appointment bookings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| doctor_id | UUID | REFERENCES doctors(id) | Doctor reference |
| scheduled_date | DATE | NOT NULL | Appointment date |
| scheduled_time | TIME | NOT NULL | Appointment time |
| duration_minutes | INTEGER | DEFAULT 30 | Length of appointment |
| type | VARCHAR(20) | NOT NULL | 'video', 'audio' |
| status | VARCHAR(20) | DEFAULT 'scheduled' | 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show' |
| cancellation_reason | TEXT | | If cancelled, why |
| daily_room_url | TEXT | | Daily.co room URL |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### 6. pre_consultation_forms

Pre-consultation questionnaires filled by patients.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| appointment_id | UUID | REFERENCES appointments(id), UNIQUE | Links to appointment |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| chief_complaint | TEXT | NOT NULL | Main reason for visit |
| current_symptoms | TEXT | | Symptom description |
| symptom_duration | VARCHAR(100) | | How long symptoms present |
| current_medications | TEXT | | Medications being taken |
| additional_notes | TEXT | | Any other info |
| consent_given | BOOLEAN | DEFAULT FALSE | Terms accepted |
| consent_timestamp | TIMESTAMP | | When consent was given |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### 7. consultations

Records of completed consultations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| appointment_id | UUID | REFERENCES appointments(id), UNIQUE | Links to appointment |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| doctor_id | UUID | REFERENCES doctors(id) | Doctor reference |
| diagnosis | TEXT | | Doctor's diagnosis |
| clinical_notes | TEXT | | Detailed consultation notes |
| ai_summary | TEXT | | AI-generated summary |
| follow_up_required | BOOLEAN | DEFAULT FALSE | Follow-up needed? |
| follow_up_date | DATE | | Suggested follow-up date |
| started_at | TIMESTAMP | | Consultation start time |
| ended_at | TIMESTAMP | | Consultation end time |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

---

### 8. prescriptions

Prescriptions issued by doctors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| consultation_id | UUID | REFERENCES consultations(id) | Links to consultation |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| doctor_id | UUID | REFERENCES doctors(id) | Doctor reference |
| medications | JSONB | NOT NULL | Array of medication objects |
| instructions | TEXT | | General instructions |
| valid_until | DATE | | Prescription expiry |
| pdf_url | TEXT | | Generated PDF URL |
| created_at | TIMESTAMP | DEFAULT NOW() | |

**medications JSONB structure:**
```json
[
  {
    "name": "Paracetamol",
    "dosage": "500mg",
    "frequency": "Twice daily",
    "duration": "5 days",
    "instructions": "Take after meals"
  }
]
```

---

### 9. referrals

Referral letters to other specialists/hospitals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| consultation_id | UUID | REFERENCES consultations(id) | Links to consultation |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| referring_doctor_id | UUID | REFERENCES doctors(id) | Who is referring |
| referred_to | VARCHAR(255) | NOT NULL | Specialist/Hospital name |
| referral_reason | TEXT | NOT NULL | Why referral is needed |
| urgency | VARCHAR(20) | DEFAULT 'routine' | 'routine', 'urgent', 'emergency' |
| notes | TEXT | | Additional notes |
| pdf_url | TEXT | | Generated PDF URL |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### 10. documents

Medical documents uploaded by patients or doctors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| uploaded_by | UUID | REFERENCES profiles(id) | Who uploaded |
| file_name | VARCHAR(255) | NOT NULL | Original file name |
| file_url | TEXT | NOT NULL | Supabase storage URL |
| file_type | VARCHAR(50) | NOT NULL | 'report', 'image', 'prescription', 'other' |
| file_size | INTEGER | | Size in bytes |
| description | TEXT | | Document description |
| consultation_id | UUID | REFERENCES consultations(id) | Optional link to consultation |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### 11. messages

Secure messaging between patients and doctors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| sender_id | UUID | REFERENCES profiles(id) | Who sent |
| receiver_id | UUID | REFERENCES profiles(id) | Who receives |
| appointment_id | UUID | REFERENCES appointments(id) | Related appointment |
| content | TEXT | NOT NULL | Message content |
| is_read | BOOLEAN | DEFAULT FALSE | Read status |
| read_at | TIMESTAMP | | When read |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

### 12. availability_slots

Doctor availability for appointment booking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique ID |
| doctor_id | UUID | REFERENCES doctors(id) | Doctor reference |
| date | DATE | NOT NULL | Available date |
| start_time | TIME | NOT NULL | Slot start |
| end_time | TIME | NOT NULL | Slot end |
| is_booked | BOOLEAN | DEFAULT FALSE | Already booked? |
| created_at | TIMESTAMP | DEFAULT NOW() | |

---

## Supabase SQL to Create Tables

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    blood_group VARCHAR(10),
    allergies TEXT,
    medical_history TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doctors table
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    specialisation VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    qualifications TEXT,
    experience_years INTEGER,
    consultation_fee DECIMAL(10,2),
    bio TEXT,
    available_days JSONB DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}',
    available_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    type VARCHAR(20) NOT NULL CHECK (type IN ('video', 'audio')),
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    cancellation_reason TEXT,
    daily_room_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pre-consultation forms table
CREATE TABLE pre_consultation_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    chief_complaint TEXT NOT NULL,
    current_symptoms TEXT,
    symptom_duration VARCHAR(100),
    current_medications TEXT,
    additional_notes TEXT,
    consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consultations table
CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    diagnosis TEXT,
    clinical_notes TEXT,
    ai_summary TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    medications JSONB NOT NULL,
    instructions TEXT,
    valid_until DATE,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    referring_doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    referred_to VARCHAR(255) NOT NULL,
    referral_reason TEXT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
    notes TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('report', 'image', 'prescription', 'other')),
    file_size INTEGER,
    description TEXT,
    consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability slots table
CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, date, start_time)
);

-- Create indexes for better query performance
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_availability_doctor_date ON availability_slots(doctor_id, date);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
```

---

## Row Level Security Policies

These will be added after basic setup to control data access:

- Patients can only see their own data
- Doctors can see their patients' data
- Admins can see everything

---

## Entity Relationship Diagram

```
profiles (1) ──── (1) patients
    │
    └──── (1) doctors
                │
                ├──── (*) appointments ────── (*) patients
                │           │
                │           └──── (1) pre_consultation_forms
                │           │
                │           └──── (1) consultations
                │                       │
                │                       ├──── (*) prescriptions
                │                       │
                │                       └──── (*) referrals
                │
                └──── (*) availability_slots

documents ────── (*) patients
messages ────── profiles (sender/receiver)
```
