"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppState {
  chatModel?: { provider: string; model: string };
  openShortcutsPopup: boolean;
  openChatPreferences: boolean;
  openUserSettings: boolean;
}

export interface AppDispatch {
  mutate: (state: Partial<AppState>) => void;
}

const initialState: AppState = {
  chatModel: { provider: "openai", model: "gpt-4o" },
  openShortcutsPopup: false,
  openChatPreferences: false,
  openUserSettings: false,
};

export const appStore = create<AppState & AppDispatch>()(
  persist(
    (set) => ({
      ...initialState,
      mutate: set,
    }),
    {
      name: "workflow-app-store",
      partialize: (state) => ({
        chatModel: state.chatModel,
      }),
    },
  ),
);
