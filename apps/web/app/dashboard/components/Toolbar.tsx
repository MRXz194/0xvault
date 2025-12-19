'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Star, StarOff, Search as SearchIcon } from 'lucide-react';

type Props = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filterType: 'all' | 'crypto' | 'login' | 'note';
  setFilterType: (v: 'all' | 'crypto' | 'login' | 'note') => void;
  onlyFavorites: boolean;
  setOnlyFavorites: (v: boolean) => void;
};

export default function Toolbar({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  onlyFavorites,
  setOnlyFavorites,
}: Props) {
  return (
    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-md">
        <Input
          placeholder="Search by name or note..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
        <Button variant={onlyFavorites ? 'default' : 'outline'} onClick={() => setOnlyFavorites(!onlyFavorites)}>
          {onlyFavorites ? <Star className="mr-2 h-4 w-4" /> : <StarOff className="mr-2 h-4 w-4" />} Favorites
        </Button>
      </div>
    </div>
  );
}
