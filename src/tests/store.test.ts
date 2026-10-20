import { describe, it, expect, vi } from 'vitest';

// gameStore 的 actions 操作 module-level globalState，只有 useState/useEffect 依賴 React。
// 在 node 環境以最小 stub 取代 React hooks，直接驗證 store 邏輯 (不渲染任何 component)。
vi.mock('react', () => ({
  useState: (init: unknown) => [init, () => {}],
  useEffect: () => {},
}));

import { useGame, createInitialState } from '../engine/gameStore';
import { INITIAL_HORSES } from '../data/hkHorses';
import type { Horse } from '../types/horse';

describe('Game Store Actions', () => {
  it('TEST 21: 拍賣購入必須真正加入馬房名單，而且不可重複購入', () => {
    const game = useGame();
    const fundsBefore = game.state.playerFundsHKD;
    const rosterBefore = game.state.horses.length;

    const candidate: Horse = {
      ...INITIAL_HORSES[0],
      id: 'market_test_aurora',
      nameZh: '測試拍賣駒',
      isPlayerOwned: false,
      ownerId: '',
      ownerName: '',
      raceHistory: [],
      trophies: [],
    };

    const res1 = game.buyHorse(candidate, 1000000);
    expect(res1.success).toBe(true);

    const after = useGame();
    const owned = after.state.horses.find(h => h.id === 'market_test_aurora');
    expect(owned).toBeDefined();
    expect(owned?.isPlayerOwned).toBe(true);
    expect(owned?.ownerId).toBe('player');
    expect(after.state.horses.length).toBe(rosterBefore + 1);
    expect(after.state.playerFundsHKD).toBe(fundsBefore - 1000000);

    // 重複購入同一匹馬必須被拒絕兼不扣錢
    const res2 = after.buyHorse(candidate, 1000000);
    expect(res2.success).toBe(false);
    const finalState = useGame();
    expect(finalState.state.playerFundsHKD).toBe(fundsBefore - 1000000);
    expect(finalState.state.horses.filter(h => h.id === 'market_test_aurora').length).toBe(1);
  });

  it('TEST 22: 初始狀態資金與馬房基線', () => {
    const initial = createInitialState();
    expect(initial.playerFundsHKD).toBe(25000000);
    expect(initial.horses.filter(h => h.isPlayerOwned).length).toBe(3);
  });
});

describe('Season Objectives Claim', () => {
  it('TEST 26: 目標完成後領獎入賬一次，重複領取被拒', () => {
    // TEST 21 已購入 1 匹 (現役 4 匹)，再購入 1 匹即達 obj_stable_5 的 5 匹
    const game = useGame();
    const candidate: Horse = {
      ...INITIAL_HORSES[1],
      id: 'market_test_second',
      nameZh: '測試第二駒',
      isPlayerOwned: false,
      ownerId: '',
      ownerName: '',
      raceHistory: [],
      trophies: [],
    };
    expect(game.buyHorse(candidate, 500000).success).toBe(true);

    const before = useGame();
    const fundsBefore = before.state.playerFundsHKD;
    const res = before.claimObjectiveReward('obj_stable_5');
    expect(res.success).toBe(true);

    const after = useGame();
    expect(after.state.playerFundsHKD).toBe(fundsBefore + 400000);
    expect(after.state.claimedObjectiveIds).toContain('obj_stable_5');

    const again = after.claimObjectiveReward('obj_stable_5');
    expect(again.success).toBe(false);
    expect(useGame().state.playerFundsHKD).toBe(fundsBefore + 400000);

    // 未完成目標唔俾領
    const incomplete = useGame().claimObjectiveReward('obj_g1_first');
    expect(incomplete.success).toBe(false);
  });
});
