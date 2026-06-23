
import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  requirePhrase?: string;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = false,
  requirePhrase,
  isLoading = false
}) => {
  const [phraseInput, setPhraseInput] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requirePhrase && phraseInput.toUpperCase() !== requirePhrase.toUpperCase()) {
      return;
    }
    onConfirm();
  };

  const phraseMatches = !requirePhrase || phraseInput.toUpperCase() === requirePhrase.toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-sky-100 text-sky-600'}`}>
                {isDanger ? <AlertTriangle size={24} /> : <AlertTriangle size={24} />}
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
            <p className="text-slate-600 leading-relaxed mb-8">{message}</p>

            {requirePhrase && (
              <div className="mb-8">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  To confirm, type "{requirePhrase}" below:
                </label>
                <input 
                  type="text"
                  autoFocus
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  placeholder={requirePhrase}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold uppercase tracking-wider text-slate-700"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button 
                onClick={handleConfirm}
                disabled={!phraseMatches || isLoading}
                className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDanger 
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200' 
                    : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-200'
                }`}
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmDialog;
