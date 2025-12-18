'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast'; 
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { useVaultStore } from '@/lib/store';
import { generateSalt, deriveKeysFromPassword } from '@/lib/supabase/crypto';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const { setMasterKey } = useVaultStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Kiểm tra lỗi chưa confirm email từ Supabase
        if (error.message.includes("Email not confirmed")) {
          toast({
            variant: "destructive",
            title: "Account not activated",
            description: "Please check your email to verify your account before logging in.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error.message,
          });
        }
        return;
      }

      // Đăng nhập thành công -> derive master key và đảm bảo user_security tồn tại
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No session after login');
      }

      // Lấy salt từ bảng user_security (hoặc khởi tạo mới nếu chưa có)
      let saltHex: string;
      let authHash: string | null = null;

      const { data: secRow, error: secErr } = await supabase
        .from('user_security')
        .select('salt, auth_hash')
        .eq('user_id', user.id)
        .maybeSingle();

      if (secErr && secErr.code !== 'PGRST116') {
        // Lỗi khác ngoài not-found
        throw secErr;
      }

      if (secRow?.salt) {
        saltHex = secRow.salt;
      } else {
        saltHex = generateSalt();
      }

      const derived = await deriveKeysFromPassword(password, saltHex);
      authHash = derived.authHash;

      // Nếu chưa có bản ghi user_security -> tạo mới
      if (!secRow) {
        const { error: insertErr } = await supabase.from('user_security').insert({
          user_id: user.id,
          salt: saltHex,
          auth_hash: authHash,
        });
        if (insertErr) throw insertErr;
      }

      // Lưu master key trong RAM
      setMasterKey(derived.encryptionKey);

      toast({
        title: 'Login successful',
        description: 'Vault unlocked on this device session.',
      });

      router.push('/dashboard');
      router.refresh(); // Refresh để cập nhật session state cho các component server

    } catch {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your Vault
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Register
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}