import { memo, type CSSProperties } from 'react';
import { PALETTES } from '../logic/game';
import type { ExerciseType } from '../types';

// ---------- 通用：把字元矩陣畫成 SVG 像素 ----------
function rects(rows: string[], colors: Record<string, string>) {
  const out: { x: number; y: number; w: number; c: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const c = colors[ch];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      out.push({ x, y, w, c });
      x += w;
    }
  });
  return out;
}

function PixelSvg({ rows, colors, size, className, style, title }: {
  rows: string[]; colors: Record<string, string>; size: number; className?: string; style?: CSSProperties; title?: string;
}) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects(rows, colors).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}

// ---------- 圖示 ----------
const ICONS: Record<string, string[]> = {
  heart: ['.........', '.xx...xx.', 'xxxx.xxxx', 'xwxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....'],
  star: ['....x....', '....x....', '...xxx...', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '..xxxxx..', '.xx...xx.', 'x.......x'],
  check: ['.........', '........x', '.......xx', '......xx.', 'x....xx..', 'xx..xx...', '.xxxx....', '..xx.....', '.........'],
  moon: ['...xxxx..', '.xxx.....', '.xx......', 'xxx......', 'xxx......', 'xxx.....x', '.xxx..xx.', '..xxxxx..', '.........'],
  home: ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '.xxxxxxx.', '.xxx.xxx.', '.xxx.xxx.', '.xxx.xxx.'],
  flag: ['x........', 'xyyyyy...', 'xyyyyyyy.', 'xyyyyyyyy', 'xyyyyy...', 'x........', 'x........', 'x........', 'xx.......'],
  calendar: ['.x.....x.', 'xxxxxxxxx', 'xxxxxxxxx', 'x.......x', 'x.y.y.y.x', 'x.......x', 'x.y.y.y.x', 'x.......x', 'xxxxxxxxx'],
  face: ['..xxxxx..', '.x.....x.', 'x.......x', 'x.x...x.x', 'x.......x', 'x.x...x.x', 'x..xxx..x', '.x.....x.', '..xxxxx..'],
  shoe: ['.........', '..xxx....', '..xyx....', '..xxx....', '..xxxx...', '.xxxxxxx.', 'xxxxxxxxx', 'xyyyyyyyx', '.........'],
  bolt: ['....xxx..', '...xxx...', '..xxx....', '.xxxxxx..', '...xxx...', '..xxx....', '.xxx.....', '.xx......', '.x.......'],
  dumbbell: ['.........', '.........', 'xx.....xx', 'xx.....xx', 'xxyyyyyxx', 'xx.....xx', 'xx.....xx', '.........', '.........'],
  leaf: ['......xxx', '....xxxxx', '...xxxxyx', '..xxxxyxx', '.xxxxyxxx', '.xxxyxxx.', '.xxyxxx..', '.xy......', 'y........'],
  flame: ['....x....', '...xx....', '...xxx...', '..xxxxx..', '.xxxyxxx.', '.xxyyyxx.', 'xxyyyyyxx', '.xxyyyxx.', '..xxxxx..'],
  trophy: ['xxxxxxxxx', 'x.xxxxx.x', 'x.xxxxx.x', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....', '..xxxxx..', '..xxxxx..'],
  lock: ['..xxxxx..', '.x.....x.', '.x.....x.', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxx.xxxx', 'xxxx.xxxx', 'xxxxxxxxx', 'xxxxxxxxx'],
  plus: ['.........', '...xxx...', '...xxx...', 'xxxxxxxxx', 'xxxxxxxxx', 'xxxxxxxxx', '...xxx...', '...xxx...', '.........'],
  diamond: ['.........', '..xxxxx..', '.xyxxxyx.', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....', '.........'],
  sparkle: ['....x....', '....x....', '...xxx...', 'xxxxyxxxx', '...xxx...', '....x....', '....x..x.', '......xxx', '.......x.'],
  coin: ['..xxxxx..', '.xyyyyyx.', 'xyywyyyyx', 'xywyyxyyx', 'xyyyyxyyx', 'xyyyyxyyx', 'xyyyyyyyx', '.xyyyyyx.', '..xxxxx..'],
  snack: ['..xxxxx..', '.xyyyyyx.', 'xyyxyyyyx', 'xyyyyyxyx', 'xyxyyyyyx', 'xyyyyxyyx', 'xyyyyyyyx', '.xyyyyyx.', '..xxxxx..'],
  ball: ['..xxxxx..', '.xyyyyyx.', 'xyyyyyyyx', 'xxxxxxxxx', 'xwwwwwwwx', 'xxxxxxxxx', 'xyyyyyyyx', '.xyyyyyx.', '..xxxxx..'],
  clock: ['..xxxxx..', '.x..y..x.', 'x...y...x', 'x...y...x', 'x...yyy.x', 'x.......x', 'x.......x', '.x.....x.', '..xxxxx..'],
};

export type IconName = keyof typeof ICONS;

export const PixelIcon = memo(function PixelIcon({ name, size = 18, color = 'currentColor', accent, className, title }: {
  name: string; size?: number; color?: string; accent?: string; className?: string; title?: string;
}) {
  const rows = ICONS[name] || ICONS.star;
  return (
    <PixelSvg
      rows={rows}
      colors={{ x: color, y: accent ?? 'rgba(255,255,255,.7)', w: 'rgba(255,255,255,.85)' }}
      size={size}
      className={'px-icon ' + (className || '')}
      title={title}
    />
  );
});

export const TYPE_ICON: Record<ExerciseType, string> = {
  run: 'shoe', core: 'flame', cardio: 'bolt', sculpt: 'diamond', stretch: 'leaf', custom: 'sparkle',
};
export const TYPE_COLOR: Record<ExerciseType, string> = {
  run: '#86b6d9', core: '#f2a46f', cardio: '#ee8fa3', sculpt: '#e9c75a', stretch: '#8fc79a', custom: '#b88d6e',
};

// ---------- 主角像素角色 ----------
const BODY_IDLE = [
  '....oooooooo....',
  '..oollllllbboo..',
  '.olllbbbbbbbbbo.',
  '.ohhhhhhhhhhhho.',
  'obbbbbbbbbbbbbbo',
  'obbbwebbbbwebbbo',
  'obbbeebbbbeebbbo',
  'obppbbbmmbbbppbo',
  'obbbbbbbbbbbbbdo',
  'obbbbbbbbbbbbbdo',
  '.odbbbbbbbbbbddo',
  '.oddbbbbbbbbddo.',
  '..ooddddddddoo..',
  '....oooooooo....',
  '...odo....odo...',
  '...ooo....ooo...',
];
const BODY_BLINK = BODY_IDLE.map((r, i) => (i === 5 ? 'obbbbbbbbbbbbbbo' : i === 6 ? 'obbboobbbboobbbo' : r));
const BODY_HAPPY = BODY_IDLE.map((r, i) =>
  i === 5 ? 'obbbbebbbbebbbbo' : i === 6 ? 'obbbebebbebebbbo' : i === 8 ? 'obbbbbbmmbbbbbdo' : r,
);
const BODY_TIRED = BODY_IDLE.map((r, i) => (i === 5 ? 'obbbbbbbbbbbbbbo' : i === 6 ? 'obbeeebbbbeeebbo' : i === 7 ? 'obppbbbbbbbbppbo' : i === 8 ? 'obbbbbbmmbbbbbdo' : r));

const ACC: Record<string, string[]> = {
  none: [],
  sprout: ['.....gg.gg.....', '.......gG.......'],
  star: ['................', '...........y....', '..........yyy...', '...........y....'],
  cap: ['................', '....cccccccc....', '...cccccccccc...', '..ccccccccccCCCC'],
  crown: ['....y..yy..y....', '....yyyyyyyy....', '....yryyyyry....'],
  // ---- 商店帽子 ----
  bunny: ['....ww....ww....', '....wP....Pw....'],
  flower: ['................', '.....r..y..r....', '....grgygrgg....'],
  headphones: ['................', '....kkkkkkkk....', '...k........k...', '..k..........k..', '.k............k.', 'k..............k', 'kk............kk', 'kk............kk', 'kk............kk'],
  wizard: ['.........K......', '.......KKK......', '......KKKKy.....', '...KKKKKKKKKK...'],
};

/** 服裝：疊在角色身體上（以 18 列的畫面座標表示） */
const OUTFIT: Record<string, string[]> = {
  none: [],
  scarf: [...Array(10).fill(''), 'orrrrrrrrrrrrrro', '..........rr....', '..........rr....'],
  bow: [...Array(10).fill(''), '......PP.PP.....', '.......PrP......', '......PP.PP.....'],
  stripes: [...Array(10).fill(''), '.kkkkkkkkkkkkkk.', '', '..kkkkkkkkkkkkk.', '', '....kkkkkkkk....'],
  medal: [...Array(10).fill(''), '......k...k.....', '.......k.k......', '.......yy.......', '.......yy.......'],
};

export type Mood = 'idle' | 'happy' | 'tired';

export const Hero = memo(function Hero({ palette = 'mint', accessory = 'none', outfit = 'none', mood = 'idle', size = 128, className }: {
  palette?: string; accessory?: string; outfit?: string; mood?: Mood; size?: number; className?: string;
}) {
  const p = PALETTES.find((x) => x.id === palette) || PALETTES[0];
  const colors: Record<string, string> = {
    o: '#4a3426', b: p.body, l: p.light, d: p.shade, h: p.band, w: '#ffffff', e: '#2d2019',
    p: palette === 'sakura' ? '#e27c96' : '#f4a9b8', m: '#8a4a3a',
    g: '#6fae5c', G: '#4f8a43', y: '#f2c94c', r: '#e2687a', c: p.band, C: '#4a3426',
    k: '#5e98c7', K: '#6b7fc4', P: '#f08aa5',
  };
  const body = mood === 'happy' ? BODY_HAPPY : mood === 'tired' ? BODY_TIRED : BODY_IDLE;
  const base = ['................', '................', ...body];
  const acc = ACC[accessory] || [];
  const out = OUTFIT[outfit] || [];
  const layer = (row: string, a?: string) => (a ? row.split('').map((ch, x) => (a[x] && a[x] !== '.' ? a[x] : ch)).join('') : row);
  const merge = (frame: string[]) => frame.map((row, y) => layer(layer(row, out[y]), acc[y]));
  const main = merge(base);
  const blink = merge(['................', '................', ...(mood === 'idle' ? BODY_BLINK : body)]);
  return (
    <div className={`hero hero-${mood} ${className || ''}`} style={{ width: size, height: (size * 18) / 16 }} aria-label="我的像素運動夥伴" role="img">
      <PixelSvg rows={main} colors={colors} size={size} className="hero-frame hero-a" />
      <PixelSvg rows={blink} colors={colors} size={size} className="hero-frame hero-b" />
    </div>
  );
});

// ---------- EXP 條 ----------
export function ExpBar({ current, need, label = 'EXP', tone = 'mint' }: { current: number; need: number; label?: string; tone?: 'mint' | 'pink' | 'blue' }) {
  const pct = need > 0 ? Math.min(100, Math.round((current / need) * 100)) : 0;
  const segs = 20;
  const filled = Math.round((pct / 100) * segs);
  return (
    <div className="expbar" role="progressbar" aria-valuemin={0} aria-valuemax={need} aria-valuenow={current} aria-label={label}>
      <div className="expbar-head">
        <span className="pf">{label}</span>
        <span className="pf">
          {current}/{need}
        </span>
      </div>
      <div className={`expbar-track tone-${tone}`}>
        {Array.from({ length: segs }, (_, i) => (
          <i key={i} className={i < filled ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ pct, tone = 'mint' }: { pct: number; tone?: 'mint' | 'pink' | 'blue' | 'yellow' }) {
  const segs = 12;
  const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * segs);
  return (
    <div className={`pbar tone-${tone}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segs }, (_, i) => (
        <i key={i} className={i < filled ? 'on' : ''} />
      ))}
    </div>
  );
}

// ---------- 徽章圖案 ----------
export function BadgeMedal({ icon, color, locked, size = 56 }: { icon: string; color: string; locked?: boolean; size?: number }) {
  return (
    <div className={'medal' + (locked ? ' locked' : '')} style={{ width: size, height: size, ['--medal' as string]: color }}>
      <PixelIcon name={locked ? 'lock' : icon} size={size * 0.5} color={locked ? '#8d8478' : '#4a3426'} accent="#fff8e8" />
    </div>
  );
}


// ---------- 寵物 ----------
const PETS: Record<string, { rows: string[]; colors: Record<string, string> }> = {
  chick: {
    rows: ['...oooo...', '..oyyyyo..', '.oyyeyyyo.', 'oBByyyyyo.', '.oyyyyyyyo', '.oyyYYyyyo', '.oyyyyyyo.', '..oooooo..', '...B..B...'],
    colors: { o: '#4a3426', y: '#f6dd8a', Y: '#e0b43d', e: '#2d2019', B: '#f2a46f' },
  },
  kitty: {
    rows: ['.o....o...', '.oOoooOo..', 'oOOwwwnno.', 'owewwwewo.', 'owwwpwwwo.', '.owwwwwo..', '.owwnnwwo.', '.owwwwwwoo', '.oo.oo.oo.'],
    colors: { o: '#4a3426', O: '#f2a46f', n: '#8a5a3f', w: '#fffaf0', e: '#2d2019', p: '#f4a9b8' },
  },
  bunnypet: {
    rows: ['..ow.ow...', '..op.po...', '..owoow...', '.owwwwwo..', '.oewwewo..', '.owwpwwo..', 'owwwwwwwo.', 'owwwwwwwoo', '.oo...oo..'],
    colors: { o: '#4a3426', w: '#fffaf0', e: '#2d2019', p: '#f4a9b8' },
  },
  frog: {
    rows: ['.oo...oo..', 'owwo.owwo.', 'oweoooweo.', 'ogggggggo.', 'oggrrrggo.', '.oggggggo.', 'oGgggggGo.', 'oGGoooGGo.', '.oo...oo..'],
    colors: { o: '#4a3426', w: '#fffaf0', e: '#2d2019', g: '#8fc79a', G: '#5e9a63', r: '#e2687a' },
  },
  egg: {
    rows: ['...oooo...', '..owwwwo..', '.owwswwwo.', '.owwwwswo.', 'owswwwwwwo', 'owwwwswwwo', 'owwwwwwswo', '.owwwwwwo.', '..oooooo..'],
    colors: { o: '#4a3426', w: '#fffaf0', s: '#9fdcc0' },
  },
};

export const PetSprite = memo(function PetSprite({ kind, size = 48, mood = 'ok', className }: { kind: string; size?: number; mood?: string; className?: string }) {
  const p = PETS[kind] || PETS.chick;
  return (
    <div className={`pet pet-${mood} ${className || ''}`} style={{ width: size }} role="img" aria-label="我的寵物">
      <PixelSvg rows={p.rows} colors={p.colors} size={size} />
      {mood === 'sleepy' && <span className="zzz pf" aria-hidden>z</span>}
    </div>
  );
});

// ---------- 遊戲機背景 ----------
const SUN = ['..y..y..', '...yy...', 'y.yyyy.y', '.yyyyyy.', '.yyyyyy.', 'y.yyyy.y', '...yy...', '..y..y..'];
const TREE = ['..gggg..', '.gggggg.', 'gggGgggg', 'ggggggGg', '.gggggg.', '...bb...', '...bb...', '...bb...'];
const MOON = ['..yyy...', '.yy.....', 'yy......', 'yy......', 'yy......', '.yy.....', '..yyy...'];
const CLOUD = ['..www...', '.wwwwww.', 'wwwwwwww'];
const PALM = ['gg.g.gg.', '.ggggg..', 'g..b..g.', '...b....', '...b....', '...b....', '..bbb...'];
const SC = { y: '#f2c94c', g: '#7cb36a', G: '#5e9a55', b: '#8a5a3f', w: '#fffdf2' };

export function Scene({ id }: { id: string }) {
  if (!id || id === 'none') return null;
  return (
    <div className={`scene scene-${id}`} aria-hidden>
      {id === 'park' && (
        <>
          <PixelSvg rows={SUN} colors={SC} size={26} className="sc sc-tr" />
          <PixelSvg rows={TREE} colors={SC} size={34} className="sc sc-bl" />
          <PixelSvg rows={CLOUD} colors={SC} size={30} className="sc sc-tl" />
        </>
      )}
      {id === 'beach' && (
        <>
          <PixelSvg rows={SUN} colors={SC} size={24} className="sc sc-tr" />
          <PixelSvg rows={PALM} colors={SC} size={34} className="sc sc-bl" />
          <div className="waves" />
        </>
      )}
      {id === 'night' && (
        <>
          <PixelSvg rows={MOON} colors={SC} size={22} className="sc sc-tr" />
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} className="star-dot" style={{ left: `${(i * 37) % 92 + 4}%`, top: `${(i * 23) % 50 + 6}%`, ['--d' as string]: `${i * 0.3}s` }} />
          ))}
        </>
      )}
      {id === 'sakura' && (
        <>
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} className="petal" style={{ left: `${(i * 29) % 90 + 5}%`, ['--d' as string]: `${i * 0.7}s` }} />
          ))}
          <div className="sakura-ground" />
        </>
      )}
    </div>
  );
}
