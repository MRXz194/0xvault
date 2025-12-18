'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useVaultStore } from '@/lib/store';
import { encryptData, decryptData } from '@/lib/supabase/crypto';
import { VaultItem } from '@/types'; 

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Copy, Eye, EyeOff, LogOut, Wallet, Key, StickyNote } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIChat } from "@/components/ai-chat"; 

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  
  // Lấy Key từ RAM (Zustand)
  const { masterKey, setMasterKey } = useVaultStore();
  
  const [items, setItems] = useState<VaultItem[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);

  // State cho Form thêm mới
  const [isOpen, setIsOpen] = useState(false);
  const [newItemType, setNewItemType] = useState('crypto');
  const [newItemName, setNewItemName] = useState('');
  const [newItemSecret, setNewItemSecret] = useState(''); 
  const [newItemNote, setNewItemNote] = useState(''); 

  // 1. Bảo vệ trang: Không có Key là đuổi ra ngoài ngay
  useEffect(() => {
    if (!masterKey) {
      router.replace('/login');
    } else {
      fetchItems();
    }
  }, [masterKey]);

  // 2. Lấy dữ liệu từ Supabase
  const fetchItems = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as any);
    }
    setLoading(false);
  };

  // 3. Hàm thêm mới Item
  const handleAddItem = async () => {
    if (!newItemName || !newItemSecret || !masterKey) return alert('Please fill required fields');

    try {
      const encryptedBlob = await encryptData(newItemSecret, masterKey);

      const metadata = {
        name: newItemName,
        note: newItemNote,
        createdAt: new Date().toISOString()
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase.from('vault_items').insert({
        user_id: user.id,
        type: newItemType,
        metadata: metadata,
        encrypted_blob: encryptedBlob
      });

      if (error) throw error;

      setIsOpen(false);
      setNewItemName('');
      setNewItemSecret('');
      setNewItemNote('');
      fetchItems();
      alert("Item added securely!");

    } catch (e: any) {
      console.error(e);
      alert(e.message);
    }
  };

  // 4. Hàm xem giải mã
  const toggleReveal = async (item: VaultItem) => {
    if (decryptedCache[item.id]) {
      const newCache = { ...decryptedCache };
      delete newCache[item.id];
      setDecryptedCache(newCache);
      return;
    }

    if (masterKey) {
      const secret = await decryptData(item.encrypted_blob, masterKey);
      setDecryptedCache(prev => ({ ...prev, [item.id]: secret }));
    }
  };

  const handleLogout = async () => {
    setMasterKey(null);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const getIcon = (type: string) => {
    if (type === 'crypto') return <Wallet className="h-5 w-5 text-orange-500" />;
    if (type === 'login') return <Key className="h-5 w-5 text-blue-500" />;
    return <StickyNote className="h-5 w-5 text-gray-500" />;
  };

  if (!masterKey) return null; 

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header - Luôn hiển thị ở trên cùng */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Vault</h1>
            <p className="text-gray-500 text-sm">Zero-knowledge storage secured</p>
          </div>
          <div className="flex gap-2">
             <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Secret</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newItemType} onValueChange={setNewItemType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crypto">Crypto Wallet</SelectItem>
                        <SelectItem value="login">Login / Password</SelectItem>
                        <SelectItem value="note">Secure Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input placeholder="e.g. MetaMask Main" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Content (Will be Encrypted)</Label>
                    <Textarea 
                      placeholder="Private Key, Seed Phrase, or Password..." 
                      className="font-mono text-xs"
                      value={newItemSecret} 
                      onChange={e => setNewItemSecret(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Public Note (Optional)</Label>
                    <Input placeholder="Network, Username, etc." value={newItemNote} onChange={e => setNewItemNote(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleAddItem}>Encrypt & Save</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="icon" onClick={handleLogout} title="Lock Vault">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* --- PHẦN TABS MỚI --- */}
        <Tabs defaultValue="vault" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="vault"> My Vault</TabsTrigger>
            <TabsTrigger value="ai">Market AI</TabsTrigger>
          </TabsList>

          {/* TAB 1: DANH SÁCH VÍ (Code cũ) */}
          <TabsContent value="vault" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading encrypted data...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-dashed">
                <p className="text-gray-500">Your vault is empty.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getIcon(item.type)}
                        {item.metadata?.name || 'Untitled'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-500 mb-4 h-5 truncate">
                        {item.metadata?.note || item.type.toUpperCase()}
                      </div>
                      
                      <div className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-md font-mono text-xs break-all relative group">
                        {decryptedCache[item.id] ? (
                          <span className="text-green-600 dark:text-green-400">{decryptedCache[item.id]}</span>
                        ) : (
                          <span className="text-gray-400 blur-[2px] select-none">
                            ••••••••••••••••••••••••
                          </span>
                        )}
                        
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              if (decryptedCache[item.id]) {
                                navigator.clipboard.writeText(decryptedCache[item.id]);
                                alert("Copied!");
                              } else {
                                alert("Reveal first to copy!");
                              }
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs h-8"
                          onClick={() => toggleReveal(item)}
                        >
                          {decryptedCache[item.id] ? <><EyeOff className="mr-2 h-3 w-3"/> Hide</> : <><Eye className="mr-2 h-3 w-3"/> Reveal</>}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: AI CHAT (Mới) */}
          <TabsContent value="ai" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AIChat />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}