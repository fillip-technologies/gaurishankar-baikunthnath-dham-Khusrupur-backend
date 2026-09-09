import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiError from "../../../utils/ApiError.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../utils/cloudinary.js";
import { Pooja } from "../models/pooja.model.js";
import { PoojaCategory } from "../models/poojaCategory.model.js";
import {
  findOrCreateCategoryByName,
  deleteCategoryIfEmpty,
} from "./poojaCategory.service.js";

// Ensures the referenced category exists before it is attached to a pooja, so a
// booking never points at a category id that was mistyped or already deleted.
const assertCategoryExists = async (category) => {
  const found = await PoojaCategory.findById(category).lean();
  if (!found) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Category not found");
};

// Resolves the caller's category input to a category id. Either an existing
// `category` id is used (after checking it exists), or a `categoryName` is
// resolved to an existing/new category. Returns `{ id, wasCreated }` so a fresh
// category can be rolled back if the pooja it belongs to fails to save.
const resolveCategory = async ({ category, categoryName }) => {
  if (category) {
    await assertCategoryExists(category);
    return { id: category, wasCreated: false };
  }
  if (categoryName) {
    return findOrCreateCategoryByName(categoryName);
  }
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "A category is required");
};

export const addPoojaService = async ({
  poojaName,
  description,
  price,
  category,
  categoryName,
  file,
}) => {
  if (!file?.buffer)
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Pooja image is required");

  const existing = await Pooja.findOne({ poojaName }).lean();
  if (existing)
    throw new ApiError(HTTP_STATUS.CONFLICT, "Pooja already exists");

  // Resolve (and possibly create) the category only after the cheap duplicate
  // check, so a rejected pooja never leaves a stray category behind.
  const { id: categoryId, wasCreated } = await resolveCategory({
    category,
    categoryName,
  });

  let pooja;
  try {
    const upload = await uploadToCloudinary(file.buffer);
    if (!upload)
      throw new ApiError(
        HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        "Something went wrong",
      );

    pooja = await Pooja.create({
      poojaName,
      description,
      category: categoryId,
      imageUrl: upload.secure_url,
      publicId: upload.public_id,
      price,
    });
  } catch (err) {
    // The pooja never made it — undo a category we created just for it so the
    // "no empty categories" invariant holds.
    if (wasCreated) await deleteCategoryIfEmpty(categoryId);
    throw err;
  }

  if (!pooja)
    throw new ApiError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Problem creating pooja!!",
    );

  return pooja;
};

export const removePoojaService = async ({ id }) => {
  const requestedData = await Pooja.findById(id);
  if (!requestedData)
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Data not found");

  const categoryId = requestedData.category;

  await deleteFromCloudinary(requestedData.publicId);

  const data = await Pooja.findByIdAndDelete(id);

  if (!data) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Something went wrong");

  // Categories die with their poojas: if this was the last one in its category,
  // remove the now-empty category too.
  await deleteCategoryIfEmpty(categoryId);

  return data;
};

export const updatePoojaService = async ({
  id,
  poojaName,
  description,
  price,
  category,
  categoryName,
  file,
}) => {
  const pooja = await Pooja.findById(id);
  if (!pooja) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Pooja not found");

  if (poojaName !== undefined && poojaName !== pooja.poojaName) {
    const duplicate = await Pooja.findOne({
      poojaName,
      _id: { $ne: id },
    }).lean();
    if (duplicate)
      throw new ApiError(HTTP_STATUS.CONFLICT, "Pooja already exists");
  }

  // Resolve the new category (existing id or new name) only if the caller is
  // changing it. Track the previous one so we can retire it if it empties out.
  const oldCategoryId = pooja.category;
  let newCategory = null;
  if (category !== undefined || categoryName !== undefined) {
    newCategory = await resolveCategory({ category, categoryName });
  }

  if (poojaName !== undefined) pooja.poojaName = poojaName;
  if (description !== undefined) pooja.description = description;
  if (price !== undefined) pooja.price = price;
  if (newCategory) pooja.category = newCategory.id;

  // Replace the image only after a successful upload, then clean up the old
  // asset once the document is saved so a failed upload never orphans the record.
  const oldPublicId = pooja.publicId;
  let uploadedNewImage = false;
  try {
    if (file?.buffer) {
      const upload = await uploadToCloudinary(file.buffer);
      if (!upload)
        throw new ApiError(
          HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
          "Something went wrong",
        );
      pooja.imageUrl = upload.secure_url;
      pooja.publicId = upload.public_id;
      uploadedNewImage = true;
    }

    await pooja.save();
  } catch (err) {
    // The update failed — undo a category we created just for this move.
    if (newCategory?.wasCreated) await deleteCategoryIfEmpty(newCategory.id);
    throw err;
  }

  if (uploadedNewImage && oldPublicId) {
    await deleteFromCloudinary(oldPublicId);
  }

  // If the pooja moved categories, retire the old one when it's now empty.
  if (
    newCategory &&
    oldCategoryId &&
    String(oldCategoryId) !== String(newCategory.id)
  ) {
    await deleteCategoryIfEmpty(oldCategoryId);
  }

  return pooja;
};
