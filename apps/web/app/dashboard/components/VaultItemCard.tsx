'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Eye, EyeOff, Pencil, Star, StarOff, Trash2, Wallet, Key, StickyNote } from 'lucide-react';
import type { VaultItem } from '@/types';

type Props = {
  item: VaultItem;
  decrypted?: string;
  onReveal: () => void;
  onEdit: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onCopy: () => void;
};

function getIcon(type: string) {
  if (type === 'crypto') return <Wallet className="h-5 w-5 text-orange-500" />;
  if (type === 'login') return <Key className="h-5 w-5 text-blue-500" />;
  return <StickyNote className="h-5 w-5 text-gray-500" />;
}

export default function VaultItemCard({ item, decrypted, onReveal, onEdit, onToggleFavorite, onDelete, onCopy }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
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
          {decrypted ? (
            <span className="text-green-600 dark:text-green-400">{decrypted}</span>
          ) : (
            <span className="text-gray-400 blur-[2px] select-none">
              ••••••••••••••••••••••••
            </span>
          )}

          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onCopy}
              className="p-1 hover:bg-gray-200 rounded"
              aria-label="Copy secret"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onReveal}>
            {decrypted ? <><EyeOff className="mr-2 h-3 w-3"/> Hide</> : <><Eye className="mr-2 h-3 w-3"/> Reveal</>}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={onEdit} aria-label="Edit item">
            <Pencil className="mr-2 h-3 w-3" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={onToggleFavorite}
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
            onClick={onDelete}
            aria-label="Delete item"
          >
            <Trash2 className="mr-2 h-3 w-3" /> Move to Trash
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
