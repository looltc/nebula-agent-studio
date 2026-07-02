import { create } from 'zustand';
import { apiClient } from '@/services/api';
import type { UserProfile } from '@/types/api';

export interface UserState {
  user: UserProfile | null;
  loading: boolean;

  loadUser: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<boolean>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,

  loadUser: async () => {
    set({ loading: true });
    try {
      const res = await apiClient.getUser();
      set({ user: res.user, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  updateDisplayName: async (displayName: string) => {
    const trimmed = displayName.trim();
    if (!trimmed) return false;
    try {
      const res = await apiClient.updateUser({ display_name: trimmed });
      set({ user: res.user });
      return true;
    } catch {
      return false;
    }
  },
}));
