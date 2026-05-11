export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, message } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const safeMessage = typeof message === 'string' ? message.slice(0, 4000) : '';

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📨 新しいお問い合わせ' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*From*\n${email}` },
          { type: 'mrkdwn', text: `*受信日時*\n${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: safeMessage ? `*メッセージ*\n${safeMessage}` : '_メッセージ本文なし_',
        },
      },
    ],
    text: `新しいお問い合わせ: ${email}`,
  };

  try {
    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!slackRes.ok) {
      const errText = await slackRes.text();
      console.error('Slack webhook failed:', slackRes.status, errText);
      return res.status(502).json({ error: 'Failed to deliver message' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Slack webhook error:', err);
    return res.status(500).json({ error: 'Failed to deliver message' });
  }
}
