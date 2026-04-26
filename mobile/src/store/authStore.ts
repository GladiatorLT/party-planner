import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  accessToken: string | null;
  idToken: string | null;
  username: string | null;
  isLoading: boolean;
  setTokens: (tokens: { accessToken: string; idToken: string; refreshToken: string }, username: string) => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  idToken: null,
  username: null,
  isLoading: true,

  setTokens: async ({ accessToken, idToken, refreshToken }, username) => {
    await AsyncStorage.multiSet([
      ['pp_access_token', accessToken],
      ['pp_id_token', idToken],
      ['pp_refresh_token', refreshToken],
      ['pp_username', username],
    ]);
    set({ accessToken, idToken, username });
  },

  loadStoredAuth: async () => {
    try {
      const [[, accessToken], [, idToken], [, username]] = await AsyncStorage.multiGet([
        'pp_access_token', 'pp_id_token', 'pp_username',
      ]);
      set({ accessToken, idToken, username, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await AsyncStorage.multiRemove(['pp_access_token', 'pp_id_token', 'pp_refresh_token', 'pp_username']);
    set({ accessToken: null, idToken: null, username: null });
  },
}));
