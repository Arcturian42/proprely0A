export type PipelineStatus =
  | 'nouveau'
  | 'a_qualifier'
  | 'devis_a_preparer'
  | 'devis_envoye'
  | 'en_discussion'
  | 'gagne'
  | 'perdu'
  | 'archive'

export type PipelinePriority = 'chaud' | 'tiede' | 'froid'
export type PipelineSource = 'ai' | 'website' | 'referral' | 'manual'
export type LifecycleStage = 'prospect' | 'lead' | 'qualified' | 'customer' | 'former'

export interface PipelineLead {
  id: string
  company_id: string
  company_name: string
  siret?: string
  address?: string
  sector?: string
  company_size?: string
  annual_revenue?: number
  value_monthly?: number
  value_total?: number
  probability: number
  priority: PipelinePriority
  status: PipelineStatus
  source: PipelineSource
  tags: string[]
  assigned_to: string
  next_action_date?: string
  next_action_type?: string
  next_action_note?: string
  ai_score?: number
  lifecycle_stage: LifecycleStage
  lost_reason?: string
  lost_comment?: string
  won_reason?: string
  won_comment?: string
  estimated_close_date?: string
  created_at: string
  updated_at: string
}

export interface PipelineContact {
  id: string
  lead_id: string
  company_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  role?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}

export interface PipelineTask {
  id: string
  lead_id: string
  company_id: string
  title: string
  description?: string
  due_date?: string
  status: 'todo' | 'done'
  priority: 'low' | 'medium' | 'high'
  assigned_to: string
  completed_at?: string
  template?: string
  created_at: string
  updated_at: string
}

export interface PipelineNote {
  id: string
  lead_id: string
  company_id: string
  content: string
  author: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface QuoteLineItem {
  id: string
  service: string
  surface?: number
  surface_unit?: string
  frequency?: string
  unit_price: number
  quantity: number
  total: number
}

export interface ParsedQuoteData {
  surfaces: { type: string; area: number; unit: string }[]
  service_type?: string
  frequency?: string
  constraints?: string[]
  raw_text: string
}

export interface Quote {
  id: string
  lead_id: string
  company_id: string
  quote_number: string
  status: 'brouillon' | 'envoye' | 'signe' | 'refuse' | 'expire'
  line_items: QuoteLineItem[]
  labor_cost: number
  products_cost: number
  travel_cost: number
  equipment_cost: number
  subtotal_ht: number
  tva_rate: number
  tva_amount: number
  total_ttc: number
  margin_pct: number
  selling_price: number
  notes?: string
  conditions?: string
  valid_until?: string
  vocal_input_raw?: string
  parsed_data?: ParsedQuoteData
  signature_status?: 'pending' | 'signed'
  signed_at?: string
  signed_by?: string
  email_sent_at?: string
  created_at: string
  updated_at: string
}

export interface PipelineEmail {
  id: string
  lead_id: string
  company_id: string
  direction: 'sent' | 'received'
  to_address: string
  from_address: string
  subject: string
  body: string
  sent_at: string
  status: 'sent' | 'delivered' | 'opened'
  template?: string
}

export interface PipelineCall {
  id: string
  lead_id: string
  company_id: string
  contact_id?: string
  direction: 'inbound' | 'outbound'
  duration_seconds: number
  summary?: string
  outcome: 'no_answer' | 'voicemail' | 'connected' | 'scheduled' | 'qualified' | 'not_interested'
  rating?: number
  made_by: string
  made_at: string
  created_at: string
}

export interface PipelineFile {
  id: string
  lead_id: string
  company_id: string
  name: string
  size: number
  type: string
  url: string
  category: 'company' | 'contact' | 'quote' | 'contract' | 'other'
  uploader: string
  created_at: string
}

export type ActivityType = 'note' | 'call' | 'email' | 'quote' | 'task' | 'status_change' | 'file' | 'created'

export interface PipelineActivity {
  id: string
  lead_id: string
  company_id: string
  type: ActivityType
  content: string
  author: string
  related_id?: string
  created_at: string
}
