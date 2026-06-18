export type Traveler = {
  id: string; trip_id: string; name: string; birthdate?: string
  email?: string; phone?: string; passport_number?: string
  passport_expiry?: string; passport_issue?: string; dni?: string
  esta_number?: string; esta_expiry?: string; created_at: string
}
export type Trip = {
  id: string; user_id: string; name: string; destination: string
  country_code?: string; start_date: string; end_date: string
  currency: string; currency_sym: string; exchange_base: string
  exchange_rate: number; cover_image?: string; created_at: string
  travelers?: Traveler[]
}
export type EventCategory = 'flight'|'hotel'|'activity'|'meal'|'transport'|'other'
export type Event = {
  id: string; trip_id: string; day: string; time: string; title: string
  category: EventCategory; location?: string; lat?: number; lng?: number
  note?: string; cost: number; url?: string; budget_item_id?: string
  airline?: string; flight_number?: string; from_airport?: string
  to_airport?: string; dep_time?: string; arr_time?: string
  arr_day?: string; terminal?: string; created_at: string
}
export type BudgetCategory = 'flights'|'hotels'|'transport'|'activities'|'meals'|'other'
export type BudgetItem = {
  id: string; trip_id: string; category: BudgetCategory; description: string
  amount: number; paid: boolean; checkin?: string; checkout?: string
  cancel_before?: string; url?: string; created_at: string
}
export type Document = {
  id: string; trip_id: string; name: string
  category: 'vuelos'|'hoteles'|'seguros'|'permisos'|'transporte'|'otros'
  expiry?: string; url?: string; budget_item_id?: string; note?: string; created_at: string
}
export type ChecklistItem = {
  id: string; trip_id: string; group_name: string; text: string
  done: boolean; url?: string; created_at: string
}
export type DayNote = { id: string; trip_id: string; day: string; content: string; updated_at: string }
export type Photo = {
  id: string; trip_id: string; day?: string; url: string
  caption?: string; storage_path: string; created_at: string
}
export type Alert = { level: 'red'|'amber'; message: string; type: string }

export type FamilyMember = {
  id: string
  user_id: string
  name: string
  birthdate?: string
  email?: string
  phone?: string
  dni?: string
  passport_number?: string
  passport_issue?: string
  passport_expiry?: string
  esta_number?: string
  esta_expiry?: string
  tse_number?: string
  tse_expiry?: string
  health_ins_number?: string
  health_ins_expiry?: string
  health_ins_phone?: string
  drive_license?: string
  drive_license_expiry?: string
  created_at?: string
}

export type TripMember = {
  id: string
  trip_id: string
  family_member_id: string
  travel_ins_number?: string
  travel_ins_expiry?: string
  travel_ins_phone?: string
  travel_ins_url?: string
  cancel_ins_number?: string
  cancel_ins_notes?: string
  family_member?: FamilyMember
}
