/**
 * Jotai DevTools - Custom compact implementation using store
 */

import React, { useState, useEffect } from 'react';
import { Atom } from 'jotai';
import { store } from '../../store/store';
import * as atoms from '../../store/atoms';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AtomUpdate {
  name: string;
  value: unknown;
  timestamp: number;
  id: string; // unique id for each update
}

const JotaiDevTools = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [updateHistory, setUpdateHistory] = useState<AtomUpdate[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Initialize history with current atom values
    const initHistory = () => {
      const updates: AtomUpdate[] = [];
      Object.entries(atoms).forEach(([name, atom]) => {
        if (!atom || typeof atom !== 'object' || !('read' in atom)) {
          return;
        }

        try {
          const value = store.get(atom as Atom<unknown>);
          updates.push({
            name,
            value,
            timestamp: Date.now(),
            id: `${name}-${Date.now()}`
          });
        } catch (e) {
          console.log(`Failed to read atom ${name}:`, e);
        }
      });
      setUpdateHistory(updates.reverse()); // Most recent first
    };

    initHistory();

    // Subscribe to all atom changes and add to history
    const unsubscribers: Array<() => void> = [];

    Object.entries(atoms).forEach(([name, atom]) => {
      if (!atom || typeof atom !== 'object' || !('read' in atom)) {
        return;
      }

      try {
        const unsub = store.sub(atom as Atom<unknown>, () => {
          const value = store.get(atom as Atom<unknown>);
          const timestamp = Date.now();
          const newUpdate: AtomUpdate = {
            name,
            value,
            timestamp,
            id: `${name}-${timestamp}`
          };

          // Remove old entry with same name and add new update to the top
          setUpdateHistory(prev => {
            const filtered = prev.filter(item => item.name !== name);
            return [newUpdate, ...filtered];
          });
        });
        unsubscribers.push(unsub);
      } catch (e) {
        // Skip atoms that can't be subscribed
      }
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [isOpen]);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg shadow-lg text-xs font-semibold transition-colors z-50"
      >
        Jotai DevTools
      </button>
    );
  }

  return (
    <div className="fixed top-0 right-0 bg-slate-900/95 border-l border-slate-700 shadow-2xl w-96 h-screen overflow-hidden flex flex-col z-50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-purple-400">Jotai DevTools</span>
          <span className="text-[10px] text-slate-500">({updateHistory.length} updates)</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Update History - Most Recent First */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {updateHistory.length === 0 ? (
          <div className="text-xs text-slate-500 text-center py-4">No updates yet</div>
        ) : (
          <div className="space-y-1">
            {updateHistory.map((update, index) => (
              <AtomUpdateItem key={update.id} update={update} isFirst={index === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AtomUpdateItem: React.FC<{ update: AtomUpdate; isFirst: boolean }> = ({ update, isFirst }) => {
  const { name, value, timestamp } = update;

  const valuePreview = React.useMemo(() => {
    try {
      if (value === null) return 'null';
      if (value === undefined) return 'undefined';
      if (typeof value === 'string') return value.length > 50 ? `"${value.substring(0, 50)}..."` : `"${value}"`;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (typeof value === 'function') return '[Function]';
      if (Array.isArray(value)) return `Array(${value.length})`;
      if (value instanceof Set) return `Set(${value.size})`;
      if (value instanceof Map) return `Map(${value.size})`;
      if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';
        if (keys.length <= 2) {
          return `{${keys.join(', ')}}`;
        }
        return `{${keys.length} keys}`;
      }
      return String(value);
    } catch {
      return '[Error]';
    }
  }, [value]);

  const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });

  return (
    <div className={`flex items-center justify-between gap-2 px-2 py-1 rounded ${isFirst ? 'bg-purple-900/30 border border-purple-500/50' : 'bg-slate-800/50 border border-slate-700/50'}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="text-[9px] text-slate-500 font-mono flex-shrink-0">
          {timeStr}
        </div>
        <div className="text-[10px] font-semibold text-purple-300 flex-shrink-0">
          {name}
        </div>
      </div>
      <div className="text-[10px] text-slate-400 font-mono truncate flex-shrink-0 max-w-[150px]">
        {valuePreview}
      </div>
    </div>
  );
};

export default JotaiDevTools;
