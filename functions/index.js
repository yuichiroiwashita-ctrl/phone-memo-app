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

【制約】
- 冒頭の挨拶文（「〇〇様」「〇〇チームの皆様」「お疲れ様です」など）は一切入れない。本文の要点から始める
- **太字** などのMarkdown記法は使わない。強調したい項目名は【】で囲む（例：【相手先】）
- HTMLタグも使わない。プレーンテキストのみ
- 本文の冒頭に【法人名】【担当者名】【連絡先】【内容】を必ずこの順番で記載する
  - 【法人名】相手先の情報から会社・団体名部分を抽出する。判別できない場合は「不明」と記載する
  - 【担当者名】相手先の情報から氏名部分を抽出する。判別できない場合は「不明」と記載する
  - 【連絡先】電話番号を記載する。電話番号がない場合は「不明」と記載する
  - 【内容】メモ内容を整理して記載する。内容が空の場合のみ「記載なし」とする
- 上記4項目以外に補足すべき情報（担当者・宛先など）があれば、4項目の後に続けて記載する

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
