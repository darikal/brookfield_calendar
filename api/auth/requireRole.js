import { getDB } from "./_auth.js";
import { ObjectId } from "mongodb";

/**
 * Wraps a handler and enforces role-based access.
 * @param {Array<string>} allowedRoles - e.g. ["admin", "subAdmin"]
 * @returns {Function} - Wrapped handler(req, res)
 */
export function requireRole(allowedRoles = []) {
  return async function(handler) {
    return async (req, res) => {
      const cookie = req.headers.cookie || "";
      const session = cookie
        .split(";")
        .find(c => c.trim().startsWith("session="))
        ?.split("=")[1];

      if (!session) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const db = await getDB();
      const user = await db.collection("users").findOne({ _id: new ObjectId(session) });

      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      req.user = user; // attach user to request
      return handler(req, res);
    };
  };
}
