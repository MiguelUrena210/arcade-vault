"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/client";
import { displayNameFrom } from "@/lib/user-name";

export function Nav() {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    // Se relee en cada cambio de ruta: login/logout ocurren en el servidor
    // (Server Actions) y no disparan eventos en este cliente.
    supabase.auth.getSession().then(({ data }) => {
      setDisplayName(displayNameFrom(data.session?.user));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setDisplayName(displayNameFrom(session?.user));
    });
    return () => subscription.unsubscribe();
  }, [pathname]);

  const isActive = (name: "inicio" | "biblioteca" | "salon" | "auth") => {
    if (name === "inicio") return pathname === "/";
    if (name === "biblioteca") return pathname.startsWith("/games");
    if (name === "salon") return pathname.startsWith("/hall-of-fame");
    return pathname.startsWith("/login");
  };
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("inicio") ? "active" : ""}>
            Inicio
          </Link>
          <Link
            href="/games"
            className={isActive("biblioteca") ? "active" : ""}
          >
            Biblioteca
          </Link>
          <Link
            href="/hall-of-fame"
            className={isActive("salon") ? "active" : ""}
          >
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {displayName ? (
          <>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--green)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                maxWidth: 160,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
            <form action={signOut}>
              <button
                className="btn auth-btn"
                type="submit"
                onClick={() => setDisplayName(null)}
              >
                Salir
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link
          href="/"
          className={isActive("inicio") ? "active" : ""}
          onClick={close}
        >
          Inicio
        </Link>
        <Link
          href="/games"
          className={isActive("biblioteca") ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/hall-of-fame"
          className={isActive("salon") ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        {displayName ? (
          <>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--green)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </div>
            <form action={signOut}>
              <button
                className="btn ghost"
                type="submit"
                style={{ width: "100%" }}
                onClick={() => {
                  setDisplayName(null);
                  close();
                }}
              >
                Salir
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            className={isActive("auth") ? "active" : ""}
            onClick={close}
          >
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
