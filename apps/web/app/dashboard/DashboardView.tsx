'use client';

import dynamic from 'next/dynamic';
import { Download, LogOut, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { useVault } from './useVault';
import AddItemDialog from './components/AddItemDialog';
import EditItemDialog from './components/EditItemDialog';
import Toolbar from './components/Toolbar';
import VaultItemCard from './components/VaultItemCard';
import ConfirmDialog from './components/ConfirmDialog';

const AIChat = dynamic(() => import('@/components/ai-chat').then((m) => m.AIChat), {
  ssr: false,
  loading: () => <div className="text-center py-10 text-muted-foreground">Loading AI assistant...</div>,
});

export default function DashboardView() {
  const {
    // state
    decryptedCache,
    searchQuery,
    filterType,
    onlyFavorites,
    isAddOpen,
    newItemType,
    newItemName,
    newItemSecret,
    newItemNote,
    isEditOpen,
    editName,
    editNote,
    editSecret,
    isConfirmOpen,
    confirmMode,
    importInputRef,

    // setters
    setSearchQuery,
    setFilterType,
    setOnlyFavorites,
    setIsAddOpen,
    setNewItemType,
    setNewItemName,
    setNewItemSecret,
    setNewItemNote,
    setIsEditOpen,
    setEditName,
    setEditNote,
    setEditSecret,
    setIsConfirmOpen,

    // derived
    filteredItems,
    filteredDeletedItems,
    loading,

    // actions
    handleAddItem,
    handleToggleFavorite,
    handleSoftDelete,
    handleRestore,
    openConfirm,
    onConfirm,
    handleOpenEdit,
    handleSaveEdit,
    toggleReveal,
    handleLogout,
    handleExport,
    onImportFile,
  } = useVault();

  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Vault</h1>
            <p className="text-gray-500 text-sm">Zero-knowledge storage secured</p>
          </div>
          <div className="flex gap-2">
            <AddItemDialog
              open={isAddOpen}
              onOpenChange={setIsAddOpen}
              newItemType={newItemType}
              setNewItemType={setNewItemType}
              newItemName={newItemName}
              setNewItemName={setNewItemName}
              newItemSecret={newItemSecret}
              setNewItemSecret={setNewItemSecret}
              newItemNote={newItemNote}
              setNewItemNote={setNewItemNote}
              onSubmit={handleAddItem}
            />

            <Button variant="outline" size="icon" onClick={handleLogout} title="Lock Vault" aria-label="Lock Vault">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExport} aria-label="Export vault">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <input ref={importInputRef} type="file" accept="application/json" hidden onChange={onImportFile} />
            <Button variant="outline" onClick={() => importInputRef.current?.click()} aria-label="Import vault">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <Toolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType as 'all' | 'crypto' | 'login' | 'note'}
          setFilterType={setFilterType as (v: 'all' | 'crypto' | 'login' | 'note') => void}
          onlyFavorites={onlyFavorites}
          setOnlyFavorites={setOnlyFavorites}
        />

        {/* Tabs */}
        <Tabs defaultValue="vault" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="vault"> My Vault</TabsTrigger>
            <TabsTrigger value="trash">Trash</TabsTrigger>
            <TabsTrigger value="ai">Market AI</TabsTrigger>
          </TabsList>

          {/* Vault Tab */}
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
                  <VaultItemCard
                    key={item.id}
                    item={item}
                    decrypted={decryptedCache[item.id]}
                    onReveal={() => toggleReveal(item)}
                    onEdit={() => handleOpenEdit(item)}
                    onToggleFavorite={() => handleToggleFavorite(item)}
                    onDelete={() => openConfirm('delete', item)}
                    onCopy={async () => {
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
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trash Tab */}
          <TabsContent value="trash" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {filteredDeletedItems.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-lg border border-dashed">
                <p className="text-gray-500">Trash is empty.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDeletedItems.map((item) => (
                  <div key={item.id} className="hover:shadow-md transition-shadow rounded-lg border p-4">
                    <div className="text-sm font-medium mb-2">{item.metadata?.name || 'Untitled'}</div>
                    <div className="text-xs text-gray-500 mb-4 h-5 truncate">Deleted at {item.metadata?.deletedAt}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => handleRestore(item)}>Restore</Button>
                      <Button variant="destructive" size="sm" className="text-xs h-8" onClick={() => openConfirm('purge', item)}>Delete permanently</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <AIChat />
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <EditItemDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          editName={editName}
          setEditName={setEditName}
          editNote={editNote}
          setEditNote={setEditNote}
          editSecret={editSecret}
          setEditSecret={setEditSecret}
          onSave={handleSaveEdit}
        />

        {/* Confirm Dialog */}
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          mode={confirmMode}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}
