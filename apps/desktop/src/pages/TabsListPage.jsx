import React from "react";
import { Search } from "lucide-react";
import { money, total, date } from "../lib/format.js";
export default function TabsListPage({
  data,
  page,
  search,
  setSearch,
  setSelectedId,
}) {
  const visibleTabs = (page === "history" ? data.history : data.tabs).filter(
    (tab) =>
      (String(tab.number) + " " + tab.label)
        .toLowerCase()
        .includes((search ?? "").toLowerCase()),
  );
  return (
    <section className="panel history-panel">
      <div className="list-toolbar">
        <div className="searchbox">
          <Search size={18} />
          <input
            aria-label="Buscar ficha"
            placeholder="Buscar mesa ou ficha"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="result-count">
          {page === "cashier"
            ? `${data.tabs.length} contas abertas`
            : `Últimas ${data.history.length} fichas`}
        </span>
      </div>
      <div className="history-grid">
        {visibleTabs.map((tab) => (
          <button
            className="history-card"
            key={tab.id}
            onClick={() => setSelectedId(tab.id)}
          >
            <h3>{tab.label}</h3>
            <span>
              Ficha #{tab.number} ·{" "}
              {page === "cashier"
                ? tab.status === "PAID"
                  ? "Paga · encerrar"
                  : "Em aberto"
                : date(tab.closedAt)}
            </span>
            <strong>{money(total(tab))}</strong>
          </button>
        ))}
      </div>
      {!visibleTabs.length && (
        <p className="empty-inline">Nenhuma ficha encontrada.</p>
      )}
    </section>
  );
}
