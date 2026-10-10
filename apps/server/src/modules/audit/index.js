export async function audit(
  tx,
  user,
  terminal,
  action,
  entityId,
  details = {},
) {
  await tx.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      terminal,
      action,
      entityId,
      details,
    },
  });
}
