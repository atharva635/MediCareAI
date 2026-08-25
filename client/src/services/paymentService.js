import api from "./api";

// Create Razorpay Order
export const createRazorpayOrder = async (appointmentId) => {
  return await api.post("/payments/create-order", { appointmentId });
};

// Verify Razorpay Payment Signature
export const verifyRazorpayPayment = async (verifyData) => {
  return await api.post("/payments/verify", verifyData);
};
