import type {
  ProductImage,
  ProductVariantGroup,
  ProductVariantImageMapping,
} from '../types/product';

type SelectedOption = { groupId: string; optionId: string };

function activeGroups(groups: ProductVariantGroup[]) {
  return groups.filter((group) =>
    group.name.trim() && group.options.some((option) => option.label.trim()),
  );
}

export function sanitizeVariantImageMappings(
  mappings: ProductVariantImageMapping[] | undefined,
  groups: ProductVariantGroup[],
  images: ProductImage[],
): ProductVariantImageMapping[] {
  const validGroups = activeGroups(groups);
  if (validGroups.length < 2 || !mappings?.length) return [];
  const imageIds = new Set(images.map((image) => image.id));
  const used = new Set<string>();
  const result: ProductVariantImageMapping[] = [];
  for (const mapping of mappings) {
    if (!mapping || typeof mapping.imageId !== 'string' || !imageIds.has(mapping.imageId)) continue;
    if (!mapping.selections || typeof mapping.selections !== 'object' || Array.isArray(mapping.selections)) continue;
    if (Object.keys(mapping.selections).length !== validGroups.length) continue;
    if (!validGroups.every((group) =>
      group.options.some((option) => option.label.trim() && option.id === mapping.selections[group.id]),
    )) continue;
    const key = validGroups.map((group) => mapping.selections[group.id]).join('::');
    if (used.has(key)) continue;
    used.add(key);
    result.push({ selections: { ...mapping.selections }, imageId: mapping.imageId });
  }
  return result;
}

export function resolveVariantCombinationImageId(
  groups: ProductVariantGroup[] | undefined,
  mappings: ProductVariantImageMapping[] | undefined,
  images: ProductImage[] | undefined,
  selectedOptions: SelectedOption[],
): string | undefined {
  if (!groups?.length || !mappings?.length || !images?.length) return undefined;
  const validGroups = activeGroups(groups);
  if (validGroups.length < 2) return undefined;
  const selected = new Map(selectedOptions.map((option) => [option.groupId, option.optionId]));
  if (!validGroups.every((group) => selected.has(group.id))) return undefined;
  const imageIds = new Set(images.map((image) => image.id));
  return mappings.find((mapping) =>
    mapping && imageIds.has(mapping.imageId) &&
    mapping.selections && typeof mapping.selections === 'object' &&
    Object.keys(mapping.selections).length === validGroups.length &&
    validGroups.every((group) => mapping.selections[group.id] === selected.get(group.id)),
  )?.imageId;
}

export type VariantImageCombination = {
  selections: Record<string, string>;
  label: string;
};

export function buildVariantImageCombinations(
  groups: ProductVariantGroup[],
  limit = 120,
): { combinations: VariantImageCombination[]; exceeded: boolean } {
  const validGroups = activeGroups(groups);
  if (validGroups.length < 2) return { combinations: [], exceeded: false };
  let count = 1;
  for (const group of validGroups) {
    count *= group.options.filter((option) => option.label.trim()).length;
    if (count > limit) return { combinations: [], exceeded: true };
  }
  let combinations: VariantImageCombination[] = [{ selections: {}, label: '' }];
  for (const group of validGroups) {
    const next: VariantImageCombination[] = [];
    for (const combination of combinations) {
      for (const option of group.options.filter((item) => item.label.trim())) {
        next.push({
          selections: { ...combination.selections, [group.id]: option.id },
          label: [combination.label, group.name + ': ' + option.label].filter(Boolean).join(' / '),
        });
      }
    }
    combinations = next;
  }
  return { combinations, exceeded: false };
}
