import { PoojaCategory } from "../models/poojaCategory.model.js";
import { Pooja } from "../models/pooja.model.js";

// Lists the IN-USE categories, newest first. This is the only category read
// surface — categories are never created or deleted directly: they are born when
// a pooja is added under a new name, and die when their last pooja is removed.
//
// Only categories that still have at least one pooja are returned. This keeps
// the "no empty categories" invariant true for the UI even if an empty category
// lingers in the DB (e.g. left over from older data): an unused category simply
// isn't listed, and is reused by name the next time a pooja needs it.
export const getAllPoojaCategoriesService = async () => {
  const usedIds = await Pooja.distinct("category", {
    category: { $ne: null },
  });
  return PoojaCategory.find({ _id: { $in: usedIds } })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Resolves a category name to its id, creating the category if it doesn't exist
 * yet (case-insensitive match, so "Havan" and "havan" are the same bucket).
 * Returns `{ id, wasCreated }` so the caller can roll the creation back if the
 * pooja it was meant for ultimately fails to save.
 */
export const findOrCreateCategoryByName = async (name) => {
  const existing = await PoojaCategory.findOne({
    name: new RegExp(`^${name}$`, "i"),
  }).lean();
  if (existing) return { id: existing._id, wasCreated: false };

  try {
    const created = await PoojaCategory.create({ name });
    return { id: created._id, wasCreated: true };
  } catch (err) {
    // Lost a race to a concurrent create with the same name — reuse theirs.
    if (err?.code === 11000) {
      const found = await PoojaCategory.findOne({
        name: new RegExp(`^${name}$`, "i"),
      }).lean();
      if (found) return { id: found._id, wasCreated: false };
    }
    throw err;
  }
};

// Deletes a category iff no pooja references it any more. Called after a pooja
// is removed or moved to a different category, so empty categories never linger.
export const deleteCategoryIfEmpty = async (categoryId) => {
  if (!categoryId) return;
  const remaining = await Pooja.countDocuments({ category: categoryId });
  if (remaining === 0) {
    await PoojaCategory.findByIdAndDelete(categoryId);
  }
};
