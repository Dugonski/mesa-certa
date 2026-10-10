import { sumItems } from "../../../../packages/shared/money.js";
import React, { useState } from "react";
import { Search } from "lucide-react";
const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function TableMap({
  tables,
  tabs,
  busy,
  canOpen,
  onSelect,
  onOpen,
}) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const state = (table) =>
    table.activeTabId
      ? (byId.get(table.activeTabId)?.status ?? "OPEN")
      : "FREE";
  const labels = { FREE: "Livre", OPEN: "Ocupada", PAID: "Paga" };
  const visible = tables.filter(
    (table) =>
      (filter === "ALL" || state(table) === filter) &&
      String(table.number).includes(search.trim()),
  );
  const previous = tabs.filter((tab) => !tab.tableNumber);
  return (
    <>
      <div className="map-toolbar">
        <div className="chips">
          {[
            ["ALL", "Todas"],
            ["FREE", "Livres"],
            ["OPEN", "Ocupadas"],
            ["PAID", "Pagas"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>
                {value === "ALL"
                  ? tables.length
                  : tables.filter((table) => state(table) === value).length}
              </span>
            </button>
          ))}
        </div>
        <div className="searchbox">
          <Search size={18} />
          <input
            aria-label="Buscar mesa"
            inputMode="numeric"
            placeholder="Número da mesa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="table-map">
        {visible.map((table) => {
          const tab = byId.get(table.activeTabId);
          const status = state(table);
          const amount = tab ? sumItems(tab.items) : 0;
          return (
            <button
              className={`table-tile ${status.toLowerCase()}`}
              key={table.number}
              aria-label={`Mesa ${table.number} · ${labels[status]}`}
              disabled={busy || (!table.activeTabId && !canOpen)}
              onClick={() => (tab ? onSelect(tab.id) : onOpen(table.number))}
            >
              <span className="table-label">Mesa</span>
              <strong>{String(table.number).padStart(2, "0")}</strong>
              <span className="table-status">
                <i />
                {labels[status]}
              </span>
              {tab && <b>{money(amount)}</b>}
            </button>
          );
        })}
      </div>
      {!visible.length && (
        <p className="empty-inline">Nenhuma mesa encontrada.</p>
      )}
      {!!previous.length && (
        <section className="previous-tabs">
          <h2>Fichas anteriores</h2>
          <div className="history-grid">
            {previous.map((tab) => (
              <button
                className="history-card"
                key={tab.id}
                onClick={() => onSelect(tab.id)}
              >
                <h3>{tab.label}</h3>
                <span>Ficha #{tab.number}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
