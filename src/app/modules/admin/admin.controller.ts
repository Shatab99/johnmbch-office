import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { adminService } from "./admin.service";

const createTier = catchAsync(async (req, res) => {
  const result = await adminService.createTier(req.body);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Tier created successfully",
  });
});

const getAllTiers = catchAsync(async (req, res) => {
  const result = await adminService.getAllTiers(req.query);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Tiers retrieved successfully",
  });
});

const deleteTier = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.deleteTier(id);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Tier deleted successfully",
  });
});

const editATier = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.editATier(id, req.body);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Tier updated successfully",
  });
}); 

export const adminController = {
  createTier,
  getAllTiers,
  deleteTier,
  editATier,
};
