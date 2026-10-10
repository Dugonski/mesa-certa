import React from "react";
import { CreditCard, Download, Check } from "lucide-react";
import { Badge } from "./Ui.jsx";
import { itemTotalCents, sumItems } from "../../../../packages/shared/money.js";
import { formatKg } from "../../../../packages/shared/catalog.js";
const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function PaymentWorkspace({
  tab,
  busy,
  allowed,
  onPay,
  onClose,
  onExport,
  onEditOrder,
}) {
  return (
    <div className="payment-workspace">
      <section className="panel payment-review">
        <div className="order-heading">
          <h2>Conferência da conta</h2>
          <Badge status={tab.status} />
        </div>
        <div className="table-wrap">
          <table>
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
                    {item.note && (
                      <small className="audit-detail">{item.note}</small>
                    )}
                  </td>
                  <td>{money(itemTotalCents(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tab.items.length && (
            <p className="empty-inline">Nenhum item lançado.</p>
          )}
        </div>
      </section>
      <aside className="panel payment-summary">
        <h2>Pagamento</h2>
        <span className="payment-total">{money(sumItems(tab.items))}</span>
        {tab.payment && (
          <p className="paid-info">
            <Check size={18} />
            {tab.payment.method === "PIX" ? "Pix" : "Cartão"}
          </p>
        )}
        <div className="payment-buttons">
          {tab.status === "OPEN" && allowed("tabs.pay") && (
            <button
              className="primary full"
              onClick={onPay}
              disabled={busy || !tab.items.length}
            >
              <CreditCard size={20} />
              Pagar
            </button>
          )}
          {tab.payment && allowed("tabs.pay") && (
            <button
              className="secondary full"
              onClick={onExport}
              disabled={busy}
            >
              <Download size={18} />
              Salvar XML
            </button>
          )}
          {tab.status === "PAID" && allowed("tabs.close") && (
            <button className="primary full" onClick={onClose} disabled={busy}>
              <Check size={18} />
              Encerrar ficha
            </button>
          )}
          {tab.status === "OPEN" && allowed("tabs.add") && (
            <button
              className="secondary full"
              onClick={onEditOrder}
              disabled={busy}
            >
              Voltar ao pedido
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
