import React from "react";
import { roleLabels } from "../../../../packages/shared/permissions.js";
export default function UsersPage({ data }) {
  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>Perfil</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((person) => (
              <tr key={person.id}>
                <td>
                  <strong>{person.name}</strong>
                </td>
                <td>{person.username}</td>
                <td>{roleLabels[person.role]}</td>
                <td>
                  <span className="badge paid">
                    {person.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
