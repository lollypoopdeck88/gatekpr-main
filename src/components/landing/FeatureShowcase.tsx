import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  FileText, 
  Bell, 
  Wrench, 
  CalendarCheck, 
  Users,
  ChevronLeft,
  ChevronRight,
  Play,
  Eye
} from 'lucide-react';

interface FeaturePreview {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  highlights: string[];
  mockupType: 'payments' | 'documents' | 'announcements' | 'maintenance' | 'reservations' | 'directory';
}

const featurePreviews: FeaturePreview[] = [
  {
    id: 'payments',
    icon: CreditCard,
    title: 'Online Payments',
    description: 'Accept HOA dues via credit card or ACH. Residents see what they owe and pay in seconds.',
    highlights: ['Automatic payment reminders', 'Payment history tracking', 'Calendar integration'],
    mockupType: 'payments',
  },
  {
    id: 'documents',
    icon: FileText,
    title: 'Document Library',
    description: 'Securely store and share bylaws, meeting minutes, and important notices.',
    highlights: ['Inline PDF preview', 'Categorized folders', 'Search and filter'],
    mockupType: 'documents',
  },
  {
    id: 'announcements',
    icon: Bell,
    title: 'Community Announcements',
    description: 'Keep everyone informed with broadcast announcements and email notifications.',
    highlights: ['Email notifications', 'Rich text formatting', 'Scheduled publishing'],
    mockupType: 'announcements',
  },
  {
    id: 'maintenance',
    icon: Wrench,
    title: 'Maintenance Requests',
    description: 'Residents submit requests with real-time status tracking.',
    highlights: ['Status updates', 'Assignment workflow', 'Comment threads'],
    mockupType: 'maintenance',
  },
  {
    id: 'reservations',
    icon: CalendarCheck,
    title: 'Space Reservations',
    description: 'Book clubhouses, pools, and community spaces online.',
    highlights: ['Calendar availability', 'Approval workflow', 'Blackout dates'],
    mockupType: 'reservations',
  },
  {
    id: 'directory',
    icon: Users,
    title: 'Resident Directory',
    description: 'Searchable directory helps neighbors connect while respecting privacy.',
    highlights: ['Address search', 'Privacy controls', 'Quick access'],
    mockupType: 'directory',
  },
];

// Mockup components that simulate the app UI
function PaymentsMockup() {
  return (
    <div className="bg-background rounded-lg p-4 shadow-inner border">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="h-4 w-4 text-secondary" />
          Payments Due
        </div>
        <div>
          <p className="text-2xl font-bold">$375.00</p>
          <p className="text-xs text-muted-foreground">2 payments due</p>
        </div>
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Monthly HOA Dues</p>
              <p className="text-xs text-muted-foreground">Due: Feb 1, 2026</p>
            </div>
            <Button size="sm" className="h-7 text-xs">Pay $250</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Special Assessment</p>
              <p className="text-xs text-muted-foreground">Due: Feb 15, 2026</p>
            </div>
            <Button size="sm" className="h-7 text-xs">Pay $125</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentsMockup() {
  return (
    <div className="bg-background rounded-lg p-4 shadow-inner border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Documents</span>
          <span className="text-xs text-muted-foreground">12 files</span>
        </div>
        <div className="space-y-2">
          {['CC&Rs (2024)', 'Meeting Minutes - Jan', 'Architectural Guidelines', 'Pool Rules'].map((doc, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <FileText className="h-4 w-4 text-secondary" />
              <span className="text-sm flex-1">{doc}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnnouncementsMockup() {
  return (
    <div className="bg-background rounded-lg p-4 shadow-inner border">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bell className="h-4 w-4 text-secondary" />
          Recent Announcements
        </div>
        <div className="space-y-3">
          <div className="border-b pb-3">
            <h3 className="font-medium text-sm">Annual Meeting Scheduled</h3>
            <p className="text-xs text-muted-foreground mt-1">Jan 15, 2026</p>
            <p className="text-xs mt-2 line-clamp-2">Join us for the annual HOA meeting on February 10th at the clubhouse...</p>
          </div>
          <div className="border-b pb-3">
            <h3 className="font-medium text-sm">Pool Maintenance Notice</h3>
            <p className="text-xs text-muted-foreground mt-1">Jan 12, 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MaintenanceMockup() {
  return (
    <div className="bg-background rounded-lg p-4 shadow-inner border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Maintenance Requests</span>
          <Button size="sm" className="h-7 text-xs">+ New</Button>
        </div>
        <div className="space-y-2">
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Broken Gate Arm</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">In Progress</span>
            </div>
            <p className="text-xs text-muted-foreground">Submitted Jan 10 • Common Area</p>
          </div>
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Street Light Out</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Resolved</span>
            </div>
            <p className="text-xs text-muted-foreground">Submitted Jan 5 • Lot 42</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReservationsMockup() {
  return (
    <div className="bg-background rounded-lg p-4 shadow-inner border">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarCheck className="h-4 w-4 text-secondary" />
          Community Spaces
        </div>
        <div className="space-y-2">
          {['Community Clubhouse', 'Pool & Deck Area', 'Tennis Courts'].map((space, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">{space}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs">Reserve</Button>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">Your Reservations</p>
          <div className="mt-2 p-2 rounded-lg bg-secondary/10">
            <p className="text-sm font-medium">Clubhouse</p>
            <p className="text-xs text-muted-foreground">Feb 8, 2-5 PM • Birthday Party</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectoryMockup() {
  return (
    <div className="bg-background rounded-lg p-4 shadow-inner border">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-secondary" />
          Resident Directory
        </div>
        <input 
          type="text" 
          placeholder="Search residents..." 
          className="w-full text-sm px-3 py-1.5 rounded-lg border bg-background"
          readOnly
        />
        <div className="space-y-2">
          {[
            { name: 'John & Sarah Miller', address: '123 Oak Lane' },
            { name: 'The Rodriguez Family', address: '127 Oak Lane' },
            { name: 'Emily Chen', address: '131 Oak Lane' },
          ].map((resident, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-medium">
                {resident.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{resident.name}</p>
                <p className="text-xs text-muted-foreground">{resident.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MockupComponents: Record<FeaturePreview['mockupType'], React.FC> = {
  payments: PaymentsMockup,
  documents: DocumentsMockup,
  announcements: AnnouncementsMockup,
  maintenance: MaintenanceMockup,
  reservations: ReservationsMockup,
  directory: DirectoryMockup,
};

export function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = featurePreviews[activeIndex];
  const MockupComponent = MockupComponents[activeFeature.mockupType];

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % featurePreviews.length);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + featurePreviews.length) % featurePreviews.length);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Play className="h-4 w-4" />
            See It In Action
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Experience the GateKpr Interface
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Clean, intuitive design that residents actually enjoy using. Click through to explore each feature.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Feature selector tabs */}
          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap gap-2 mb-6 justify-center lg:justify-start">
              {featurePreviews.map((feature, index) => (
                <motion.button
                  key={feature.id}
                  onClick={() => setActiveIndex(index)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    index === activeIndex
                      ? 'bg-secondary text-secondary-foreground shadow-md'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <feature.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{feature.title}</span>
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-2 border-secondary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-secondary/10">
                        <activeFeature.icon className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{activeFeature.title}</h3>
                        <p className="text-muted-foreground mt-1">{activeFeature.description}</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {activeFeature.highlights.map((highlight, i) => (
                        <motion.li 
                          key={highlight}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                          {highlight}
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Navigation arrows */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrev}
                className="h-10 w-10 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex gap-1.5">
                {featurePreviews.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? 'w-6 bg-secondary' : 'w-2 bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext}
                className="h-10 w-10 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Live mockup preview */}
          <div className="order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Phone frame */}
              <div className="relative mx-auto w-full max-w-[320px]">
                <div className="bg-foreground rounded-[40px] p-3 shadow-2xl">
                  <div className="bg-background rounded-[28px] overflow-hidden">
                    {/* Status bar mockup */}
                    <div className="bg-muted/50 px-6 py-2 flex justify-between items-center text-xs">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
                        <div className="w-4 h-2 bg-foreground/60 rounded-sm" />
                        <div className="w-6 h-2 bg-foreground rounded-sm" />
                      </div>
                    </div>
                    
                    {/* App content */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeFeature.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="p-4 min-h-[400px]"
                      >
                        <MockupComponent />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-secondary/20 rounded-full blur-2xl" />
                <div className="absolute -top-4 -left-4 h-16 w-16 bg-accent/20 rounded-full blur-xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
