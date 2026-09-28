import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SettingsState = {
  openaiApiKey: string | null;
  setOpenaiApiKey: (key: string | null) => void;
};

// Prototype trade-off: the key lives in browser localStorage and is used directly from
// the browser to call OpenAI (see lib/openai.ts). Fine for a local demo; never do this
// in a real deployment — that's exactly why the mobile app proxies through a backend.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openaiApiKey: null,
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
    }),
    { name: 'healthprayaas.settings' },
  ),
);
