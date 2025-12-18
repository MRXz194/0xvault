'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateSalt, deriveKeysFromPassword } from '@/lib/supabase/crypto';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async () => {
    if (!email || !password) return alert('Please fill in all fields'); // Vui lòng điền đủ
    
    setLoading(true);
    try {
      // 1. Đăng ký User với Supabase Auth
      // (Pass gửi lên đây chỉ để login, còn bảo mật thật nằm ở bảng user_security)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Registration failed'); // Đăng ký thất bại
      }

      // 2. Bắt đầu quy trình Zero-Knowledge (Mã hóa tại Client)
      const salt = generateSalt(); // Tạo muối ngẫu nhiên
      const { authHash } = await deriveKeysFromPassword(password, salt); // Tạo Hash login

      console.log("Saving Security Data...", { salt, authHash });

      // 3. Lưu Salt & Hash vào bảng user_security
      const { error: dbError } = await supabase
        .from('user_security')
        .insert({
          user_id: authData.user.id, // Link với user vừa tạo
          salt: salt,
          auth_hash: authHash
        });

      if (dbError) throw dbError;

      alert('Registration successful! Please check your email to confirm (if enabled) or log in now.');
      router.push('/'); // Chuyển về trang chủ hoặc Login

    } catch (error: any) {
      console.error(error);
      alert(error.message || 'An error occurred'); // Có lỗi xảy ra
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">0xVault Register</CardTitle>
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
              placeholder="Enter your strongest password..." 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground text-red-500">
              ⚠️ We do not store your master password. If you forget it, your data will be lost forever.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? 'Encrypting & Creating Wallet...' : 'Create Account'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}