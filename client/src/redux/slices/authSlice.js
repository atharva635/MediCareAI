import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  token: localStorage.getItem("token") || null,
  loading: !!localStorage.getItem("token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      if (action.payload.token) {
        state.token = action.payload.token;
        localStorage.setItem("token", action.payload.token);
      }
      state.loading = false;
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    logout: (state) => {
      state.user = null;
      state.token = null;
      state.loading = false;

      localStorage.removeItem("token");
    },
  },
});

export const { setUser, setLoading, logout } = authSlice.actions;

export default authSlice.reducer;