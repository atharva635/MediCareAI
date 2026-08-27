import api from "./api";

export const registerUser = async (data) => {
  return await api.post("/auth/register", data);
};

export const loginUser = async (data) => {

  console.log("Calling Login API...");

  const res = await api.post("/auth/login", data);

  console.log("API Success:", res.data);

  return res;
};
export const getCurrentUser = async () => {
  return await api.get("/auth/me");
};

export const getConsultants = async () => {
  return await api.get("/auth/consultants");
};

export const getDoctors = async () => {
  return await api.get("/auth/doctors");
};

export const logoutUser = async () => {
  return await api.post("/auth/logout");
};

export const updateDoctorProfile = async (data) => {
  return await api.put("/auth/profile", data);
};