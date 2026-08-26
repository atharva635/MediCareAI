# 🩺 MediCare AI

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P_Video-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)

**MediCare AI** is a state-of-the-art digital healthcare ecosystem that automates patient intake, implements intelligent AI-powered symptom triaging, schedules appointments, processes secure payments, and hosts immersive virtual consultation workspaces with real-time peer-to-peer WebRTC video calling and Socket.io messaging.

---

## 🗺️ System Flow & Consultation Lifecycle

The following sequence details how patients, consultants, and doctors interact through MediCare AI, powered by AI routing and real-time signaling:

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    actor Consultant
    actor Doctor
    participant Server as MediCare AI Server
    participant AI as Groq LLM (MediCare AI)
    participant Payment as Razorpay API

    Patient->>Server: Register & Submit Symptoms (Intake)
    Server->>AI: Evaluate Symptom Details
    AI-->>Server: Risk Classification & Initial Advice
    Server-->>Patient: Display Triage Summary (Low/Medium/High/Critical)
    
    Consultant->>Server: Retrieve Triage Files
    Consultant->>Server: Add Notes & Refer to Doctor (e.g., Cardiologist)
    
    Patient->>Server: Engage in AI Intake Chatbot Interview
    Patient->>Server: Browse Doctor & Request Appointment (Stores Chat Logs)
    Server->>AI: Parse Intake Conversation Transcript
    AI-->>Server: Output Structured Patient Profile JSON
    
    Doctor->>Server: Review AI Intake Report (Risk & Severity)
    Doctor->>Server: Approve/Confirm Appointment Slot
    
    Patient->>Server: Initiate Payment Request
    Server->>Payment: Generate Order Transaction
    Payment-->>Patient: Razorpay Payment Checkout
    Patient->>Server: Verify Signature & Complete Payment
    Server-->>Doctor: Notify Confirmed Booking (Email Alert)
    
    Doctor->>Server: Launch Consultation Room (Join Room)
    Patient->>Server: Join Consultation Room
    Note over Patient, Doctor: Establish P2P WebRTC Video Stream & Socket.io Chat
    
    Doctor->>Server: Log Notes, Prescriptions & End Consultation
```

---

## ✨ Features

### 👤 Patient Workspace
*   **AI Symptoms Triage:** Perform preliminary symptom analysis. Patients receive automated advice and risk-level categorization (Low, Medium, High, Critical) before seeing a physician.
*   **Conversational AI Intake Agent:** When booking an appointment, patients complete a sequential, interactive chatbot interview gathering symptoms, duration, medical history, and medications.
*   **Physician Directory:** Browse verified lists of doctors filtered by specializations, consultation fees, experience, ratings, and active availability.
*   **Interactive Booking:** Select date/time slots with automatic conflict prevention (blocks overlapping schedules).
*   **Secure Payment Integration:** Integrated checkouts utilizing the **Razorpay API** for processing session fees.
*   **Virtual Ward & Chat:** Access virtual call chambers for high-fidelity audio/video calls and chat histories.

### 🥼 Doctor Portal
*   **AI Intake Diagnostic Report:** Before confirming appointments, doctors can review a parsed clinical profile showing severity levels (Mild, Moderate, Severe), risk categories (Low, Medium, High, Critical), chief complaints, medications list, and medical history highlights.
*   **Patient Chat Logs Accordion:** View exact pre-consultation transcripts between patients and the AI assistant to track symptoms context.
*   **Patient Intake Dashboard:** View complete list of triaged patient files, diagnostic logs, and historical consultations.
*   **Appointment Management:** Accept, decline, or complete upcoming appointments with inline reason logs.
*   **Prescription Console:** Record consultation outcomes, write clinical notes, input prescriptions, specify follow-up instructions, or transfer patients to other specialists.
*   **P2P Telemedicine:** Directly initiate secure WebRTC video calls with patients alongside inline chat messaging.

### 💼 Consultant Dashboard
*   **Intake Filtration:** Review newly registered triaged cases in the system.
*   **Referral Gateway:** Input guidance notes, assign specialists, and transition patients from triage stages into scheduled appointments.

---

## 🛠️ Tech Stack

### Frontend (Client)
*   **Library:** React 19 (ES6 modules)
*   **Build Tool:** Vite
*   **State Management:** Redux Toolkit (`@reduxjs/toolkit` & `react-redux`)
*   **Navigation:** React Router Dom (v7)
*   **Styles:** Tailwind CSS (v4)
*   **Graphics & Visualization:** Chart.js & React-Chartjs-2
*   **Telehealth:** Socket.io-client & native Browser WebRTC APIs

### Backend (Server)
*   **Runtime:** Node.js
*   **Framework:** Express.js (v5)
*   **Database:** MongoDB with Mongoose ODM
*   **Realtime Signaling:** Socket.io
*   **AI Engine:** Groq SDK (utilizing `openai/gpt-oss-120b` for JSON-structured intake profiles)
*   **Payment Processor:** Razorpay SDK
*   **Notification Engine:** Resend API & Nodemailer (SMTP configs)

---

## 📁 Repository Structure

```text
MediCareAI/
├── client/                     # Frontend Application
│   ├── public/                 # Static Assets
│   ├── src/
│   │   ├── components/         # Shared Components (Sidebar, Navbar, Loader, BookingModal)
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── layouts/            # Page layouts
│   │   ├── pages/              # Module Workspaces (Dashboard, Consultation, Triage, DoctorAppointments)
│   │   ├── redux/              # Redux Slices (Auth, Active State)
│   │   ├── routes/             # App Router with Role Protected Routes
│   │   ├── services/           # Axios Base Instances & API Handlers
│   │   └── utils/              # Helper functions
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API & WebSocket Server
│   ├── config/                 # MongoDB database adapter
│   ├── controllers/            # Controller Handlers (Auth, Payments, AI, Appointments)
│   ├── middleware/             # Route guards (JWT verification, Role validators)
│   ├── models/                 # Mongoose Database Schemas (User, Patient, Appointment)
│   ├── routes/                 # Express REST Endpoints
│   ├── services/               # Resend, Nodemailer, and Groq AI parsing scripts
│   ├── validations/            # Request payload sanity check schemas
│   ├── app.js                  # Express middleware declarations
│   ├── server.js               # Entry point (HTTP Server, Socket.io signaling configuration)
│   └── package.json
```

---

## ⚙️ Environment Variables Configuration

To run MediCare AI locally, configure a `.env` file within the `server/` directory.

Create the file: `server/.env`
```env
# Network Server Config
PORT=5000

# MONGODB CONNECTION
MONGODB_URI=your_mongodb_connection_string

# Authentication secret
JWT_SECRET=your_jwt_signing_token_secret

# Email Gateway Config (SMTP / Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email_address@gmail.com
SMTP_PASS=your_email_app_specific_password

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx

# AI Engine Credentials (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🚀 Installation & Local Development

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/atharva635/MediCareAI.git
cd MediCareAI
```

### 2️⃣ Spin Up Backend Server
```bash
# Navigate to Server directory
cd server

# Install Node dependencies
npm install

# Start local server in development mode (with hot reloading via nodemon)
npm run dev
```
*The server will initialize at `http://localhost:5000`.*

### 3️⃣ Spin Up Frontend Client
```bash
# Open a new terminal and navigate to client directory
cd client

# Install packages
npm install

# Launch Development Client
npm run dev
```
*The frontend client will launch at `http://localhost:5173`.*

---

## 📡 API Reference Summary

All requests are pre-configured to hit: `https://medicareai-backend-lp1l.onrender.com/api` (Production) or `http://localhost:5000/api` (Local Development).

| Category | Endpoint | Method | Description | Auth Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth/register` | `POST` | User registration (patient, doctor, consultant) | None |
| **Auth** | `/api/auth/login` | `POST` | Login user & sign JWT | None |
| **Auth** | `/api/auth/me` | `GET` | Retrieve logged-in user profile details | Bearer JWT |
| **Patients**| `/api/patient` | `POST` | Submit triage details & intake symptom list | Patient |
| **Patients**| `/api/patient/all` | `GET` | Fetch all records for the viewing workspace | Role Restricted |
| **Appointments**| `/api/appointments` | `POST` | Book appointment slot. Accepts `aiChatHistory` in request body to trigger Groq parsing. | Patient |
| **Appointments**| `/api/appointments/doctor`| `GET` | View appointments assigned to currently authenticated doctor | Doctor |
| **Payments**| `/api/payments/order` | `POST` | Generate Razorpay order ID | Patient |
| **Payments**| `/api/payments/verify`| `POST` | Confirm Razorpay cryptographic signature | Patient |
| **AI** | `/api/ai/chat` | `POST` | Direct chatbot assistance stream | Bearer JWT |

---

## 🗃️ Database Schemas (MongoDB models)

*   **`User`**: Manages authentication details, credentials, and roles (`patient`, `doctor`, `consultant`). Stores specialized metadata for doctors (specialization, experience, consulting fees, ratings, availability timetables).
*   **`Patient`**: Handles symptom logs, triage outcomes, severity categories (`Low`, `Medium`, `High`, `Critical`), payment statuses, consultant referral notes, and doctor diagnosis details.
*   **`Appointment`**: Connects patient and doctor models. Maintains date/time slots, amount, payment tracking, appointment statuses, and physician decisions (Pending/Accepted/Rejected). Stores the structured `aiIntake` sub-document:
    ```javascript
    aiIntake: {
      chiefComplaint: String,
      duration: String,
      symptoms: [String],
      history: String,
      medications: String,
      severity: String,
      riskLevel: String,
      summary: String,
      chatHistory: [
        { sender: String, text: String, timestamp: Date }
      ]
    }
    ```
*   **`Message`**: Persists conversation texts sent during virtual consultation sessions alongside roomId tracking for active WebRTC rooms.
*   **`Consultation`**: Represents active/completed direct communication tracks between patients and doctors.

---

## 🔮 Roadmap & Future Enhancements

As the platform is in active development, the following modules are planned:
*   [x] **AI Pre-Consultation Intake Agent:** Implemented interactive pre-consultation chatbot interviewing patients and structuring reports.
*   [ ] **Automated Prescription PDF:** Dynamically output signed digital prescriptions downloadable by patients.
*   [ ] **Patient Health Dashboard Analytics:** Display symptom severity progression graphs using Chart.js.
*   [ ] **AI Multi-turn Chat Records:** Save historic conversations with the Groq symptom triage chatbot.
*   [ ] **Smart Calendar Synchronization:** Direct integrations for synchronizing confirmed bookings with Google Calendar/Outlook APIs.

---

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.

Developed with 💙 by **[Atharva Gupta](https://github.com/atharva635)**.
