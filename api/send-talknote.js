import OpenAI from 'openai';
import nodemailer from 'nodemailer';

const TALKNOTE_EMAIL = 'g-21923-715880@mail.talknote.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { memo } = req.body;
  if (!memo || !memo.who || !memo.content) {
    return res.status(400).json({ error: 'メモデータが不正です' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `以下の電話応対メモを元に、Talknoteへ投稿するメール本文を作成してください。
ビジネスで使いやすいよう読みやすく整理し、要点が伝わる内容にしてください。
箇条書きや改行を適切に活用してください。

【電話応対メモ】
相手先: ${memo.who}
電話番号: ${memo.phone || 'なし'}
担当者: ${memo.from || 'なし'}
宛先: ${memo.to || 'なし'}
内容: ${memo.content}
受信者: ${memo.receiver || ''}

メール本文のみ出力してください（件名は不要です）。`,
        },
      ],
    });

    const formattedBody = aiResponse.choices[0].message.content;
    const subject = `【電話メモ】${memo.who}${memo.to ? ` → ${memo.to}` : ''}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Memo Cloud" <${process.env.MAIL_USER}>`,
      to: TALKNOTE_EMAIL,
      subject,
      text: formattedBody,
    });

    return res.status(200).json({ success: true, subject });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '送信に失敗しました' });
  }
}
