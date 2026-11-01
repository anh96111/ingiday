import { supabase } from "../lib/supabase";

// Query ALL order statuses, not only completed orders. Revenue remains
// completed-only in the existing revenue report.
const ORDER_PAGE_SIZE = 500;
const RELATED_BATCH_SIZE = 80;
const RELATED_PAGE_SIZE = 500;

type OrderRow = {
  id: string;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  quantity: number;
};

type HandlingSnapshotRow = {
  order_id: string;
  packaging_cost: number | string;
  shipping_cost: number | string;
};

type ItemSnapshotRow = {
  order_item_id: string;
  filament_cost_per_unit: number | string;
  electricity_cost_per_unit: number | string | null;
  total_cost_per_unit: number | string | null;
};

export type CostPeriodBreakdown = {
  orderCount: number;
  itemLineCount: number;
  itemUnitCount: number;
  knownFilamentCost: number;
  knownElectricityCost: number;
  knownProductionCost: number;
  knownPackagingCost: number;
  knownShippingCost: number;
  knownTotalCost: number;
  missingHandlingOrders: number;
  missingProductionUnits: number;
  complete: boolean;
};

export type ProductionCostReport = {
  totals: CostPeriodBreakdown;
  byDate: Record<string, CostPeriodBreakdown>;
};

const vietnamDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dayKey(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid order timestamp.");
  const parts = vietnamDay.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function money(value: number | string, field: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(amount)) {
    throw new Error(`Invalid ${field} value in a cost snapshot.`);
  }
  return amount;
}

function units(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Invalid quantity in an order item.");
  }
  return value;
}

function emptyBreakdown(): CostPeriodBreakdown {
  return {
    orderCount: 0,
    itemLineCount: 0,
    itemUnitCount: 0,
    knownFilamentCost: 0,
    knownElectricityCost: 0,
    knownProductionCost: 0,
    knownPackagingCost: 0,
    knownShippingCost: 0,
    knownTotalCost: 0,
    missingHandlingOrders: 0,
    missingProductionUnits: 0,
    complete: true,
  };
}

function addBucket(
  target: CostPeriodBreakdown,
  added: CostPeriodBreakdown,
): void {
  target.orderCount += added.orderCount;
  target.itemLineCount += added.itemLineCount;
  target.itemUnitCount += added.itemUnitCount;
  target.knownFilamentCost += added.knownFilamentCost;
  target.knownElectricityCost += added.knownElectricityCost;
  target.knownProductionCost += added.knownProductionCost;
  target.knownPackagingCost += added.knownPackagingCost;
  target.knownShippingCost += added.knownShippingCost;
  target.knownTotalCost += added.knownTotalCost;
  target.missingHandlingOrders += added.missingHandlingOrders;
  target.missingProductionUnits += added.missingProductionUnits;
  target.complete = target.complete && added.complete;
}

async function listRelatedItems(orderIds: string[]): Promise<OrderItemRow[]> {
  const rows: OrderItemRow[] = [];
  for (let from = 0; ; from += RELATED_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("order_items")
      .select("id,order_id,quantity")
      .in("order_id", orderIds)
      .order("id", { ascending: true })
      .range(from, from + RELATED_PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as OrderItemRow[];
    rows.push(...page);
    if (page.length < RELATED_PAGE_SIZE) break;
  }
  return rows;
}

async function listRelatedHandling(
  orderIds: string[],
): Promise<HandlingSnapshotRow[]> {
  const { data, error } = await supabase
    .from("order_handling_cost_snapshots")
    .select("order_id,packaging_cost,shipping_cost")
    .in("order_id", orderIds);
  if (error) throw error;
  return (data ?? []) as unknown as HandlingSnapshotRow[];
}

async function listRelatedItemSnapshots(
  itemIds: string[],
): Promise<ItemSnapshotRow[]> {
  const rows: ItemSnapshotRow[] = [];
  for (let index = 0; index < itemIds.length; index += RELATED_BATCH_SIZE) {
    const batch = itemIds.slice(index, index + RELATED_BATCH_SIZE);
    const { data, error } = await supabase
      .from("order_item_production_cost_snapshots")
      .select("order_item_id,filament_cost_per_unit,electricity_cost_per_unit,total_cost_per_unit")
      .in("order_item_id", batch);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as ItemSnapshotRow[]));
  }
  return rows;
}

function calculateOrderCost(
  orderItems: OrderItemRow[],
  handling: HandlingSnapshotRow | undefined,
  snapshots: Map<string, ItemSnapshotRow>,
): CostPeriodBreakdown {
  const cost = emptyBreakdown();
  cost.orderCount = 1;
  if (handling) {
    cost.knownPackagingCost = money(handling.packaging_cost, "packaging_cost");
    cost.knownShippingCost = money(handling.shipping_cost, "shipping_cost");
  } else {
    // Historical orders have no handling snapshot. Never silently assign zero.
    cost.missingHandlingOrders = 1;
    cost.complete = false;
  }

  for (const item of orderItems) {
    const quantity = units(item.quantity);
    cost.itemLineCount += 1;
    cost.itemUnitCount += quantity;
    const snapshot = snapshots.get(item.id);
    if (!snapshot) {
      cost.missingProductionUnits += quantity;
      cost.complete = false;
      continue;
    }
    cost.knownFilamentCost += money(snapshot.filament_cost_per_unit, "filament_cost_per_unit") * quantity;
    if (snapshot.electricity_cost_per_unit !== null) {
      cost.knownElectricityCost += money(snapshot.electricity_cost_per_unit, "electricity_cost_per_unit") * quantity;
    }
    if (snapshot.total_cost_per_unit === null) {
      // Electricity price or printer wattage was not configured when ordered.
      cost.missingProductionUnits += quantity;
      cost.complete = false;
    } else {
      cost.knownProductionCost += money(snapshot.total_cost_per_unit, "total_cost_per_unit") * quantity;
    }
  }

  cost.knownTotalCost = cost.knownProductionCost + cost.knownPackagingCost + cost.knownShippingCost;
  return cost;
}

/**
 * Admin-only reporting read. Orders are selected by creation date in ALL
 * statuses. Each order contributes one packaging and one actual-shipping
 * snapshot; each line contributes quantity times the snapshotted per-unit cost.
 *
 * The known totals are PARTIAL when complete=false. Callers MUST NOT use them
 * to display definitive profit, margin, ROI or a daily profit line.
 * Historic orders without snapshots remain explicitly incomplete.
 */
export async function loadProductionCostReport(
  startIso: string,
  endExclusiveIso: string,
): Promise<ProductionCostReport> {
  const start = new Date(startIso);
  const end = new Date(endExclusiveIso);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
      start.getTime() >= end.getTime()) {
    throw new Error("Invalid production-cost reporting date range.");
  }

  const totals = emptyBreakdown();
  const byDate: Record<string, CostPeriodBreakdown> = Object.create(null);

  for (let from = 0; ; from += ORDER_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,created_at")
      .gte("created_at", startIso)
      .lt("created_at", endExclusiveIso)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + ORDER_PAGE_SIZE - 1);
    if (error) throw error;
    const orders = (data ?? []) as unknown as OrderRow[];

    for (let offset = 0; offset < orders.length; offset += RELATED_BATCH_SIZE) {
      const batch = orders.slice(offset, offset + RELATED_BATCH_SIZE);
      const orderIds = batch.map((order) => order.id);
      const [items, handlingSnapshots] = await Promise.all([
        listRelatedItems(orderIds),
        listRelatedHandling(orderIds),
      ]);
      const itemSnapshots = await listRelatedItemSnapshots(items.map((item) => item.id));
      const handlingByOrder = new Map(handlingSnapshots.map((row) => [row.order_id, row]));
      const snapshotsByItem = new Map(itemSnapshots.map((row) => [row.order_item_id, row]));
      const itemsByOrder = new Map<string, OrderItemRow[]>();
      for (const item of items) {
        const group = itemsByOrder.get(item.order_id) ?? [];
        group.push(item);
        itemsByOrder.set(item.order_id, group);
      }

      for (const order of batch) {
        const cost = calculateOrderCost(
          itemsByOrder.get(order.id) ?? [],
          handlingByOrder.get(order.id),
          snapshotsByItem,
        );
        const date = dayKey(order.created_at);
        if (!Object.hasOwn(byDate, date)) byDate[date] = emptyBreakdown();
        addBucket(byDate[date], cost);
        addBucket(totals, cost);
      }
    }

    if (orders.length < ORDER_PAGE_SIZE) break;
  }

  return { totals, byDate };
}
