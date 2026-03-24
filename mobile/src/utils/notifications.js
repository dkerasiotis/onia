import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '../api/client';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('Notifications not supported in this environment');
}

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Ώνια',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '683deea8-76b9-4eb4-9f0d-6a90fa10e19c',
    });

    console.log('[Push] Got token:', tokenData.data);

    // Register token with backend
    await apiFetch('/api/register-push-token', {
      method: 'POST',
      body: { token: tokenData.data },
    });

    console.log('[Push] Token registered with backend');
    return tokenData.data;
  } catch (e) {
    console.log('Push notifications not available:', e.message);
    return null;
  }
}
