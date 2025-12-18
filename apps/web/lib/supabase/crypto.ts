
// 1. Hàm tạo chuỗi ngẫu nhiên (Salt)
export function generateSalt(length = 16): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    // Chuyển sang Hex string để lưu DB
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // 2. Hàm chuyển chuỗi Hex thành Buffer (để tính toán)
  function hexToBuf(hex: string): ArrayBuffer {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes.buffer;
  }
  
  // 3. Hàm PBKDF2: Biến Password + Salt -> Key Material
  // Đây là bước quan trọng nhất để chống Brute-force
  async function getKeyMaterial(password: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
  }
  
  // 4. Hàm chính: Từ Password tạo ra Encryption Key và Auth Hash
  export async function deriveKeysFromPassword(password: string, saltHex: string) {
    const salt = hexToBuf(saltHex);
    const keyMaterial = await getKeyMaterial(password);
  
    // a. Tạo Encryption Key (Dùng để mã hóa ví - Giữ lại RAM, KHÔNG gửi server)
    // Dùng thuật toán AES-GCM, dài 256 bit
    const encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000, // Lặp 100k lần cho chậm (an toàn)
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true, // Cho phép export key này để dùng
      ["encrypt", "decrypt"]
    );
  
    // b. Tạo Auth Hash (Dùng để Login - Gửi lên Server)
    // Chúng ta "băm" cái key trên thêm 1 lần nữa để tạo ra chuỗi hash khác biệt
    const encryptionKeyExported = await window.crypto.subtle.exportKey("raw", encryptionKey);
    const authHashBuffer = await window.crypto.subtle.digest("SHA-256", encryptionKeyExported);
    
    // Chuyển Auth Hash sang string để lưu DB
    const authHash = Array.from(new Uint8Array(authHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  
    return { encryptionKey, authHash };
  }

// 5. Hàm Mã hóa dữ liệu (Text -> AES-GCM -> "IV:EncryptedData")
export async function encryptData(text: string, key: CryptoKey): Promise<string> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV chuẩn 12 bytes cho GCM
    const encodedText = new TextEncoder().encode(text);
  
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encodedText
    );
  
    // Chuyển Buffer sang Hex string để lưu DB
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const encryptedHex = Array.from(new Uint8Array(encryptedContent))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  
    return `${ivHex}:${encryptedHex}`; // Format: IV:DATA
  }
  
  // 6. Hàm Giải mã dữ liệu ("IV:EncryptedData" -> AES-GCM -> Text)
  export async function decryptData(encryptedString: string, key: CryptoKey): Promise<string> {
    try {
      const [ivHex, dataHex] = encryptedString.split(':');
      if (!ivHex || !dataHex) throw new Error('Invalid encrypted format');
  
      const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const data = new Uint8Array(dataHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
      const decryptedContent = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
      );
  
      return new TextDecoder().decode(decryptedContent);
    } catch (e) {
      console.error("Decryption failed:", e);
      return "Error: Wrong Key or Corrupted Data";
    }
  }