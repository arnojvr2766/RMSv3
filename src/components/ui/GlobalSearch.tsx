import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, DoorClosed, FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface SearchResult {
  id: string;
  type: 'renter' | 'room' | 'lease';
  title: string;
  subtitle: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface GlobalSearchProps {
  onClose: () => void;
}

const ICONS = { renter: Users, room: DoorClosed, lease: FileText };
const TYPE_COLORS = { renter: 'text-blue-400', room: 'text-green-400', lease: 'text-yellow-400' };
const TYPE_LABELS = { renter: 'Renter', room: 'Room', lease: 'Lease' };

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose }) => {
  const [query_text, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allData, setAllData] = useState<{ renters: any[]; rooms: any[]; leases: any[] } | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Pre-load data once
  useEffect(() => {
    const load = async () => {
      try {
        const [rentersSnap, roomsSnap, leasesSnap] = await Promise.all([
          getDocs(query(collection(db, 'renters'), limit(500))),
          getDocs(query(collection(db, 'rooms'), limit(500))),
          getDocs(query(collection(db, 'leases'), limit(200))),
        ]);
        setAllData({
          renters: rentersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          rooms: roomsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          leases: leasesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        });
      } catch (e) {
        console.error('Search load error', e);
      }
    };
    load();
  }, []);

  // Search whenever query changes
  useEffect(() => {
    if (!allData || query_text.trim().length < 2) {
      setResults([]);
      return;
    }
    const q = query_text.toLowerCase().trim();
    const found: SearchResult[] = [];

    // Search renters
    allData.renters.forEach((r: any) => {
      const name = `${r.personalInfo?.firstName || ''} ${r.personalInfo?.lastName || ''}`.trim().toLowerCase();
      const phone = (r.personalInfo?.phone || '').toLowerCase();
      const email = (r.personalInfo?.email || '').toLowerCase();
      const idNum = (r.personalInfo?.idNumber || '').toLowerCase();
      if (name.includes(q) || phone.includes(q) || email.includes(q) || idNum.includes(q)) {
        found.push({
          id: r.id,
          type: 'renter',
          title: `${r.personalInfo?.firstName || ''} ${r.personalInfo?.lastName || ''}`.trim(),
          subtitle: r.personalInfo?.phone || r.personalInfo?.email || '',
          path: `/renters`,
          icon: Users,
        });
      }
    });

    // Search rooms
    allData.rooms.forEach((r: any) => {
      const num = (r.roomNumber || '').toLowerCase();
      const type = (r.type || '').toLowerCase();
      if (num.includes(q) || type.includes(q)) {
        found.push({
          id: r.id,
          type: 'room',
          title: `Room ${r.roomNumber}`,
          subtitle: `${r.type} · R${(r.monthlyRent || 0).toLocaleString()}/mo · ${r.status}`,
          path: `/rooms`,
          icon: DoorClosed,
        });
      }
    });

    // Search leases (by lease ID prefix)
    allData.leases.forEach((l: any) => {
      const idLower = (l.id || '').toLowerCase();
      if (idLower.includes(q) || (l.status || '').includes(q)) {
        found.push({
          id: l.id,
          type: 'lease',
          title: `Lease ${l.id.slice(0, 8)}…`,
          subtitle: `${l.status} · R${(l.terms?.monthlyRent || 0).toLocaleString()}/mo`,
          path: `/leases`,
          icon: FileText,
        });
      }
    });

    setResults(found.slice(0, 12));
  }, [query_text, allData]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-start justify-center pt-16 sm:pt-24 px-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query_text}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tenants, rooms, leases…"
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-base"
          />
          {query_text && (
            <button onClick={() => setQuery('')} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs px-2 py-1 bg-gray-700 rounded">
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query_text.trim().length < 2 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No results for "{query_text}"
            </div>
          ) : (
            <div className="py-2">
              {results.map(result => {
                const Icon = result.icon;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/60 transition-colors text-left"
                  >
                    <div className={`flex-shrink-0 ${TYPE_COLORS[result.type]}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{result.title}</p>
                      <p className="text-gray-400 text-xs truncate">{result.subtitle}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[result.type]} bg-gray-700`}>
                      {TYPE_LABELS[result.type]}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
            {results.length} result{results.length !== 1 ? 's' : ''} — click to navigate
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
