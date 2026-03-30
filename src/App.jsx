import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
import { 
  Phone, User, Building2, MessageSquare, UserMinus, Trash2, Copy, 
  CheckCircle2, Clock, Plus, Save, LogOut, Loader2, LogIn
} from 'lucide-react';

// ==========================================
// あなたの Firebase 設定（適用済み）
// ==========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 初期化
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memos, setMemos] = useState([]);
  const [formData, setFormData] = useState({
    company: '', contactName: '', targetName: '', phoneNumber: '', content: '',
  });
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // データのリアルタイム取得
  useEffect(() => {
    if (!user) {
      setMemos([]);
      return;
    }

    // ユーザーごとに独立したパスに保存
    const memosCol = collection(db, 'users', user.uid, 'memos');
    
    const unsubscribe = onSnapshot(memosCol, (snapshot) => {
      const memoList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 作成日時順にソート
      memoList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setMemos(memoList);
    }, (error) => {
      console.error("Firestore sync error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const logout = () => signOut(auth);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveMemo = async (status) => {
    if (!user || (!formData.company && !formData.contactName)) return;
    setIsSaving(true);
    try {
      const memosCol = collection(db, 'users', user.uid, 'memos');
      await addDoc(memosCol, {
        ...formData,
        status,
        createdAt: Date.now(),
        timestamp: new Date().toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      });
      // フォームをリセット
      setFormData({ company: '', contactName: '', targetName: '', phoneNumber: '', content: '' });
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    const text = `【電話連絡】\n宛先：${formData.targetName || '担当者'} 様\n会社名：${formData.company || '不明'}\n担当者：${formData.contactName || '不明'} 様\n電話番号：${formData.phoneNumber || '不明'}\n用件：${formData.content || '特になし'}\n\n（不在だったため記録しました）`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        saveMemo('message_sent');
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      saveMemo('message_sent');
    }
  };

  const deleteMemo = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'memos', id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-indigo-600" size={40} />
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full text-center border border-slate-200">
          <div className="bg-indigo-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
            <Phone size={40} />
          </div>
          <h1 className="text-2xl font-black mb-2 text-slate-800">電話応対メモ</h1>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">
            クラウド保存でどこからでも確認。<br/>Googleアカウントでログインしてください。
          </p>
          <button 
            onClick={login} 
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 py-3 rounded-2xl hover:border-indigo-500 hover:bg-slate-50 transition-all font-bold text-slate-700 active:scale-95 shadow-sm"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5" alt="Google"/>
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Phone size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tight">電話応対メモ</h1>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-1 pr-3 rounded-full border border-slate-100">
            <img src={user.photoURL} className="w-8 h-8 rounded-full border border-white shadow-sm" alt="Avatar"/>
            <span className="text-sm font-bold hidden sm:block">{user.displayName}</span>
            <button 
              onClick={logout} 
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="ログアウト"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">会社名</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      name="company" 
                      value={formData.company} 
                      onChange={handleChange} 
                      placeholder="株式会社サンプル" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">担当者名</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      name="contactName" 
                      value={formData.contactName} 
                      onChange={handleChange} 
                      placeholder="山田 太郎 様" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">誰宛か</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      name="targetName" 
                      value={formData.targetName} 
                      onChange={handleChange} 
                      placeholder="営業部 佐藤" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">電話番号</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      name="phoneNumber" 
                      value={formData.phoneNumber} 
                      onChange={handleChange} 
                      placeholder="090-0000-0000" 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">用件</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 text-slate-300" size={18} />
                  <textarea 
                    name="content" 
                    value={formData.content} 
                    onChange={handleChange} 
                    placeholder="折り返し希望、資料の件など" 
                    rows="4" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => saveMemo('saved')} 
                disabled={isSaving || (!formData.company && !formData.contactName)} 
                className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>}
                保存して記録
              </button>
              <button 
                onClick={copyToClipboard} 
                disabled={isSaving || (!formData.company && !formData.contactName)} 
                className="flex-1 bg-amber-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all active:scale-95 shadow-lg shadow-amber-100 disabled:opacity-50"
              >
                {copied ? <CheckCircle2 size={20} /> : <Copy size={20}/>}
                伝言コピー & 保存
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4 flex flex-col h-full overflow-hidden">
            <h2 className="font-black text-slate-400 text-sm px-2 flex items-center justify-between tracking-widest uppercase">
              <span className="flex items-center gap-2"><Clock size={16}/> Recent History</span>
              <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px]">{memos.length}</span>
            </h2>
            <div className="space-y-4 overflow-y-auto max-h-[650px] pr-2 custom-scrollbar">
              {memos.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-sm italic">
                  履歴はありません
                </div>
              ) : (
                memos.map(memo => (
                  <div key={memo.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-indigo-100 transition-all">
                    <button 
                      onClick={() => deleteMemo(memo.id)} 
                      className="absolute top-4 right-4 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                    >
                      <Trash2 size={16}/>
                    </button>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border tracking-tighter ${
                        memo.status === 'saved' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {memo.status === 'saved' ? 'SAVED' : 'MESSAGE SENT'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{memo.timestamp}</span>
                    </div>
                    <div className="font-black text-slate-900 text-base leading-tight">
                      {memo.company || '不明'}
                    </div>
                    <div className="text-sm font-bold text-slate-600">
                      {memo.contactName ? `${memo.contactName} 様` : '担当者不明'}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-50 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>TO: <span className="text-slate-700">{memo.targetName || '---'}</span></span>
                        {memo.phoneNumber && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[9px]">{memo.phoneNumber}</span>}
                      </div>
                      <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border-l-4 border-slate-200 italic leading-relaxed">
                        {memo.content || '用件の記録なし'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {copied && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-500 z-50">
          <div className="bg-amber-500 p-2 rounded-full ring-4 ring-amber-500/20">
            <CheckCircle2 size={24} className="text-white" />
          </div>
          <div>
            <div className="font-black text-sm">コピーしました！</div>
            <div className="text-xs text-slate-400 font-medium">チャットに貼り付けて報告しましょう</div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;