import api from "./api";

// 1. Create Appointment (Patient only)
export const createAppointment = async (data) => {
  return await api.post("/appointments", data);
};

// 2. Get Patient Appointments
export const getPatientAppointments = async () => {
  return await api.get("/appointments/patient");
};

// 3. Get Doctor Appointments
export const getDoctorAppointments = async () => {
  return await api.get("/appointments/doctor");
};

// 4. Get Appointment By ID
export const getAppointmentById = async (id) => {
  return await api.get(`/appointments/${id}`);
};

// 5. Cancel Appointment
export const cancelAppointment = async (id) => {
  return await api.put(`/appointments/${id}/cancel`);
};

// 6. Complete Appointment (Doctor only)
export const completeAppointment = async (id, data) => {
  return await api.put(`/appointments/${id}/complete`, data);
};

// 7. Save Doctor Availability
export const saveAvailability = async (data) => {
  return await api.put("/appointments/availability", data);
};

// 8. Get Doctor Availability
export const getAvailability = async (doctorId) => {
  return await api.get(`/appointments/availability/${doctorId}`);
};

// 9. Get Available 30-min Slots
export const getAvailableSlots = async (doctorId, date) => {
  return await api.get(`/appointments/slots/${doctorId}?date=${date}`);
};

// 10. Mock Payment for Appointment (Patient only)
export const payAppointment = async (id) => {
  return await api.put(`/appointments/${id}/pay`);
};

// 11. Accept Appointment (Doctor only)
export const acceptAppointment = async (id) => {
  return await api.put(`/appointments/${id}/accept`);
};

// 12. Reject Appointment (Doctor only)
export const rejectAppointment = async (id, data) => {
  return await api.put(`/appointments/${id}/reject`, data);
};

// 13. Delete Appointment
export const deleteAppointment = async (id) => {
  return await api.delete(`/appointments/${id}`);
};
