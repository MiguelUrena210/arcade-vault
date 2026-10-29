/**
 * Resuelve el nombre a mostrar de un usuario autenticado.
 * Los proveedores OAuth no rellenan `display_name`, así que se recorre una
 * cadena de fallbacks y, como último recurso, la parte local del email —
 * con sesión siempre hay nombre (lo exige el check de `scores`).
 */

type UserLike = {
  email?: string;
  user_metadata?: Record<string, unknown>;
};

const NAME_KEYS = ["display_name", "full_name", "name", "user_name"] as const;

export function displayNameFrom(
  user: UserLike | null | undefined,
): string | null {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  for (const key of NAME_KEYS) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const emailLocal = user.email?.split("@")[0]?.trim();
  return emailLocal || null;
}

export const GUEST_INITIALS = "INVITADO";

/**
 * Sanea un display name a iniciales válidas para `scores.initials`:
 * mayúsculas, espacios a `_`, solo [A-Z0-9_], recorte a 10.
 * Si el resultado no cumple `^[A-Z0-9_]{3,10}$`, devuelve INVITADO.
 */
export function initialsFrom(displayName: string | null | undefined): string {
  const sanitized = (displayName ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 10);
  return /^[A-Z0-9_]{3,10}$/.test(sanitized) ? sanitized : GUEST_INITIALS;
}
