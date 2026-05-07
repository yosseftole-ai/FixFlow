import { useState } from 'react';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Fault, FaultStatus } from '../types';
import { Trash2, Wrench } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface FaultListProps {
  faults: Fault[];
  loading: boolean;
}

export function FaultList({ faults, loading }: FaultListProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'fixed'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleToggleStatus = async (fault: Fault) => {
    try {
      const newStatus: FaultStatus = fault.status === 'open' ? 'fixed' : 'open';
      const faultRef = doc(db, 'faults', fault.id);
      await updateDoc(faultRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `faults/${fault.id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }
    
    try {
      const faultRef = doc(db, 'faults', id);
      await deleteDoc(faultRef);
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `faults/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 flex-1">
        <div className="w-8 h-8 flex items-center justify-center border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const filteredFaults = faults.filter(f => filter === 'all' || f.status === filter);

  return (
    <>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2">
          <button 
            onClick={() => setFilter('all')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'all' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            הכל
          </button>
          <button 
            onClick={() => setFilter('open')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'open' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            פתוחות
          </button>
          <button 
            onClick={() => setFilter('fixed')}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filter === 'fixed' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            טופלו
          </button>
        </div>
        <div className="hidden sm:flex items-center text-sm text-slate-400 font-medium">
          <span className="ml-2">סינון לפי:</span>
          <select className="bg-transparent font-bold text-slate-600 outline-none">
            <option>הכי חדשים</option>
          </select>
        </div>
      </div>

      {filteredFaults.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="text-slate-400" size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">אין תקלות כאן</h3>
          <p className="text-slate-500 text-sm">לא נמצאו דיווחים התואמים לסינון או שעוד לא דווחו.</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFaults.map((fault) => (
            <div 
              key={fault.id} 
              className={`bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col hover:shadow-md transition-all h-fit ${fault.status === 'fixed' ? 'opacity-80' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${fault.status === 'fixed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {fault.status === 'fixed' ? 'טופל' : 'פעיל'}
                </span>
                <span className="text-xs text-slate-400 font-medium italic">
                  {fault.createdAt ? formatDistanceToNow(fault.createdAt.toDate(), { addSuffix: true, locale: he }) : ''}
                </span>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1 line-clamp-2">
                {fault.title}
              </h4>
              <p className="text-sm text-slate-500 mb-4 whitespace-pre-wrap line-clamp-3">
                {fault.description}
              </p>
              {fault.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
                  <img src={fault.imageUrl} alt="תמונה של התקלה" className="w-full h-32 object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-6 mt-auto pt-2 flex-wrap">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {fault.reporterName.charAt(0)}
                </div>
                <span className="text-xs text-slate-600 font-semibold truncate max-w-[120px]">
                  דווח: {fault.reporterName}
                </span>
                <span className="mx-1 text-slate-300">•</span>
                <span className="text-xs text-slate-400 italic truncate max-w-[100px]">
                  מיקום: {fault.location}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleStatus(fault)}
                  className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${
                    fault.status === 'open' 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {fault.status === 'open' ? 'סמן כבוצע' : 'החזר לטיפול'}
                </button>
                <button
                  onClick={() => handleDelete(fault.id)}
                  className={`px-3 py-2 rounded-xl transition-colors border ${
                    deletingId === fault.id 
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' 
                    : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 border-slate-100'
                  }`}
                  title={deletingId === fault.id ? "לחצו שוב לאישור מחיקה" : "מחיקה"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
