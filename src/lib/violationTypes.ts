export interface ViolationCategory {
  id: string;
  hoa_id: string;
  name: string;
  description: string | null;
  default_fine_amount: number;
  created_at: string;
}

export interface Violation {
  id: string;
  hoa_id: string;
  resident_id: string;
  category_id: string | null;
  title: string;
  description: string;
  location: string | null;
  observed_at: string;
  notice_content: string | null;
  ai_generated: boolean;
  ai_disclaimer_shown: boolean;
  fine_amount: number;
  fine_due_date: string | null;
  status: 'draft' | 'sent' | 'acknowledged' | 'disputed' | 'resolved' | 'waived';
  created_by: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  // Joined fields
  resident?: {
    id: string;
    name: string;
    email: string;
  };
  category?: ViolationCategory;
}

export interface ViolationEvidence {
  id: string;
  violation_id: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ViolationResponse {
  id: string;
  violation_id: string;
  resident_id: string;
  response_type: 'acknowledge' | 'dispute' | 'request_extension';
  message: string | null;
  created_at: string;
}

export const DEFAULT_VIOLATION_CATEGORIES = [
  { name: 'Noise Violation', description: 'Excessive noise outside quiet hours', default_fine_amount: 5000 },
  { name: 'Parking Violation', description: 'Improper parking or unauthorized vehicles', default_fine_amount: 7500 },
  { name: 'Landscaping', description: 'Failure to maintain yard or landscaping', default_fine_amount: 10000 },
  { name: 'Architectural', description: 'Unauthorized exterior modifications', default_fine_amount: 15000 },
  { name: 'Pet Policy', description: 'Violation of pet rules and regulations', default_fine_amount: 5000 },
  { name: 'Trash/Debris', description: 'Improper disposal or visible trash/debris', default_fine_amount: 5000 },
  { name: 'Common Area Misuse', description: 'Improper use of common areas', default_fine_amount: 7500 },
  { name: 'Other', description: 'Other violation type', default_fine_amount: 0 },
];
