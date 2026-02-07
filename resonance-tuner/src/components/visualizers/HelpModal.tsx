import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onLearnMore?: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, content, onLearnMore }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-blue-400 font-bold uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">&times;</button>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          {content}
        </p>
        
        {onLearnMore && (
          <button 
            onClick={() => {
              onClose();
              onLearnMore();
            }}
            className="w-full mt-4 text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest text-center"
          >
            Learn More About This &rarr;
          </button>
        )}

        <button 
          onClick={onClose}
          className="w-full mt-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
        >
          GOT IT
        </button>
      </div>
    </div>
  );
};
