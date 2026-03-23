// Expo Push Notification helper
// Uses Expo's push API — no Firebase Admin SDK needed

async function sendPushNotifications(db, title, body, excludeUserId = null) {
  try {
    const users = db.prepare('SELECT expo_push_token FROM users WHERE expo_push_token IS NOT NULL').all();
    const tokens = users
      .map(u => u.expo_push_token)
      .filter(t => t && t.startsWith('ExponentPushToken'));

    if (!tokens.length) return;

    // Exclude the user who triggered the action
    const filteredTokens = excludeUserId
      ? tokens.filter(t => {
          const user = db.prepare('SELECT expo_push_token FROM users WHERE id = ?').get(excludeUserId);
          return t !== user?.expo_push_token;
        })
      : tokens;

    if (!filteredTokens.length) return;

    const messages = filteredTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { type: 'list_update' }
    }));

    // Batch send via Expo push API (max 100 per request)
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chunk)
      }).catch(err => console.error('Push notification error:', err.message));
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

module.exports = { sendPushNotifications };
