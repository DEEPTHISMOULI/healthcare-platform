# Healthcare Telemedicine Platform

A comprehensive healthcare web platform with Patient, Doctor, and Admin portals.

## Project Overview

**Client:** Dr. Narendra  
**Developer:** Deepthi Sarvamangala Mouli  
**Start Date:** January 2025  
**Estimated Completion:** 6-8 weeks

## Features

### Patient Portal
- Registration/Login
- Profile management
- Pre-consultation questionnaires
- Medical document upload
- Video/Audio consultations
- Prescription access
- Referral letters

### Doctor Portal
- Medical profile
- Video/Audio consultations
- Patient chart access
- Prescription creation
- Referral management
- Consultation notes with AI integration
- Secure messaging

### Admin Portal
- Role-based access control
- Patient & Doctor management
- Appointment tracking
- Availability management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Video Calls | Daily.co |
| Email | Resend |
| Hosting | Hetzner Cloud |

## Project Structure

```
healthcare-platform/
├── frontend/                # React application
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   │   ├── patient/     # Patient portal pages
│   │   │   ├── doctor/      # Doctor portal pages
│   │   │   └── admin/       # Admin portal pages
│   │   ├── services/        # API calls & external services
│   │   ├── context/         # React context (auth, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Helper functions
│   │   └── styles/          # CSS files
│   └── package.json
├── backend/                 # Node.js API server
│   ├── routes/              # API routes
│   ├── middleware/          # Auth, validation middleware
│   ├── services/            # Business logic
│   ├── utils/               # Helper functions
│   └── package.json
├── docs/                    # Documentation
│   ├── database-schema.md
│   ├── api-endpoints.md
│   └── cost-tracking.md
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### 1. Clone the repository
```bash
git clone https://github.com/DEEPTHISMOULI/healthcare-platform.git
cd healthcare-platform
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Add your Supabase and Daily.co keys to .env
npm start
```

### 3. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Add your environment variables to .env
npm run dev
```

## Environment Variables

### Frontend (.env)
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_DAILY_API_KEY=your_daily_api_key
```

### Backend (.env)
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
RESEND_API_KEY=your_resend_api_key
```

## Development Timeline

| Week | Milestone |
|------|-----------|
| 1 | Authentication + User Profiles |
| 2 | Patient & Doctor Dashboards |
| 3 | Appointment Booking System |
| 4 | Video Consultation Integration |
| 5 | Documents + Prescriptions |
| 6 | Admin Dashboard + Messaging |
| 7 | AI Integration + Polish |
| 8 | Testing + Deployment |
