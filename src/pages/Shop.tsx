import { useState } from 'react';
import { useStore } from '../store';
import { ACCESSORIES } from '../logic/game';
import { COIN_PER_BADGE, COIN_PER_PHASE, SHOP_ITEMS, SLOT_LABEL, STARTER_PET, type ShopItem, type ShopSlot } from '../logic/shop';
import { Hero, PetSprite, PixelIcon, Scene } from '../components/pixel';
import { Btn, Dialog, Panel } from '../components/ui';
import type { Settings } from '../types';

const SLOTS: ShopSlot[] = ['hat', 'outfit', 'scene', 'pet'];
const SLOT_KEY: Record<ShopSlot, keyof Settings> = { hat: 'accessory', outfit: 'outfit', scene: 'scene', pet: 'pet' };

interface Entry {
  id: string;
  slot: ShopSlot;
  name: string;
  desc: string;
  price: number;
  /** 等級獎勵（不用買） */
  level?: number;
  free?: boolean;
}

export function Coin({ n }: { n: number }) {
  return (
    <span className="coin">
      <PixelIcon name="coin" size={14} color="#8a5a1f" accent="#f2c94c" />
      <span className="pf">{n}</span>
    </span>
  );
}

export function Shop() {
  const { settings, updateSettings, shop, coins, buyItem, level, toast, sfx, petHatched } = useStore();
  const [slot, setSlot] = useState<ShopSlot>('hat');
  const [trial, setTrial] = useState<Partial<Record<ShopSlot, string>>>({});
  const [buying, setBuying] = useState<Entry | null>(null);

  const entries: Entry[] = [
    ...(slot === 'hat'
      ? ACCESSORIES.filter((a) => a.id !== 'none').map((a) => ({ id: a.id, slot: 'hat' as const, name: a.name, desc: `Lv.${a.level} 升級獎勵`, price: 0, level: a.level }))
      : []),
    ...(slot === 'pet' ? [{ id: STARTER_PET, slot: 'pet' as const, name: '小雞', desc: '第一次運動就會孵出來', price: 0, free: true }] : []),
    ...SHOP_ITEMS.filter((i) => i.slot === slot).map((i: ShopItem) => ({ ...i })),
  ];

  const look = {
    accessory: trial.hat ?? settings.accessory,
    outfit: trial.outfit ?? settings.outfit,
    scene: trial.scene ?? settings.scene,
    pet: trial.pet ?? settings.pet,
  };
  const trying = Object.keys(trial).length > 0;
  const setTrialSlot = (s: ShopSlot, id: string | undefined) =>
    setTrial((t) => {
      const n = { ...t };
      if (id) n[s] = id;
      else delete n[s];
      return n;
    });

  const owns = (e: Entry) => (e.level ? level.level >= e.level : e.free ? petHatched : !!shop.owned[e.id]);
  const equipped = (e: Entry) => settings[SLOT_KEY[e.slot]] === e.id;

  const equip = async (e: Entry, on: boolean) => {
    const off = e.slot === 'pet' ? STARTER_PET : 'none';
    await updateSettings({ [SLOT_KEY[e.slot]]: on ? e.id : off } as Partial<Settings>);
    setTrialSlot(e.slot, undefined);
    toast(on ? `換上「${e.name}」` : `脫下「${e.name}」`, 'info');
  };

  return (
    <div className="page-section">
      <Panel tone="yellow" className="shop-head">
        <div className="shop-top">
          <div>
            <span className="stat-label">我的金幣</span>
            <div className="coin-big">
              <PixelIcon name="coin" size={26} color="#8a5a1f" accent="#f2c94c" />
              <span className="pf">{Math.max(0, coins)}</span>
            </div>
          </div>
          <div className={'lcd-mini' + (look.scene === 'night' ? ' is-night' : '')}>
            <Scene id={look.scene} />
            <Hero palette={settings.palette} accessory={look.accessory} outfit={look.outfit} mood="happy" size={64} />
            {petHatched && <PetSprite kind={look.pet} size={30} mood="happy" className="mini-pet" />}
          </div>
        </div>
        <p className="small muted">
          運動賺金幣：每筆紀錄可得 EXP 的一半，每個徽章 +{COIN_PER_BADGE}，完成一個階段 +{COIN_PER_PHASE}。
        </p>
        {coins < 0 && <p className="small">之前的紀錄有被刪除，金幣暫時是負的；已買的東西不會被收回，多運動就能補回來。</p>}
        {trying && (
          <div className="trial-bar">
            <span className="small">試穿中（還沒有購買）</span>
            <Btn small variant="ghost" onClick={() => setTrial({})}>
              恢復原本的樣子
            </Btn>
          </div>
        )}
      </Panel>

      <div className="seg seg-wide" role="tablist" aria-label="商品分類">
        {SLOTS.map((s) => (
          <button key={s} role="tab" aria-selected={slot === s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="shop-grid">
        {entries.map((e) => {
          const own = owns(e);
          const on = equipped(e);
          const trialOn = trial[e.slot] === e.id;
          return (
            <div key={e.id} className={'shop-item' + (on ? ' on' : '') + (trialOn ? ' trial' : '')}>
              <div className={'shop-thumb' + (e.slot === 'scene' && e.id === 'night' ? ' is-night' : '')}>
                {e.slot === 'scene' && <Scene id={e.id} />}
                {e.slot === 'pet' ? (
                  <PetSprite kind={e.id} size={40} />
                ) : (
                  <Hero
                    palette={settings.palette}
                    accessory={e.slot === 'hat' ? e.id : 'none'}
                    outfit={e.slot === 'outfit' ? e.id : 'none'}
                    size={e.slot === 'scene' ? 34 : 48}
                  />
                )}
              </div>
              <b className="shop-name">{e.name}</b>
              <span className="shop-desc">{e.desc}</span>
              {on ? (
                <span className="shop-state pf">EQUIPPED</span>
              ) : own ? (
                <span className="shop-state owned">已擁有</span>
              ) : e.level ? (
                <span className="shop-state">🔒 Lv.{e.level}</span>
              ) : e.free ? (
                <span className="shop-state">運動後孵化</span>
              ) : (
                <Coin n={e.price} />
              )}
              <div className="shop-actions">
                {own ? (
                  e.slot === 'pet' && on ? null : (
                    <button className="mini" onClick={() => equip(e, !on)}>
                      {on ? '脫下' : e.slot === 'pet' ? '帶在身邊' : '穿上'}
                    </button>
                  )
                ) : (
                  <>
                    {!e.level && !e.free && (
                      <button className="mini" onClick={() => { sfx.tap(); setTrialSlot(e.slot, trialOn ? undefined : e.id); }}>
                        {trialOn ? '取消試穿' : '試穿'}
                      </button>
                    )}
                    {!e.level && !e.free && (
                      <button className="mini buy" onClick={() => setBuying(e)}>
                        購買
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!buying}
        title="確認購買"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setBuying(null)}>
              再想想
            </Btn>
            <Btn
              disabled={!buying || coins < buying.price}
              onClick={async () => {
                if (!buying) return;
                try {
                  await buyItem(buying.id);
                  sfx.badge();
                  await updateSettings({ [SLOT_KEY[buying.slot]]: buying.id } as Partial<Settings>);
                  setTrial({});
                  toast(`買到「${buying.name}」，已經換上了！`);
                } catch (err) {
                  sfx.error();
                  toast(err instanceof Error ? err.message : '購買失敗', 'err');
                }
                setBuying(null);
              }}
            >
              購買並換上
            </Btn>
          </>
        }
      >
        {buying && (
          <>
            <p>
              用 <Coin n={buying.price} /> 買「{buying.name}」？
            </p>
            <p className="small muted">
              目前有 {Math.max(0, coins)} 枚
              {coins < buying.price ? `，還差 ${buying.price - coins} 枚。去運動賺金幣吧！` : `，買完剩 ${coins - buying.price} 枚。`}
            </p>
          </>
        )}
      </Dialog>
    </div>
  );
}
