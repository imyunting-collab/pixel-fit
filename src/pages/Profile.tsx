import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { PALETTES, TITLES, nextUnlock, titleFor } from '../logic/game';
import { BADGES } from '../logic/badges';
import { totals } from '../logic/stats';
import { BadgeMedal, ExpBar, Hero } from '../components/pixel';
import { Btn, Dialog, Field, Panel } from '../components/ui';
import type { MotionPref } from '../types';
import { Shop } from './Shop';
import { PetRoom } from './PetRoom';
import { todayISO } from '../logic/dates';

function fmtTime(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Profile() {
  const { profileView, setProfileView } = useStore();
  const views = [
    { v: 'hero' as const, label: '角色' },
    { v: 'shop' as const, label: '商店' },
    { v: 'pet' as const, label: '寵物' },
  ];
  return (
    <div className="page">
      <header className="top">
        <h1 className="pf-title">PROFILE</h1>
        <span className="top-date">我的角色</span>
      </header>
      <div className="seg seg-wide" role="tablist" aria-label="角色頁分頁">
        {views.map((x) => (
          <button key={x.v} role="tab" aria-selected={profileView === x.v} className={profileView === x.v ? 'on' : ''} onClick={() => setProfileView(x.v)}>
            {x.label}
          </button>
        ))}
      </div>
      {profileView === 'hero' && <HeroView />}
      {profileView === 'shop' && <Shop />}
      {profileView === 'pet' && <PetRoom />}
    </div>
  );
}

function HeroView() {
  const s = useStore();
  const { level, settings, updateSettings, records, today, earned, progress } = s;
  const t = totals(records, today);
  const [name, setName] = useState(settings.heroName);
  useEffect(() => setName(settings.heroName), [settings.heroName]);
  const nu = nextUnlock(level.level);

  return (
    <div className="page-section">
      <Panel tone="mint" className="profile-hero">
        <div className="ph-stage">
          <Hero palette={settings.palette} accessory={settings.accessory} outfit={settings.outfit} mood="happy" size={120} />
        </div>
        <div className="ph-info">
          <p className="pf">Lv.{level.level}</p>
          <p className="ph-title">{titleFor(level.level)}</p>
          <Field label="角色名字">
            <input
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                const v = name.trim() || '小像素';
                setName(v);
                if (v !== settings.heroName) void updateSettings({ heroName: v }).then(() => s.toast('名字已更新'));
              }}
            />
          </Field>
        </div>
        <ExpBar current={level.current} need={level.need} label={`EXP（總計 ${level.total}）`} />
        {nu && <p className="small muted">🎁 {nu}</p>}
      </Panel>

      <Panel title="冒險紀錄" icon="star">
        <div className="mini-stats">
          <div><span className="pf">{t.sessions}</span><small>運動次數</small></div>
          <div><span className="pf">{t.days}</span><small>運動天數</small></div>
          <div><span className="pf">{t.minutes}</span><small>總分鐘</small></div>
          <div><span className="pf">{t.runKm}</span><small>跑步公里</small></div>
        </div>
        <p className="small muted">EXP 規則：每筆 5 分鐘以上的紀錄得 10 EXP，每 10 分鐘再 +2（最多算 120 分鐘）；每天第一筆再 +5；完成一個訓練階段 +50。EXP 由紀錄即時計算，修改或刪除紀錄會自動校正。</p>
      </Panel>

      <Panel title="外觀與稱號" icon="sparkle" tone="pink">
        <p className="field-label">配色</p>
        <div className="swatches">
          {PALETTES.map((p) => {
            const locked = level.level < p.level;
            return (
              <button
                key={p.id}
                disabled={locked}
                className={'swatch' + (settings.palette === p.id ? ' on' : '') + (locked ? ' locked' : '')}
                style={{ ['--sw' as string]: p.body }}
                onClick={() => updateSettings({ palette: p.id })}
                aria-label={locked ? `${p.name}（Lv.${p.level} 解鎖）` : p.name}
              >
                <i />
                <span>{locked ? `Lv.${p.level}` : p.name}</span>
              </button>
            );
          })}
        </div>
        <p className="field-label">帽子・服裝・背景</p>
        <p className="small">升級獎勵的裝飾和用金幣買的衣服，都在「商店」裡換穿。</p>
        <Btn small variant="ghost" onClick={() => s.setProfileView('shop')}>前往商店</Btn>
        <p className="field-label">稱號</p>
        <ul className="titles">
          {TITLES.map((x) => (
            <li key={x.name} className={level.level >= x.level ? 'on' : ''}>
              <span className="pf tiny">Lv.{x.level}</span> {level.level >= x.level ? x.name : '？？？'}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="徽章收藏牆" icon="trophy" tone="yellow" right={<span className="pf small">{earned.length}/{BADGES.length}</span>}>
        <div className="badge-wall">
          {BADGES.map((b) => {
            const on = earned.includes(b.id);
            const [cur, max] = b.progress(s.badgeCtx);
            const first = progress.seenBadges[b.id];
            return (
              <div key={b.id} className={'badge' + (on ? ' on' : '')}>
                <BadgeMedal icon={b.icon} color={b.color} locked={!on} size={52} />
                <span className="pf tiny">{b.name}</span>
                <span className="badge-cond">{b.condition}</span>
                <span className="badge-prog">
                  {on ? (first ? `解鎖於 ${fmtTime(first).slice(0, 10)}` : '已解鎖') : `${Math.floor(cur * 10) / 10} / ${max}`}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <SettingsPanel />
      <DataPanel />
      <InstallPanel />

      <p className="footer-note pf tiny">PIXEL FIT v1.1.0</p>
    </div>
  );
}

function SettingsPanel() {
  const { settings, updateSettings, sfx } = useStore();
  const motions: { v: MotionPref; label: string }[] = [
    { v: 'auto', label: '跟隨系統' },
    { v: 'on', label: '開啟' },
    { v: 'off', label: '關閉' },
  ];
  return (
    <Panel title="設定" icon="sparkle">
      <div className="setting-row">
        <span>動畫效果</span>
        <div className="seg">
          {motions.map((m) => (
            <button key={m.v} className={settings.motion === m.v ? 'on' : ''} onClick={() => updateSettings({ motion: m.v })}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <p className="small muted">「跟隨系統」會在手機開啟「減少動態效果」時自動關閉動畫。</p>
      <div className="setting-row">
        <span>8-bit 音效</span>
        <div className="seg">
          <button className={!settings.sound ? 'on' : ''} onClick={() => updateSettings({ sound: false })}>靜音</button>
          <button
            className={settings.sound ? 'on' : ''}
            onClick={async () => {
              await updateSettings({ sound: true });
              setTimeout(() => sfx.success(), 50);
            }}
          >
            開啟
          </button>
        </div>
      </div>
    </Panel>
  );
}

function DataPanel() {
  const { buildBackup, markBackedUp, lastBackupAt, previewImport, applyImport, clearAll, toast, records, phases } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ json: unknown; info: string } | null>(null);
  const [importErr, setImportErr] = useState<string[] | null>(null);
  const [clearStep, setClearStep] = useState(0);
  const [clearText, setClearText] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  const exportJson = async () => {
    const data = JSON.stringify(buildBackup(), null, 2);
    const stamp = todayISO();
    const fname = `pixel-fit-backup-${stamp}.json`;
    const blob = new Blob([data], { type: 'application/json' });
    const file = typeof File !== 'undefined' ? new File([blob], fname, { type: 'application/json' }) : null;
    try {
      // 手機上優先用分享面板（可存到「檔案」或傳到雲端硬碟）；分享不可用時改為下載
      let shared = false;
      if (file && navigator.canShare?.({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        try {
          await navigator.share({ files: [file], title: 'PIXEL FIT 備份' });
          shared = true;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') throw e;
        }
      }
      if (!shared) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      await markBackedUp();
      toast(`已匯出備份（${records.length} 筆紀錄、${phases.length} 個階段）`);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return toast('已取消匯出', 'info');
      toast('匯出失敗：' + (e instanceof Error ? e.message : ''), 'err');
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setImportErr(null);
    try {
      if (f.size > 20 * 1024 * 1024) throw new Error('檔案太大（超過 20MB）');
      const text = await f.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        setImportErr(['檔案不是有效的 JSON 格式']);
        return;
      }
      const pv = previewImport(json);
      if (!pv.ok) {
        setImportErr(pv.errors);
        return;
      }
      setPending({
        json,
        info: `運動紀錄：新增 ${pv.rp.add.length} 筆、更新 ${pv.rp.update.length} 筆、略過重複 ${pv.rp.skipped} 筆\n訓練階段：新增 ${pv.pp.add.length} 個、更新 ${pv.pp.update.length} 個、略過 ${pv.pp.skipped} 個`,
      });
    } catch (e) {
      setImportErr([e instanceof Error ? e.message : '讀取檔案失敗']);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Panel title="資料與備份" icon="clock" tone="blue">
      <div className="warn-box">
        <b>⚠ 資料只存在這台裝置的瀏覽器裡</b>
        <p>這不是雲端備份。清除瀏覽器資料、刪除主畫面 App、更換手機或使用無痕模式，都可能讓紀錄消失。請定期匯出 JSON 備份並存到雲端硬碟。</p>
        <p className="small">iPhone 若超過約 7 天沒有開啟這個網站，Safari 可能會清除網站資料；加入主畫面後使用通常較穩定。</p>
      </div>

      <p className="backup-time">
        最後一次備份：<b>{lastBackupAt ? fmtTime(lastBackupAt) : '尚未備份'}</b>
      </p>
      {persisted !== null && (
        <p className="small muted">
          瀏覽器永久儲存：{persisted ? '已允許 ✅' : '未允許'}
          {!persisted && (
            <button
              className="link"
              onClick={async () => {
                const ok = await navigator.storage?.persist?.();
                setPersisted(!!ok);
                toast(ok ? '已允許永久儲存' : '瀏覽器未允許（加入主畫面後再試試）', ok ? 'ok' : 'info');
              }}
            >
              　請求允許
            </button>
          )}
        </p>
      )}

      <div className="btn-row">
        <Btn onClick={exportJson}>匯出 JSON 備份</Btn>
        <Btn variant="blue" onClick={() => fileRef.current?.click()}>從備份匯入</Btn>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {importErr && (
        <div className="err-box" role="alert">
          <b>無法匯入：</b>
          <ul>{importErr.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <hr className="px-hr" />
      <Btn variant="danger" className="btn-block" onClick={() => { setClearStep(1); setClearText(''); }}>
        清除所有資料
      </Btn>

      <Dialog
        open={!!pending}
        title="確認匯入"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setPending(null)}>取消</Btn>
            <Btn
              onClick={async () => {
                if (!pending) return;
                try {
                  const r = await applyImport(pending.json);
                  toast(`匯入完成：新增 ${r.addedRecords} 筆紀錄、${r.addedPhases} 個階段`);
                } catch (e) {
                  toast('匯入失敗：' + (e instanceof Error ? e.message : ''), 'err');
                }
                setPending(null);
              }}
            >
              開始匯入
            </Btn>
          </>
        }
      >
        <p className="pre">{pending?.info}</p>
        <p className="small muted">匯入是「合併」：不會刪除現有資料，重複的紀錄會自動略過。</p>
      </Dialog>

      <Dialog
        open={clearStep === 1}
        title="確定要清除？"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setClearStep(0)}>取消</Btn>
            <Btn variant="danger" onClick={() => setClearStep(2)}>下一步</Btn>
          </>
        }
      >
        <p>將刪除全部 {records.length} 筆運動紀錄、{phases.length} 個訓練階段、等級與徽章進度。建議先匯出備份。</p>
      </Dialog>

      <Dialog
        open={clearStep === 2}
        title="最後確認"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setClearStep(0)}>取消</Btn>
            <Btn
              variant="danger"
              disabled={clearText.trim() !== '清除'}
              onClick={async () => {
                await clearAll();
                setClearStep(0);
                toast('所有資料已清除', 'info');
              }}
            >
              永久清除
            </Btn>
          </>
        }
      >
        <p>此動作無法復原。請輸入「清除」兩個字確認：</p>
        <input value={clearText} onChange={(e) => setClearText(e.target.value)} placeholder="清除" aria-label="輸入清除確認" />
      </Dialog>
    </Panel>
  );
}

function InstallPanel() {
  const [prompt, setPrompt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone);
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  return (
    <Panel title="加入手機主畫面" icon="home">
      {standalone ? (
        <p>✅ 你正在以 App 模式使用 PIXEL FIT。</p>
      ) : (
        <>
          {prompt && (
            <Btn className="btn-block" onClick={() => prompt.prompt()}>
              安裝到主畫面
            </Btn>
          )}
          <p><b>iPhone（Safari）</b>：點下方「分享」按鈕 → 選「加入主畫面」→ 新增。</p>
          <p><b>Android（Chrome）</b>：點右上角「⋮」→「安裝應用程式」或「加到主畫面」。</p>
          <p className="small muted">需要以 HTTPS 網址開啟才能安裝與離線使用。iPhone 必須用 Safari 開啟才會出現「加入主畫面」。</p>
        </>
      )}
    </Panel>
  );
}
