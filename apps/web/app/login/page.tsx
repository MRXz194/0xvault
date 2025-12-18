'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deriveKeysFromPassword } from '@/lib/supabase/crypto'; // Import hàm crypto
import { useVaultStore } from '@/lib/store'; // Import kho chứa RAM
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const setMasterKey = useVaultStore((state) => state.setMasterKey);

  const handleLogin = async () => {
    if (!email || !password) return alert('Please enter email and password');
    setLoading(true);

    try {
      // 1. Đăng nhập Auth cơ bản (để lấy quyền đọc DB)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) throw new Error('Incorrect email or password');

      // 2. Lấy thông tin bảo mật (Salt & Hash) từ DB
      // Nhờ RLS, user chỉ lấy được dòng của chính mình
      const { data: securityData, error: secError } = await supabase
        .from('user_security')
        .select('salt, auth_hash')
        .eq('user_id', authData.user.id)
        .single();

      if (secError || !securityData) {
        throw new Error('Security data not found. Please register again.');
      }

      // 3. Tính toán lại Key từ Password nhập vào + Salt trong DB
      console.log("Deriving keys...");
      const { encryptionKey, authHash } = await deriveKeysFromPassword(password, securityData.salt);

      // 4. Kiểm tra lần cuối: Hash tính ra có khớp với Hash trong DB không?
      // (Bước này đảm bảo Password nhập vào chính là Master Password giải mã được dữ liệu)
      if (authHash !== securityData.auth_hash) {
        throw new Error('Critical Error: Password matches Auth but fails Decryption check!');
      }

      // 5. LƯU CHÌA KHÓA VÀO RAM (Zustand)
      setMasterKey(encryptionKey);
      
      console.log("Unlock success! Key stored in memory.");
      router.push('/dashboard'); // Chuyển hướng vào két sắt

    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">0xVault Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email" 
              placeholder="user@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pass">Master Password</Label>
            <Input 
              id="pass"
              type="password" 
              placeholder="Your master password..." 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Unlocking Vault...' : 'Unlock Vault'}
          </Button>
          <Button variant="link" className="text-xs" onClick={() => router.push('/register')}>
            Don't have an account? Register
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}