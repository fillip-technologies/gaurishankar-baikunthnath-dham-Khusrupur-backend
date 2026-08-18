import { HTTP_STATUS } from "../../../constants/httpStatus.constants.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getAddressService,
  updateAddressService,
} from "../services/address.service.js";

export const updateAddress = asyncHandler(async (req, res) => {
  const { houseName, locality, district, state, zipcode, country } =
    req.validated.body;

  const response = await updateAddressService({
    decoded: req.user,
    houseName,
    locality,
    district,
    state,
    zipcode,
    country,
  });
  
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, response, "Address updated succesfully"),
    );
});

export const getAddress = asyncHandler(async (req, res) => {
  const address = await getAddressService({ decoded: req.user });
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, address, "Address fetched succesfully"),
    );
});
