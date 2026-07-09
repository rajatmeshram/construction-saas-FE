import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { AuthUser } from "@/lib/types";

export type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ access: string; refresh: string; user: AuthUser }>) {
      const { access, refresh, user } = action.payload;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("construction_access", access);
        window.localStorage.setItem("construction_refresh", refresh);
        window.localStorage.setItem("construction_user", JSON.stringify(user));
      }
      state.accessToken = access;
      state.refreshToken = refresh;
      state.user = user;
      state.hydrated = true;
    },
    clearSession(state) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("construction_access");
        window.localStorage.removeItem("construction_refresh");
        window.localStorage.removeItem("construction_user");
      }
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.hydrated = true;
    },
    hydrateSession(state) {
      if (typeof window === "undefined") {
        return;
      }
      const accessToken = window.localStorage.getItem("construction_access");
      const refreshToken = window.localStorage.getItem("construction_refresh");
      const userJson = window.localStorage.getItem("construction_user");
      if (!accessToken || !refreshToken || !userJson) {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        state.hydrated = true;
        return;
      }
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.user = JSON.parse(userJson) as AuthUser;
      state.hydrated = true;
    },
  },
});

export const { setSession, clearSession, hydrateSession } = authSlice.actions;
export default authSlice.reducer;
