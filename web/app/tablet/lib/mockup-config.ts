export type MockupBranding = {
  name?: string;
  subtitle?: string;
  accent?: string;
  badge?: string;
  greeting?: string;
  dateLabel?: string;
};

export const defaultMockupBranding: MockupBranding = {
  name: "TG MDT",
  subtitle: "Agency Operations Terminal",
  accent: "#ff9100",
  badge: "Duty Profile",
  greeting: "Good morning, Agent Nova.",
  dateLabel: "May 12, 2026",
};

export const defaultMockupModules: Record<string, boolean> = {
  dashboard: true,
  dispatch: true,
  persons: true,
  vehicles: true,
  reports: true,
  incidents: true,
  penalties: true,
  map: true,
  chat: true,
  administration: true,
};
