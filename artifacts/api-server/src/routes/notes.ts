import { Router } from "express";
import { db } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";

const router = Router();

// ─── Tailor Notes CRUD ────────────────────────────────────────────────────────

router.get("/notes", async (req, res) => {
  try {
    const { deviceId, customerId, type, pinned, archived = "false", search } = req.query as Record<string, string>;
    if (!deviceId) return void res.status(400).json({ message: "deviceId required" });

    // Build base conditions using sql template tags (auto-parameterized)
    const showArchived = archived === "true";

    let rows: any[];

    if (customerId) {
      const cId = parseInt(customerId);
      if (search) {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.customer_id = ${cId}
            AND (n.title ILIKE ${'%' + search + '%'} OR n.content ILIKE ${'%' + search + '%'} OR n.tags ILIKE ${'%' + search + '%'})
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      } else {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.customer_id = ${cId}
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      }
    } else if (type === "general") {
      if (search) {
        rows = (await db.execute(sql`
          SELECT n.*, NULL as customer_name
          FROM tailor_notes n
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.customer_id IS NULL
            AND (n.title ILIKE ${'%' + search + '%'} OR n.content ILIKE ${'%' + search + '%'} OR n.tags ILIKE ${'%' + search + '%'})
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      } else {
        rows = (await db.execute(sql`
          SELECT n.*, NULL as customer_name
          FROM tailor_notes n
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.customer_id IS NULL
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      }
    } else if (type === "client") {
      if (search) {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.customer_id IS NOT NULL
            AND (n.title ILIKE ${'%' + search + '%'} OR n.content ILIKE ${'%' + search + '%'} OR n.tags ILIKE ${'%' + search + '%'})
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      } else {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.customer_id IS NOT NULL
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      }
    } else if (pinned === "true") {
      if (search) {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.is_pinned = TRUE
            AND (n.title ILIKE ${'%' + search + '%'} OR n.content ILIKE ${'%' + search + '%'} OR n.tags ILIKE ${'%' + search + '%'})
          ORDER BY n.updated_at DESC
        `)).rows;
      } else {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND n.is_pinned = TRUE
          ORDER BY n.updated_at DESC
        `)).rows;
      }
    } else {
      // all
      if (search) {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
            AND (n.title ILIKE ${'%' + search + '%'} OR n.content ILIKE ${'%' + search + '%'} OR n.tags ILIKE ${'%' + search + '%'})
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      } else {
        rows = (await db.execute(sql`
          SELECT n.*, tc.name as customer_name
          FROM tailor_notes n
          LEFT JOIN tailoring_customers tc ON n.customer_id = tc.id
          WHERE n.device_id = ${deviceId}
            AND n.is_archived = ${showArchived}
          ORDER BY n.is_pinned DESC, n.updated_at DESC
        `)).rows;
      }
    }

    return void res.json(rows);
  } catch (err) {
    console.error("GET /notes error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/notes", async (req, res) => {
  try {
    const { deviceId, title, content, customerId, tags, isPinned = false, imageData } = req.body;
    if (!deviceId || !title || !content) {
      return void res.status(400).json({ message: "deviceId, title, and content are required" });
    }

    const result = await db.execute(sql`
      INSERT INTO tailor_notes (device_id, title, content, customer_id, tags, is_pinned, image_data)
      VALUES (${deviceId}, ${title}, ${content}, ${customerId || null}, ${tags || null}, ${isPinned}, ${imageData || null})
      RETURNING *
    `);

    // Increment tool usage count for the device
    try {
      await db.update(usersTable)
        .set({ totalUsageCount: sql`COALESCE(total_usage_count, 0) + 1` })
        .where(eq(usersTable.deviceId, deviceId));
    } catch { /* non-fatal */ }

    return void res.json(result.rows[0]);
  } catch (err) {
    console.error("POST /notes error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { deviceId, title, content, customerId, tags, isPinned, isArchived, imageData } = req.body;
    if (!deviceId) return void res.status(400).json({ message: "deviceId required" });

    // Build update using Drizzle sql tag — only set fields that were provided
    const updates: ReturnType<typeof sql>[] = [sql`updated_at = NOW()`];
    if (title !== undefined)      updates.push(sql`title = ${title}`);
    if (content !== undefined)    updates.push(sql`content = ${content}`);
    if (customerId !== undefined) updates.push(sql`customer_id = ${customerId || null}`);
    if (tags !== undefined)       updates.push(sql`tags = ${tags}`);
    if (isPinned !== undefined)   updates.push(sql`is_pinned = ${isPinned}`);
    if (isArchived !== undefined) updates.push(sql`is_archived = ${isArchived}`);
    if (imageData !== undefined)  updates.push(sql`image_data = ${imageData || null}`);

    const setClause = sql.join(updates, sql`, `);

    const result = await db.execute(sql`
      UPDATE tailor_notes
      SET ${setClause}
      WHERE id = ${id} AND device_id = ${deviceId}
      RETURNING *
    `);

    if (!result.rows.length) return void res.status(404).json({ message: "Note not found" });
    return void res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT /notes/:id error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { deviceId } = req.query as Record<string, string>;
    if (!deviceId) return void res.status(400).json({ message: "deviceId required" });

    await db.execute(sql`
      DELETE FROM tailor_notes WHERE id = ${id} AND device_id = ${deviceId}
    `);
    return void res.json({ success: true });
  } catch (err) {
    console.error("DELETE /notes/:id error:", err);
    return void res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
