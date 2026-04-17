# 電話応対メモ（Memo Cloud）

電話応対の内容をクラウドに記録・共有できる社内向けWebアプリです。

## 公開URL

https://phone-memo-app-xi.vercel.app

> Googleアカウントでログインして利用します。プレビュー環境（localhost）ではGoogle認証が動作しません。

## 主な機能

- **メモ記録** — 相手先・電話番号・担当者・宛先・内容をフォームから入力して保存
- **クリップボードコピー** — 保存と同時に定型テキストをクリップボードへコピー
- **履歴一覧** — 自分が受けた電話メモをリアルタイムで一覧表示
- **Talknote通知** — ボタン1つでメモ内容をAI整形してTalknoteグループへ投稿
- **Google認証** — Googleアカウントでログイン／ユーザーごとにデータを分離管理

## 技術スタック

| 区分 | 技術 |
|---|---|
| フロントエンド | React 19 + Vite + Tailwind CSS |
| 認証 | Firebase Authentication（Google）|
| DB | Cloud Firestore |
| バックエンド | Vercel Functions（`api/send-talknote.js`）|
| AI整形 | OpenAI API（gpt-4o-mini）|
| メール送信 | Nodemailer + Gmail SMTP → Talknote メールゲートウェイ |
| ホスティング | Vercel |

## Talknote通知の仕組み

1. フロントエンドが `/api/send-talknote` にメモデータをPOST
2. Vercel FunctionがOpenAI APIでメモをビジネス文に整形
3. Gmail SMTPでTalknoteのメールアドレス宛に送信
4. Talknoteのメールゲートウェイがグループに投稿

## 環境変数（Vercel）

| 変数名 | 説明 |
|---|---|
| `OPENAI_API_KEY` | OpenAI APIキー |
| `MAIL_USER` | 送信元Gmailアドレス |
| `MAIL_PASS` | Gmailのアプリパスワード |

## ローカル開発

```bash
npm install
npm run dev
```

> Google認証はlocalhostでは動作しません。Firebaseコンソールで承認済みドメインに追加するか、Vercelのプレビューデプロイで確認してください。
