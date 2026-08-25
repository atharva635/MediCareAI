import { BrowserRouter, Routes, Route } from "react-router-dom";

import Landing from "../pages/Landing/Landing";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import DoctorDashboard from "../pages/Dashboard/Dashboard";
import PatientDashboard from "../pages/Dashboard/PatientDashboard";
import ConsultantDashboard from "../pages/Dashboard/ConsultantDashboard";
import Assessment from "../pages/Assessment/Assessment";
import History from "../pages/History/History";
import Profile from "../pages/Profile/Profile";
import PatientTriage from "../pages/Triage/PatientTriage";
import DoctorList from "../pages/DoctorList/DoctorList";
import ConsultationSpace from "../pages/Consultation/ConsultationSpace";
import PatientAppointments from "../pages/PatientAppointments/PatientAppointments";
import DoctorAppointments from "../pages/DoctorAppointments/DoctorAppointments";

import ProtectedRoute from "../components/ProtectedRoute";
import DashboardRedirect from "../components/DashboardRedirect";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Smart Redirect */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Role-Specific Dashboards */}
        <Route
          path="/patient/dashboard"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/appointments"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientAppointments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/doctor/appointments"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorAppointments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consultant/dashboard"
          element={
            <ProtectedRoute allowedRoles={["consultant"]}>
              <ConsultantDashboard />
            </ProtectedRoute>
          }
        />

        {/* Triage & Consultation Workspaces */}
        <Route
          path="/patient/triage"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientTriage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/patient/doctors/:triageId"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <DoctorList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consultation/:id"
          element={
            <ProtectedRoute>
              <ConsultationSpace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessment"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <Assessment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <History />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}