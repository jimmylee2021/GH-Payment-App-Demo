import React, { useState, useEffect } from 'react';
import { 
  StickyNote, 
  AlertTriangle, 
  Check, 
  Save, 
  Trash2, 
  ShieldAlert, 
  Sparkles,
  Info
} from 'lucide-react';
import { updatePatientNotes } from '../services/store';
import { playAudio } from '../services/sound';

interface PatientNotesCardProps {
  cardNo: string;
  patientName: string;
  notes?: string;
  onNotesSaved?: (newNotes: string) => void;
  compact?: boolean;
}

export const PatientNotesCard: React.FC<PatientNotesCardProps> = ({
  cardNo,
  patientName,
  notes = '',
  onNotesSaved,
  compact = false,
}) => {
  const [memoText, setMemoText] = useState(notes || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync state if patient card changes
  useEffect(() => {
    setMemoText(notes || '');
    setSavedSuccess(false);
  }, [cardNo, notes]);

  const hasAllergyKeywords = (text: string) => {
    const lower = text.toLowerCase();
    return (
      lower.includes('allergic') ||
      lower.includes('allergy') ||
      lower.includes('penicillin') ||
      lower.includes('asthm') ||
      lower.includes('reaction') ||
      lower.includes('caution') ||
      lower.includes('diabet') ||
      lower.includes('warning') ||
      lower.includes('danger') ||
      lower.includes('g6pd') ||
      lower.includes('alert')
    );
  };

  const isAlert = Boolean(memoText && hasAllergyKeywords(memoText));

  const handleSave = () => {
    const trimmed = memoText.trim();
    updatePatientNotes(cardNo, trimmed);
    setSavedSuccess(true);
    setIsEditing(false);
    playAudio.successChime();

    if (onNotesSaved) {
      onNotesSaved(trimmed);
    }

    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const handleInsertSnippet = (snippet: string) => {
    setMemoText((prev) => {
      if (!prev.trim()) return snippet;
      if (prev.includes(snippet)) return prev;
      return `${prev.trim()}. ${snippet}`;
    });
    setIsEditing(true);
    playAudio.tapSound();
  };

  const handleClear = () => {
    setMemoText('');
    updatePatientNotes(cardNo, '');
    setSavedSuccess(true);
    setIsEditing(false);
    playAudio.tapSound();
    if (onNotesSaved) {
      onNotesSaved('');
    }
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const quickSnippets = [
    { label: '⚠️ Allergic to penicillin', snippet: 'Allergic to penicillin' },
    { label: '⚠️ Asthmatic / Inhaler', snippet: 'Asthmatic (inhaler user)' },
    { label: '🩸 Diabetic (Monitor sugar)', snippet: 'Diabetic (requires blood sugar monitor)' },
    { label: '🫀 Hypertensive', snippet: 'Hypertensive patient' },
    { label: '⚠️ G6PD Deficiency (No Septrin)', snippet: 'G6PD deficient - avoid sulfonamides & Septrin' },
    { label: '✅ Nil Known Allergies (NKA)', snippet: 'Nil known drug allergies (NKA)' },
  ];

  return (
    <div
      className={`rounded-2xl transition-all shadow-sm ${
        isAlert
          ? 'bg-amber-50/90 border-2 border-amber-300 ring-2 ring-amber-200/50'
          : 'bg-white border-2 border-slate-200'
      } ${compact ? 'p-4' : 'p-5'}`}
    >
      {/* Header with Title and Status Badges */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {isAlert ? (
            <span className="p-2 bg-amber-200 text-amber-900 rounded-xl animate-pulse">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </span>
          ) : (
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <StickyNote className="w-5 h-5 text-emerald-700" />
            </span>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                Patient Notes & Medical Memo
              </h3>
              {isAlert ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                  <ShieldAlert className="w-3 h-3" /> Critical Alert
                </span>
              ) : memoText ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  <Info className="w-3 h-3" /> Active Note
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Empty
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Persisted with Card <span className="font-mono-code font-bold text-slate-700">#{cardNo}</span> ({patientName}) · Shared across Doctors, Records & Dispensary
            </p>
          </div>
        </div>

        {/* Success toast indicator */}
        {savedSuccess && (
          <div className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm animate-bounce">
            <Check className="w-3.5 h-3.5" />
            <span>Saved!</span>
          </div>
        )}
      </div>

      {/* Prominent Memo Display View when not explicitly focusing edit */}
      {memoText && !isEditing ? (
        <div className="space-y-3">
          <div
            className={`p-4 rounded-xl border font-medium text-sm leading-relaxed ${
              isAlert
                ? 'bg-amber-100/70 border-amber-300 text-amber-950 font-semibold'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isAlert && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
              <div className="flex-1 whitespace-pre-wrap">{memoText}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-[11px] text-slate-500 italic">
              Tap &ldquo;Edit Note&rdquo; to modify or append alerts.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <StickyNote className="w-3.5 h-3.5 text-emerald-400" />
                Edit Note
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit or Empty Form Area */
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {memoText ? 'Update Patient Memo / Allergy Warning' : 'Add Patient Memo or Allergy Warning'}
            </label>
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="e.g. Allergic to penicillin. Asthmatic. Diabetic on Metformin. Fall risk..."
              rows={3}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none ${
                isAlert
                  ? 'bg-amber-50/50 border-amber-300 focus:border-amber-600 text-amber-950 placeholder:text-amber-800/40'
                  : 'bg-slate-50 border-slate-300 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400 focus:bg-white'
              }`}
            />
          </div>

          {/* Quick clinical shortcut chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Quick Medical Presets:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickSnippets.map((item) => (
                <button
                  key={item.snippet}
                  type="button"
                  onClick={() => handleInsertSnippet(item.snippet)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 text-slate-700 hover:text-emerald-900 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
            <div>
              {notes ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg flex items-center justify-center sm:justify-start gap-1 transition-colors w-full sm:w-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Note
                </button>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setMemoText(notes || '');
                    setIsEditing(false);
                  }}
                  className="flex-1 sm:flex-initial px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg text-center"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="truncate">Save Note to Card #{cardNo}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
