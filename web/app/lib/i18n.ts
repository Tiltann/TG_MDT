export type SupportedLocale = "en" | "de";

export type TranslationParams = Record<string, string | number>;

export type TFunction = (
  key: string,
  params?: TranslationParams,
  fallback?: string
) => string;

const fallbackEn: Record<string, string> = {
  cancel: "Cancel",
  "tablet.player.mock_user": "Mock User",
};

export function normalizeLocale(value?: string): SupportedLocale {
  const normalized = (value || "en").toLowerCase().split(/[-_]/)[0];
  return normalized === "de" ? "de" : "en";
}

export function createTranslator(
  locale: string,
  dictionary?: Record<string, string>
): TFunction {
  const activeLocale = normalizeLocale(locale);
  const activeDictionary = dictionary || {};

  return (key: string, params?: TranslationParams, fallback?: string) => {
    let template =
      activeDictionary[key] ?? fallbackEn[key] ?? fallback ?? key;

    if (!params) {
      return template;
    }

    template = template.replace(/\{(\w+)\}/g, (_, token: string) => {
      const value = params[token];
      return value === undefined ? `{${token}}` : String(value);
    });

    return template;
  };
}
