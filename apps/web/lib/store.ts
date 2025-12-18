import { create } from 'zustand';

interface VaultState {
  masterKey: CryptoKey | null;
  setMasterKey: (key: CryptoKey | null) => void;
  isUnlocked: boolean;
}

export const useVaultStore = create<VaultState>((set) => ({
  masterKey: null,
  isUnlocked: false,
  setMasterKey: (key) => set({ masterKey: key, isUnlocked: !!key }),
}));