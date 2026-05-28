// Khan Bhai S. — Design Constants

export const colors = {
  black: "#0D0D0D",
  black2: "#141414",
  black3: "#1A1A1A",
  black4: "#252525",
  gold: "#C9A84C",
  goldLight: "#E8D5A3",
  goldSoft: "#B89540",
  goldDark: "#8B6914",
  goldGlow: "rgba(201, 168, 76, 0.18)",
  goldLine: "rgba(201, 168, 76, 0.25)",
  goldFaint: "rgba(201, 168, 76, 0.08)",
  text: "#F5F5F0",
  textMuted: "rgba(245, 245, 240, 0.62)",
  textFaint: "rgba(245, 245, 240, 0.42)",
} as const;

export const fonts = {
  serif: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
  serifAlt: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
  sans: "'Poppins', 'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

export const breakpoints = {
  mobile: 390,
  tablet: 768,
  desktop: 1240,
} as const;

export const spacing = {
  containerMax: "1240px",
  sectionPadY: "120px",
  sectionPadYMobile: "72px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
} as const;

export const typeClasses = {
  eyebrow: "kb-eyebrow",
  display: "kb-display",
  h2: "kb-h2",
  rule: "kb-rule",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stay", label: "Stay" },
  { href: "/restaurant", label: "Restaurant" },
  { href: "/banquet", label: "Banquet" },
  { href: "/travel", label: "Travel" },
] as const;

export const BRAND = {
  name: "Khan Bhai S.",
  tagline: "Hotel · Restaurant · Travel",
  phone: "+91 98765 43210",
  whatsapp: "919876543210",
  email: "stay@khanbhais.in",
  address: {
    line1: "Khan Bhai S.",
    line2: "Golapar, Haldwani",
    line3: "Uttarakhand 263139",
  },
} as const;
