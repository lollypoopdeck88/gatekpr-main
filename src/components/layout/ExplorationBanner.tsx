import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, Users, X } from 'lucide-react';
import { useState } from 'react';

interface ExplorationBannerProps {
  profileName?: string;
}

export function ExplorationBanner({ profileName }: ExplorationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-secondary/10 border-b border-secondary/20 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          <div className="p-1.5 bg-secondary/20 rounded-lg flex-shrink-0 mt-0.5 sm:mt-0">
            <Building2 className="h-4 w-4 text-secondary" />
          </div>
          <div className="text-sm text-foreground">
            <span className="font-medium">Welcome{profileName ? `, ${profileName}` : ''}!</span>
            <span className="text-muted-foreground block sm:inline"> You're not part of an HOA yet. Join an existing community or start a new one.</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <Link to="/request-join" className="flex-1 sm:flex-none">
            <Button size="sm" variant="outline" className="h-8 text-xs w-full sm:w-auto">
              <Users className="h-3 w-3 mr-1.5" />
              Join Existing HOA
            </Button>
          </Link>
          <Link to="/admin/onboarding" className="flex-1 sm:flex-none">
            <Button size="sm" className="h-8 text-xs bg-secondary hover:bg-secondary/90 w-full sm:w-auto">
              <Building2 className="h-3 w-3 mr-1.5" />
              Start New HOA
            </Button>
          </Link>
          <button 
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-muted rounded-md transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}
