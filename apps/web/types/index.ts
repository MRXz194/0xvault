export type VaultItemType = 'crypto' | 'login' | 'card' | 'note';

// Định nghĩa cấu trúc Metadata cho từng loại (để gợi ý code)
export interface BaseMetadata {
  name: string;
  note?: string;
  isFavorite?: boolean;
}

export interface CryptoMetadata extends BaseMetadata {
  symbol: string;     // VD: ETH
  network: string;    // VD: ERC20
  address?: string;   // public key
}

export interface LoginMetadata extends BaseMetadata {
  username: string;
  url?: string;
}

// Mapping với bảng vault_items
export interface VaultItem {
  id: string;
  user_id: string;
  type: VaultItemType;
  metadata: CryptoMetadata | LoginMetadata | any; // Dùng 'any' để mở rộng nếu cần
  encrypted_blob: string;
  created_at: string;
}

//Mapping với bảng user_security
export interface UserSecurity {
  user_id: string;
  salt: string;
  auth_hash: string;
}