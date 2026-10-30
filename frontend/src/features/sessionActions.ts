import { createAction } from "@reduxjs/toolkit";

/** Dispatched by the base API when the refresh token is no longer valid. */
export const sessionExpired = createAction("auth/sessionExpired");
