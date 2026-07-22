"use client";

import { useState } from "react";
import { IconEye, IconEyeOff, IconLock, IconLogin2 } from "@tabler/icons-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: username.trim(), password: password.trim() })
    });
    setLoading(false);
    if (!response.ok) {
      setError("Usuario ou senha invalidos.");
      return;
    }
    window.location.href = "/admin/pages";
  }

  return (
    <main className="login-wrap">
      <section className="login-card">
        <div className="login-logo">
          <img src="/assets/logo-icone.svg" alt="" />
          <img src="/assets/logo-letra.svg" alt="Casa Estampa" />
        </div>
        <p className="kicker">Painel visual</p>
        <h1 className="admin-title">Entrar no editor</h1>
        <p className="admin-subtitle">
          Acesso para editar paginas, cores globais, imagens e secoes.
        </p>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Usuario</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <span className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <IconEyeOff size={19} /> : <IconEye size={19} />}
              </button>
            </span>
            {capsLock ? <small className="field-warning">Caps Lock esta ativado.</small> : null}
          </label>
          <button className="btn btn-primary" disabled={loading}>
            <IconLogin2 size={18} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        {error ? (
          <div className="error-box">
            <IconLock size={16} />
            <span>{error} Confira a senha completa usando o icone de visualizacao.</span>
          </div>
        ) : null}
      </section>
    </main>
  );
}
