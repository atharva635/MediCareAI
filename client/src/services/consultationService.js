import api from "./api";

// Fetch chat history for a specific room ID
export const getRoomMessages = async (roomId) => {
  return await api.get(`/consultations/${roomId}/messages`);
};
