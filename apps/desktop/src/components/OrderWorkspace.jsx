import {
  inCatalog,
  needsPrice,
  kgToGrams,
  formatKg,
} from "../../../../packages/shared/catalog.js";
import React, { useState } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "./Ui.jsx";
import { itemTotalCents, sumItems } from "../../../../packages/shared/money.js";
const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function OrderWorkspace({
  tab,
  products,
  allowed,
  busy,
  onAdd,
  onEdit,
  onRemove,
  onGoCashier,
  onConfigure,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selectedId, setSelectedId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const canAdd = tab.status === "OPEN" && allowed("tabs.add");
  const canEdit = tab.status === "OPEN" && allowed("tabs.edit");
  const product = products.find((p) => p.id === selectedId && inCatalog(p));
  const weighted = product?.saleType === "WEIGHT";
  const grams = kgToGrams(weight);
  const valid =
    product &&
    product.active &&
    product.priceCents > 0 &&
    (weighted
      ? Number.isInteger(grams) && grams > 0 && grams <= 100000
      : Number.isInteger(Number(quantity)) && quantity >= 1 && quantity <= 99);
  const preview = valid
    ? itemTotalCents({
        saleType: product.saleType,
        weightGrams: grams,
        quantity: Number(quantity),
        unitPriceCents: product.priceCents,
      })
    : 0;
  const visible = products.filter(
    (p) =>
      inCatalog(p) &&
      (category === "Todos" || p.category === category) &&
      p.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className={`order-workspace ${canAdd ? "" : "review-only"}`}>
      {canAdd && (
        <section className="catalog panel" aria-label="Produtos disponíveis">
          <div className="catalog-toolbar">
            <div className="searchbox">
              <Search size={19} />
              <input
                aria-label="Buscar produto"
                placeholder="Buscar bebida ou buffet"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
          <div className="category-tabs">
            {[
              "Todos",
              ...new Set(products.filter(inCatalog).map((p) => p.category)),
            ].map((value) => (
              <button
                key={value}
                className={category === value ? "selected" : ""}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {visible.map((p) => (
              <button
                key={p.id}
                className={`product-card ${selectedId === p.id ? "selected" : ""}`}
                disabled={busy}
                onClick={() => {
                  setSelectedId(p.id);
                  setQuantity(1);
                  setWeight("");
                  setNote("");
                }}
              >
                <strong>{p.name}</strong>
                <span>
                  {needsPrice(p) ? "Definir preço" : money(p.priceCents)}
                  <small> / {p.saleType === "WEIGHT" ? "kg" : "un."}</small>
                </span>
              </button>
            ))}
          </div>
          {!visible.length && (
            <p className="empty-inline">Nenhum produto disponível.</p>
          )}
          {product ? (
            <form
              className="item-composer"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!valid) return;
                const ok = await onAdd(
                  product,
                  weighted ? 1 : Number(quantity),
                  note,
                  weighted ? grams : null,
                );
                if (ok) {
                  setQuantity(1);
                  setWeight("");
                  setNote("");
                }
              }}
            >
              <strong>{product.name}</strong>
              {needsPrice(product) && (
                <div className="missing-price">
                  <span>Defina o preço por kg para lançar este buffet.</span>
                  {allowed("products.write") ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onConfigure(product)}
                    >
                      Definir preço
                    </button>
                  ) : (
                    <small>Solicite a configuração ao administrador.</small>
                  )}
                </div>
              )}
              <div className="composer-inputs">
                {weighted ? (
                  <>
                    <label>
                      Quantidade (kg)
                      <input
                        aria-label="Quantidade (kg)"
                        type="number"
                        min="0.001"
                        max="100"
                        step="0.001"
                        placeholder="Ex.: 0,350"
                        value={weight}
                        onChange={(event) => setWeight(event.target.value)}
                        required
                        disabled={busy}
                      />
                    </label>
                  </>
                ) : (
                  <label>
                    Quantidade
                    <input
                      aria-label="Quantidade"
                      type="number"
                      min="1"
                      max="99"
                      step="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                      disabled={busy}
                    />
                  </label>
                )}
                <label>
                  Observação
                  <input
                    aria-label="Observação"
                    value={note}
                    maxLength={240}
                    placeholder="Opcional"
                    disabled={busy}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              </div>
              <div className="composer-action">
                <span>
                  {valid
                    ? money(preview)
                    : weighted
                      ? "Informe a quantidade em kg"
                      : "Informe a quantidade"}
                </span>
                <button className="primary" disabled={busy || !valid}>
                  <Plus size={19} />
                  Adicionar
                </button>
              </div>
            </form>
          ) : (
            <p className="composer-hint">
              Selecione uma bebida ou um tipo de buffet.
            </p>
          )}
        </section>
      )}
      <section className="panel order-panel" aria-label="Pedido">
        <div className="order-heading">
          <h2>Pedido</h2>
          <Badge status={tab.status} />
        </div>
        <div className="order-lines">
          {tab.items.length ? (
            <table className="order-table">
              <thead>
                <tr>
                  <th>Qtd./kg</th>
                  <th>Produto</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {tab.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.saleType === "WEIGHT"
                        ? `${formatKg(item.weightGrams)} kg`
                        : item.quantity}
                    </td>
                    <td>
                      <strong>{item.productName}</strong>
                      {item.saleType === "WEIGHT" && (
                        <small>{money(item.unitPriceCents)} / kg</small>
                      )}
                      {item.note && <small>{item.note}</small>}
                      {canEdit && (
                        <div className="item-controls">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onEdit(item)}
                            aria-label={`Editar ${item.productName}`}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onRemove(item)}
                            aria-label={`Remover ${item.productName}`}
                          >
                            <Trash2 size={14} />
                            Remover
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{money(itemTotalCents(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-inline">Nenhum item lançado.</p>
          )}
        </div>
        <div className="order-footer">
          <div className="total-line">
            <span>Total do pedido</span>
            <strong>{money(sumItems(tab.items))}</strong>
          </div>
          {allowed("tabs.pay") && (
            <button
              className="secondary full"
              onClick={onGoCashier}
              disabled={busy}
            >
              Ir ao caixa
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
