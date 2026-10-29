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
