export type AppRole = "admin" | "resident" | "super_admin";

export type PaymentStatus = "pending" | "paid" | "overdue";

export type DocumentCategory =
  | "Bylaws"
  | "Rules"
  | "Minutes"
  | "Notices"
  | "Other";

export type PaymentFrequency = "monthly" | "quarterly" | "annual" | "one-time";

export type JoinRequestStatus = "pending" | "approved" | "denied";

export type ProfileStatus = "active" | "pending" | "suspended";

export interface Profile {
  id: string;
  user_id: string;
  hoa_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  unit_number: string | null;
  house_number: string | null;
  street_name: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: ProfileStatus;
  avatar_url: string | null;
  email_verified: boolean | null;
  email_verification_code: string | null;
  email_verification_expires_at: string | null;
  phone_verified: boolean | null;
  phone_verification_code: string | null;
  phone_verification_expires_at: string | null;
  notify_by_email: boolean | null;
  notify_by_sms: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface HOA {
  id: string;
  name: string;
  address: string | null;
  welcome_message: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface PaymentSchedule {
  id: string;
  hoa_id: string;
  name: string;
  description: string | null;
  amount: number;
  frequency: PaymentFrequency;
  due_day: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequest {
  id: string;
  schedule_id: string;
  resident_id: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
  payment_schedule?: PaymentSchedule;
}

export interface Payment {
  id: string;
  request_id: string | null;
  resident_id: string;
  amount: number;
  payment_method: string | null;
  stripe_transaction_id: string | null;
  paid_at: string;
}

export interface Announcement {
  id: string;
  hoa_id: string;
  author_id: string | null;
  title: string;
  body: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Document {
  id: string;
  hoa_id: string;
  uploaded_by: string | null;
  name: string;
  description: string | null;
  category: DocumentCategory;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
}

export interface ResidentInvite {
  id: string;
  hoa_id: string;
  email: string | null;
  house_number: string;
  street_name: string;
  city: string;
  state: string;
  zip_code: string;
  invite_token: string;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface JoinRequest {
  id: string;
  hoa_id: string;
  user_id: string;
  house_number: string;
  street_name: string;
  city: string;
  state: string;
  zip_code: string;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  hoa?: HOA;
}
