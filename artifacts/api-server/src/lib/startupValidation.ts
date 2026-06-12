/**
 * Production Startup Validation
 *
 * Validates security-critical environment variables before the server accepts
 * any traffic.  In production (NODE_ENV=production):
 *   - Missing or default-value secrets → log error + process.exit(1)
 * In all other environments:
 *   - Warnings are printed but startup continues normally.
 */

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── Known hardcoded default values that must NOT reach production ────────────

const KNOWN_DEFAULTS: Record<string, string> = {
  JWT_SECRET: "onetailor-admin-secret-key-123",
  USER_JWT_SECRET: "onetailor-user-secret-key-456",
};

// ─── Variable registry ────────────────────────────────────────────────────────

type Severity = "critical" | "warn";

interface EnvVarSpec {
  key: string;
  severity: Severity;
  description: string;
}

const CRITICAL_VARS: EnvVarSpec[] = [
  {
    key: "JWT_SECRET",
    severity: "critical",
    description: "Admin JWT signing secret — controls all admin session tokens",
  },
  {
    key: "USER_JWT_SECRET",
    severity: "critical",
    description: "User JWT signing secret — controls all user session tokens",
  },
  {
    key: "SESSION_SECRET",
    severity: "critical",
    description: "Express session secret — required for cookie-based session integrity",
  },
];

const ADVISORY_VARS: EnvVarSpec[] = [
  {
    key: "DATABASE_URL",
    severity: "warn",
    description: "PostgreSQL connection string — database connectivity is validated separately",
  },
  {
    key: "VAPID_PUBLIC_KEY",
    severity: "warn",
    description: "Web Push VAPID public key — push notifications will be disabled without this",
  },
  {
    key: "VAPID_PRIVATE_KEY",
    severity: "warn",
    description: "Web Push VAPID private key — push notifications will be disabled without this",
  },
];

// ─── Status types ─────────────────────────────────────────────────────────────

type VarStatus = "present" | "missing" | "using-fallback";

interface VarResult {
  key: string;
  status: VarStatus;
  severity: Severity;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkVar(spec: EnvVarSpec): VarResult {
  const value = process.env[spec.key];

  let status: VarStatus;
  if (!value || value.trim() === "") {
    status = "missing";
  } else if (KNOWN_DEFAULTS[spec.key] && value === KNOWN_DEFAULTS[spec.key]) {
    status = "using-fallback";
  } else {
    status = "present";
  }

  return { key: spec.key, status, severity: spec.severity, description: spec.description };
}

function statusLabel(status: VarStatus): string {
  switch (status) {
    case "present":       return "✅ PRESENT";
    case "missing":       return "❌ MISSING";
    case "using-fallback": return "⚠️  FALLBACK";
  }
}

// ─── Email provider advisory ──────────────────────────────────────────────────

function checkEmailProviders(): VarResult {
  const resend = process.env["RESEND_API_KEY"];
  const brevo  = process.env["BREVO_API_KEY"];
  const smtpUser = process.env["SMTP_USER"];
  const smtpPass = process.env["SMTP_PASS"];

  const hasProvider =
    (resend && resend.trim() !== "") ||
    (brevo  && brevo.trim()  !== "") ||
    (smtpUser && smtpPass && smtpUser.trim() !== "" && smtpPass.trim() !== "");

  return {
    key: "EMAIL_PROVIDER (RESEND_API_KEY | BREVO_API_KEY | SMTP_USER+SMTP_PASS)",
    status: hasProvider ? "present" : "missing",
    severity: "warn",
    description: "At least one email provider must be configured or all transactional emails will be silently dropped",
  };
}

// ─── Main validation entry point ──────────────────────────────────────────────

export function validateStartupEnvironment(): void {
  const allResults: VarResult[] = [
    ...CRITICAL_VARS.map(checkVar),
    ...ADVISORY_VARS.map(checkVar),
    checkEmailProviders(),
  ];

  const criticalFailures = allResults.filter(
    (r) => r.severity === "critical" && r.status !== "present",
  );

  const advisoryIssues = allResults.filter(
    (r) => r.severity === "warn" && r.status !== "present",
  );

  // ─── Print validation report ─────────────────────────────────────────────

  const env = IS_PRODUCTION ? "PRODUCTION" : (process.env.NODE_ENV ?? "development").toUpperCase();
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║        STARTUP ENVIRONMENT VALIDATION [${env.padEnd(10)}] ║`);
  console.log(`╚══════════════════════════════════════════════════════╝`);

  for (const r of allResults) {
    const label = statusLabel(r.status);
    console.log(`  ${label.padEnd(15)} ${r.key}`);
  }

  console.log(`──────────────────────────────────────────────────────`);

  if (criticalFailures.length === 0 && advisoryIssues.length === 0) {
    console.log(`  ✅ All environment validations passed.\n`);
    return;
  }

  // ─── Advisory warnings ────────────────────────────────────────────────────

  if (advisoryIssues.length > 0) {
    console.warn(`\n  ⚠️  ADVISORY — the following non-critical vars are not configured:`);
    for (const r of advisoryIssues) {
      console.warn(`     [${r.status.toUpperCase()}] ${r.key}`);
      console.warn(`       → ${r.description}`);
    }
  }

  // ─── Critical failures ────────────────────────────────────────────────────

  if (criticalFailures.length > 0) {
    if (IS_PRODUCTION) {
      console.error(`\n╔══════════════════════════════════════════════════════╗`);
      console.error(`║  🔥 CRITICAL: REFUSING TO START IN PRODUCTION        ║`);
      console.error(`╚══════════════════════════════════════════════════════╝`);
      console.error(`\n  The following security-critical environment variables`);
      console.error(`  are missing or using insecure default/placeholder values:\n`);
      for (const r of criticalFailures) {
        console.error(`     [${r.status.toUpperCase()}] ${r.key}`);
        console.error(`       → ${r.description}`);
      }
      console.error(`\n  ACTION REQUIRED:`);
      console.error(`  Set each variable as a Replit Secret (or environment variable)`);
      console.error(`  with a strong, randomly generated value before deploying.\n`);
      console.error(`  Server will NOT start. Exiting with code 1.\n`);
      process.exit(1);
    } else {
      console.warn(`\n  ⚠️  WARNING — security-critical vars are using defaults:`);
      for (const r of criticalFailures) {
        console.warn(`     [${r.status.toUpperCase()}] ${r.key}`);
        console.warn(`       → ${r.description}`);
      }
      console.warn(`\n  These defaults are ONLY acceptable in local development.`);
      console.warn(`  Startup will continue, but DO NOT deploy with these values.\n`);
    }
  }

  console.log(`──────────────────────────────────────────────────────\n`);
}
