import { prisma } from "./prisma";

/**
 * PAYMENT CALCULATION SERVICE
 * 
 * ALL payment calculations happen ONLY on the backend.
 * Frontend NEVER contributes to the final payable amount.
 * 
 * This service:
 * 1. Validates items exist and are available
 * 2. Looks up current prices from database
 * 3. Applies active discounts correctly
 * 4. Calculates packing charges
 * 5. Calculates taxes (if applicable)
 * 6. Returns final payable amount
 */

export interface OrderItemForCalculation {
  menuItemId: string;
  quantity: number;
  variantName?: string; // If variant was selected
}

export interface CalculationResult {
  subtotal: number;
  packingCharges: number;
  taxes: number;
  discountAmount: number;
  total: number;
  breakdown: {
    items: Array<{
      menuItemId: string;
      itemName: string;
      quantity: number;
      unitPrice: number;
      itemTotal: number;
      discount: number;
      appliedDiscountPct: number;
    }>;
  };
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

type DiscountableItem = {
  discountPct?: number | null;
  discountFlat?: number | null;
};

type PackingChargeItem = {
  itemName: string;
  quantity: number;
};

/**
 * Validate that an item exists and is available
 */
async function validateItemAvailability(
  menuItemId: string
): Promise<ValidationResult> {
  try {
    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!item) {
      return { valid: false, error: `Item ${menuItemId} not found` };
    }

    if (item.outOfStock) {
      return { valid: false, error: `Item ${item.name} is out of stock` };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Database error validating item" };
  }
}

/**
 * Get current price for a menu item (including variants)
 */
async function getCurrentPrice(
  menuItemId: string,
  variantName?: string
): Promise<number> {
  const item = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
  });

  if (!item) throw new Error(`Item ${menuItemId} not found`);

  // Look up variant price securely from database
  if (variantName && item.variantPrices) {
    const prices = item.variantPrices as Record<string, number>;
    if (prices[variantName] !== undefined) {
      return prices[variantName];
    }
  }

  return item.price;
}

/**
 * Calculate applied discount for an item
 */
function calculateDiscount(basePrice: number, item: DiscountableItem): number {
  let discount = 0;

  if (item.discountPct) {
    discount = Math.round(basePrice * item.discountPct / 100);
  } else if (item.discountFlat) {
    discount = Math.min(item.discountFlat, basePrice);
  }

  return discount;
}

/**
 * Calculate packing charges based on items
 * Rules:
 * - ₹20 for 2 Dosas
 * - ₹10 for 2 Idli
 */
function calculatePackingCharges(items: PackingChargeItem[]): number {
  let packingCharges = 0;

  // Group by item name and calculate packing
  const itemMap = new Map<string, number>();
  items.forEach(item => {
    itemMap.set(item.itemName, (itemMap.get(item.itemName) || 0) + item.quantity);
  });

  for (const [itemName, quantity] of itemMap) {
    if (itemName.toLowerCase().includes("dosa")) {
      // ₹20 per 2 dosas
      packingCharges += Math.ceil(quantity / 2) * 20;
    } else if (itemName.toLowerCase().includes("idli")) {
      // ₹10 per 2 idlis
      packingCharges += Math.ceil(quantity / 2) * 10;
    }
  }

  return packingCharges;
}

/**
 * MAIN CALCULATION FUNCTION
 * 
 * Recalculates the entire bill from scratch using database values.
 * This is called BEFORE creating a payment to ensure the amount is correct.
 */
export async function calculatePayableAmount(
  items: OrderItemForCalculation[],
  isTakeaway: boolean = false
): Promise<CalculationResult> {
  if (!items || items.length === 0) {
    throw new Error("No items to calculate");
  }

  // Validate all items exist and are available
  for (const item of items) {
    const validation = await validateItemAvailability(item.menuItemId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  // Fetch all menu items
  const menuItemIds = items.map(i => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new Error("Some items could not be found in database");
  }

  const itemMap = new Map(menuItems.map(item => [item.id, item]));

  let subtotal = 0;
  let totalDiscount = 0;
  const breakdownItems: CalculationResult["breakdown"]["items"] = [];

  // Calculate each item
  for (const reqItem of items) {
    const dbItem = itemMap.get(reqItem.menuItemId);
    if (!dbItem) throw new Error(`Item not found: ${reqItem.menuItemId}`);

    // Get current price (from variant if provided, else base price)
    const unitPrice = await getCurrentPrice(
      reqItem.menuItemId,
      reqItem.variantName
    );

    const itemTotal = unitPrice * reqItem.quantity;
    const discount = calculateDiscount(unitPrice, dbItem);
    const itemDiscount = discount * reqItem.quantity;

    subtotal += itemTotal;
    totalDiscount += itemDiscount;

    breakdownItems.push({
      menuItemId: reqItem.menuItemId,
      itemName: dbItem.name,
      quantity: reqItem.quantity,
      unitPrice,
      itemTotal,
      discount: itemDiscount,
      appliedDiscountPct: dbItem.discountPct || 0,
    });
  }

  // Apply subtotal-level discounts (if any)
  subtotal = Math.max(0, subtotal - totalDiscount);

  // Calculate packing charges (for takeaway only, or if explicitly requested)
  let packingCharges = 0;
  if (isTakeaway) {
    packingCharges = calculatePackingCharges(
      breakdownItems.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
      }))
    );
  }

  // Calculate taxes (GST - currently 5% for restaurant)
  // Can be made configurable if needed
  const gstRate = 0.05;
  const taxes = Math.round(subtotal * gstRate);

  // Calculate total
  const total = subtotal + packingCharges + taxes;

  return {
    subtotal,
    packingCharges,
    taxes,
    discountAmount: totalDiscount,
    total,
    breakdown: {
      items: breakdownItems,
    },
  };
}

/**
 * Verify that a payment amount matches the calculated amount for items
 * Used to detect tampering attempts.
 */
export async function verifyPaymentAmount(
  items: OrderItemForCalculation[],
  claimedAmount: number,
  isTakeaway: boolean = false,
  tolerance: number = 0 // Allow 0 rupees tolerance (strict)
): Promise<{ valid: boolean; reason?: string; calculated?: number }> {
  try {
    const calculation = await calculatePayableAmount(items, isTakeaway);
    const difference = Math.abs(calculation.total - claimedAmount);

    if (difference > tolerance) {
      return {
        valid: false,
        reason: `Amount mismatch: claimed ₹${claimedAmount}, calculated ₹${calculation.total}`,
        calculated: calculation.total,
      };
    }

    return { valid: true, calculated: calculation.total };
  } catch (err) {
    return {
      valid: false,
      reason: `Verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/**
 * Get the breakdown for display to user (before they confirm payment)
 */
export async function getPaymentBreakdown(
  items: OrderItemForCalculation[],
  isTakeaway: boolean = false
): Promise<CalculationResult> {
  return calculatePayableAmount(items, isTakeaway);
}
