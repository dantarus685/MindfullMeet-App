// src/hooks/useProfile.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getUserProfile,
  getUserEvents,
  selectProfile,
  selectUserEvents,
  selectProfileLoading,
  selectProfileErrors,
  selectIsProfileInitialized
} from '../src/redux/profileSlice';

export const useProfile = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const profile = useSelector(selectProfile);
  const userEvents = useSelector(selectUserEvents);
  const loading = useSelector(selectProfileLoading);
  const errors = useSelector(selectProfileErrors);
  const isInitialized = useSelector(selectIsProfileInitialized);
  
  // Auth state
  const { isAuthenticated, user: authUser } = useSelector(state => state.auth);
  
  // Initialize profile data
  const initializeProfile = async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('🔄 Initializing profile data...');
      await dispatch(getUserProfile()).unwrap();
      
      // Load events in background
      dispatch(getUserEvents());
      
      console.log('✅ Profile initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize profile:', error);
      throw error;
    }
  };
  
  // Refresh profile data
  const refreshProfile = async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('🔄 Refreshing profile data...');
      await Promise.all([
        dispatch(getUserProfile()).unwrap(),
        dispatch(getUserEvents()).unwrap()
      ]);
      console.log('✅ Profile refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh profile:', error);
      throw error;
    }
  };
  
  // Auto-initialize when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized && !profile && !loading.profile) {
      initializeProfile().catch(error => {
        console.error('Auto-initialization failed:', error);
        // Don't throw here as it would cause component to crash
      });
    }
  }, [isAuthenticated, isInitialized, profile, loading.profile]);
  
  // Calculate stats
  const stats = {
    eventsCount: userEvents?.length || 0,
    groupsCount: profile?.groupsCount || 0,
    postsCount: profile?.postsCount || 0
  };
  
  return {
    // Data - fallback to auth user if profile not loaded
    profile: profile || authUser || null,
    userEvents,
    
    // States
    isLoading: loading.profile && !profile,
    isRefreshing: loading.profile && !!profile,
    isUpdating: loading.update,
    isInitialized,
    
    // Errors
    profileError: errors.profile,
    updateError: errors.update,
    eventsError: errors.events,
    
    // Actions
    initializeProfile,
    refreshProfile,
    
    // Computed values
    hasProfile: !!profile,
    isAuthenticated,
    stats
  };
};

export default useProfile;