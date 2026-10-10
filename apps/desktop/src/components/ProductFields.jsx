import React, { useState } from "react";
export default function ProductFields({ product }) {
  const [type, setType] = useState(product?.saleType ?? "UNIT");
  return (
    <>
      <label>
        Nome
        <input
          name="name"
          defaultValue={product?.name}
          maxLength={100}
          required
          autoFocus
        />
      </label>
      <label>
        Tipo
        <select
          name="saleType"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="UNIT">Bebida · por unidade</option>
          <option value="WEIGHT">Buffet · por peso</option>
        </select>
      </label>
      <input
        type="hidden"
        name="category"
        value={type === "WEIGHT" ? "Buffet" : "Bebidas"}
      />
      <label>
        {type === "WEIGHT" ? "Preço por kg (R$)" : "Preço por unidade (R$)"}
        <input
          name="price"
          type="number"
          min="0.01"
          step="0.01"
          max="10000"
          defaultValue={
            product?.priceCents ? (product.priceCents / 100).toFixed(2) : ""
          }
          required
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          name="active"
          defaultChecked={
            product?.priceCents === 0 || (product?.active ?? true)
          }
        />
        Disponível para pedidos
      </label>
    </>
  );
}
