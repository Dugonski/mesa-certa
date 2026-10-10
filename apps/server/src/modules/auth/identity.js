import { createHash } from "node:crypto";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const safeUser = ({ id, name, username, role, active }) => ({
  id,
  name,
  username,
  role,
  active,
});
