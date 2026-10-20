import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { CARE_COOLDOWN, PET_LINES, PET_NAMES, affectionLevel, fullness, happiness, petMood } from '../logic/shop';
import { Hero, PetSprite, PixelIcon, ProgressBar, Scene } from '../components/pixel';
import { Btn, Field, Panel } from '../components/ui';

type Fx = { id: number; kind: 'feed' | 'play' | 'pet' };

export function PetRoom() {
  const { pet, petHatched, snacks, petAct, renamePet, settings, now, toast, sfx, setTab } = useStore();
  const [fx, setFx] = useState<Fx[]>([]);
  const [name, setName] = useState(pet.name);
  const [line, setLine] = useState(0);
  useEffect(() => setName(pet.name), [pet.name]);

  const kind = settings.pet;
  const petName = pet.name || PET_NAMES[kind] || '小雞';

  if (!petHatched) {
    return (
      <div className="page-section">
        <Panel tone="mint" className="pet-panel">
          <div className={'pet-stage' + (settings.scene === 'night' ? ' is-night' : '')}>
            <Scene id={settings.scene} />
            <PetSprite kind="egg" size={72} className="egg-wobble" />
          </div>
          <p className="pet-line">蛋裡好像有東西在動…</p>
          <p className="small muted">完成第一筆 5 分鐘以上的運動，就能孵出妳的小雞夥伴！</p>
          <Btn className="btn-block" onClick={() => setTab('checkin')}>
            去打卡孵蛋
          </Btn>
        </Panel>
      </div>
    );
  }

  const f = fullness(pet, now);
  const h = happiness(pet, now);
  const mood = petMood(pet, now);
  const aff = affectionLevel(pet.affection);
  const lines = PET_LINES[mood];

  const act = async (k: Fx['kind']) => {
    try {
      const gained = await petAct(k);
      k === 'feed' ? sfx.success() : sfx.tap();
      const id = Date.now();
      setFx((x) => [...x.slice(-3), { id, kind: k }]);
      setTimeout(() => setFx((x) => x.filter((e) => e.id !== id)), 1200);
      setLine((n) => n + 1);
      const what = k === 'feed' ? '吃得好開心' : k === 'play' ? '玩得好開心' : '被摸得好舒服';
      toast(gained ? `${petName}${what}！親密度 +1` : `${petName}${what}～（30 分鐘後再互動會增加親密度）`, gained ? 'ok' : 'info');
    } catch (e) {
      sfx.error();
      toast(e instanceof Error ? e.message : '沒辦法互動', 'err');
    }
  };

  const cooldown = (last: number) => (now - last < CARE_COOLDOWN ? Math.ceil((CARE_COOLDOWN - (now - last)) / 60000) : 0);

  return (
    <div className="page-section">
      <Panel tone="mint" className="pet-panel">
        <div className={'pet-stage' + (settings.scene === 'night' ? ' is-night' : '')}>
          <Scene id={settings.scene} />
          <div className="bubble pet-bubble">{fx.length ? (fx[fx.length - 1].kind === 'feed' ? '好好吃！' : fx[fx.length - 1].kind === 'play' ? '接住了！' : '嘿嘿～') : lines[line % lines.length]}</div>
          <Hero palette={settings.palette} accessory={settings.accessory} outfit={settings.outfit} mood="happy" size={70} className="pet-owner" />
          <button className="pet-btn" onClick={() => act('pet')} aria-label={`摸摸${petName}`}>
            <PetSprite kind={kind} size={64} mood={mood} className={fx.length ? 'pet-react' : ''} />
          </button>
          {fx.map((e) => (
            <span key={e.id} className={`pet-fx fx-${e.kind}`} aria-hidden>
              <PixelIcon name={e.kind === 'feed' ? 'snack' : e.kind === 'play' ? 'ball' : 'heart'} size={16} color={e.kind === 'pet' ? '#e2687a' : '#8a5a1f'} accent={e.kind === 'play' ? '#86b6d9' : '#f6dd8a'} />
            </span>
          ))}
        </div>
        <div className="pet-name-row">
          <b className="pet-name">{petName}</b>
          <span className="pf small">♥ Lv.{aff.level}</span>
        </div>

        <div className="pet-stats">
          <div>
            <span className="small"><b>飽足度</b> {f}</span>
            <ProgressBar pct={f} tone="yellow" />
          </div>
          <div>
            <span className="small"><b>開心度</b> {h}</span>
            <ProgressBar pct={h} tone="pink" />
          </div>
          <div>
            <span className="small"><b>親密度</b> {aff.current}/{aff.need}</span>
            <ProgressBar pct={(aff.current / aff.need) * 100} tone="mint" />
          </div>
        </div>

        <div className="pet-actions">
          <Btn variant="main" onClick={() => act('feed')} disabled={snacks <= 0}>
            <span className="btn-icon"><PixelIcon name="snack" size={16} color="#8a5a1f" accent="#f6dd8a" /> 餵點心</span>
            <small className="btn-sub">剩 {snacks} 份</small>
          </Btn>
          <Btn variant="blue" onClick={() => act('play')}>
            <span className="btn-icon"><PixelIcon name="ball" size={16} color="#4a3426" accent="#fffdf2" /> 一起玩</span>
            <small className="btn-sub">{cooldown(pet.lastPlayed) ? `${cooldown(pet.lastPlayed)} 分後加親密` : '可加親密度'}</small>
          </Btn>
          <Btn variant="pink" onClick={() => act('pet')}>
            <span className="btn-icon"><PixelIcon name="heart" size={16} color="#e2687a" /> 摸摸</span>
            <small className="btn-sub">{cooldown(pet.lastPetted) ? `${cooldown(pet.lastPetted)} 分後加親密` : '可加親密度'}</small>
          </Btn>
        </div>
        <p className="small muted">
          每個運動日可以拿到 2 份點心，完成階段再送 5 份。寵物不會生病也不會離開，太久沒互動只會有點想睡、想妳。
        </p>
      </Panel>

      <Panel title="寵物資料" icon="face">
        <Field label="寵物名字">
          <input
            value={name}
            maxLength={10}
            placeholder={PET_NAMES[kind]}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const v = name.trim();
              if (v !== pet.name) void renamePet(v).then(() => toast(v ? `改名為「${v}」` : '已恢復預設名字', 'info'));
            }}
          />
        </Field>
        <p className="small muted">在「商店 → 寵物」可以領養新夥伴並切換要帶在身邊的寵物。親密度與名字是共用的。</p>
      </Panel>
    </div>
  );
}
