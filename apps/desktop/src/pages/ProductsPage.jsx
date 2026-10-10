import React from "react";
import { Empty } from "../components/Ui.jsx";
import { money } from "../lib/format.js";
export default function ProductsPage({ data, setModal }) {
  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                </td>
                <td>{product.category}</td>
                <td>
                  {product.priceCents > 0
                    ? money(product.priceCents)
                    : "Definir preço"}
                  {product.saleType === "WEIGHT" ? " / kg" : " / un."}
                </td>
                <td>
                  <span
                    className={`badge ${product.active ? "paid" : "closed"}`}
                  >
                    {product.active ? "Disponível" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => setModal({ type: "product", product })}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.products.length && (
        <Empty
          title="Seu cardápio começa aqui"
          description="Cadastre o primeiro produto para liberar os lançamentos."
        />
      )}
    </section>
  );
}
