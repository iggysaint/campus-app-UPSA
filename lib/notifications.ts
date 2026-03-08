import { auth, db } from '@/lib/firebase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async (): Promise<string | null> => {
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
    console.log('Notification permission not granted');
    return null;
  }

  // Android channel setup - kept for future Android support
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '8febecd5-f7ad-4567-885a-30191f2480e9'
  })).data;

  // Save token to Firestore - stores Platform.OS for future Android support
  if (auth.currentUser) {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      push_token: token,
      platform: Platform.OS,
    });
  }

  return token;
};

export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: object
): Promise<void> => {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data: data || {},
      sound: 'default',
    }),
  });
};

export const sendNotificationToAll = async (
  title: string,
  body: string,
  data?: object
): Promise<void> => {
  const usersSnapshot = await getDocs(
    query(collection(db, 'users'), where('push_token', '!=', null))
  );

  const tokens: string[] = [];
  usersSnapshot.forEach(doc => {
    const token = doc.data().push_token;
    if (token) tokens.push(token);
  });

  if (tokens.length === 0) return;

  // Send in batches of 100 (Expo limit)
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        batch.map(token => ({
          to: token,
          title,
          body,
          data: data || {},
          sound: 'default',
        }))
      ),
    });
  }
};
