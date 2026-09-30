"use client";

/*
 * Campos customizados do Puck compartilhados (home, pisos e congeladas).
 *
 * ImagemField — substitui o "colar URL": mostra preview, botão
 * "Enviar imagem" (POST /api/uploads, exige login de admin) e mantém o
 * campo de URL para quem preferir colar (/uploads/…, /assets/… ou http…).
 * Uso:  foto: imagemField("Foto do card")
 */

import { useRef, useState } from "react";

export function ImagemField({ value, onChange, readOnly }) {
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef(null);

  async function enviar(file) {
    if (!file) return;
    setBusy(true);
    setErro("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Falha no envio (${res.status})`);
      onChange(json.path);
    } catch (e) {
      setErro(e.message || "Falha no envio.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {value ? (
        <img
          src={value}
          alt=""
          style={{ width: "100%", maxHeight: 160, objectFit: "contain", background: "#111", borderRadius: 4, display: "block" }}
        />
      ) : (
        <div style={{ padding: "18px 10px", textAlign: "center", background: "#111", color: "#888", borderRadius: 4, fontSize: 12 }}>
          Sem imagem
        </div>
      )}
      <input
        type="text"
        value={value || ""}
        disabled={readOnly || busy}
        placeholder="/uploads/… ou https://…"
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          disabled={readOnly || busy}
          style={{ display: "none" }}
          onChange={(e) => enviar(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={readOnly || busy}
          onClick={() => fileRef.current?.click()}
          style={{ flex: 1, padding: "8px 10px", cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? "Enviando…" : "Enviar imagem"}
        </button>
        {value ? (
          <button type="button" disabled={readOnly || busy} onClick={() => onChange("")} style={{ padding: "8px 10px" }}>
            Limpar
          </button>
        ) : null}
      </div>
      {erro ? <span style={{ color: "#e66", fontSize: 12 }}>{erro}</span> : null}
    </div>
  );
}

export const imagemField = (label) => ({
  type: "custom",
  label,
  render: (props) => <ImagemField {...props} />,
});
