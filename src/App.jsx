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
  Hash,
  Send,
  ChevronRight,
  Hash as HashIcon
} from 'lucide-react';

// --- Firebase Configuration ---
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

export default function App() {
  const [user, setUser] = useState(null);
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    who: '',
    phone: '',
    from: '',
    to: '',
    content: ''
  });
  const [notification, setNotification] = useState(null);

  // 認証状態の監視
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // データのリアルタイム購読
  useEffect(() => {
    if (!user) {
      setMemos([]);
      return;
    }

    const memosRef = collection(db, 'artifacts', appId, 'users', user.uid, 'memos');
    const q = query(memosRef, orderBy('createdAt', 'desc'));

    const unsubscribeMemos = onSnapshot(q, (snapshot) => {
      const memoData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMemos(memoData);
    }, (error) => {
      console.error(error);
      showNotification('データの読み込みに失敗しました', 'error');
    });

    return () => unsubscribeMemos();
  }, [user]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      showNotification('ログインに失敗しました。本番環境で試してください。', 'error');
    }
  };

  const logout = () => signOut(auth);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatMemoText = () => {
    return `【電話応対メモ】
相手先: ${formData.who}
電話番号: ${formData.phone || 'なし'}
担当者: ${formData.from}
宛先: ${formData.to}
内容: ${formData.content}
受信者: ${user.displayName}`;
  };

  const saveMemo = async (shouldCopy = false) => {
    if (!formData.who || !formData.content) {
      showNotification('相手先と内容は必須です', 'error');
      return;
    }

    try {
      if (shouldCopy) {
        const text = formatMemoText();
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }

      const memosRef = collection(db, 'artifacts', appId, 'users', user.uid, 'memos');
      await addDoc(memosRef, {
        ...formData,
        receiver: user.displayName,
        createdAt: serverTimestamp()
      });

      setFormData({ who: '', phone: '', from: '', to: '', content: '' });
      showNotification(shouldCopy ? 'コピーして保存しました' : '保存しました');
    } catch (error) {
      showNotification('保存に失敗しました。権限設定を確認してください。', 'error');
    }
  };

  const deleteMemo = async (id) => {
    try {
      const memoDoc = doc(db, 'artifacts', appId, 'users', user.uid, 'memos', id);
      await deleteDoc(memoDoc);
      showNotification('削除しました');
    } catch (error) {
      showNotification('削除に失敗しました', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 text-center border border-indigo-50">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
            <Phone className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">電話応対メモ</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            クラウドでどこからでもアクセス。<br />
            チームの連携をよりスマートに。
          </p>
          <button 
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-700 py-4 px-6 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all font-bold shadow-sm active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleアカウントでログイン
          </button>
          <p className="mt-6 text-[10px] text-slate-400">
            ※プレビュー環境ではログインできません。<br/>
            実際のデプロイ先URLでご利用ください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100 group-hover:rotate-12 transition-transform">
              <Phone className="text-white" size={20} />
            </div>
            <span className="font-black text-xl tracking-tighter text-slate-800 uppercase">Memo Cloud</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
              {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full shadow-sm" />}
              <span className="text-sm font-bold text-slate-700">{user.displayName}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="ログアウト"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 p-6 md:p-8 border border-white sticky top-28">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-amber-100 p-2 rounded-lg">
                  <Plus size={20} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800">新規作成</h2>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-[0.2em] ml-1">相手先（社名・氏名）</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      name="who"
                      value={formData.who}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 font-bold text-sm"
                      placeholder="株式会社〇〇 山田様"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-[0.2em] ml-1">電話番号</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input 
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 font-bold text-sm"
                      placeholder="090-0000-0000"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-[0.2em] ml-1">担当者</label>
                    <input 
                      name="from"
                      value={formData.from}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 font-bold text-sm"
                      placeholder="営業部"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-[0.2em] ml-1">宛先</label>
                    <input 
                      name="to"
                      value={formData.to}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-300 font-bold text-sm"
                      placeholder="田中係長"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-[0.2em] ml-1">メモ内容</label>
                  <textarea 
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 focus:outline-none transition-all resize-none placeholder:text-slate-300 font-bold text-sm leading-relaxed"
                    placeholder="折り返しのお電話をお願いします。"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={() => saveMemo(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    <Clipboard size={18} />
                    コピーして保存
                  </button>
                  <button 
                    onClick={() => saveMemo(false)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-4 rounded-2xl hover:bg-black transition-all font-bold active:scale-95"
                  >
                    <Save size={18} />
                    保存のみ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <Clock size={20} className="text-indigo-600" />
                履歴
                <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-tighter">
                  {memos.length} Records
                </span>
              </h2>
            </div>

            <div className="space-y-4">
              {memos.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] py-16 text-center">
                  <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hash size={24} className="text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold text-sm">記録されたメモはありません</p>
                </div>
              ) : (
                memos.map(memo => (
                  <div key={memo.id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 p-5 hover:shadow-md hover:border-indigo-100 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-50 p-2.5 rounded-xl group-hover:bg-indigo-50 transition-colors">
                          <User size={18} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 leading-tight">{memo.who}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                              <Clock size={10} />
                              {memo.createdAt?.toDate().toLocaleString('ja-JP')}
                            </p>
                            {memo.phone && (
                              <p className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 uppercase tracking-tighter">
                                <Phone size={10} />
                                {memo.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteMemo(memo.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="削除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="bg-slate-50/50 rounded-xl p-4 text-slate-700 font-bold text-sm leading-relaxed whitespace-pre-wrap border border-slate-50">
                      {memo.content}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {memo.from && (
                        <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
                          <Send size={10} />
                          担当: {memo.from}
                        </div>
                      )}
                      {memo.to && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
                          <ChevronRight size={10} />
                          宛先: {memo.to}
                        </div>
                      )}
                      <div className="ml-auto text-[9px] font-black text-slate-300 uppercase tracking-widest">
                        By {memo.receiver}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 px-8 py-4 rounded-2xl shadow-2xl text-white transition-all transform animate-in fade-in slide-in-from-bottom-5 duration-300 z-[100] ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-slate-900'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} className="text-emerald-400" />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  );
}