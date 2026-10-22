"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="av-hero fade-in">
      <h1 className="flicker">SEÑAL PERDIDA</h1>
      <div className="sub">
        NO SE PUDO CONECTAR CON EL VAULT <span className="blink">_</span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: 32,
        }}
      >
        <button className="btn pulse" onClick={() => retry()}>
          REINTENTAR
        </button>
        <Link href="/" className="btn magenta">
          IR AL INICIO
        </Link>
      </div>
    </section>
  );
}
