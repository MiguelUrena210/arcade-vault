"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { signIn, signUp, type AuthState } from "@/app/login/actions";

const initialState: AuthState = {};

function FormNotice({ state }: { state: AuthState }) {
  if (!state.error && !state.message) return null;
  return (
    <div
      className="mono"
      role={state.error ? "alert" : "status"}
      style={{
        fontSize: 12,
        letterSpacing: "0.08em",
        color: state.error ? "var(--magenta)" : "var(--green)",
        margin: "4px 0 10px",
      }}
    >
      {state.error ?? state.message}
    </div>
  );
}

export function AuthForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [inState, signInAction, inPending] = useActionState(
    signIn,
    initialState,
  );
  const [upState, signUpAction, upPending] = useActionState(
    signUp,
    initialState,
  );

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => setTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => setTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>

        {tab === "in" ? (
          <form action={signInAction}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                name="email"
                required
                placeholder="jugador@vault.gg"
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
              />
            </div>
            <FormNotice state={inState} />
            <button
              className="btn lg"
              type="submit"
              disabled={inPending}
              style={{ width: "100%", marginTop: 8 }}
            >
              {inPending ? "CONECTANDO…" : "ENTRAR AL VAULT"}
            </button>
          </form>
        ) : upState.message ? (
          <div className="slide-in" style={{ textAlign: "center" }}>
            <FormNotice state={upState} />
            <div
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--ink-dim)",
                letterSpacing: "0.08em",
                marginBottom: 12,
              }}
            >
              Sigue el enlace del correo para activar la cuenta y entrar al
              Vault.
            </div>
          </div>
        ) : (
          <form action={signUpAction}>
            <div className="field slide-in">
              <label>Usuario</label>
              <input name="username" required placeholder="px_kai" />
            </div>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                name="email"
                required
                placeholder="jugador@vault.gg"
              />
            </div>
            <div className="field">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
            <FormNotice state={upState} />
            <button
              className="btn lg"
              type="submit"
              disabled={upPending}
              style={{ width: "100%", marginTop: 8 }}
            >
              {upPending ? "CREANDO…" : "CREAR Y JUGAR"}
            </button>
          </form>
        )}

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => router.push("/games")}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button">
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button">
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
