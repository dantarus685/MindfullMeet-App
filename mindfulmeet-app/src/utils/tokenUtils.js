// src/utils/tokenUtils.js - Create this utility file
export const decodeJWTToken = (token) => {
  try {
    if (!token) return null;
    
    // Split the token and get the payload
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode from base64
    const decoded = atob(padded);
    
    // Parse as JSON
    const userData = JSON.parse(decoded);
    
    console.log('🔓 Decoded JWT payload:', userData);
    return userData;
  } catch (error) {
    console.error('❌ Error decoding JWT token:', error);
    return null;
  }
};

export const getUserFromToken = (token) => {
  const decoded = decodeJWTToken(token);
  
  // JWT tokens usually store user data in different fields
  // Check common patterns
  if (decoded) {
    // Try different possible user data locations in JWT
    return decoded.user || decoded.data || decoded.payload || {
      id: decoded.id || decoded.userId || decoded.sub,
      name: decoded.name || decoded.username,
      email: decoded.email,
      role: decoded.role
    };
  }
  
  return null;
};