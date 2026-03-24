// Expo Push Notification helper
// Uses Expo's push API — no Firebase Admin SDK needed

async function sendPushNotifications(db, title, body, excludeUserId = null) {
  try {
    const users = db.prepare('SELECT id, expo_push_token FROM users WHERE expo_push_token IS NOT NULL').all();
    const tokens = users
      .filter(u => u.expo_push_token && u.expo_push_token.startsWith('ExponentPushToken'))
      .filter(u => u.id !== excludeUserId);

    console.log(`[Push] Sending to ${tokens.length} user(s): "${title}"`);

    if (!tokens.length) {
      console.log('[Push] No tokens to send to');
      return;
    }

    const messages = tokens.map(u => ({
      to: u.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { type: 'list_update' }
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();
    console.log('[Push] Expo response:', JSON.stringify(result));
  } catch (err) {
    console.error('[Push] Error:', err.message);
  }
}

module.exports = { sendPushNotifications };
