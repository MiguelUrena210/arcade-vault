import Link from "next/link";

export default function NotFound() {
  return (
    <section className="av-hero fade-in">
      <h1 className="flicker">404</h1>
      <div className="sub">
        JUEGO NO ENCONTRADO <span className="blink">_</span>
      </div>
      <Link href="/" className="btn pulse" style={{ marginTop: 32 }}>
        VOLVER AL VAULT
      </Link>
    </section>
  );
}
