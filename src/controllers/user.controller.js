import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, username } = req.body;
  console.log("email", email);

  if (
    [fullName, username, password, email].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
});

export { registerUser };
