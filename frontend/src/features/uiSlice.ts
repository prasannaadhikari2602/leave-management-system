import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
}

const uiSlice = createSlice({
  name: "ui",
  initialState: { sidebarOpen: false } as UiState,
  reducers: {
    openSidebar(state) {
      state.sidebarOpen = true;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
  },
});

export const { openSidebar, closeSidebar } = uiSlice.actions;
export default uiSlice.reducer;
