"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultStore } from "@/lib/store";
import { encryptData, decryptData } from "@/lib/supabase/crypto";
import type { VaultItem } from "@/types";
import { useToast } from "@/hooks/use-toast";

export function useVault() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const { masterKey, setMasterKey } = useVaultStore();

  const [items, setItems] = useState<VaultItem[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Search/Filter/Favorite
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "crypto" | "login" | "note">("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Add dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItemType, setNewItemType] = useState("crypto");
  const [newItemName, setNewItemName] = useState("");
  const [newItemSecret, setNewItemSecret] = useState("");
  const [newItemNote, setNewItemNote] = useState("");

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSecret, setEditSecret] = useState("");

  // Confirm dialog (soft delete/purge)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"delete" | "purge">("delete");
  const [targetItem, setTargetItem] = useState<VaultItem | null>(null);

  // Import helper
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("vault_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setItems(data as unknown as VaultItem[]);
    setLoading(false);
  }, [supabase]);

  // Guards and initial fetch
  useEffect(() => {
    const ensure = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!masterKey) {
        router.replace("/unlock");
        return;
      }
      fetchItems();
    };
    void ensure();
  }, [masterKey, fetchItems, router, supabase]);

  // Derived lists
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = items.filter((it) => {
      if (it.metadata?.deletedAt) return false; // exclude soft-deleted
      if (filterType !== "all" && it.type !== filterType) return false;
      if (onlyFavorites && !it.metadata?.isFavorite) return false;
      if (!q) return true;
      const name = it.metadata?.name?.toString()?.toLowerCase() ?? "";
      const note = it.metadata?.note?.toString()?.toLowerCase() ?? "";
      return name.includes(q) || note.includes(q);
    });
    list = list.slice().sort((a, b) => {
      const af = a.metadata?.isFavorite ? 1 : 0;
      const bf = b.metadata?.isFavorite ? 1 : 0;
      return bf - af;
    });
    return list;
  }, [items, searchQuery, filterType, onlyFavorites]);

  const filteredDeletedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (!it.metadata?.deletedAt) return false;
      if (filterType !== "all" && it.type !== filterType) return false;
      if (!q) return true;
      const name = it.metadata?.name?.toString()?.toLowerCase() ?? "";
      const note = it.metadata?.note?.toString()?.toLowerCase() ?? "";
      return name.includes(q) || note.includes(q);
    });
  }, [items, searchQuery, filterType]);

  // Mutations
  const handleAddItem = async () => {
    if (!newItemName || !newItemSecret || !masterKey)
      return toast({ variant: "destructive", title: "Save failed", description: "Please fill required fields" });

    try {
      const encryptedBlob = await encryptData(newItemSecret, masterKey);
      const metadata = { name: newItemName, note: newItemNote, createdAt: new Date().toISOString() };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");

      const { error } = await supabase.from("vault_items").insert({
        user_id: user.id,
        type: newItemType,
        metadata,
        encrypted_blob: encryptedBlob,
      });
      if (error) throw error;

      setIsAddOpen(false);
      setNewItemName("");
      setNewItemSecret("");
      setNewItemNote("");
      fetchItems();
      toast({ title: "Item added securely!" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Save failed", description: message });
    }
  };

  const handleToggleFavorite = useCallback(async (item: VaultItem) => {
    try {
      const current = item.metadata ?? {};
      const nextMeta = { ...current, isFavorite: !current.isFavorite } as VaultItem["metadata"];
      const { error } = await supabase.from("vault_items").update({ metadata: nextMeta }).eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, metadata: nextMeta } : it)));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Update failed", description: message });
    }
  }, [supabase, toast]);

  const handleSoftDelete = useCallback(async (item: VaultItem) => {
    try {
      const current = item.metadata ?? {};
      const nextMeta = { ...current, deletedAt: new Date().toISOString() } as VaultItem["metadata"];
      const { error } = await supabase.from("vault_items").update({ metadata: nextMeta }).eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, metadata: nextMeta } : it)));
      toast({ title: "Moved to Trash", description: "Item has been moved to Trash." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Delete failed", description: message });
    }
  }, [supabase, toast]);

  const handleRestore = useCallback(async (item: VaultItem) => {
    try {
      const current = item.metadata ?? {};
      const nextMeta = { ...current } as VaultItem["metadata"];
      delete (nextMeta as { deletedAt?: string }).deletedAt;
      const { error } = await supabase.from("vault_items").update({ metadata: nextMeta }).eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, metadata: nextMeta } : it)));
      toast({ title: "Restored", description: "Item restored from Trash." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Restore failed", description: message });
    }
  }, [supabase, toast]);

  const handlePurge = useCallback(async (item: VaultItem) => {
    try {
      const { error } = await supabase.from("vault_items").delete().eq("id", item.id);
      if (error) throw error;
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setDecryptedCache((prev) => { const c = { ...prev }; delete c[item.id]; return c; });
      toast({ title: "Deleted permanently", description: "Item has been removed." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Purge failed", description: message });
    }
  }, [supabase, toast]);

  const openConfirm = (mode: "delete" | "purge", item: VaultItem) => {
    setConfirmMode(mode);
    setTargetItem(item);
    setIsConfirmOpen(true);
  };
  const onConfirm = async () => {
    if (!targetItem) return;
    setIsConfirmOpen(false);
    await (confirmMode === "delete" ? handleSoftDelete(targetItem) : handlePurge(targetItem));
    setTargetItem(null);
  };

  const handleOpenEdit = useCallback((item: VaultItem) => {
    setEditingItem(item);
    setEditName(item.metadata?.name ?? "");
    setEditNote(item.metadata?.note ?? "");
    setEditSecret("");
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
      const { error } = await supabase.from("vault_items").update(updates).eq("id", editingItem.id);
      if (error) throw error;
      setItems((prev) => prev.map((it) => (it.id === editingItem.id ? { ...it, ...updates } as VaultItem : it)));
      setIsEditOpen(false);
      setEditingItem(null);
      setEditSecret("");
      toast({ title: "Updated", description: "Item updated successfully." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Update failed", description: message });
    }
  }, [editingItem, editName, editNote, editSecret, masterKey, supabase, toast]);

  const toggleReveal = async (item: VaultItem) => {
    if (decryptedCache[item.id]) {
      const newCache = { ...decryptedCache };
      delete newCache[item.id];
      setDecryptedCache(newCache);
      return;
    }
    if (masterKey) {
      const secret = await decryptData(item.encrypted_blob, masterKey);
      setDecryptedCache((prev) => ({ ...prev, [item.id]: secret }));
    }
  };

  const handleLogout = async () => {
    setMasterKey(null);
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Export/Import
  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      items: items.map(({ type, metadata, encrypted_blob, created_at }) => ({ type, metadata, encrypted_blob, created_at })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `0xvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as { items?: Array<{ type: VaultItem["type"]; metadata: VaultItem["metadata"]; encrypted_blob: string }> };
      if (!json.items || !Array.isArray(json.items)) throw new Error("Invalid file");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const rows = json.items.map((x) => ({ user_id: user.id, type: x.type, metadata: x.metadata, encrypted_blob: x.encrypted_blob }));
      const { error } = await supabase.from("vault_items").insert(rows);
      if (error) throw error;
      toast({ title: "Imported", description: `${rows.length} items imported.` });
      fetchItems();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ variant: "destructive", title: "Import failed", description: msg });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  return {
    // state
    items,
    loading,
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
    editingItem,
    editName,
    editNote,
    editSecret,
    isConfirmOpen,
    confirmMode,
    targetItem,
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

    // actions
    handleAddItem,
    handleToggleFavorite,
    handleSoftDelete,
    handleRestore,
    handlePurge,
    openConfirm,
    onConfirm,
    handleOpenEdit,
    handleSaveEdit,
    toggleReveal,
    handleLogout,
    handleExport,
    onImportFile,
  };
}
