import React from "react";
import { date, actionLabels } from "../lib/format.js";
export default function AuditPage({ data }) {
  return (
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Atividade</th>
              <th>Usuário</th>
              <th>Terminal</th>
              <th>Data e hora</th>
            </tr>
          </thead>
          <tbody>
            {data.auditLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  <strong>{actionLabels[log.action] ?? log.action}</strong>
                  <small className="audit-detail">
                    {log.details?.product ??
                      log.details?.label ??
                      log.details?.username ??
                      log.entityId}
                  </small>
                </td>
                <td>{log.userName}</td>
                <td>{log.terminal}</td>
                <td>{date(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
