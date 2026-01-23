import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function usePushNotifications() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
      isLoading: false,
    }));

    // Register service worker
    if (isSupported) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('Service Worker registered:', registration.scope);
      
      // Check if already subscribed
      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
      }));
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission, isLoading: false }));

      if (permission === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      } else if (permission === 'denied') {
        toast.error('Push notifications were blocked. You can enable them in browser settings.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [state.isSupported]);

  const subscribe = useCallback(async () => {
    if (!state.isSupported || state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // For demo purposes, we'll use a simple subscription without VAPID keys
      // In production, you'd want to use web-push with VAPID keys
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // In production, add: applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('Push subscription:', subscription);
      setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
      toast.success('Push notifications subscribed!');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      // Silently handle - browser may not support push manager
      return false;
    }
  }, [state.isSupported, state.permission, requestPermission]);

  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      setState(prev => ({ ...prev, isSubscribed: false, isLoading: false }));
      toast.success('Push notifications unsubscribed');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast.error('Failed to unsubscribe from push notifications');
      return false;
    }
  }, []);

  // Send a local test notification
  const sendTestNotification = useCallback(() => {
    if (state.permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    new Notification('GateKpr Test', {
      body: 'Push notifications are working!',
      icon: '/favicon.png',
      tag: 'test-notification',
    });
  }, [state.permission]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}
