-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_actions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'general',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "monthly_income" DOUBLE PRECISION NOT NULL,
    "categories" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last4" TEXT,
    "classification" TEXT NOT NULL DEFAULT 'asset',
    "apr" DOUBLE PRECISION,
    "custom_label" TEXT,
    "apr_confirmed_at" TIMESTAMP(3),
    "plaid_account_id" TEXT,
    "plaid_access_token" TEXT,
    "plaid_item_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "last_sync_attempted_at" TIMESTAMP(3),
    "last_sync_error" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "securities" (
    "id" TEXT NOT NULL,
    "plaid_security_id" TEXT,
    "ticker" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "close_price" DOUBLE PRECISION,
    "close_price_at" TIMESTAMP(3),
    "iso_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "securities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "security_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost_basis" DOUBLE PRECISION,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_holdings" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "asset_class" TEXT NOT NULL,
    "sector" TEXT,
    "geography" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "cost_basis" DOUBLE PRECISION,
    "current_price" DOUBLE PRECISION NOT NULL,
    "current_value" DOUBLE PRECISION NOT NULL,
    "beta" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "merchant_name" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "net_worth_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "total_assets" DOUBLE PRECISION NOT NULL,
    "total_liabilities" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "net_worth_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "annual_income" DOUBLE PRECISION NOT NULL,
    "savings_rate" DOUBLE PRECISION NOT NULL,
    "retirement_age" INTEGER NOT NULL,
    "location_city" TEXT,
    "location_state" TEXT,
    "job_title" TEXT,
    "employer" TEXT,
    "employer_start_date" TIMESTAMP(3),
    "target_retirement_income" DOUBLE PRECISION,
    "emergency_fund_months_target" INTEGER DEFAULT 6,
    "major_goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risk_tolerance" INTEGER,
    "contract_parsed_data" JSONB,
    "contract_uploaded_at" TIMESTAMP(3),
    "contract_step_skipped_at" TIMESTAMP(3),
    "intro_seen_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_rename_rules" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "renamed_to" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_rename_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'ai_coach',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_exclusions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_rollovers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_name" TEXT NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "budgeted" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL,
    "rollover" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_rollovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_benefits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_extraction" JSONB NOT NULL,
    "has_401k" BOOLEAN NOT NULL DEFAULT false,
    "match_rate" DOUBLE PRECISION,
    "match_cap" DOUBLE PRECISION,
    "vesting_years" INTEGER,
    "has_hsa" BOOLEAN NOT NULL DEFAULT false,
    "hsa_employer_contrib" DOUBLE PRECISION,
    "has_fsa" BOOLEAN NOT NULL DEFAULT false,
    "fsa_limit" DOUBLE PRECISION,
    "has_rsus" BOOLEAN NOT NULL DEFAULT false,
    "rsu_grant_value" DOUBLE PRECISION,
    "stock_option_shares" DOUBLE PRECISION,
    "paid_sick_leave_days" INTEGER,
    "has_espp" BOOLEAN NOT NULL DEFAULT false,
    "espp_discount" DOUBLE PRECISION,
    "has_commuter_benefits" BOOLEAN NOT NULL DEFAULT false,
    "commuter_monthly_limit" DOUBLE PRECISION,
    "tuition_reimbursement" DOUBLE PRECISION,
    "wellness_stipend" DOUBLE PRECISION,
    "total_annual_value" DOUBLE PRECISION,
    "captured_annual_value" DOUBLE PRECISION,
    "action_items_done" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "employment_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMP(3),

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_code_redemptions" (
    "id" TEXT NOT NULL,
    "invite_code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "annual_value" DOUBLE PRECISION NOT NULL,
    "recovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "trigger" TEXT NOT NULL,
    "signals_checked" INTEGER NOT NULL DEFAULT 0,
    "signals_flagged" INTEGER NOT NULL DEFAULT 0,
    "signals_resolved" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'new',
    "severity" TEXT NOT NULL DEFAULT 'advisory',
    "annual_value" DOUBLE PRECISION NOT NULL,
    "lifetime_value" DOUBLE PRECISION,
    "payload" JSONB,
    "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "acted_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "first_detected_in_scan_id" TEXT,
    "last_updated_in_scan_id" TEXT,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_states" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_id" TEXT NOT NULL,
    "current_state" TEXT NOT NULL,
    "state_since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_state" TEXT,
    "last_checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_value" DOUBLE PRECISION,
    "previous_value" DOUBLE PRECISION,

    CONSTRAINT "signal_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_key" ON "budgets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_plaid_account_id_key" ON "accounts"("plaid_account_id");

-- CreateIndex
CREATE INDEX "accounts_last_synced_at_idx" ON "accounts"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "securities_plaid_security_id_key" ON "securities"("plaid_security_id");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_account_id_security_id_key" ON "holdings"("account_id", "security_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_holdings_account_id_ticker_key" ON "analytics_holdings"("account_id", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_profiles_user_id_key" ON "onboarding_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_rules_user_id_merchant_name_key" ON "category_rules"("user_id", "merchant_name");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_rename_rules_user_id_original_name_key" ON "merchant_rename_rules"("user_id", "original_name");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_exclusions_user_id_merchant_name_key" ON "recurring_exclusions"("user_id", "merchant_name");

-- CreateIndex
CREATE UNIQUE INDEX "budget_rollovers_user_id_category_name_period_year_period_m_key" ON "budget_rollovers"("user_id", "category_name", "period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "employment_benefits_user_id_key" ON "employment_benefits"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE INDEX "invite_code_redemptions_user_id_idx" ON "invite_code_redemptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_code_redemptions_invite_code_id_user_id_key" ON "invite_code_redemptions"("invite_code_id", "user_id");

-- CreateIndex
CREATE INDEX "recovery_events_user_id_idx" ON "recovery_events"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_events_user_id_gap_id_key" ON "recovery_events"("user_id", "gap_id");

-- CreateIndex
CREATE INDEX "scans_user_id_started_at_idx" ON "scans"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "signals_user_id_state_idx" ON "signals"("user_id", "state");

-- CreateIndex
CREATE INDEX "signals_user_id_last_seen_at_idx" ON "signals"("user_id", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "signals_domain_idx" ON "signals"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "signals_user_id_gap_id_key" ON "signals"("user_id", "gap_id");

-- CreateIndex
CREATE INDEX "signal_states_user_id_current_state_idx" ON "signal_states"("user_id", "current_state");

-- CreateIndex
CREATE UNIQUE INDEX "signal_states_user_id_gap_id_key" ON "signal_states"("user_id", "gap_id");

-- AddForeignKey
ALTER TABLE "financial_actions" ADD CONSTRAINT "financial_actions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "securities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_holdings" ADD CONSTRAINT "analytics_holdings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_holdings" ADD CONSTRAINT "analytics_holdings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_profiles" ADD CONSTRAINT "onboarding_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rename_rules" ADD CONSTRAINT "merchant_rename_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_exclusions" ADD CONSTRAINT "recurring_exclusions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_rollovers" ADD CONSTRAINT "budget_rollovers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_benefits" ADD CONSTRAINT "employment_benefits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_code_redemptions" ADD CONSTRAINT "invite_code_redemptions_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "invite_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_events" ADD CONSTRAINT "recovery_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_states" ADD CONSTRAINT "signal_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

