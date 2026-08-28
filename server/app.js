import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import consultationRoutes from "./routes/consultationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

console.log("✅ Auth Routes Loaded");


const app = express();

app.use(cors());
app.use(express.json());

// 👇 Debug middleware
app.use("/api/auth", (req, res, next) => {
  console.log("🔥 Auth Route Hit");
  console.log(req.method, req.originalUrl);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to MediCare AI API 🚀",
  });
});

export default app;
