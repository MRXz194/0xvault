import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, Wallet, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50 dark:bg-zinc-950">
      <Card className="w-full max-w-md text-center shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">0xVault</CardTitle>
          <CardDescription className="text-base">
            Zero-knowledge storage for your crypto assets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
             <div className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-zinc-900 rounded-lg border">
                <Lock className="h-5 w-5" />
                <span>Client Encrypted</span>
             </div>
             <div className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-zinc-900 rounded-lg border">
                <Wallet className="h-5 w-5" />
                <span>Secure Storage</span>
             </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/login" className="w-full">
              <Button className="w-full h-11 text-base">Open My Vault</Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full h-11">Create New Account</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-gray-400">
        Secured by AES-GCM & PBKDF2
      </p>
    </div>
  );
}