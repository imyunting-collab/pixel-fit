import { useEffect, useRef, type ReactNode } from 'react';
import { useStore, type Tab } from '../store';
import { BADGES } from '../logic/badges';
import { titleFor } from '../logic/game';
import { BadgeMedal, Hero, PixelIcon } from './pixel';

export function Panel({ title, icon, right, children, className, tone }: {
  title?: ReactNode; icon?: string; right?: ReactNode; children: ReactNode; className?: string; tone?: 'mint' | 'pink' | 'cream' | 'blue' | 'yellow';
}) {
  return (
    <section className={`panel tone-${tone || 'cream'} ${className || ''}`}>
      {title && (
        <header className="panel-head">
          <h2>
            {icon && <PixelIcon name={icon} size={16} />}
            <span>{title}</span>
          </h2>
          {right}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function Btn({ children, onClick, variant = 'main', type = 'button', disabled, className, small, ariaLabel }: {
  children: ReactNode; onClick?: () => void; variant?: 'main' | 'pink' | 'ghost' | 'danger' | 'blue'; type?: 'button' | 'submit';
  disabled?: boolean; className?: string; small?: boolean; ariaLabel?: string;
}) {
  const { sfx } = useStore();
  return (
    <button
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`btn btn-${variant} ${small ? 'btn-sm' : ''} ${className || ''}`}
      onClick={() => {
        sfx.tap();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} ref={ref} tabIndex={-1}>
        <header className="sheet-head">
          <h2 className="pf-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            ✕
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Dialog({ open, title, children, actions }: { open: boolean; title: string; children: ReactNode; actions: ReactNode }) {
  if (!open) return null;
  return (
    <div className="overlay center">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="dialog-title pf">{title}</div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

export function Empty({ icon = 'star', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <PixelIcon name={icon} size={28} color="#c9b9a3" />
      <p className="empty-title">{title}</p>
      {children && <div className="empty-sub">{children}</div>}
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          {t.tone === 'ok' && <PixelIcon name="star" size={14} color="#e9c75a" />}
          {t.tone === 'err' && <span aria-hidden>!</span>}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** 升級 / 解鎖徽章的遊戲風格提示視窗（依序顯示） */
export function CelebrationLayer() {
  const { celebrations, dismissCelebration, settings, sfx } = useStore();
  const c = celebrations[0];
  useEffect(() => {
    if (!c) return;
    if (c.kind === 'badge' && !BADGES.some((x) => x.id === c.id)) {
      dismissCelebration();
      return;
    }
    if (c.kind === 'level') sfx.levelUp();
    else sfx.badge();
  }, [c, sfx, dismissCelebration]);
  if (!c) return null;
  if (c.kind === 'level') {
    return (
      <div className="overlay center celebrate">
        <div className="dialog dialog-celebrate" role="alertdialog" aria-label="升級">
          <Sparkles />
          <div className="pf big-glow">LEVEL UP!</div>
          <Hero palette={settings.palette} accessory={settings.accessory} outfit={settings.outfit} mood="happy" size={112} className="jump" />
          <p className="pf lv-num">Lv.{c.level}</p>
          <p>
            {settings.heroName} 升到 {c.level} 級了！
            <br />
            目前稱號：<b>{titleFor(c.level)}</b>
          </p>
          <Btn onClick={dismissCelebration}>太棒了！</Btn>
        </div>
      </div>
    );
  }
  const b = BADGES.find((x) => x.id === c.id);
  if (!b) return null;
  return (
    <div className="overlay center celebrate">
      <div className="dialog dialog-celebrate" role="alertdialog" aria-label="解鎖徽章">
        <Sparkles />
        <div className="pf big-glow">NEW BADGE!</div>
        <div className="medal-pop">
          <BadgeMedal icon={b.icon} color={b.color} size={84} />
        </div>
        <p className="pf">{b.name}</p>
        <p>
          <b>{b.zh}</b>　{b.condition}
        </p>
        <Btn variant="pink" onClick={dismissCelebration}>
          收進徽章牆
        </Btn>
      </div>
    </div>
  );
}

function Sparkles() {
  return (
    <div className="sparkles" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ ['--i' as string]: i }}>
          <PixelIcon name={i % 2 ? 'heart' : 'star'} size={14} color={i % 2 ? '#f4a9b8' : '#f2c94c'} />
        </span>
      ))}
    </div>
  );
}

const NAV: { tab: Tab; label: string; en: string; icon: string }[] = [
  { tab: 'home', label: '首頁', en: 'HOME', icon: 'home' },
  { tab: 'checkin', label: '打卡', en: 'CHECK IN', icon: 'check' },
  { tab: 'plan', label: '計畫', en: 'PLAN', icon: 'flag' },
  { tab: 'calendar', label: '月曆', en: 'CALENDAR', icon: 'calendar' },
  { tab: 'profile', label: '角色', en: 'PROFILE', icon: 'face' },
];

export function BottomNav() {
  const { tab, setTab, sfx } = useStore();
  return (
    <nav className="bottom-nav" aria-label="主要選單">
      {NAV.map((n) => (
        <button
          key={n.tab}
          className={'nav-btn' + (tab === n.tab ? ' active' : '')}
          aria-current={tab === n.tab ? 'page' : undefined}
          onClick={() => {
            sfx.tap();
            setTab(n.tab);
          }}
        >
          <PixelIcon name={n.icon} size={20} />
          <span className="nav-zh">{n.label}</span>
          <span className="nav-en pf">{n.en}</span>
        </button>
      ))}
    </nav>
  );
}

export function Field({ label, children, hint, error, required }: { label: string; children: ReactNode; hint?: string; error?: string; required?: boolean }) {
  return (
    <label className={'field' + (error ? ' has-error' : '')}>
      <span className="field-label">
        {label}
        {required && <em className="req">*</em>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
