import React from 'react';
import { useGame } from '../../engine/gameStore';
import { DollarSign, Coins, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, Shield } from 'lucide-react';

export const FinanceScreen: React.FC = () => {
  const { state } = useGame();

  let totalPrizeEarned = 0;
  let totalUpkeepSpent = 0;
  let totalFacilitySpent = 0;

  for (const tx of state.transactions) {
    if (tx.type === 'prize_money' && tx.amountHKD > 0) {
      totalPrizeEarned += tx.amountHKD;
    } else if (tx.type === 'stable_upkeep' || tx.type === 'facility_maint') {
      totalUpkeepSpent += Math.abs(tx.amountHKD);
    } else if (tx.type === 'facility_upgrade') {
      totalFacilitySpent += Math.abs(tx.amountHKD);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-bold uppercase">{state.playerStableName} 營運會計</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            馬房收支財務流水賬 (Financial Ledger)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            實時追蹤出賽名次獎金分賬、每周馬匹伙食養馬費、設施升級投資與配種費
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <Coins className="w-5 h-5 text-amber-400" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold">現有儲備總額</span>
            <span className="text-lg font-black text-amber-300">
              HK$ {state.playerFundsHKD.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>累積賽事獎金收入</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            +HK${totalPrizeEarned.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">包含馬主 70% 實收分賬</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>累積常規營運養馬費支出</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">
            -HK${totalUpkeepSpent.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">沙田馬房日常養馬與設施維護</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>累積設施營建投資</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400">
            HK${totalFacilitySpent.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">從化跑道、泳池、水療升級</div>
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-base font-black text-white">
          詳細交易流水記錄 ({state.transactions.length} 筆)
        </h3>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">年份 / 週數</th>
                <th className="py-3 px-3">交易類別</th>
                <th className="py-3 px-3">明細說明</th>
                <th className="py-3 px-3 text-right">金額 (HKD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {state.transactions.map((tx) => {
                const isPositive = tx.amountHKD >= 0;

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400">
                      {tx.year} 年 第 {tx.week} 周
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === 'prize_money' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        tx.type === 'horse_purchase' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        tx.type === 'facility_upgrade' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {tx.type === 'prize_money' ? '賽事獎金' :
                         tx.type === 'capital_injection' ? '開季注資' :
                         tx.type === 'objective_reward' ? '目標獎勵' :
                         tx.type === 'horse_purchase' ? '購入賽駒' :
                         tx.type === 'facility_upgrade' ? '設施擴建' :
                         tx.type === 'stud_fee' ? '配種費用' : '馬房營運'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-200 font-medium">
                      {tx.descriptionZh}
                    </td>

                    <td className={`py-2.5 px-3 text-right font-mono font-black text-sm ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? `+HK$${tx.amountHKD.toLocaleString()}` : `-HK$${Math.abs(tx.amountHKD).toLocaleString()}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
