import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'teacher' | 'health_staff';

type ProfileState = {
  name: string | null;
  role: Role | null;
  setProfile: (name: string, role: Role) => void;
  clearProfile: () => void;
};

// This is a frontend-only prototype: there's no backend to authenticate against, so
// "login" is just a locally-stored display name + role, not a real security boundary.
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: null,
      role: null,
      setProfile: (name, role) => set({ name, role }),
      clearProfile: () => set({ name: null, role: null }),
    }),
    { name: 'healthprayaas.profile' },
  ),
);
