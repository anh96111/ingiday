export type ProductionCostSettings = {
  filamentPricePerKg: number;
  // Null means the shop has not yet configured a reliable electricity estimate.
  averagePrinterPowerWatts: number | null;
  electricityPricePerKwh: number | null;
  packagingCostPerOrder: number;
  shippingCostPerOrder: number;
};

// A profile represents the base product when selections is empty, or an exact
// selection of variant option IDs when the product has variant groups.
export type ProductProductionCostProfile = {
  selections: Record<string, string>;
  filamentGrams: number;
  printMinutes: number;
};

export type SelectedProductionVariant = {
  groupId: string;
  optionId: string;
};

export type UnitProductionCost = {
  filamentCost: number;
  electricityCost: number | null;
  totalCost: number | null;
};

export type OrderHandlingCost = {
  orderCount: number;
  packagingCost: number;
  shippingCost: number;
  totalCost: number;
};
