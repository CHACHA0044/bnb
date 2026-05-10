import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../lib/auth";
import { getIO } from "../lib/socket";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";

const router = Router();

// Setup Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg, .png and .webp formats allowed!"));
    }
  },
});

const MENU_IMAGE_DIR = path.join(process.cwd(), "..", "public", "images", "menu");
if (!existsSync(MENU_IMAGE_DIR)) {
  mkdirSync(MENU_IMAGE_DIR, { recursive: true });
}

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

/* ─── In-Memory Menu Cache ─────────────────── */
let menuCache: { categories: any[]; items: any[]; cachedAt: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

async function getMenuFromDB() {
  const categories = await prisma.category.findMany({
    where: { name: { not: "Others" } },
    orderBy: { sortOrder: "asc" },
  });

  // Auto-restock items whose outOfStockUntil has passed
  const now = new Date();
  await prisma.menuItem.updateMany({
    where: {
      outOfStock: true,
      outOfStockUntil: { not: null, lte: now },
    },
    data: { outOfStock: false, outOfStockUntil: null },
  });

  const items = await prisma.menuItem.findMany({
    where: { category: { name: { not: "Others" } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { category: { select: { name: true } } },
  });

  return { categories, items };
}

function invalidateCache() {
  menuCache = null;
}

async function getCachedMenu() {
  if (menuCache && Date.now() - menuCache.cachedAt < CACHE_TTL) {
    return menuCache;
  }
  const data = await getMenuFromDB();
  menuCache = { ...data, cachedAt: Date.now() };
  return menuCache;
}

/** Emit menu_updated or specific item stock updates to all connected clients */
export function emitMenuUpdate(updates?: { id: string; outOfStock: boolean }[]) {
  invalidateCache();
  try {
    const io = getIO();
    if (updates && updates.length > 0) {
      io.emit("menu_item_stock_updated", updates);
    } else {
      io.emit("menu_updated"); // Global emit — all clients re-fetch
    }
  } catch { /* socket not ready */ }
}

/** Save a version snapshot before destructive changes */
async function saveVersionSnapshot(note: string) {
  const allCategories = await prisma.category.findMany({
    include: { items: true },
    orderBy: { sortOrder: "asc" },
  });
  await prisma.menuVersion.create({
    data: {
      snapshot: JSON.parse(JSON.stringify(allCategories)),
      note,
    },
  });
}

/* ═══════════════════════════════════════════════
   PUBLIC ROUTES
   ═══════════════════════════════════════════════ */

/**
 * GET /api/menu
 * Public — returns all categories + items for the ordering page.
 */
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const { categories, items } = await getCachedMenu();

    // Transform items to match frontend OrderMenuItem interface
    const menuItems = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category.name,
      descriptionEn: item.descriptionEn,
      descriptionHi: item.descriptionHi,
      image: item.image,
      priceLabel: item.priceLabel,
      rating: item.rating,
      ratingCount: item.ratingCount,
      variants: item.variants.length > 0 ? item.variants : undefined,
      variantPrices: item.variantPrices || undefined,
      tags: item.tags.length > 0 ? item.tags : undefined,
      outOfStock: item.outOfStock,
      outOfStockVariants: item.outOfStockVariants || [],
      volume: item.volume || null,
      discountPct: item.discountPct,
      discountFlat: item.discountFlat,
    }));

    const categoryNames = categories.map((c: any) => c.name);

    res.json({ categories: categoryNames, items: menuItems });
  } catch (err) {
    console.error("[MENU] Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

/* ═══════════════════════════════════════════════
   ADMIN ROUTES (require auth)
   ═══════════════════════════════════════════════ */

/**
 * GET /api/menu/admin/full
 * Returns full menu data for admin editing (includes IDs, timestamps, etc.)
 */
router.get("/admin/full", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    res.json({ categories });
  } catch (err: any) {
    console.error("[MENU ADMIN] Fetch error:", {
      message: err.message,
      code: err.code,
      meta: err.meta,
      stack: err.stack?.split("\n").slice(0, 3).join("\n")
    });
    res.status(500).json({ 
      error: "Failed to fetch menu",
      details: err.message,
      isDbError: err.message?.includes("Can't reach database")
    });
  }
});

/* ─── Image Upload ─────────────────────────── */

/**
 * POST /api/menu/admin/upload
 * Handle image upload, optimize with sharp, and save to public.
 */
router.post("/admin/upload", requireAdmin, upload.single("image"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const { itemName } = req.body;
    if (!itemName) {
      res.status(400).json({ error: "itemName is required to generate filename" });
      return;
    }

    const timestamp = Date.now();
    const filename = `${slugify(itemName)}-${timestamp}.webp`;
    const filepath = path.join(MENU_IMAGE_DIR, filename);

    // Process with sharp
    await sharp(req.file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Max 1200px width
      .webp({ quality: 80 }) // Convert to WebP with good quality
      .toFile(filepath);

    console.log(`[MENU ADMIN] Image uploaded & optimized: ${filename}`);

    res.json({ 
      success: true, 
      path: `/images/menu/${filename}`,
      filename: filename
    });
  } catch (err: any) {
    console.error("[MENU ADMIN] Upload error:", err);
    res.status(500).json({ error: "Failed to process image", details: err.message });
  }
});

/* ─── Item CRUD ────────────────────────────── */

/**
 * POST /api/menu/admin/items
 * Create a new menu item.
 */
router.post("/admin/items", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, price, categoryId, descriptionEn, descriptionHi, image, priceLabel, rating, ratingCount, variants, variantPrices, tags } = req.body;

    if (!name || !price || !categoryId) {
      res.status(400).json({ error: "name, price, and categoryId are required" });
      return;
    }

    await saveVersionSnapshot(`Create: ${name}`);

    const item = await prisma.menuItem.create({
      data: {
        name,
        price: parseInt(price),
        categoryId,
        descriptionEn: descriptionEn || null,
        descriptionHi: descriptionHi || null,
        image: image || null,
        priceLabel: priceLabel || null,
        rating: rating ? parseFloat(rating) : null,
        ratingCount: ratingCount ? parseInt(ratingCount) : null,
        variantPrices: variantPrices || undefined,
        tags: tags || [],
        // @ts-ignore
        volume: req.body.volume || null,
        // @ts-ignore: Bypassing stale Prisma types until db push succeeds
        outOfStockVariants: req.body.outOfStockVariants || [],
      },
    });

    console.log(`[MENU ADMIN] Created item: ${name} (${item.id})`);
    emitMenuUpdate();
    res.status(201).json(item);
  } catch (err) {
    console.error("[MENU ADMIN] Create error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

/**
 * PUT /api/menu/admin/items/:id
 * Update an existing menu item.
 */
router.put("/admin/items/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const data = req.body;

    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    const itemName = data.name || existingItem?.name || id;
    
    const changes: string[] = [];
    if (existingItem) {
      if (data.name !== undefined && data.name !== existingItem.name) changes.push("Changed name");
      if (data.price !== undefined && parseInt(data.price) !== existingItem.price) changes.push("Changed price");
      if (data.image !== undefined && data.image !== existingItem.image) changes.push("Changed image");
      if (data.descriptionEn !== undefined && data.descriptionEn !== existingItem.descriptionEn) changes.push("Changed description");
      if (data.discountPct !== undefined && data.discountPct !== null && parseInt(data.discountPct) !== existingItem.discountPct) changes.push("Applied discount");
      if (data.discountPct === null && existingItem.discountPct !== null) changes.push("Removed discount");
      if (data.outOfStock !== undefined && Boolean(data.outOfStock) !== existingItem.outOfStock) changes.push(data.outOfStock ? "Marked out of stock" : "Put in stock");
      if (data.categoryId !== undefined && data.categoryId !== existingItem.categoryId) changes.push("Changed category");
      if (data.variants !== undefined && JSON.stringify(data.variants) !== JSON.stringify(existingItem.variants)) changes.push("Changed variants");
      if (data.variantPrices !== undefined && JSON.stringify(data.variantPrices) !== JSON.stringify(existingItem.variantPrices)) changes.push("Changed variant prices");
      if (data.volume !== undefined && data.volume !== existingItem.volume) changes.push("Changed volume");
    }
    
    let changeStr = "";
    if (changes.length > 0) {
      const uniqueChanges = Array.from(new Set(changes));
      changeStr = ` (${uniqueChanges.slice(0, 3).join(", ")}${uniqueChanges.length > 3 ? "..." : ""})`;
    } else if (existingItem) {
      changeStr = " (Updated details)";
    }

    await saveVersionSnapshot(`Update: ${itemName}${changeStr}`);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = parseInt(data.price);
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.descriptionEn !== undefined) updateData.descriptionEn = data.descriptionEn || null;
    if (data.descriptionHi !== undefined) updateData.descriptionHi = data.descriptionHi || null;
    if (data.image !== undefined) updateData.image = data.image || null;
    if (data.priceLabel !== undefined) updateData.priceLabel = data.priceLabel || null;
    if (data.rating !== undefined) updateData.rating = data.rating ? parseFloat(data.rating) : null;
    if (data.ratingCount !== undefined) updateData.ratingCount = data.ratingCount ? parseInt(data.ratingCount) : null;
    if (data.variants !== undefined) updateData.variants = data.variants;
    if (data.variantPrices !== undefined) updateData.variantPrices = data.variantPrices;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.outOfStock !== undefined) updateData.outOfStock = Boolean(data.outOfStock);
    if (data.outOfStockUntil !== undefined) updateData.outOfStockUntil = data.outOfStockUntil ? new Date(data.outOfStockUntil) : null;
    if (data.discountPct !== undefined) updateData.discountPct = data.discountPct ? parseInt(data.discountPct) : null;
    if (data.discountFlat !== undefined) updateData.discountFlat = data.discountFlat ? parseInt(data.discountFlat) : null;
    if (data.outOfStockVariants !== undefined) updateData.outOfStockVariants = data.outOfStockVariants;
    if (data.sortOrder !== undefined) updateData.sortOrder = parseInt(data.sortOrder);
    if (data.volume !== undefined) updateData.volume = data.volume || null;

    const item = await prisma.menuItem.update({
      where: { id: id as string },
      data: updateData,
    });

    console.log(`[MENU ADMIN] Updated item: ${item.name} (${item.id})`);
    emitMenuUpdate();
    res.json(item);
  } catch (err) {
    console.error("[MENU ADMIN] Update error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * DELETE /api/menu/admin/items/:id
 * Delete a menu item.
 */
router.delete("/admin/items/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const item = await prisma.menuItem.findUnique({ where: { id: id as string } });
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }

    await saveVersionSnapshot(`Delete: ${item.name}`);

    await prisma.menuItem.delete({ where: { id: id as string } });

    console.log(`[MENU ADMIN] Deleted item: ${item.name}`);
    emitMenuUpdate();
    res.json({ success: true });
  } catch (err) {
    console.error("[MENU ADMIN] Delete error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

/**
 * PATCH /api/menu/admin/items/:id/stock
 * Quick toggle out-of-stock status.
 * Body: { outOfStock: boolean, until?: "today" | ISO string }
 */
router.patch("/admin/items/:id/stock", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { outOfStock, until } = req.body;

    let outOfStockUntil: Date | null = null;
    if (outOfStock && until === "today") {
      // End of today
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      outOfStockUntil = endOfDay;
    } else if (outOfStock && until) {
      outOfStockUntil = new Date(until);
    }

    const item = await prisma.menuItem.update({
      where: { id: id as string },
      data: { outOfStock: Boolean(outOfStock), outOfStockUntil },
    });

    console.log(`[MENU ADMIN] Stock toggle: ${item.name} → ${outOfStock ? "OUT OF STOCK" : "IN STOCK"}`);
    emitMenuUpdate([{ id: item.id, outOfStock: Boolean(outOfStock) }]);
    res.json(item);
  } catch (err) {
    console.error("[MENU ADMIN] Stock toggle error:", err);
    res.status(500).json({ error: "Failed to toggle stock" });
  }
});

/**
 * PATCH /api/menu/admin/items/bulk-stock
 * Bulk update out-of-stock status.
 * Body: { updates: [{ id: string, outOfStock: boolean }] }
 */
router.patch("/admin/items/bulk-stock", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
      res.status(400).json({ error: "updates array is required" });
      return;
    }

    // Removed saveVersionSnapshot for stock updates to make it instantaneous

    // We use a transaction to ensure all updates succeed or fail together
    await prisma.$transaction(
      updates.map((u: any) => 
        prisma.menuItem.update({
          where: { id: u.id as string },
          data: { 
            outOfStock: Boolean(u.outOfStock),
            outOfStockUntil: u.outOfStock ? undefined : null // Clear auto-restock if marking back in stock
          },
        })
      )
    );

    console.log(`[MENU ADMIN] Bulk stock update completed for ${updates.length} items`);
    emitMenuUpdate(updates.map((u: any) => ({ id: u.id, outOfStock: Boolean(u.outOfStock) })));
    res.json({ success: true });
  } catch (err) {
    console.error("[MENU ADMIN] Bulk stock update error:", err);
    res.status(500).json({ error: "Failed to update stock" });
  }
});

/* ─── Category CRUD ────────────────────────── */

/**
 * POST /api/menu/admin/categories
 * Create a new category.
 */
router.post("/admin/categories", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, sortOrder } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }

    await saveVersionSnapshot(`Create category: ${name}`);

    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: { name, sortOrder: sortOrder ?? ((maxSort._max.sortOrder || 0) + 1) },
    });

    console.log(`[MENU ADMIN] Created category: ${name}`);
    emitMenuUpdate();
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === "P2002") {
      res.status(409).json({ error: "Category name already exists" });
      return;
    }
    console.error("[MENU ADMIN] Category create error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

/**
 * PUT /api/menu/admin/categories/:id
 * Update a category.
 */
router.put("/admin/categories/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, sortOrder } = req.body;

    const existingCat = await prisma.category.findUnique({ where: { id } });
    const catName = name || existingCat?.name || id;
    
    const changes: string[] = [];
    if (existingCat) {
      if (name !== undefined && name !== existingCat.name) changes.push("Changed name");
      if (sortOrder !== undefined && parseInt(sortOrder) !== existingCat.sortOrder) changes.push("Changed sort order");
    }
    
    let changeStr = "";
    if (changes.length > 0) {
      changeStr = ` (${changes.join(", ")})`;
    } else if (existingCat) {
      changeStr = " (Updated details)";
    }
    
    await saveVersionSnapshot(`Update Category: ${catName}${changeStr}`);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sortOrder !== undefined) updateData.sortOrder = parseInt(sortOrder);

    const category = await prisma.category.update({
      where: { id: id as string },
      data: updateData,
    });

    console.log(`[MENU ADMIN] Updated category: ${category.name}`);
    emitMenuUpdate();
    res.json(category);
  } catch (err) {
    console.error("[MENU ADMIN] Category update error:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

/**
 * DELETE /api/menu/admin/categories/:id
 * Delete a category (only if empty).
 */
router.delete("/admin/categories/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const itemCount = await prisma.menuItem.count({ where: { categoryId: id as string } });
    if (itemCount > 0) {
      res.status(400).json({ error: `Cannot delete: category has ${itemCount} items. Move or delete them first.` });
      return;
    }

    const category = await prisma.category.findUnique({ where: { id: id as string } });
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    await saveVersionSnapshot(`Delete Category: ${category.name}`);
    await prisma.category.delete({ where: { id: id as string } });

    console.log(`[MENU ADMIN] Deleted category: ${id}`);
    emitMenuUpdate();
    res.json({ success: true });
  } catch (err) {
    console.error("[MENU ADMIN] Category delete error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

/* ─── Bulk Discount ────────────────────────── */

/**
 * POST /api/menu/admin/discount/bulk
 * Apply discount to all items in a category.
 * Body: { categoryId, discountPct?: number, discountFlat?: number, clear?: boolean }
 */
router.post("/admin/discount/bulk", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { categoryId, discountPct, discountFlat, clear } = req.body;
    if (!categoryId) { res.status(400).json({ error: "categoryId required" }); return; }

    await saveVersionSnapshot(`Bulk discount on category: ${categoryId}`);

    if (clear) {
      await prisma.menuItem.updateMany({
        where: { categoryId: categoryId as string },
        data: { discountPct: null, discountFlat: null },
      });
    } else {
      await prisma.menuItem.updateMany({
        where: { categoryId: categoryId as string, discountPct: null, discountFlat: null }, // Only items without item-level discount
        data: {
          discountPct: discountPct ? parseInt(discountPct) : null,
          discountFlat: discountFlat ? parseInt(discountFlat) : null,
        },
      });
    }

    console.log(`[MENU ADMIN] Bulk discount applied to category ${categoryId}`);
    emitMenuUpdate();
    res.json({ success: true });
  } catch (err) {
    console.error("[MENU ADMIN] Bulk discount error:", err);
    res.status(500).json({ error: "Failed to apply discount" });
  }
});

/* ─── Version History / Rollback ───────────── */

/**
 * GET /api/menu/admin/versions
 * Get recent menu version history.
 */
router.get("/admin/versions", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const versions = await prisma.menuVersion.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, note: true, changedBy: true, createdAt: true },
    });
    res.json(versions);
  } catch (err) {
    console.error("[MENU ADMIN] Version history error:", err);
    res.status(500).json({ error: "Failed to fetch versions" });
  }
});

/**
 * POST /api/menu/admin/versions/:id/rollback
 * Rollback menu to a previous version snapshot.
 */
router.post("/admin/versions/:id/rollback", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const version = await prisma.menuVersion.findUnique({ where: { id: id as string } });
    if (!version) { res.status(404).json({ error: "Version not found" }); return; }

    await saveVersionSnapshot("Pre-rollback snapshot");

    const snapshot = version.snapshot as any[];

    // Delete all current items and categories, then recreate
    await prisma.menuItem.deleteMany({});
    await prisma.category.deleteMany({});

    for (const cat of snapshot) {
      const newCat = await prisma.category.create({
        data: {
          name: cat.name,
          sortOrder: cat.sortOrder,
        },
      });

      if (cat.items && Array.isArray(cat.items)) {
        for (const item of cat.items) {
          await prisma.menuItem.create({
            data: {
              name: item.name,
              price: item.price,
              categoryId: newCat.id,
              descriptionEn: item.descriptionEn,
              descriptionHi: item.descriptionHi,
              image: item.image,
              priceLabel: item.priceLabel,
              rating: item.rating,
              ratingCount: item.ratingCount,
              variants: item.variants || [],
              variantPrices: item.variantPrices,
              tags: item.tags || [],
              outOfStock: item.outOfStock || false,
              discountPct: item.discountPct,
              discountFlat: item.discountFlat,
              sortOrder: item.sortOrder || 0,
            },
          });
        }
      }
    }

    console.log(`[MENU ADMIN] Rolled back to version ${id}`);
    emitMenuUpdate();
    res.json({ success: true });
  } catch (err) {
    console.error("[MENU ADMIN] Rollback error:", err);
    res.status(500).json({ error: "Failed to rollback" });
  }
});

/**
 * POST /api/menu/rate
 * Submit a rating for a menu item.
 */
router.post("/rate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemId, rating, orderId, sessionId } = req.body as { itemId: string; rating: number; orderId?: string; sessionId?: string };
    
    if (!itemId || !rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "itemId and rating (1-5) required" });
      return;
    }

    const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const currentCount = item.ratingCount || 0;
    const currentRating = item.rating || 0;
    const newCount = currentCount + 1;
    const newRating = ((currentRating * currentCount) + rating) / newCount;

    await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        rating: parseFloat(newRating.toFixed(1)),
        ratingCount: newCount
      }
    });

    // Sync with OrderHistoryRecord if context provided
    if (orderId || sessionId) {
      try {
        const historyWhere: any = orderId ? { orderId } : { sessionId };
        const historyRecords = await (prisma as any).orderHistoryRecord.findMany({ where: historyWhere });
        
        for (const record of historyRecords) {
          const items = Array.isArray(record.items) ? record.items : [];
          let updated = false;
          const updatedItems = items.map((it: any) => {
            if (it.name === item.name) {
              updated = true;
              return { ...it, rating };
            }
            return it;
          });

          if (updated) {
            await (prisma as any).orderHistoryRecord.update({
              where: { id: record.id },
              data: { items: updatedItems }
            });
          }
        }

        // Also update AnalyticsLog
        await (prisma as any).analyticsLog.updateMany({
          where: orderId ? { orderId, itemName: item.name } : { sessionId, itemName: item.name },
          data: { rating }
        });

      } catch (err) {
        console.error("[MENU] History rating sync error:", err);
      }
    }

    try {
      const io = getIO();
      io.emit("menu_updated");
    } catch { /* skip */ }

    res.json({ success: true, rating: newRating });
  } catch (err) {
    console.error("[MENU] Rate error:", err);
    res.status(500).json({ error: "Failed to submit rating" });
  }
});


router.post("/feedback", async (req, res) => {
  try {
    const { sessionId, feedback } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Session ID is required" });

    // Update Session
    await (prisma as any).session.update({
      where: { id: sessionId },
      data: { feedback: feedback || null }
    });

    // Sync with OrderHistoryRecord if it exists
    try {
      await (prisma as any).orderHistoryRecord.updateMany({
        where: { sessionId },
        data: { feedback: feedback || null }
      });
    } catch (err) {
      console.error("[MENU] History feedback sync error:", err);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[MENU] Feedback error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

export default router;
