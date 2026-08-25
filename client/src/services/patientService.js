import api from "./api";

export const addPatient = async (data) => {
  return await api.post("/patient/add", data);
};

export const getPatients = async () => {
  return await api.get("/patient/all");
};

export const getDashboardStats = async () => {
  return await api.get("/patient/stats");
};

export const getPatientById = async (id) => {
  return await api.get(`/patient/${id}`);
};

export const referPatient = async (id, data) => {
  return await api.post(`/patient/${id}/refer`, data);
};

export const addRecommendation = async (id, data) => {
  return await api.post(`/patient/${id}/recommend`, data);
};

export const bookDoctor = async (id, data) => {
  return await api.post(`/patient/${id}/book`, data);
};

export const startConsultation = async (id) => {
  return await api.post(`/patient/${id}/start`);
};

export const completeConsultation = async (id, data) => {
  return await api.post(`/patient/${id}/complete`, data);
};