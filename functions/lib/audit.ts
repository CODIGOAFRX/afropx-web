import { createOpaqueId } from "./ids";

export async function writeAudit(
  db: D1Database,
  adminEmail: string,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_audit
        (id, admin_email, action, entity_type, entity_id, details_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(
      createOpaqueId("audit"),
      adminEmail,
      action.slice(0, 80),
      entityType.slice(0, 80),
      entityId.slice(0, 120),
      JSON.stringify(details).slice(0, 4_000)
    )
    .run();
}
