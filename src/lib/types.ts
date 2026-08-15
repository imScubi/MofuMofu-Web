export type StandStatus = "available" | "pending" | "sold" | "blocked";

export interface StandRow {
  id: string;
  price: number;
  status: StandStatus;
  reservable: boolean;
  updated_at: string;
}

export type RegistrationStatus = "pending_review" | "approved" | "rejected";

export interface RegistrationRow {
  id: string;
  stand_id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  other_social: string | null;
  business_category: string;
  needs_electricity: boolean;
  electricity_details: string | null;
  needs_gas: boolean;
  gas_details: string | null;
  amount_reported: number;
  payment_proof_path: string;
  payment_proof_path_2: string | null;
  plan_id: string;
  plan_label: string;
  plan_price: number;
  is_shared: boolean;
  status: RegistrationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}
