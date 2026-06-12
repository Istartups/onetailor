import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MeasurementEntry {
  from: string;
  to: string;
  value: number;
  result: number;
  date: string;
}

export interface CalculationEntry {
  cost: number;
  profit: number;
  selling: number;
  date: string;
}

export interface FabricItem {
  id: string;
  name: string;
  pricePerUnit: number;
  quantity: number;
  unit: string;
}

export interface NotionItem {
  id: string;
  name: string;
  cost: number;
}

export interface FabricQuote {
  id: string;
  clientName: string;
  garmentType: string;
  fabrics: FabricItem[];
  notions: NotionItem[];
  laborHours: number;
  hourlyRate: number;
  overheadPercent: number;
  totalCost: number;
  suggestedPrice: number;
  date: string;
}

export type QueueStatus = "Cutting" | "Sewing" | "Finishing" | "Ready" | "Delivered";

export interface QueueOrder {
  id: string;
  customerName: string;
  description: string;
  dueDate: string;
  status: QueueStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementRecord {
  id: string;
  customerId: string;
  category: string;
  measurements: Record<string, string | number>;
  unit: "inches" | "cm";
  createdAt: string;
  updatedAt: string;
}

export interface GarmentTemplate {
  id: string;
  name: string;
  gender: "male" | "female" | "both";
  fields: string[];
  isCustom: true;
  createdAt: string;
}

export interface BusinessProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  addressDetails?: {
    street?: string;
    city?: string;
    state?: string;
    landmark?: string;
    country?: string;
  };
  tagline?: string;
  clientIdPrefix?: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
    tiktok?: string;
    youtube?: string;
  };
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface MediaWorkspaceFile {
  id: string;
  file: File;
  type: "image" | "video";
  url: string;
  createdAt: string;
}

/** Account info returned from /auth/me or /auth/login. Separate from the anonymous deviceId flow. */
export interface AccountInfo {
  id: number;
  email: string | null;
  businessName: string | null;
  phone: string | null;
  isPremium: boolean;
  deviceId: string;
  premiumExpiryDate: string | Date | null;
}

export interface AppState {
  isPremium: boolean;
  licenseKey: string | null;
  totalUsageCount: number;
  globalUsageLimit: number;
  currencySymbol: string;
  currencyCode: string;
  deviceId: string | null;
  businessProfile: BusinessProfile | null;
  mediaWorkspace: MediaWorkspaceFile | null;
  referralCode: string;
  successfulInvites: number;
  bonusUsageLimit: number;
  referredBy: number | null;
  referralConfirmed: boolean;
  premiumExpiryDate: string | null;
  isDebugMode: boolean;
  isUsageLimitEnabled: boolean;

  // ─── Account session (null = anonymous/free user) ───────────────────────────
  account: AccountInfo | null;
  /** True when a premium request exists and payment hasn't been completed — show resume flow. */
  pendingPremiumRequest: boolean;
  /** Granular status of the most recent premium request — null when none exists. */
  premiumRequestStatus: "pending" | "payment_submitted" | "approved" | "rejected" | null;
  selectedDeviceCount: number;

  // Actions
  setMediaWorkspace: (file: MediaWorkspaceFile | null) => void;
  setBusinessProfile: (profile: BusinessProfile) => void;
  setReferralData: (data: Partial<AppState>) => void;
  applyReferralCode: (code: string) => Promise<{ success: boolean; message: string }>;
  darkMode: boolean;
  appName: string;
  appLogo: string | null;
  splashImage: string | null;
  measurementHistory: MeasurementEntry[];
  calculationHistory: CalculationEntry[];
  whatsappTemplates: string[];
  fabricQuotes: FabricQuote[];
  favorites: string[];
  recentTools: string[];
  customers: Customer[];
  measurements: MeasurementRecord[];
  upgradeLink: string;
  measurementLimit: number;
  proUpgradeMessage: string;
  proUpgradeLink: string;
  proUpgradeButtonText: string;
  proUpgradeTitle: string;
  pendingTitle: string;
  pendingBody: string;
  pendingCTA: string;
  adminNotificationPhone: string;
  adminNotificationMessage: string;

  setSelectedDeviceCount: (count: number) => void;
  setIsPremium: (status: boolean, key?: string) => void;
  setUsage: (count: number, limit: number) => void;
  incrementUsage: () => Promise<boolean>;
  setCurrency: (symbol: string, code: string) => void;
  setDeviceId: (id: string) => void;
  setDarkMode: (v: boolean) => void;
  setAppName: (name: string) => void;
  setAppLogo: (logo: string | null) => void;
  setSplashImage: (img: string | null) => void;
  addMeasurementHistory: (h: MeasurementEntry) => void;
  addCalculationHistory: (h: CalculationEntry) => void;
  addWhatsappTemplate: (t: string) => void;
  addFabricQuote: (q: FabricQuote) => void;
  deleteFabricQuote: (id: string) => void;
  toggleFavorite: (toolId: string) => void;
  addRecentTool: (toolId: string) => void;
  addCustomer: (c: Customer) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addMeasurement: (m: MeasurementRecord) => void;
  updateMeasurement: (id: string, m: Partial<MeasurementRecord>) => void;
  deleteMeasurement: (id: string) => void;
  setUpgradeLink: (link: string) => void;
  setSystemSettings: (s: {
    measurementLimit?: number;
    proUpgradeMessage?: string;
    proUpgradeLink?: string;
    proUpgradeButtonText?: string;
    proUpgradeTitle?: string;
    pendingTitle?: string;
    pendingBody?: string;
    pendingCTA?: string;
    adminNotificationPhone?: string;
    adminNotificationMessage?: string;
    paymentLink?: string;
  }) => void;
  importData: (data: { customers: Customer[]; measurements: MeasurementRecord[] }) => void;
  clearData: () => void;

  customTemplates: GarmentTemplate[];
  customMeasurementFields: string[];
  addCustomTemplate: (t: Omit<GarmentTemplate, "id" | "createdAt" | "isCustom">) => void;
  deleteCustomTemplate: (id: string) => void;
  addCustomMeasurementField: (name: string) => void;

  // ─── Account actions ────────────────────────────────────────────────────────
  setAccount: (account: AccountInfo | null) => void;
  setPendingPremiumRequest: (pending: boolean) => void;
  setPremiumRequestStatus: (status: "pending" | "payment_submitted" | "approved" | "rejected" | null) => void;
  /** Clear account session — call on logout. */
  logout: () => void;
  /** Re-validates premium from server using stored JWT. Safe to call on startup. */
  revalidatePremium: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      licenseKey: null,
      totalUsageCount: 0,
      globalUsageLimit: 25,
      currencySymbol: "₦",
      currencyCode: "NGN",
      deviceId: null,
      businessProfile: null,
      setBusinessProfile: (profile) => set({ businessProfile: profile }),
      darkMode: false,
      appName: "OneTailor",
      appLogo: null,
      splashImage: null,
      measurementHistory: [],
      calculationHistory: [],
      whatsappTemplates: [
        "Hello, I want to place an order",
        "I want this design",
        "How much is this outfit?",
      ],
      fabricQuotes: [],
      favorites: [],
      recentTools: [],
      customers: [],
      measurements: [],
      customTemplates: [],
      customMeasurementFields: [],
      upgradeLink: "",
      measurementLimit: 25,
      proUpgradeMessage:
        "Want to backup your customer measurement and never lose them if you phone or device is broken stolen etc. Unlock Premium to access more features beyond measurement, manage order, delivery, payment, inventory, finance, expense and so much more.",
      proUpgradeLink: "",
      proUpgradeButtonText: "⭐ Unlock OneTailor Pro",
      proUpgradeTitle: "OneTailor Pro",
      pendingTitle: "",
      pendingBody: "",
      pendingCTA: "",
      adminNotificationPhone: "",
      adminNotificationMessage: "",
      mediaWorkspace: null,
      referralCode: "",
      successfulInvites: 0,
      bonusUsageLimit: 0,
      referredBy: null,
      referralConfirmed: false,
      premiumExpiryDate: null,
      isDebugMode: false,
      isUsageLimitEnabled: true,

      // Account session (persisted — so users stay logged in across PWA reloads)
      account: null,
      pendingPremiumRequest: false,
      premiumRequestStatus: null,

      // ─── Media ────────────────────────────────────────────────────────────
      setMediaWorkspace: (file) => set({ mediaWorkspace: file }),
      setReferralData: (data) => set(data),

      applyReferralCode: async (code) => {
        const state = get();
        try {
          const res = await fetch("/api/referral/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: state.deviceId, code }),
          });
          const data = await res.json();
          if (res.ok) {
            set({ referredBy: 1 });
            return { success: true, message: data.message };
          }
          return { success: false, message: data.message };
        } catch {
          return { success: false, message: "Network error" };
        }
      },

      selectedDeviceCount: 1,
      setSelectedDeviceCount: (count) => set({ selectedDeviceCount: count }),
      setIsPremium: (status, key) => set({ isPremium: status, licenseKey: key || null }),
      setUsage: (count, limit) => set({ totalUsageCount: count, globalUsageLimit: limit }),

      incrementUsage: async () => {
        const state = get();
        const isTempPremium =
          state.premiumExpiryDate && new Date(state.premiumExpiryDate) > new Date();
        if (state.isPremium || isTempPremium) return true;

        const effectiveLimit = state.globalUsageLimit + state.bonusUsageLimit;
        if (state.totalUsageCount >= effectiveLimit) return false;

        try {
          const res = await fetch("/api/usage/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceId: state.deviceId }),
          });
          const data = await res.json();
          if (res.ok) {
            set({ totalUsageCount: data.totalUsageCount });
            return true;
          }
          return false;
        } catch {
          const newCount = state.totalUsageCount + 1;
          set({ totalUsageCount: newCount });
          return newCount <= effectiveLimit;
        }
      },

      setCurrency: (symbol, code) => set({ currencySymbol: symbol, currencyCode: code }),
      setDeviceId: (id) => set({ deviceId: id }),
      setDarkMode: (v) => set({ darkMode: v }),
      setAppName: (name) => set({ appName: name }),
      setAppLogo: (logo) => set({ appLogo: logo }),
      setSplashImage: (img) => set({ splashImage: img }),
      addMeasurementHistory: (h) =>
        set((state) => ({ measurementHistory: [h, ...state.measurementHistory].slice(0, 100) })),
      addCalculationHistory: (h) =>
        set((state) => ({ calculationHistory: [h, ...state.calculationHistory].slice(0, 100) })),
      addWhatsappTemplate: (t) =>
        set((state) => ({ whatsappTemplates: [...state.whatsappTemplates, t] })),
      addFabricQuote: (q) =>
        set((state) => ({ fabricQuotes: [q, ...state.fabricQuotes].slice(0, 500) })),
      deleteFabricQuote: (id) =>
        set((state) => ({ fabricQuotes: state.fabricQuotes.filter((q) => q.id !== id) })),
      toggleFavorite: (toolId) =>
        set((state) => ({
          favorites: state.favorites.includes(toolId)
            ? state.favorites.filter((id) => id !== toolId)
            : [...state.favorites, toolId],
        })),
      addRecentTool: (toolId) =>
        set((state) => ({
          recentTools: [toolId, ...state.recentTools.filter((id) => id !== toolId)].slice(0, 8),
        })),
      addCustomer: (c) => set((state) => ({ customers: [c, ...state.customers] })),
      updateCustomer: (id, c) =>
        set((state) => ({
          customers: state.customers.map((cust) =>
            cust.id === id ? { ...cust, ...c, updatedAt: new Date().toISOString() } : cust
          ),
        })),
      deleteCustomer: (id) =>
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
          measurements: state.measurements.filter((m) => m.customerId !== id),
        })),
      addMeasurement: (m) => set((state) => ({ measurements: [m, ...state.measurements] })),
      updateMeasurement: (id, m) =>
        set((state) => ({
          measurements: state.measurements.map((rec) =>
            rec.id === id ? { ...rec, ...m, updatedAt: new Date().toISOString() } : rec
          ),
        })),
      deleteMeasurement: (id) =>
        set((state) => ({ measurements: state.measurements.filter((m) => m.id !== id) })),

      addCustomTemplate: (t) =>
        set((state) => ({
          customTemplates: [
            ...state.customTemplates,
            { ...t, id: `tpl_${Date.now()}`, isCustom: true as const, createdAt: new Date().toISOString() },
          ],
        })),
      deleteCustomTemplate: (id) =>
        set((state) => ({ customTemplates: state.customTemplates.filter((t) => t.id !== id) })),
      addCustomMeasurementField: (name) =>
        set((state) => ({
          customMeasurementFields: state.customMeasurementFields.includes(name)
            ? state.customMeasurementFields
            : [...state.customMeasurementFields, name],
        })),

      setUpgradeLink: (link) => set({ upgradeLink: link }),
      setSystemSettings: (s) =>
        set((state) => ({
          measurementLimit: s.measurementLimit ?? state.measurementLimit,
          proUpgradeMessage: s.proUpgradeMessage ?? state.proUpgradeMessage,
          proUpgradeLink: s.proUpgradeLink ?? state.proUpgradeLink,
          proUpgradeButtonText: s.proUpgradeButtonText ?? state.proUpgradeButtonText,
          proUpgradeTitle: s.proUpgradeTitle ?? state.proUpgradeTitle,
          pendingTitle: s.pendingTitle ?? state.pendingTitle,
          pendingBody: s.pendingBody ?? state.pendingBody,
          pendingCTA: s.pendingCTA ?? state.pendingCTA,
          adminNotificationPhone: s.adminNotificationPhone ?? state.adminNotificationPhone,
          adminNotificationMessage: s.adminNotificationMessage ?? state.adminNotificationMessage,
          upgradeLink: s.paymentLink ?? state.upgradeLink,
        })),
      importData: (data) =>
        set((state) => ({
          customers: [
            ...data.customers,
            ...state.customers.filter((sc) => !data.customers.find((dc) => dc.id === sc.id)),
          ],
          measurements: [
            ...data.measurements,
            ...state.measurements.filter((sm) => !data.measurements.find((dm) => dm.id === sm.id)),
          ],
        })),
      clearData: () =>
        set({
          measurementHistory: [],
          calculationHistory: [],
          fabricQuotes: [],
          customers: [],
          measurements: [],
          whatsappTemplates: [
            "Hello, I want to place an order",
            "I want this design",
            "How much is this outfit?",
          ],
        }),

      // ─── Account actions ──────────────────────────────────────────────────

      setAccount: (account) =>
        set({
          account,
          // Sync isPremium from account if available
          isPremium: account?.isPremium ?? get().isPremium,
        }),

      setPendingPremiumRequest: (pending) => set({ pendingPremiumRequest: pending }),

      setPremiumRequestStatus: (status) => set({ premiumRequestStatus: status }),

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("user_token");
        }
        set({
          account: null,
          isPremium: false,
          licenseKey: null,
          pendingPremiumRequest: false,
          premiumRequestStatus: null,
        });
      },

      revalidatePremium: async () => {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("user_token") : null;
        if (!token) return;

        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!res.ok) {
            if (res.status === 403) {
              // Token expired — clear silently
              if (typeof window !== "undefined") localStorage.removeItem("user_token");
              set({ account: null, isPremium: false, pendingPremiumRequest: false, premiumRequestStatus: null });
            }
            return;
          }

          const data = await res.json();
          if (data.user) {
            set({
              account: data.user,
              isPremium: data.user.isPremium,
            });
          }
          if (data.pendingPremiumRequest) {
            set({
              pendingPremiumRequest: data.pendingPremiumRequest.canResume,
              premiumRequestStatus: data.pendingPremiumRequest.status ?? null,
            });
          } else {
            // No pending request — clear any stale status
            set({ pendingPremiumRequest: false, premiumRequestStatus: null });
          }
        } catch {
          // Offline — keep cached state
        }
      },
    }),
    {
      name: "onetailor-storage",
      partialize: (state) => {
        // Don't persist mediaWorkspace (large blobs) or account (re-validated from server)
        const { mediaWorkspace, ...rest } = state;
        return rest;
      },
    }
  )
);
