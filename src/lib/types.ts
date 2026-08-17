export type StandStatus = "available" | "pending" | "sold" | "blocked";

/** Una edición del evento (p. ej. "Edición Octubre 2026"). */
export interface EventRow {
  id: string;
  name: string;
  date_start: string;
  date_end: string;
  payment_deadline: string;
  restricted_giros_enabled: boolean;
  is_open: boolean;
  /** Sede de esta edición; null = la sede por defecto de eventConfig. */
  venue_name: string | null;
  venue_city: string | null;
  venue_maps_url: string | null;
  created_at: string;
}

/** Disponibilidad de un stand dentro de una edición concreta. */
export interface EventStandRow {
  event_id: string;
  stand_id: string;
  status: StandStatus;
  updated_at: string;
}

export type RegistrationStatus = "pending_review" | "approved" | "rejected";

export interface RegistrationRow {
  id: string;
  folio_number: number;
  event_id: string;
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
  /** Qué vende exactamente (los registros previos a este campo no lo tienen). */
  product_details: string | null;
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
  reglamento_accepted: boolean;
  reglamento_accepted_at: string | null;
  restricted_giros_accepted: boolean;
  status: RegistrationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Una convocatoria (concurso) dentro de una edición. */
export interface ContestRow {
  id: string;
  event_id: string;
  type: string;
  name: string;
  description: string | null;
  /** null = sin límite de inscritos. */
  max_entries: number | null;
  registration_deadline: string | null;
  is_open: boolean;
  /** Lo mantiene un trigger; sirve para mostrar los lugares que quedan. */
  entries_count: number;
  created_at: string;
}

export interface ContestEntryRow {
  id: string;
  contest_id: string;
  event_id: string;
  folio_number: number;
  participant_name: string;
  phone: string;
  email: string | null;
  /** Respuestas propias del tipo de convocatoria. */
  answers: Record<string, string>;
  status: RegistrationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Una encuesta de retroalimentación de una edición. */
export interface SurveyRow {
  id: string;
  event_id: string;
  template: string;
  title: string;
  intro: string | null;
  /** Lo que va en /encuesta/<token>. */
  public_token: string;
  is_open: boolean;
  responses_count: number;
  created_at: string;
}

export interface SurveyResponseRow {
  id: string;
  survey_id: string;
  event_id: string;
  /** Respuestas por id de pregunta. Anónimas: no hay datos de contacto. */
  answers: Record<string, string>;
  created_at: string;
}
