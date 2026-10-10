import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Brand } from "./Ui.jsx";
const api = window.restaurant;
export default function Login({ onLogin, busy, error }) {
  const [settings, setSettings] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("connection")) ?? {
          host: "127.0.0.1",
          port: 5050,
          terminal: "",
        }
      );
    } catch {
      return { host: "127.0.0.1", port: 5050, terminal: "" };
    }
  });
  const [showConnection, setShowConnection] = useState(false);
  return (
    <main className="login-page">
      <section className="login-box">
        <Brand />
        <h1>Entrar</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            localStorage.setItem("connection", JSON.stringify(settings));
            onLogin({
              ...settings,
              username: form.get("username"),
              password: form.get("password"),
            });
          }}
        >
          <label>
            Usuário
            <input name="username" autoComplete="username" required autoFocus />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            Identificação do terminal
            <input
              value={settings.terminal}
              onChange={(event) =>
                setSettings({ ...settings, terminal: event.target.value })
              }
              placeholder="Ex.: Caixa 01"
              maxLength={80}
              required
            />
          </label>
          <button
            type="button"
            className="connection-toggle"
            aria-expanded={showConnection}
            onClick={() => setShowConnection(!showConnection)}
          >
            Servidor <ChevronDown size={17} />
          </button>
          {showConnection && (
            <div className="form-row">
              <label>
                Endereço
                <input
                  value={settings.host}
                  onChange={(event) =>
                    setSettings({ ...settings, host: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Porta
                <input
                  type="number"
                  value={settings.port}
                  min="1"
                  max="65535"
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      port: Number(event.target.value),
                    })
                  }
                  required
                />
              </label>
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <button className="primary full" disabled={busy || !api}>
            {busy ? "Conectando…" : "Entrar no sistema"}
          </button>
          {!api && (
            <p className="form-error">Abra a aplicação pelo Electron.</p>
          )}
        </form>
      </section>
    </main>
  );
}
