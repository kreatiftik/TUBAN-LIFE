import React from 'react';
import { MessageSquare, X } from 'lucide-react';
import { ActiveDialogue, LanguageMode } from '../game/types';
import { REGION_NAMES, t } from '../game/jawaData';

interface DialogueModalProps {
  dialogue: ActiveDialogue;
  language: LanguageMode;
  onSelectOption: (index: number) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  dialogue,
  language,
  onSelectOption,
  onClose,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-3 sm:bottom-4 short:bottom-2 z-30 flex justify-center px-3 sm:px-4 pointer-events-none">
      <div className="w-full max-w-2xl max-h-[78dvh] short:max-h-[88dvh] overflow-y-auto bg-[#121614]/96 border border-[#d99b26]/45 rounded-2xl p-4 sm:p-5 short:p-3 shadow-2xl pointer-events-auto">
        <div className="flex items-start justify-between gap-3 pb-3 short:pb-2 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#d99b26]/20 border border-[#d99b26]/40 flex items-center justify-center text-[#f5b942] shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-[#f5f2eb] leading-tight truncate">
                {dialogue.npcName}
              </h3>
              <div className="text-xs text-[#b8b1a3] flex flex-wrap items-center gap-1.5 mt-0.5">
                <span>{t(dialogue.npcRole, language)}</span>
                <span aria-hidden="true">·</span>
                <span>{t(REGION_NAMES[dialogue.region], language)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#a8a195] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="py-3 sm:py-4 short:py-2 text-sm sm:text-base short:text-xs text-[#f5f2eb] leading-relaxed">
          “{t(dialogue.text, language)}”
        </p>

        <div className="flex flex-col gap-2 short:gap-1.5 pt-1">
          {dialogue.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectOption(idx)}
              className="w-full min-h-[44px] short:min-h-[38px] text-left px-3.5 sm:px-4 py-2.5 short:py-1.5 rounded-xl bg-[#1c231f] hover:bg-[#d99b26] hover:text-[#111311] border border-white/10 text-xs sm:text-sm font-medium text-[#f5f2eb] transition-colors cursor-pointer flex items-center justify-between gap-2"
            >
              <span>{t(opt.label, language)}</span>
              <span className="text-xs opacity-70 font-mono-tabular shrink-0">[{idx + 1}]</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
