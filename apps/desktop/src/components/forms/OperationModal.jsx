import React from "react";
import { CreditCard, Wallet } from "lucide-react";
import { roleLabels } from "../../../../../packages/shared/permissions.js";
import { kgToGrams } from "../../../../../packages/shared/catalog.js";
import { money, total } from "../../lib/format.js";
import { Modal } from "../Ui.jsx";
import ProductFields from "../ProductFields.jsx";
import ItemFields from "../ItemFields.jsx";
export default function OperationModal({
  modal,
  setModal,
  busy,
  error,
  setError,
  data,
  selected,
  mutate,
}) {
  return (
    <Modal
      title={
        {
          pay: "Conferir pagamento",
          close: "Encerrar ficha",
          product: modal.product ? "Editar produto" : "Novo produto",
          user: "Novo usuário",
          tables: "Quantidade de mesas",
          editItem: "Editar item",
          removeItem: "Remover item",
        }[modal.type]
      }
      subtitle={undefined}
      busy={busy}
      onClose={() => {
        setModal(null);
        setError("");
      }}
    >
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const fields = Object.fromEntries(new FormData(event.currentTarget));
          if (modal.type === "tables")
            mutate(
              "tables.configure",
              { count: Number(fields.count) },
              "Mesas atualizadas.",
            );
          if (modal.type === "editItem")
            mutate(
              "tabs.update",
              {
                tabId: modal.tab.id,
                version: modal.tab.version,
                itemId: modal.item.id,
                quantity: Number(fields.quantity),
                weightGrams: fields.weightKg
                  ? kgToGrams(fields.weightKg)
                  : null,
                note: fields.note,
              },
              "Item atualizado.",
            );
          if (modal.type === "removeItem")
            mutate(
              "tabs.remove",
              {
                tabId: modal.tab.id,
                version: modal.tab.version,
                itemId: modal.item.id,
              },
              "Item removido.",
            );
          if (modal.type === "pay")
            mutate(
              "tabs.pay",
              {
                tabId: modal.tab.id,
                version: modal.tab.version,
                method: fields.method,
              },
              "Pagamento registrado.",
            );
          if (modal.type === "close")
            mutate(
              "tabs.close",
              { tabId: modal.tab.id, version: modal.tab.version },
              "Ficha encerrada.",
            );
          if (modal.type === "product")
            mutate(
              "products.save",
              {
                ...(modal.product ? { id: modal.product.id } : {}),
                name: fields.name,
                category: fields.category,
                saleType: fields.saleType,
                priceCents: Math.round(Number(fields.price) * 100),
                active: fields.active === "on",
              },
              "Produto salvo.",
            );
          if (modal.type === "user")
            mutate("users.create", fields, "Usuário cadastrado.");
        }}
      >
        {modal.type === "tables" && (
          <>
            <label>
              Quantidade de mesas
              <input
                name="count"
                type="number"
                min="1"
                max="1000"
                defaultValue={data.tables.length}
                required
                autoFocus
              />
            </label>
            <p className="info-note">
              As mesas são numeradas de 1 até a quantidade escolhida. Mesas
              ocupadas não podem ser desativadas.
            </p>
          </>
        )}
        {modal.type === "pay" && (
          <>
            <div className="confirm-total">
              <span>
                Ficha #{modal.tab.number} · {modal.tab.label}
              </span>
              <strong>{money(total(modal.tab))}</strong>
              <small>
                {modal.tab.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                itens conferidos
              </small>
            </div>
            <fieldset className="payment-methods">
              <legend>Forma de pagamento</legend>
              <label>
                <input type="radio" name="method" value="PIX" required />
                <Wallet size={22} />
                <strong>Pix</strong>
              </label>
              <label>
                <input type="radio" name="method" value="CARD" required />
                <CreditCard size={22} />
                <strong>Cartão</strong>
              </label>
            </fieldset>
          </>
        )}
        {modal.type === "close" && (
          <div className="confirm-total">
            <span>
              Ficha #{modal.tab.number} · {modal.tab.label}
            </span>
            <strong>{money(total(modal.tab))}</strong>
            <small>Encerrar a conta e liberar a mesa?</small>
          </div>
        )}
        {modal.type === "product" && <ProductFields product={modal.product} />}
        {modal.type === "editItem" && <ItemFields item={modal.item} />}
        {modal.type === "removeItem" && (
          <p>
            Remover <strong>{modal.item.productName}</strong> deste pedido?
          </p>
        )}
        {modal.type === "user" && (
          <>
            <label>
              Nome
              <input
                name="name"
                minLength={2}
                maxLength={100}
                required
                autoFocus
              />
            </label>
            <label>
              Usuário
              <input
                name="username"
                pattern="[a-zA-Z0-9._\-]{3,60}"
                required
                autoComplete="off"
              />
            </label>
            <label>
              Senha inicial
              <input
                name="password"
                type="password"
                minLength={8}
                maxLength={72}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Perfil
              <select name="role" required defaultValue="">
                <option value="" disabled>
                  Selecione um perfil
                </option>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              setModal(null);
              setError("");
            }}
          >
            Cancelar
          </button>
          <button
            className="primary"
            disabled={
              busy || (modal.tab && selected?.version !== modal.tab.version)
            }
          >
            {busy
              ? "Salvando…"
              : {
                  pay: "Registrar",
                  close: "Encerrar ficha",
                  product: "Salvar produto",
                  user: "Criar usuário",
                  tables: "Salvar",
                  editItem: "Salvar",
                  removeItem: "Remover",
                }[modal.type]}
          </button>
        </div>
        {modal.tab && selected?.version !== modal.tab.version && (
          <p className="form-error">
            Esta ficha mudou em outro terminal. Feche esta janela e confira os
            dados atualizados.
          </p>
        )}
      </form>
    </Modal>
  );
}
