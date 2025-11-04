const crypto = require("crypto");

const tokenUtils = {
  // Generate random token
  generateToken: () => {
    return crypto.randomBytes(32).toString("hex");
  },

  // Generate token expiration (default 1 hour)
  generateExpiry: (hours = 1) => {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  },

  // Check if token is expired
  isTokenExpired: (expiryDate) => {
    return new Date() > new Date(expiryDate);
  },
};

module.exports = tokenUtils;
