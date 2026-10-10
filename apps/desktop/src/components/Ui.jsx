import React, { useRef, useEffect } from "react";
import { UtensilsCrossed, ReceiptText, X } from "lucide-react";
const statusLabels = {
  OPEN: "Aberta",
  PAID: "Paga",
  CLOSED: "Encerrada",
};
export function Brand({ light = false }) {
  return (
    <div className={`brand ${light ? "light" : ""}`}>
      <span className="brand-icon">
        <UtensilsCrossed size={23} />
      </span>
      <div>MesaCerta</div>
    </div>
  );
}
export function Badge({ status }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
export function Empty({ title, description, icon: Icon = ReceiptText }) {
  return (
    <div className="empty">
      <span>
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Modal({ title, subtitle, children, onClose, busy }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Fechar janela"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
