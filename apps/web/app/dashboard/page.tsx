'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
import { Plus, Copy, Eye, EyeOff, LogOut, Wallet, Key, StickyNote, Star, StarOff, Trash2, Pencil, Search, Upload, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Lazy load AI Chat for performance (only when AI tab is active)
const AIChat = dynamic(() => import('@/components/ai-chat').then(m => m.AIChat), {
  ssr: false,
  loading: () => <div className="text-center py-10 text-muted-foreground">Loading AI assistant...</div>,
});

export default function Dashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  
  // Lấy Key từ RAM (Zustand)
  const { masterKey, setMasterKey } = useVaultStore();
  
  const [items, setItems] = useState<VaultItem[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({}); 
  const [loading, setLoading] = useState(true);

  // Search/Filter/Favorite
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'crypto' | 'login' | 'note'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Edit Dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSecret, setEditSecret] = useState('');

  // State cho Form thêm mới
  const [isOpen, setIsOpen] = useState(false);
  const [newItemType, setNewItemType] = useState('crypto');
  const [newItemName, setNewItemName] = useState('');
  const [newItemSecret, setNewItemSecret] = useState(''); 
  const [newItemNote, setNewItemNote] = useState(''); 

  // Confirm dialog (delete/purge)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'purge'>('delete');
  const [targetItem, setTargetItem] = useState<VaultItem | null>(null);

  // Import helper
  const importInputRef = useRef<HTMLInputElement | null>(null);

  // 2. Lấy dữ liệu từ Supabase
  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as unknown as VaultItem[]);
    }
    setLoading(false);
  }, [supabase]);

  // Derived filtered list
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = items.filter((it) => {
      if (it.metadata?.deletedAt) return false;
      if (filterType !== 'all' && it.type !== filterType) return false;
      if (onlyFavorites && !it.metadata?.isFavorite) return false;
      if (!q) return true;
      const name = it.metadata?.name?.toString()?.toLowerCase() ?? '';
      const note = it.metadata?.note?.toString()?.toLowerCase() ?? '';
      return name.includes(q) || note.includes(q);
    });
    list = list.slice().sort((a, b) => {
      const af = (a.metadata?.isFavorite ? 1 : 0);
      const bf = (b.metadata?.isFavorite ? 1 : 0);
      return bf - af;
    });
    return list;
  }, [items, searchQuery, filterType, onlyFavorites]);

  // Trash (soft-deleted)
  const filteredDeletedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (!it.metadata?.deletedAt) return false;
      if (filterType !== 'all' && it.type !== filterType) return false;
      if (!q) return true;
      const name = it.metadata?.name?.toString()?.toLowerCase() ?? '';
      const note = it.metadata?.note?.toString()?.toLowerCase() ?? '';
      return name.includes(q) || note.includes(q);
    });
  }, [items, searchQuery, filterType]);

  // 1. Bảo vệ trang: Không có Key là đuổi ra ngoài ngay
  useEffect(() => {
    const ensure = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!masterKey) {
        router.replace('/unlock');
        return;
      }
      fetchItems();
    };
    void ensure();
   }, [masterKey, fetchItems, router, supabase]);

  // 3. Hàm thêm mới Item
  const handleAddItem = async () => {
    if (!newItemName || !newItemSecret || !masterKey) return toast({ variant: 'destructive', title: 'Save failed', description: 'Please fill required fields' });

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
      toast({ title: 'Item added securely!' });

    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      toast({ variant: 'destructive', title: 'Save failed', description: message });
    }
  };

  // Toggle favorite
  const handleToggleFavorite = useCallback(async (item: VaultItem) => {
    try {
      const current = item.metadata ?? {};
      const nextMeta = { ...current, isFavorite: !current.isFavorite };
      const { error } = await supabase
        .from('vault_items')
        .update({ metadata: nextMeta })
        .eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, metadata: nextMeta } : it)));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    }
  }, [supabase, toast]);

  // Soft delete -> Trash
  const handleSoftDelete = useCallback(async (item: VaultItem) => {
    try {
      const current = item.metadata ?? {};
      const nextMeta = { ...current, deletedAt: new Date().toISOString() } as VaultItem['metadata'];
      const { error } = await supabase.from('vault_items').update({ metadata: nextMeta }).eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, metadata: nextMeta } : it)));
      toast({ title: 'Moved to Trash', description: 'Item has been moved to Trash.' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Delete failed', description: message });
    }
  }, [supabase, toast]);

  // Restore from Trash
  const handleRestore = useCallback(async (item: VaultItem) => {
    try {
      const current = item.metadata ?? {};
      const nextMeta = { ...current } as VaultItem['metadata'];
      delete (nextMeta as { deletedAt?: string }).deletedAt;
      const { error } = await supabase.from('vault_items').update({ metadata: nextMeta }).eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, metadata: nextMeta } : it)));
      toast({ title: 'Restored', description: 'Item restored from Trash.' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Restore failed', description: message });
    }
  }, [supabase, toast]);

  // Purge permanently
  const handlePurge = useCallback(async (item: VaultItem) => {
    try {
      const { error } = await supabase.from('vault_items').delete().eq('id', item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setDecryptedCache((prev) => { const c = { ...prev }; delete c[item.id]; return c; });
      toast({ title: 'Deleted permanently', description: 'Item has been removed.' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Purge failed', description: message });
    }
  }, [supabase, toast]);

  const openConfirm = (mode: 'delete' | 'purge', item: VaultItem) => { setConfirmMode(mode); setTargetItem(item); setIsConfirmOpen(true); };
  const onConfirm = async () => { if (!targetItem) return; setIsConfirmOpen(false); await (confirmMode === 'delete' ? handleSoftDelete(targetItem) : handlePurge(targetItem)); setTargetItem(null); };

  // Export/Import
  const handleExport = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), items: items.map(({ type, metadata, encrypted_blob, created_at }) => ({ type, metadata, encrypted_blob, created_at })) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `0xvault-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  };
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text(); const json = JSON.parse(text) as { items?: Array<{ type: VaultItem['type']; metadata: VaultItem['metadata']; encrypted_blob: string }> };
      if (!json.items || !Array.isArray(json.items)) throw new Error('Invalid file');
      const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error('No user');
      const rows = json.items.map((x) => ({ user_id: user.id, type: x.type, metadata: x.metadata, encrypted_blob: x.encrypted_blob }));
      const { error } = await supabase.from('vault_items').insert(rows); if (error) throw error;
      toast({ title: 'Imported', description: `${rows.length} items imported.` });
      fetchItems();
    } catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e); toast({ variant: 'destructive', title: 'Import failed', description: msg }); }
    finally { if (importInputRef.current) importInputRef.current.value = ''; }
  };

  // Edit open
  const handleOpenEdit = useCallback((item: VaultItem) => {
    setEditingItem(item);
    setEditName(item.metadata?.name ?? '');
    setEditNote(item.metadata?.note ?? '');
    setEditSecret('');
    setIsEditOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    try {
      const updates: Partial<VaultItem> & { metadata?: unknown; encrypted_blob?: string } = {};
      const currentMeta = editingItem.metadata ?? {};
      const nextMeta = { ...currentMeta, name: editName, note: editNote };
      updates.metadata = nextMeta;
      if (editSecret.trim() && masterKey) {
        updates.encrypted_blob = await encryptData(editSecret, masterKey);
      }
      const { error } = await supabase.from('vault_items').update(updates).eq('id', editingItem.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...updates } as VaultItem : it)));
      setIsEditOpen(false);
      setEditingItem(null);
      setEditSecret('');
      toast({ title: 'Updated', description: 'Item updated successfully.' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    }
  }, [editingItem, editName, editNote, editSecret, masterKey, supabase, toast]);

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

            <Button variant="outline" size="icon" onClick={handleLogout} title="Lock Vault" aria-label="Lock Vault">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExport} aria-label="Export vault"><Download className="mr-2 h-4 w-4" /> Export</Button>
            <input ref={importInputRef} type="file" accept="application/json" hidden onChange={onImportFile} />
            <Button variant="outline" onClick={() => importInputRef.current?.click()} aria-label="Import vault"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          </div>
        </div>

        {/* Toolbar: search / filter / favorites */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Input
              placeholder="Search by name or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v: 'all' | 'crypto' | 'login' | 'note') => setFilterType(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={onlyFavorites ? 'default' : 'outline'} onClick={() => setOnlyFavorites((v) => !v)}>
              {onlyFavorites ? <Star className="mr-2 h-4 w-4" /> : <StarOff className="mr-2 h-4 w-4" />} Favorites
            </Button>
          </div>
        </div>

        {/* --- PHẦN TABS MỚI --- */}
        <Tabs defaultValue="vault" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="vault"> My Vault</TabsTrigger>
            <TabsTrigger value="trash">Trash</TabsTrigger>
            <TabsTrigger value="ai">Market AI</TabsTrigger>
          </TabsList>

          {/* TAB 1: DANH SÁCH VÍ (Code cũ) */}
          <TabsContent value="vault" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading encrypted data...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-dashed">
                <p className="text-gray-500">Your vault is empty.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
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
                            onClick={async () => {
                              const val = decryptedCache[item.id];
                              if (typeof val === 'string') {
                                try {
                                  await navigator.clipboard.writeText(val);
                                  toast({ title: 'Copied', description: 'Secret copied to clipboard.' });
                                } catch {
                                  toast({ variant: 'destructive', title: 'Copy failed', description: 'Clipboard permission denied.' });
                                }
                              } else {
                                toast({ title: 'Reveal required', description: 'Reveal the secret before copying.' });
                              }
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                            aria-label="Copy secret"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-8"
                          onClick={() => toggleReveal(item)}
                        >
                          {decryptedCache[item.id] ? <><EyeOff className="mr-2 h-3 w-3"/> Hide</> : <><Eye className="mr-2 h-3 w-3"/> Reveal</>}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleOpenEdit(item)}
                          aria-label="Edit item"
                        >
                          <Pencil className="mr-2 h-3 w-3" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleToggleFavorite(item)}
                          title={item.metadata?.isFavorite ? 'Unfavorite' : 'Favorite'}
                          aria-pressed={item.metadata?.isFavorite ? true : false}
                          aria-label={item.metadata?.isFavorite ? 'Unfavorite' : 'Favorite'}
                        >
                          {item.metadata?.isFavorite ? <Star className="mr-2 h-3 w-3" /> : <StarOff className="mr-2 h-3 w-3" />}
                          {item.metadata?.isFavorite ? 'Fav' : 'Fav'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="col-span-3 text-xs h-8"
                          onClick={() => openConfirm('delete', item)}
                          aria-label="Delete item"
                        >
                          <Trash2 className="mr-2 h-3 w-3" /> Move to Trash
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TRASH */}
          <TabsContent value="trash" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {filteredDeletedItems.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-dashed">
                <p className="text-gray-500">Trash is empty.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDeletedItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {getIcon(item.type)}
                        {item.metadata?.name || 'Untitled'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-500 mb-4 h-5 truncate">Deleted at {item.metadata?.deletedAt}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => handleRestore(item)}>Restore</Button>
                        <Button variant="destructive" size="sm" className="text-xs h-8" onClick={() => openConfirm('purge', item)}>Delete permanently</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: AI CHAT (Mới) */}
          <TabsContent value="ai" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AIChat />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Public Note</Label>
                <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Secret (leave blank to keep unchanged)</Label>
                <Textarea
                  value={editSecret}
                  onChange={(e) => setEditSecret(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="Enter new secret to re-encrypt"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Dialog */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmMode === 'delete' ? 'Move to Trash' : 'Delete permanently'}</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              {confirmMode === 'delete'
                ? 'This item will be moved to Trash and can be restored later.'
                : 'This action cannot be undone. The item will be permanently deleted.'}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
              <Button variant={confirmMode === 'delete' ? 'default' : 'destructive'} onClick={onConfirm}>Confirm</Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}