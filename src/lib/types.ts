// ─── Auth ────────────────────────────────────────────────────────────────────

export interface TokenPair {
  access_token: string
  refresh_token: string
}

export interface AuthUser {
  user_id: number
  email: string
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export interface Brand {
  id: number
  name: string
  timezone: string
  currency: string
  created_at: string
  updated_at: string
}

export interface BrandMember {
  id: number
  user_id: number
  brand_id: number
  role: "owner" | "admin" | "viewer"
  joined_at: string
  edges: {
    user: {
      id: number
      name: string
      email: string
    }
  }
}

// ─── Meta Integration ────────────────────────────────────────────────────────

export interface MetaConnection {
  id: number
  ad_account_id: string
  is_active: boolean
  connected_at: string
  synced_at: string | null
}

export interface MetaAdAccount {
  id: string
  name: string
  currency: string
  account_status: number
}

// ─── Campaigns / AdSets / Ads ─────────────────────────────────────────────────

export interface Campaign {
  id: number
  meta_campaign_id: string
  name: string
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED"
  objective: string
  daily_budget: number
  synced_at: string
}

export interface AdSet {
  id: number
  meta_adset_id: string
  name: string
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED"
  optimization_goal: string
  billing_event: string
  daily_budget: number
}

export interface Ad {
  id: number
  meta_ad_id: string
  name: string
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED"
  creative_id: string
  // Creative media fields
  image_url?: string
  video_url?: string
  thumbnail_url?: string
  creative_type?: "IMAGE" | "VIDEO" | "CAROUSEL" | "UNKNOWN"
}

// ─── Metrics ─────────────────────────────────────────────────────────────────

export type MetricEntityType = "campaign" | "adset" | "ad"

export interface DailyMetric {
  id: number
  entity_type: MetricEntityType
  entity_id: number
  date: string
  // Integer fields use json:"...,omitempty" in the Go struct, so they are
  // absent (undefined) when their value is 0. Always use ?? 0 when reading.
  spend?: number
  impressions?: number
  reach?: number
  clicks?: number
  purchases?: number
  revenue?: number
  // Nullable derived ratios — null when denominator was 0
  cpm?: number | null
  cpc?: number | null
  ctr?: number | null
  cpa?: number | null
  roas?: number | null
}

// ─── Automation Rules ────────────────────────────────────────────────────────

export type RuleMetric =
  | "roas"
  | "cpa"
  | "cpc"
  | "ctr"
  | "cpm"
  | "spend"
  | "impressions"
  | "clicks"
  | "purchases"

export type RuleCondition = "greater_than" | "less_than" | "equals"

export type RuleAction = "telegram_alert" | "email_alert" | "pause_campaign" | "pause_adset" | "pause_ad"

export type RuleSeverity = "info" | "warning" | "critical"

export type RuleEntityType = "campaign" | "adset" | "ad" | "all"

export type LogicOperator = "and" | "or"

export interface AutomationRule {
  id: number
  name: string
  metric: RuleMetric
  condition: RuleCondition
  threshold: number
  action: RuleAction
  severity: RuleSeverity
  is_active: boolean
  entity_type: RuleEntityType
  // Relational constraints (optional)
  secondary_metric?: RuleMetric | null
  secondary_condition?: RuleCondition | null
  secondary_threshold?: number | null
  logic_operator?: LogicOperator | null
  brand_id: number
  created_at: string
  updated_at: string
}

export interface CreateRulePayload {
  name: string
  metric: RuleMetric
  condition: RuleCondition
  threshold: number
  action: RuleAction
  severity?: RuleSeverity
  entity_type?: RuleEntityType
  // Relational constraints (optional)
  secondary_metric?: RuleMetric
  secondary_condition?: RuleCondition
  secondary_threshold?: number
  logic_operator?: LogicOperator
}

export interface UpdateRulePayload {
  name?: string
  metric?: RuleMetric
  condition?: RuleCondition
  threshold?: number
  action?: RuleAction
  severity?: RuleSeverity
  is_active?: boolean
  entity_type?: RuleEntityType
  // Relational constraints (optional)
  secondary_metric?: RuleMetric
  secondary_condition?: RuleCondition
  secondary_threshold?: number
  logic_operator?: LogicOperator
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertHistory {
  id: number
  entity_type: MetricEntityType
  entity_id: number
  entity_name: string
  rule_name: string
  metric: RuleMetric
  threshold: number
  actual_value: number
  severity: RuleSeverity
  telegram_sent: boolean
  message: string
  triggered_at: string
}

// ─── Notification Settings ───────────────────────────────────────────────────

export interface NotificationSettings {
  telegram_enabled: boolean
  telegram_chat_id: string
  email_enabled: boolean
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
}
