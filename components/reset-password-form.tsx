"use client";

import { useActionState } from "react";

import { updatePassword, type AuthState } from "@/app/login/actions";

const initialState: AuthState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            DEFINE TU NUEVO CÓDIGO DE ACCESO
          </div>
        </div>

        <form action={formAction}>
          <div className="field">
            <label>Nueva contraseña</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoFocus
              placeholder="••••••••"
            />
          </div>
          {state.error && (
            <div
              className="mono"
              role="alert"
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                color: "var(--magenta)",
                margin: "4px 0 10px",
              }}
            >
              {state.error}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            disabled={pending}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending ? "GUARDANDO…" : "GUARDAR Y ENTRAR"}
          </button>
        </form>
      </div>
    </div>
  );
}
