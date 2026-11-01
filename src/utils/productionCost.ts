import type {
  OrderHandlingCost,
  ProductProductionCostProfile,
  ProductionCostSettings,
  SelectedProductionVariant,
  UnitProductionCost,
} from "../types/productCost";

export const DEFAULT_PRODUCTION_COST_SETTINGS: ProductionCostSettings = {
  filamentPricePerKg: 150_000,
  averagePrinterPowerWatts: null,
  electricityPricePerKwh: null,
  packagingCostPerOrder: 10_000,
  shippingCostPerOrder: 15_000,
};

function assertNonNegativeFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite non-negative number.`);
  }
}

export function calculateUnitProductionCost(
  profile: ProductProductionCostProfile,
  settings: ProductionCostSettings,
): UnitProductionCost {
  assertNonNegativeFinite(profile.filamentGrams, "filamentGrams");
  assertNonNegativeFinite(profile.printMinutes, "printMinutes");
  assertNonNegativeFinite(settings.filamentPricePerKg, "filamentPricePerKg");

  const filamentCost = Math.round(
    (profile.filamentGrams / 1_000) * settings.filamentPricePerKg,
  );
  const { averagePrinterPowerWatts, electricityPricePerKwh } = settings;

  // Never silently report electricity as free when wattage or tariff is missing.
  if (averagePrinterPowerWatts === null || electricityPricePerKwh === null) {
    return { filamentCost, electricityCost: null, totalCost: null };
  }

  assertNonNegativeFinite(averagePrinterPowerWatts, "averagePrinterPowerWatts");
  assertNonNegativeFinite(electricityPricePerKwh, "electricityPricePerKwh");

  const electricityCost = Math.round(
    (profile.printMinutes / 60) *
      (averagePrinterPowerWatts / 1_000) *
      electricityPricePerKwh,
  );

  return {
    filamentCost,
    electricityCost,
    totalCost: filamentCost + electricityCost,
  };
}

export function findProductionCostProfile(
  profiles: readonly ProductProductionCostProfile[],
  variants: readonly SelectedProductionVariant[],
): ProductProductionCostProfile | null {
  const selected = new Map(variants.map((item) => [item.groupId, item.optionId]));
  if (selected.size !== variants.length) return null;

  return (
    profiles.find((profile) => {
      const keys = Object.keys(profile.selections);
      return (
        keys.length === selected.size &&
        keys.every((groupId) => selected.get(groupId) === profile.selections[groupId])
      );
    }) ?? null
  );
}

// The caller supplies the actual counted orders, independent of order status.
// This intentionally does not use only the number of completed orders.
export function calculateOrderHandlingCost(
  orderCount: number,
  settings: ProductionCostSettings,
): OrderHandlingCost {
  if (!Number.isSafeInteger(orderCount) || orderCount < 0) {
    throw new RangeError("orderCount must be a non-negative integer.");
  }
  assertNonNegativeFinite(settings.packagingCostPerOrder, "packagingCostPerOrder");
  assertNonNegativeFinite(settings.shippingCostPerOrder, "shippingCostPerOrder");

  const packagingCost = Math.round(orderCount * settings.packagingCostPerOrder);
  const shippingCost = Math.round(orderCount * settings.shippingCostPerOrder);
  return {
    orderCount,
    packagingCost,
    shippingCost,
    totalCost: packagingCost + shippingCost,
  };
}
