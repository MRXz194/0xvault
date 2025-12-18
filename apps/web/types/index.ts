export type VaultItemType = 'crypto' | 'login' | 'card' | 'note';

// Định nghĩa cấu trúc Metadata cho từng loại (để gợi ý code)
export interface BaseMetadata {
  name: string;
  note?: string;
  isFavorite?: boolean;
  deletedAt?: string; // ISO timestamp when soft-deleted
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

export interface NoteMetadata extends BaseMetadata {
  content?: string;
}

// Fallback an toàn cho các loại metadata chưa được mô tả chi tiết
export type UnknownMetadata = BaseMetadata & Record<string, unknown>;

export type VaultItemMetadata = CryptoMetadata | LoginMetadata | NoteMetadata | UnknownMetadata;

// Mapping với bảng vault_items
export interface VaultItem {
  id: string;
  user_id: string;
  type: VaultItemType;
  metadata: VaultItemMetadata;
  encrypted_blob: string;
  created_at: string;
}

//Mapping với bảng user_security
export interface UserSecurity {
  user_id: string;
  salt: string;
  auth_hash: string;
}