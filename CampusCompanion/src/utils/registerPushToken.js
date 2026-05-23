import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { post } from '../api/client';

/**
 * Request permission and register Expo push token with the backend.
 * Skips silently in Expo Go (SDK 53+ removed push notification support).
 */
export async function registerPushTokenWithBackend() {
  try {
    // Must be a real device
    if (!Device.isDevice) return null;

    // Expo Go no longer supports push notifications from SDK 53+
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('Push notifications skipped in Expo Go');
      return null;
    }

    // Lazy import — only loads expo-notifications in production builds
    const Notifications = await import('expo-notifications');

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList:   true,
        shouldPlaySound:  true,
        shouldSetBadge:   false,
      }),
    });

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:             'default',
        importance:       Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const pushToken = tokenData?.data;
    if (pushToken) {
      await post('/users/push-token', { pushToken });
    }
    return pushToken ?? null;

  } catch (err) {
    console.warn('Push token registration failed:', err?.message || err);
    return null;
  }
}