import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from 'lucide-react';
import { generateGoogleCalendarUrl, generateAppleCalendarFile } from '@/lib/reportUtils';

interface AddToCalendarButtonProps {
  event: {
    title: string;
    description?: string;
    location?: string;
    startDate: Date;
    endDate: Date;
  };
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AddToCalendarButton({ 
  event, 
  variant = 'outline', 
  size = 'sm',
  className 
}: AddToCalendarButtonProps) {
  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAppleCalendar = () => {
    generateAppleCalendarFile(event);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover">
        <DropdownMenuItem onClick={handleGoogleCalendar} className="cursor-pointer">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.5 22H4.5C3.12 22 2 20.88 2 19.5V4.5C2 3.12 3.12 2 4.5 2H19.5C20.88 2 22 3.12 22 4.5V19.5C22 20.88 20.88 22 19.5 22ZM12 6.5C9.24 6.5 7 8.74 7 11.5C7 14.26 9.24 16.5 12 16.5C14.76 16.5 17 14.26 17 11.5C17 8.74 14.76 6.5 12 6.5Z"/>
          </svg>
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAppleCalendar} className="cursor-pointer">
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
          </svg>
          Apple Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
