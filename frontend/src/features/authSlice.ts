import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../types";
import { authApi } from "../api/authApi";
import { sessionExpired } from "./sessionActions";

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  status: AuthStatus;
}

const initialState: AuthState = { user: null, status: "unknown" };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.status = "authenticated";
    },
    clearUser(state) {
      state.user = null;
      state.status = "unauthenticated";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sessionExpired, (state) => {
        state.user = null;
        state.status = "unauthenticated";
      })
      .addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, { payload }) => {
        state.user = payload;
        state.status = "authenticated";
      })
      .addMatcher(authApi.endpoints.getMe.matchRejected, (state) => {
        state.user = null;
        state.status = "unauthenticated";
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, { payload }) => {
        state.user = payload.user;
        state.status = "authenticated";
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.status = "unauthenticated";
      });
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
