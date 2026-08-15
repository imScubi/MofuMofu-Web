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
  status: RegistrationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReserveStandPayload {
  standId: string;
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  otherSocial?: string;
  businessCategory: string;
  needsElectricity: boolean;
  electricityDetails?: string;
  needsGas: boolean;
  gasDetails?: string;
  amountReported: number;
}
