import React from "react";
export default function ItemFields({ item }) {
  return (
    <>
      <p className="edit-item-name">{item.productName}</p>
      {item.saleType === "WEIGHT" ? (
        <label>
          Quantidade (kg)
          <input
            name="weightKg"
            type="number"
            min="0.001"
            max="100"
            step="0.001"
            defaultValue={(item.weightGrams / 1000).toFixed(3)}
            required
            autoFocus
          />
          <input type="hidden" name="quantity" value="1" />
        </label>
      ) : (
        <label>
          Quantidade
          <input
            name="quantity"
            type="number"
            min="1"
            max="99"
            step="1"
            defaultValue={item.quantity}
            required
            autoFocus
          />
        </label>
      )}
      <label>
        Observação
        <input name="note" defaultValue={item.note} maxLength={240} />
      </label>
    </>
  );
}
