import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import {
  Phone,
  User,
  Clipboard,
  Save,
  LogOut,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Bell,
  ArrowRight,
  PhoneIncoming,
  FileText,
  CalendarSearch,
  X,
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBy-vvBCt7QknE9qOQO91B6dc_MCXMB0qU",
  authDomain: "phone-memo-app-31241.firebaseapp.com",
  projectId: "phone-memo-app-31241",
  storageBucket: "phone-memo-app-31241.firebasestorage.app",
  messagingSenderId: "264561665745",
  appId: "1:264561665745:web:79699e5d9170ab916147f0",
  measurementId: "G-2LKJTSKZS3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'phone-memo-app';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-semibold text-slate-600 mb-2">
        {label}
        {required && <span className="text-rose-500 text-xs">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-800 placeholder:text-slate-300 text-sm';

export default function App() {
  const [user, setUser] = useState(null);
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ who: '', phone: '', from: '', to: '', content: '' });
  const [notification, setNotification] = useState(null);
  const [sendingMemoId, setSendingMemoId] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) { setMemos([]); return; }
    const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'memos');
    const q = query(ref, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setMemos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => showNotification('データの読み込みに失敗しました', 'error'));
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      showNotification('ログインに失敗しました。本番環境で試してください。', 'error');
    }
  };

  const logout = () => signOut(auth);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const copyTextToClipboard = (text) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const formatMemoText = (data) =>
    `【電話応対メモ】\n相手先: ${data.who}\n電話番号: ${data.phone || 'なし'}\n担当者: ${data.from || 'なし'}\n宛先: ${data.to || 'なし'}\n内容: ${data.content}\n受信者: ${data.receiver || user.displayName}`;

  const saveMemo = async (shouldCopy = false) => {
    if (!formData.who || !formData.content) {
      showNotification('相手先と内容は必須です', 'error');
      return;
    }
    try {
      if (shouldCopy) copyTextToClipboard(formatMemoText(formData));
      const ref = collection(db, 'artifacts', appId, 'users', user.uid, 'memos');
      await addDoc(ref, { ...formData, receiver: user.displayName, createdAt: serverTimestamp() });
      setFormData({ who: '', phone: '', from: '', to: '', content: '' });
      showNotification(shouldCopy ? 'コピーして保存しました' : '保存しました');
    } catch {
      showNotification('保存に失敗しました', 'error');
    }
  };

  const handleCopyMemo = (memo) => {
    copyTextToClipboard(formatMemoText(memo));
    showNotification('クリップボードにコピーしました');
  };

  const handleTalknoteNotify = async (memo) => {
    if (sendingMemoId) return;
    setSendingMemoId(memo.id);
    try {
      const res = await fetch('/api/send-talknote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      });
      if (!res.ok) throw new Error();
      showNotification('Talknoteに通知しました');
    } catch {
      showNotification('Talknote通知に失敗しました', 'error');
    } finally {
      setSendingMemoId(null);
    }
  };

  const deleteMemo = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'memos', id));
      showNotification('削除しました');
    } catch {
      showNotification('削除に失敗しました', 'error');
    }
  };

  const filteredMemos = filterDate
    ? memos.filter(m => {
        if (!m.createdAt) return false;
        const d = m.createdAt.toDate();
        return (
          d.getFullYear() === parseInt(filterDate.slice(0, 4)) &&
          d.getMonth() + 1 === parseInt(filterDate.slice(5, 7)) &&
          d.getDate() === parseInt(filterDate.slice(8, 10))
        );
      })
    : memos;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-400 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-white px-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-indigo-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-200">
                <PhoneIncoming className="text-white w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">電話応対メモ</h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                チームの電話記録をクラウドで一元管理。<br />
                どこからでもリアルタイムに確認できます。
              </p>
            </div>
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 py-3.5 px-5 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all font-semibold text-sm shadow-sm active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Googleアカウントでログイン
            </button>
            <p className="mt-5 text-[11px] text-center text-slate-400 leading-relaxed">
              ※ localhost ではGoogle認証が動作しません。<br />
              デプロイ先URLからご利用ください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-sm shadow-indigo-200">
              <PhoneIncoming className="text-white" size={18} />
            </div>
            <span className="font-bold text-lg text-slate-800">電話応対メモ</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
              )}
              <span className="text-sm font-medium text-slate-700">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all font-medium"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Form */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-24">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2.5">
                <div className="bg-indigo-50 p-1.5 rounded-lg">
                  <Plus size={16} className="text-indigo-600" />
                </div>
                <h2 className="font-bold text-slate-800">新規メモ作成</h2>
              </div>

              <div className="px-6 py-5 space-y-4">
                <Field label="相手先（社名・氏名）" required>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <input
                      name="who"
                      value={formData.who}
                      onChange={handleInputChange}
                      className={`${inputClass} pl-10`}
                      placeholder="株式会社〇〇 山田様"
                    />
                  </div>
                </Field>

                <Field label="電話番号">
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`${inputClass} pl-10`}
                      placeholder="090-0000-0000"
                    />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="担当者">
                    <input
                      name="from"
                      value={formData.from}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="営業部"
                    />
                  </Field>
                  <Field label="宛先">
                    <input
                      name="to"
                      value={formData.to}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="田中係長"
                    />
                  </Field>
                </div>

                <Field label="メモ内容" required>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows="4"
                    className={`${inputClass} resize-none leading-relaxed`}
                    placeholder="折り返しのお電話をお願いします。"
                  />
                </Field>

                <div className="pt-1 space-y-2.5">
                  <button
                    onClick={() => saveMemo(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all font-semibold text-sm shadow-sm shadow-indigo-200"
                  >
                    <Clipboard size={16} />
                    コピーして保存
                  </button>
                  <button
                    onClick={() => saveMemo(false)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all font-semibold text-sm"
                  >
                    <Save size={16} />
                    保存のみ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Clock size={18} className="text-indigo-600" />
                <h2 className="font-bold text-slate-800">受電履歴</h2>
                <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                  {filteredMemos.length}{filterDate ? `/${memos.length}` : ''} 件
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700"
                  />
                </div>
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    title="フィルターを解除"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {filteredMemos.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl py-16 text-center">
                  <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FileText size={22} className="text-slate-300" />
                  </div>
                  {filterDate ? (
                    <>
                      <p className="text-slate-400 font-medium text-sm">この日付のメモはありません</p>
                      <p className="text-slate-300 text-xs mt-1">{new Date(filterDate).toLocaleDateString('ja-JP')} の記録が見つかりませんでした</p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400 font-medium text-sm">メモはまだありません</p>
                      <p className="text-slate-300 text-xs mt-1">左のフォームから記録を追加してください</p>
                    </>
                  )}
                </div>
              ) : (
                filteredMemos.map(memo => (
                  <MemoCard
                    key={memo.id}
                    memo={memo}
                    onCopy={handleCopyMemo}
                    onNotify={handleTalknoteNotify}
                    onDelete={deleteMemo}
                    isSending={sendingMemoId === memo.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl text-white z-[100] text-sm font-semibold ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-slate-800'
        }`}>
          {notification.type === 'error'
            ? <AlertCircle size={17} className="shrink-0" />
            : <CheckCircle2 size={17} className="text-emerald-400 shrink-0" />
          }
          {notification.message}
        </div>
      )}
    </div>
  );
}

function MemoCard({ memo, onCopy, onNotify, onDelete, isSending }) {
  const time = memo.createdAt?.toDate().toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="bg-indigo-50 p-2 rounded-xl shrink-0 mt-0.5">
            <PhoneIncoming size={15} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{memo.who}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {time && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={11} />
                  {time}
                </span>
              )}
              {memo.phone && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone size={11} />
                  {memo.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onNotify(memo)}
            disabled={isSending}
            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Talknoteに通知"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Bell size={15} />
            )}
          </button>
          <button
            onClick={() => onCopy(memo)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="コピー"
          >
            <Copy size={15} />
          </button>
          <button
            onClick={() => onDelete(memo.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="削除"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-4">
        <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">
          {memo.content}
        </div>
      </div>

      {/* Footer tags */}
      {(memo.from || memo.to || memo.receiver) && (
        <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
          {memo.from && (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium">
              担当: {memo.from}
            </span>
          )}
          {memo.to && (
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-medium">
              <ArrowRight size={11} />
              {memo.to} 宛
            </span>
          )}
          {memo.receiver && (
            <span className="ml-auto text-[11px] text-slate-400">
              受信: {memo.receiver}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
