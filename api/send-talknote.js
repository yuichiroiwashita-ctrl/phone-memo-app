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

【制約】
- 冒頭の挨拶文（「〇〇様」「〇〇チームの皆様」「お疲れ様です」など）は一切入れない。本文の要点から始める
- **太字** などのMarkdown記法は使わない。強調したい項目名は【】で囲む（例：【相手先】）
- HTMLタグも使わない。プレーンテキストのみ
- 本文の冒頭に【法人名】【担当者名】【連絡先】【内容】を必ずこの順番で記載する
  - 【法人名】相手先の情報から会社・団体名部分を抽出し、末尾に敬称「御中」を付ける（例：株式会社〇〇御中）。判別できない場合は「不明」と記載する
  - 【担当者名】相手先の情報から氏名部分を抽出し、末尾に敬称「様」を付ける（例：山田太郎様）。判別できない場合は「不明」と記載する
  - 【連絡先】電話番号を記載する。電話番号がない場合は「不明」と記載する
  - 【内容】メモ内容を丁寧な言葉遣い（敬語）で整理して記載する。内容が空の場合のみ「記載なし」とする
- 上記4項目以外に補足すべき情報（担当者・宛先など）があれば、4項目の後に続けて記載する
  - 【宛先】は自社の従業員（電話を取り次ぐ相手）なので、氏名のみの場合は敬称「さん」を付ける（「〇〇係長」のように役職名が含まれる場合はそのまま記載し、「さん」は付けない）
- 全体を通して丁寧で敬意のある文体（敬語）を用いる

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
