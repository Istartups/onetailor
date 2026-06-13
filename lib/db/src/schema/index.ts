import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull().unique(),
  email: text("email").unique(),
  phone: text("phone"),
  businessName: text("business_name"),
  businessAddress: text("business_address"),
  status: text("status").notNull().default("active"),
  isPremium: boolean("is_premium").notNull().default(false),
  totalUsageCount: integer("total_usage_count").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  successfulInvites: integer("successful_invites").default(0),
  referralRewardLevel: integer("referral_reward_level").default(0),
  referralConfirmed: boolean("referral_confirmed").default(false),
  bonusUsageLimit: integer("bonus_usage_limit").default(0),
  premiumExpiryDate: timestamp("premium_expiry_date"),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // Account credentials — nullable; anonymous/free users have no password
  passwordHash: text("password_hash"),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),

  // CRM lead tracking
  whatsappNumber: text("whatsapp_number"),
  leadScore: integer("lead_score").default(0),
  leadStatus: text("lead_status").default("new"),
  assignedAgentId: integer("assigned_agent_id"),
  toolsViewed: text("tools_viewed"),    // JSON array of tool IDs
  toolsUsedList: text("tools_used_list"), // JSON array of tool IDs with timestamps
});

export const adminsTable = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const followUpAgentsTable = pgTable("follow_up_agents", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const licensesTable = pgTable("licenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  key: text("key").notNull().unique(),
  status: text("status").notNull().default("active"),
  licenseType: text("license_type").default("one_tailor"),
  customerName: text("customer_name"),
  businessName: text("business_name"),
  email: text("email"),
  phone: text("phone"),
  activationDate: timestamp("activation_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const premiumRequestsTable = pgTable("premium_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  licenseType: text("license_type").notNull().default("one_tailor"),
  status: text("status").notNull().default("pending"),
  paymentId: integer("payment_id"),
  licenseId: integer("license_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("NGN"),
  method: text("method").notNull(),
  status: text("status").notNull().default("pending"),
  reference: text("reference").unique(),
  evidenceUrl: text("evidence_url"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

export const paymentSettingsTable = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  price: integer("price").default(0),
  isPaystackEnabled: boolean("is_paystack_enabled").default(false),
  isManualEnabled: boolean("is_manual_enabled").default(true),
  paystackPublicKey: text("paystack_public_key"),
  paystackSecretKey: text("paystack_secret_key"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  instructions: text("instructions"),
  paymentLink: text("payment_link"),
  globalUsageLimit: integer("global_usage_limit").default(25),
  measurementLimit: integer("measurement_limit").default(25),
  proUpgradeMessage: text("pro_upgrade_message"),
  proUpgradeLink: text("pro_upgrade_link"),
  proUpgradeButtonText: text("pro_upgrade_button_text"),
  currencyCode: text("currency_code").default("NGN"),
  currencySymbol: text("currency_symbol").default("₦"),
  isDebugMode: boolean("is_debug_mode").default(false),
  isUsageLimitEnabled: boolean("is_usage_limit_enabled").default(true),
  price2Device: integer("price_2_device"),
  price3Device: integer("price_3_device"),
  price5Device: integer("price_5_device"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  pwaName: text("pwa_name"),
  pwaShortName: text("pwa_short_name"),
  pwaDescription: text("pwa_description"),
  pwaThemeColor: text("pwa_theme_color"),
  pwaBackgroundColor: text("pwa_background_color"),
  // CallMeBot / automation settings
  callmebotPhone: text("callmebot_phone"),
  callmebotApiKey: text("callmebot_api_key"),
  followup24hEnabled: boolean("followup_24h_enabled").default(true),
  followup48hEnabled: boolean("followup_48h_enabled").default(true),
  followup72hEnabled: boolean("followup_72h_enabled").default(false),
  // Email / SMTP configuration
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpSecure: boolean("smtp_secure").default(false),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  emailFromName: text("email_from_name"),
  emailFromAddr: text("email_from_addr"),
  resendApiKey: text("resend_api_key"),
  isSmtpEnabled: boolean("is_smtp_enabled").default(true),
  isResendEnabled: boolean("is_resend_enabled").default(true),
  // Premium popup customization
  proUpgradeTitle: text("pro_upgrade_title"),
  // Payment pending banner customization
  pendingTitle: text("pending_title"),
  pendingBody: text("pending_body"),
  pendingCTA: text("pending_cta"),
  // Admin payment notification
  adminNotificationPhone: text("admin_notification_phone"),
  adminNotificationMessage: text("admin_notification_message"),
  // Premium user banner (shown only to premium users)
  premiumUserTitle: text("premium_user_title"),
  premiumUserMessage: text("premium_user_message"),
});

export const businessProfilesTable = pgTable("business_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  landmark: text("landmark"),
  country: text("country").default("Nigeria"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const licenseActivationsTable = pgTable("license_activations", {
  id: serial("id").primaryKey(),
  licenseId: integer("license_id").notNull(),
  deviceId: text("device_id").notNull(),
  activatedAt: timestamp("activated_at").notNull().defaultNow(),
});

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  deviceId: text("device_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tailoringCustomersTable = pgTable("tailoring_customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  gender: text("gender"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tailoringMeasurementsTable = pgTable("tailoring_measurements", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull(),
  values: text("values").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  type: text("type").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailLogsTable = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  template: text("template").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull(),
  error: text("error"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── CRM Tables ───────────────────────────────────────────────────────────────

export const leadInteractionsTable = pgTable("lead_interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  agentId: integer("agent_id"),         // null = admin or system
  agentType: text("agent_type").default("admin"), // admin/agent/system/auto
  agentName: text("agent_name"),
  type: text("type").notNull().default("note"), // note/whatsapp/call/email/auto/system
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const whatsappTemplatesTable = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const followUpTasksTable = pgTable("follow_up_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  agentId: integer("agent_id"),
  taskType: text("task_type").notNull(), // 24h/48h/72h
  status: text("status").notNull().default("pending"), // pending/completed/dismissed
  triggerAt: timestamp("trigger_at").notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tailorNotesTable = pgTable("tailor_notes", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  customerId: integer("customer_id"),    // null = general note
  tags: text("tags"),                    // comma-separated tag string
  isPinned: boolean("is_pinned").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
