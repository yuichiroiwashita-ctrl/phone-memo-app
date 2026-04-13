const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const OpenAI = require('openai');
const { Resend } = require('resend');

const openaiKey = defineSecret('OPENAI_API_KEY');
const resendKey = defineSecret('RESEND_API_KEY');

const TALKNOTE_EMAIL = 'g-21923-715880@mail.talknote.com';

exports.sendTalknoteNotification = onCall(
  { secrets: [openaiKey, resendKey], region: 'asia-northeast1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'ログインが必要です');
    }

    const { memo } = request.data;
    if (!memo || !memo.who || !memo.content) {
      throw new HttpsError('invalid-argument', 'メモデータが不正です');
    }

    // OpenAI API でメール本文を整形
    const openai = new OpenAI({ apiKey: openaiKey.value() });

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

    // Resend でメール送信
    const resend = new Resend(resendKey.value());

    await resend.emails.send({
      from: 'Memo Cloud <onboarding@resend.dev>',
      to: TALKNOTE_EMAIL,
      subject,
      text: formattedBody,
    });

    return { success: true, subject };
  }
);
