const ErrorHander = require("../utils/errorhander");
const catchAsyncErrors = require("./catchAsyncErrors");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  // Try to get token from multiple sources
  let token;

  // Check cookies first
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Check Authorization header (Bearer token)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token found
  if (!token) {
    return next(new ErrorHandler("Please login to access this resource", 401));
  }

  try {
    // Verify token
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decodedData.id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Check if user is active
    if (user.status !== "active") {
      return next(new ErrorHandler("User account is deactivated", 403));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      if (error.name === "TokenExpiredError") {
        return next(
          new ErrorHandler("Token has expired. Please login again", 401)
        );
      }
      if (error.name === "JsonWebTokenError") {
        return next(new ErrorHandler("Invalid token. Please login again", 401));
      }
    }

    // Handle other errors
    return next(new ErrorHandler("Authentication failed", 401));
  }
});

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHander(
          `Role: ${req.user.role} is not allowed to access this resouce `,
          403
        )
      );
    }

    next();
  };
};
