import React from "react";
import {
  LayoutGrid,
  ReceiptText,
  Package,
  Users,
  ShieldCheck,
  LogOut,
  Plus,
  RefreshCw,
  X,
  Check,
  CreditCard,
} from "lucide-react";
import { Brand } from "./components/Ui.jsx";
import Login from "./components/Login.jsx";
import TableMap from "./components/TableMap.jsx";
import OrderWorkspace from "./components/OrderWorkspace.jsx";
import PaymentWorkspace from "./components/PaymentWorkspace.jsx";
import OperationModal from "./components/forms/OperationModal.jsx";
import TabsListPage from "./pages/TabsListPage.jsx";
import ProductsPage from "./pages/ProductsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import AuditPage from "./pages/AuditPage.jsx";
import { useRestaurant } from "./hooks/useRestaurant.js";
export default function App() {
  const state = useRestaurant();
  const {
    user,
    data,
    page,
    setPage,
    selected,
    setSelectedId,
    modal,
    setModal,
    busy,
    error,
    setError,
    toast,
    allowed,
    refresh,
    operate,
    mutate,
    navigate,
    exportXml,
    login,
    logout,
  } = state;
  if (!user) return <Login busy={busy} error={error} onLogin={login} />;
  const navigation = [
    { id: "tabs", title: "Mesas", icon: LayoutGrid },
    { id: "cashier", title: "Caixa", icon: CreditCard, permission: "tabs.pay" },
    {
      id: "history",
      title: "Histórico",
      icon: ReceiptText,
      permission: "history.read",
    },
    {
      id: "products",
      title: "Produtos",
      icon: Package,
      permission: "products.write",
    },
    { id: "users", title: "Usuários", icon: Users, permission: "users.write" },
    {
      id: "audit",
      title: "Atividades",
      icon: ShieldCheck,
      permission: "audit.read",
    },
  ].filter((item) => !item.permission || allowed(item.permission));
  const pageTitle = navigation.find((item) => item.id === page)?.title;
  return (
    <div className="app-shell">
      <header className="app-header">
        <Brand />
        <nav aria-label="Navegação principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={20} />
              {item.title}
            </button>
          ))}
        </nav>
        <div className="header-user">
          <span>{user.name}</span>
          <button
            className="icon-button"
            aria-label="Atualizar dados"
            disabled={busy}
            onClick={() => operate(refresh)}
          >
            <RefreshCw size={19} />
          </button>
          <button
            className="icon-button"
            aria-label="Sair"
            disabled={busy}
            onClick={logout}
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <div className="main-shell">
        <main className="workspace">
          <div className="page-heading">
            <div>
              <h1>
                {selected
                  ? `${page === "cashier" ? "Pagamento · " : ""}${selected.label}`
                  : pageTitle}
              </h1>
              {selected && (
                <span className="record-id">Ficha #{selected.number}</span>
              )}
            </div>
            {selected ? (
              <button className="secondary" onClick={() => setSelectedId(null)}>
                Voltar
              </button>
            ) : page === "tabs" && allowed("tables.write") ? (
              <button
                className="secondary"
                onClick={() => setModal({ type: "tables" })}
              >
                Gerenciar mesas
              </button>
            ) : page === "products" ? (
              <button
                className="primary"
                onClick={() => setModal({ type: "product" })}
              >
                <Plus size={18} />
                Novo produto
              </button>
            ) : page === "users" ? (
              <button
                className="primary"
                onClick={() => setModal({ type: "user" })}
              >
                <Plus size={18} />
                Novo usuário
              </button>
            ) : null}
          </div>
          {error && !modal && (
            <div className="form-error app-error" role="alert">
              {error}
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dispensar erro"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {selected && (page === "cashier" || page === "history") ? (
            <PaymentWorkspace
              tab={selected}
              busy={busy}
              allowed={allowed}
              onPay={() => setModal({ type: "pay", tab: selected })}
              onClose={() => setModal({ type: "close", tab: selected })}
              onExport={() => exportXml(selected.id)}
              onEditOrder={() => setPage("tabs")}
            />
          ) : selected ? (
            <OrderWorkspace
              key={selected.id}
              tab={selected}
              products={data.products}
              allowed={allowed}
              busy={busy}
              onAdd={(product, quantity, note, weightGrams) =>
                mutate(
                  "tabs.add",
                  {
                    tabId: selected.id,
                    version: selected.version,
                    productId: product.id,
                    quantity,
                    weightGrams,
                    note,
                  },
                  "Item adicionado.",
                )
              }
              onEdit={(item) =>
                setModal({ type: "editItem", tab: selected, item })
              }
              onRemove={(item) =>
                setModal({ type: "removeItem", tab: selected, item })
              }
              onGoCashier={() => setPage("cashier")}
              onConfigure={(product) => setModal({ type: "product", product })}
            />
          ) : page === "tabs" ? (
            <TableMap
              tables={data.tables ?? []}
              tabs={data.tabs}
              busy={busy}
              canOpen={allowed("tabs.open")}
              onSelect={setSelectedId}
              onOpen={(number) =>
                mutate("tabs.open", { tableNumber: number }, "Mesa aberta.")
              }
            />
          ) : page === "history" || page === "cashier" ? (
            <TabsListPage {...state} />
          ) : page === "products" ? (
            <ProductsPage {...state} />
          ) : page === "users" ? (
            <UsersPage {...state} />
          ) : (
            <AuditPage {...state} />
          )}
        </main>
      </div>
      {toast && (
        <div role="status" className="toast">
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && <OperationModal {...state} />}
    </div>
  );
}
