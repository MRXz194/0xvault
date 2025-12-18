'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useVaultStore } from '@/lib/store';
import { deriveKeysFromPassword, generateSalt } from '@/lib/supabase/crypto';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

export default function UnlockPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { setMasterKey } = useVaultStore();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure there is a session, otherwise go to login
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
      }
    })();
  }, [router, supabase]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session');

      // Fetch salt from user_security (or create if missing)
      const { data: secRow, error: secErr } = await supabase
        .from('user_security')
        .select('salt, auth_hash')
        .eq('user_id', user.id)
        .maybeSingle();

      if (secErr && secErr.code !== 'PGRST116') {
        throw secErr;
      }

      let saltHex = secRow?.salt as string | undefined;
      if (!saltHex) {
        saltHex = generateSalt();
        const { error: insertErr } = await supabase.from('user_security').insert({
          user_id: user.id,
          salt: saltHex,
          auth_hash: null,
        });
        if (insertErr) throw insertErr;
      }

      const derived = await deriveKeysFromPassword(password, saltHex);
      setMasterKey(derived.encryptionKey);

      toast({ title: 'Vault unlocked', description: 'You can now access your data.' });
      router.replace('/dashboard');
      router.refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Unlock failed', description: message });
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
              <Lock className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Unlock Vault</CardTitle>
          <CardDescription>Enter your password to derive the encryption key</CardDescription>
        </CardHeader>
        <form onSubmit={handleUnlock}>
          <CardContent className="space-y-4">
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
          <CardFooter>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Unlocking...</> : 'Unlock'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
