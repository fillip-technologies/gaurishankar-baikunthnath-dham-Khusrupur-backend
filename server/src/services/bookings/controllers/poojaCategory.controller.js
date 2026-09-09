import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getAllPoojaCategoriesService } from "../services/poojaCategory.service.js";

// Categories are read-only from the outside: they are created/removed as a
// side-effect of adding/removing poojas, never through their own endpoints.
export const getAllPoojaCategories = asyncHandler(async (req, res) => {
  const categories = await getAllPoojaCategoriesService();

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(
        HTTP_STATUS.OK,
        categories,
        categories.length ? "All categories" : "No category is listed",
      ),
    );
});
