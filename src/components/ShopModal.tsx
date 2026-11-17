import React from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { LanguageMode } from '../game/types';
import { SHOPS, t } from '../game/jawaData';

interface ShopModalProps {
  shopId: string;
  money: number;
  language: LanguageMode;
  onBuy: (shopId: string, itemId: string) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  shopId,
  money,
  language,
  onBuy,
  onClose,
}) => {
  const shop = SHOPS[shopId];
  if (!shop) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 short:p-2 bg-black/55">
      <div className="w-full max-w-xl max-h-[88dvh] short:max-h-[94dvh] flex flex-col bg-[#121614] border border-[#d99b26]/40 rounded-2xl p-4 sm:p-6 short:p-3.5 shadow-2xl space-y-3 sm:space-y-4 short:space-y-2.5">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#d99b26]/20 border border-[#d99b26]/40 flex items-center justify-center text-[#f5b942] shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#f5f2eb] truncate">
                {t(shop.title, language)}
              </h3>
              <div className="text-xs text-[#b8b1a3] flex flex-wrap items-center gap-2 mt-0.5">
                <span>{shop.keeper}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-[#f5b942] font-semibold">
                  Rp {money.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup toko"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#a8a195] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#d6d0c4] italic shrink-0">
          “{t(shop.greeting, language)}”
        </p>

        <div className="space-y-2.5 overflow-y-auto pr-1">
          {shop.items.map((item) => {
            const canAfford = money >= item.price;
            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-[#1a201c] border border-white/10"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-[#f5f2eb]">
                    {t(item.name, language)}
                  </div>
                  <p className="text-xs text-[#a8a195] mt-0.5 leading-snug">
                    {t(item.description, language)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => onBuy(shopId, item.id)}
                  className={`w-full sm:w-auto shrink-0 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold font-mono-tabular transition-colors whitespace-nowrap ${
                    canAfford
                      ? 'bg-[#d99b26] hover:bg-[#e5aa38] text-[#111311] cursor-pointer'
                      : 'bg-white/5 text-white/35 cursor-not-allowed'
                  }`}
                >
                  Rp {item.price.toLocaleString('id-ID')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
