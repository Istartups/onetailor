import {
  Ruler, Calculator,
  CalendarClock, ScanLine, Shirt,
  Tag, Palette, Users, LayoutGrid, Layers, NotebookPen
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolCategory = "clients" | "measurements" | "fabric" | "pricing";

export interface Tool {
  id: string;
  path: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  glow: string;
  premium?: boolean;
  isNew?: boolean;
  popular?: boolean;
}

export const ALL_TOOLS: Tool[] = [
  {
    id: "customer-measurement",
    path: "/add-customer",
    name: "Client Management",
    description: "Manage your digital customer database.",
    category: "clients",
    icon: Users,
    iconBg: "rgba(59,130,246,0.12)",
    iconColor: "hsl(217,91%,60%)",
    borderColor: "rgba(59,130,246,0.18)",
    glow: "rgba(59,130,246,0.04)",
    popular: true,
  },
  {
    id: "tailor-notes",
    path: "/notes",
    name: "Tailor Notes",
    description: "Quick notes for tailoring work. Attach to customers or keep standalone.",
    category: "clients",
    icon: NotebookPen,
    iconBg: "rgba(20,184,166,0.12)",
    iconColor: "hsl(173,80%,40%)",
    borderColor: "rgba(20,184,166,0.18)",
    glow: "rgba(20,184,166,0.04)",
    isNew: true,
  },
  {
    id: "measurement-templates",
    path: "/measurement-templates",
    name: "Measurement Templates",
    description: "Save garment presets for one-tap reuse.",
    category: "measurements",
    icon: Layers,
    iconBg: "rgba(168,85,247,0.12)",
    iconColor: "hsl(270,80%,68%)",
    borderColor: "rgba(168,85,247,0.18)",
    glow: "rgba(168,85,247,0.04)",
    isNew: true,
  },
  {
    id: "measurement-card",
    path: "/measurement-card",
    name: "Card Generator",
    description: "Generate professional measurement cards.",
    category: "measurements",
    icon: LayoutGrid,
    iconBg: "rgba(212,160,32,0.12)",
    iconColor: "hsl(43,82%,55%)",
    borderColor: "rgba(212,160,32,0.2)",
    glow: "rgba(212,160,32,0.05)",
    popular: true,
  },
  {
    id: "converter",
    path: "/converter",
    name: "Measurement Converter",
    description: "Convert inches, cm, and yards instantly.",
    category: "measurements",
    icon: Ruler,
    iconBg: "rgba(96,165,250,0.12)",
    iconColor: "hsl(210,85%,65%)",
    borderColor: "rgba(96,165,250,0.18)",
    glow: "rgba(96,165,250,0.04)",
    popular: true,
  },
  {
    id: "measurement-checker",
    path: "/measurement-checker",
    name: "Measurement Checker",
    description: "Catch measurement mistakes before production.",
    category: "measurements",
    icon: ScanLine,
    iconBg: "rgba(251,113,133,0.12)",
    iconColor: "hsl(349,85%,68%)",
    borderColor: "rgba(251,113,133,0.18)",
    glow: "rgba(251,113,133,0.04)",
    isNew: true,
  },
  {
    id: "fabric-requirement",
    path: "/fabric-requirement",
    name: "Fabric Requirement",
    description: "Estimate fabric needs instantly.",
    category: "fabric",
    icon: Shirt,
    iconBg: "rgba(139,92,246,0.12)",
    iconColor: "hsl(262,75%,68%)",
    borderColor: "rgba(139,92,246,0.18)",
    glow: "rgba(139,92,246,0.04)",
    isNew: true,
    popular: true,
  },
  {
    id: "color-matcher",
    path: "/color-matcher",
    name: "Fabric Color Matcher",
    description: "Find matching thread colors quickly.",
    category: "fabric",
    icon: Palette,
    iconBg: "rgba(248,113,113,0.12)",
    iconColor: "hsl(0,80%,68%)",
    borderColor: "rgba(248,113,113,0.18)",
    glow: "rgba(248,113,113,0.04)",
    isNew: true,
  },
  {
    id: "delivery-date",
    path: "/delivery-date",
    name: "Delivery Date Calculator",
    description: "Stop guessing delivery dates.",
    category: "fabric",
    icon: CalendarClock,
    iconBg: "rgba(99,202,183,0.12)",
    iconColor: "hsl(170,55%,58%)",
    borderColor: "rgba(99,202,183,0.18)",
    glow: "rgba(99,202,183,0.04)",
    isNew: true,
    popular: true,
  },
  {
    id: "fabric-cost",
    path: "/fabric-cost",
    name: "Fabric Cost Estimator",
    description: "Quote materials fast and accurately.",
    category: "pricing",
    icon: Calculator,
    iconBg: "rgba(234,179,8,0.12)",
    iconColor: "hsl(45,90%,60%)",
    borderColor: "rgba(234,179,8,0.18)",
    glow: "rgba(234,179,8,0.04)",
  },
  {
    id: "profit",
    path: "/profit",
    name: "Profit Calculator",
    description: "Avoid underpricing your work.",
    category: "pricing",
    icon: Calculator,
    iconBg: "rgba(251,146,60,0.12)",
    iconColor: "hsl(25,85%,58%)",
    borderColor: "rgba(251,146,60,0.18)",
    glow: "rgba(251,146,60,0.04)",
    popular: true,
  },
  {
    id: "pricing-advisor",
    path: "/price-smartly",
    name: "Price Smartly",
    description: "Price your work with confidence.",
    category: "pricing",
    icon: Tag,
    iconBg: "rgba(234,179,8,0.12)",
    iconColor: "hsl(45,90%,52%)",
    borderColor: "rgba(234,179,8,0.18)",
    glow: "rgba(234,179,8,0.04)",
    isNew: true,
  },
];

export const CATEGORY_META: Record<ToolCategory, { label: string; emoji: string; color: string; borderColor: string; bg: string }> = {
  clients:      { label: "Clients",      emoji: "👥", color: "hsl(217,91%,60%)", borderColor: "rgba(59,130,246,0.25)",  bg: "rgba(59,130,246,0.08)"  },
  measurements: { label: "Measure",      emoji: "📏", color: "hsl(43,82%,58%)",  borderColor: "rgba(212,160,32,0.25)", bg: "rgba(212,160,32,0.08)" },
  fabric:       { label: "Fabric",       emoji: "🧵", color: "hsl(262,75%,68%)", borderColor: "rgba(139,92,246,0.25)", bg: "rgba(139,92,246,0.08)"  },
  pricing:      { label: "Pricing",      emoji: "💰", color: "hsl(45,90%,60%)",  borderColor: "rgba(234,179,8,0.25)",  bg: "rgba(234,179,8,0.08)"   },
};

// Backwards-compat alias
export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  clients:      "Clients",
  measurements: "Measure",
  fabric:       "Fabric",
  pricing:      "Pricing",
};

export function getToolById(id: string): Tool | undefined {
  return ALL_TOOLS.find((t) => t.id === id);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return ALL_TOOLS.filter((t) => t.category === category);
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase();
  return ALL_TOOLS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q),
  );
}
