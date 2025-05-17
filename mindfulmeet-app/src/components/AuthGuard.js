// src/components/AuthGuard.js - Simplified for testing
import React from 'react';

export default function AuthGuard({ children }) {
  console.log('AuthGuard rendering without navigation guards');
  
  // All navigation logic is removed for now
  
  return <>{children}</>;
}