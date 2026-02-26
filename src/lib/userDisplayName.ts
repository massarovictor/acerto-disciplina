const GENERIC_LABELS = new Set([
  "usuario",
  "usuario da equipe",
  "user",
  "sem nome",
  "nao identificado",
  "nao identificada",
]);

const LOWERCASE_PARTICLES = new Set(["da", "de", "do", "das", "dos", "e"]);

const removeDiacritics = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const toTitleName = (value: string): string =>
  value
    .split(" ")
    .filter(Boolean)
    .map((token, index) => {
      const normalizedToken = token.toLowerCase();
      if (index > 0 && LOWERCASE_PARTICLES.has(normalizedToken)) {
        return normalizedToken;
      }
      return (
        normalizedToken.charAt(0).toUpperCase() + normalizedToken.slice(1)
      );
    })
    .join(" ");

const normalizeRawName = (value: string): string => {
  const localPart = value.includes("@") ? value.split("@")[0] : value;
  return localPart.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
};

export const normalizePersonDisplayName = (
  rawValue?: string | null,
): string | null => {
  if (!rawValue) return null;

  const normalized = normalizeRawName(rawValue);
  if (!normalized) return null;

  const genericKey = removeDiacritics(normalized).toLowerCase();
  if (GENERIC_LABELS.has(genericKey)) return null;

  return toTitleName(normalized);
};

interface ResolveCreatorDisplayNameInput {
  snapshotName?: string | null;
  profileName?: string | null;
  email?: string | null;
  fallback?: string;
}

export const resolveCreatorDisplayName = ({
  snapshotName,
  profileName,
  email,
  fallback = "Usuario",
}: ResolveCreatorDisplayNameInput): string =>
  normalizePersonDisplayName(snapshotName) ||
  normalizePersonDisplayName(profileName) ||
  normalizePersonDisplayName(email) ||
  fallback;

