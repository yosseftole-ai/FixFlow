/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FaultList } from './components/FaultList';
import { FaultForm } from './components/FaultForm';
import { Plus, LogOut, Wrench } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { Fault } from './types';

function Dashboard() {
  const { user, login, logout, loading } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [faultsLoading, setFaultsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'faults'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const faultsData: Fault[] = [];
        snapshot.forEach((doc) => {
          faultsData.push({ id: doc.id, ...doc.data() } as Fault);
        });
        
        // Sort in memory to put open ones first
        faultsData.sort((a, b) => {
          if (a.status === 'open' && b.status === 'fixed') return -1;
          if (a.status === 'fixed' && b.status === 'open') return 1;
          return 0; // maintain descending createdAt sort for same status
        });
        
        setFaults(faultsData);
        setFaultsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'faults');
        setFaultsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const openCount = faults.filter(f => f.status === 'open').length;
    
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fixedThisWeek = faults.filter(f => 
      f.status === 'fixed' && f.updatedAt && f.updatedAt.toDate() > oneWeekAgo
    ).length;

    let totalDiff = 0;
    let fixedCount = 0;
    faults.forEach(f => {
      if (f.status === 'fixed' && f.createdAt && f.updatedAt) {
         const diffMs = f.updatedAt.toDate().getTime() - f.createdAt.toDate().getTime();
         if (diffMs >= 0) {
           totalDiff += diffMs;
           fixedCount++;
         }
      }
    });

    const avgHours = fixedCount > 0 ? (totalDiff / fixedCount / (1000 * 60 * 60)) : 0;

    return {
      openCount,
      fixedThisWeek,
      avgHours: avgHours > 0 ? avgHours.toFixed(1) : '0'
    };
  }, [faults]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
         <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 text-center text-slate-900">
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center max-w-md w-full">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-sm">
            י
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">מערכת דיווחי תקלות - ישיבת צביה אלישיב</h1>
          <p className="text-sm text-slate-500 mb-8 max-w-[280px]">
            התחברו כדי לדווח על תקלות בבית הספר או לנהל את מצבן.
          </p>
          <button 
            onClick={login}
            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-indigo-500/50"
          >
            התחברות באמצעות Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="h-screen w-full flex flex-col bg-slate-50 font-sans overflow-hidden text-slate-900">
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            י
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">מערכת דיווחי תקלות - ישיבת צביה אלישיב</h1>
            <p className="text-xs text-slate-500 font-medium">מרכז שליטה ובקרה לתחזוקה שוטפת</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-sm text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">דיווח על תקלה חדשה</span>
            <span className="sm:hidden">חדש</span>
          </button>
          <div className="w-px h-8 bg-slate-200 mx-1 md:mx-2"></div>
          <div className="flex items-center gap-2 text-left">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold truncate max-w-[120px]">שלום, {user.displayName?.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400">משתמש</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
              title="התנתקות"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Stats */}
        <aside className="w-64 bg-white border-l border-slate-200 p-6 flex-col gap-6 shrink-0 lg:flex hidden">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">סטטיסטיקת המערכת</h3>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-700 font-bold">תקלות פעילות</p>
                <p className="text-2xl font-black text-amber-800">{stats.openCount}</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs text-emerald-700 font-bold">טופלו השבוע</p>
                <p className="text-2xl font-black text-emerald-800">{stats.fixedThisWeek}</p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-xs text-indigo-700 font-bold">זמן טיפול ממוצע</p>
                <p className="text-2xl font-black text-indigo-800">
                  {stats.avgHours} {stats.avgHours === '1.0' ? "שעה" : "שע'"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Dashboard */}
        <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 overflow-y-auto">
          <FaultList faults={faults} loading={faultsLoading} />
        </main>
      </div>

      {isFormOpen && <FaultForm onClose={() => setIsFormOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
