import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Users, Loader2, MapPin, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Profile } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

export default function Directory() {
  const { effectiveHoaId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: residents, isLoading } = useQuery({
    queryKey: ['directory', effectiveHoaId],
    queryFn: async () => {
      // Use the secure directory_profiles view which excludes sensitive contact info
      const { data, error } = await supabase
        .from('directory_profiles')
        .select('id, name, house_number, street_name, unit_number, avatar_url')
        .eq('hoa_id', effectiveHoaId!)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as Partial<Profile>[];
    },
    enabled: !!effectiveHoaId,
  });

  const filteredResidents = useMemo(() => {
    if (!residents) return [];
    if (!searchQuery.trim()) return residents;

    const query = searchQuery.toLowerCase().trim();
    return residents.filter((resident) => {
      const name = resident.name?.toLowerCase() || '';
      const address = getAddress(resident)?.toLowerCase() || '';
      
      return (
        name.includes(query) ||
        address.includes(query)
      );
    });
  }, [residents, searchQuery]);

  function getAddress(resident: Partial<Profile>) {
    if (resident.house_number && resident.street_name) {
      return `${resident.house_number} ${resident.street_name}`;
    }
    if (resident.unit_number) {
      return `Unit ${resident.unit_number}`;
    }
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resident Directory</h1>
          <p className="text-muted-foreground">Connect with your neighbors</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results count */}
        {searchQuery && residents && (
          <p className="text-sm text-muted-foreground">
            Found {filteredResidents.length} of {residents.length} residents
          </p>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : filteredResidents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredResidents.map((resident) => (
              <Card key={resident.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={resident.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {resident.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{resident.name}</p>
                    {getAddress(resident) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{getAddress(resident)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchQuery ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No residents match "{searchQuery}"</p>
              <Button
                variant="link"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No residents found</p>
              <p className="text-sm text-muted-foreground">Directory will populate as residents join</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
