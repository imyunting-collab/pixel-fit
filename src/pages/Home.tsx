import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { formatCN, WEEKDAY_LABEL, weekday } from '../logic/dates';
import { activePhase, phaseProgress, todayTasks, weekStats } from '../logic/stats';
import { titleFor } from '../logic/game';
import { BADGES } from '../logic/badges';
import { TYPE_LABEL } from '../types';
import { BadgeMedal, ExpBar, Hero, PetSprite, PixelIcon, ProgressBar, Scene, TYPE_COLOR, TYPE_ICON, type Mood } from '../components/pixel';
import { petMood } from '../logic/shop';
import { Btn, Empty, Panel } from '../components/ui';

const LINES_IDLE = ['今天也一起動一動吧！', '喝口水，伸個懶腰～', '我已經暖身好了！', '一點點也很棒喔！'];
const LINES_DONE = ['今天好帥！我們做到了！', '流汗的感覺真好～', 'EXP 滿滿，好開心！'];
const LINES_REST = ['休息也是訓練的一部分 🌙', '今天好好恢復，明天再出發！'];

export function Home() {
  const { today, records, phases, level, settings, goCheckIn, setTab, progress, sfx, petHatched, pet: petState, now, coins, openProfile, petAct } = useStore();
  const [petCount, setPetCount] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);

  const phase = activePhase(phases, today);
  const tasks = todayTasks(phase, records, today);
  const week = weekStats(records, today);
  const todays = records.filter((r) => r.date === today);
  const doneTasks = tasks.tasks.filter((t) => t.done).length;
  const prog = phase ? phaseProgress(phase, records, today) : null;

  const trainedToday = todays.length > 0;
  const mood: Mood = trainedToday ? 'happy' : tasks.rest ? 'tired' : 'idle';
  const lines = trainedToday ? LINES_DONE : tasks.rest ? LINES_REST : LINES_IDLE;
  const line = lines[(petCount + Number(today.slice(-2))) % lines.length];

  const recentBadges = useMemo(
    () =>
      Object.entries(progress.seenBadges)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => BADGES.find((b) => b.id === id))
        .filter((b): b is (typeof BADGES)[number] => !!b)
        .slice(0, 3),
    [progress.seenBadges],
  );

  const pet = () => {
    sfx.tap();
    setPetCount((n) => n + 1);
    const id = Date.now();
    setHearts((h) => [...h.slice(-4), id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1000);
    if (petHatched) void petAct('pet').catch(() => undefined);
  };

  return (
    <div className="page">
      <header className="top">
        <h1 className="logo pf">PIXEL FIT</h1>
        <span className="top-date">{formatCN(today)}</span>
      </header>

      {/* 電子雞遊戲機 */}
      <section className="console" aria-label="我的像素訓練基地">
        <div className="console-screen">
          <div className="lcd-top">
            <span className="pf">Lv.{level.level}</span>
            <span className="lcd-title">{titleFor(level.level)}</span>
            <span className="lcd-coin"><PixelIcon name="coin" size={11} color="#2f4a33" accent="#e3ecd3" /><span className="pf">{Math.max(0, coins)}</span></span>
          </div>
          <div className={'lcd-stage' + (settings.scene === 'night' ? ' is-night' : '')}>
            <Scene id={settings.scene} />
            <div className="bubble">{line}</div>
            <button className="hero-btn" onClick={pet} aria-label="摸摸角色">
              <Hero palette={settings.palette} accessory={settings.accessory} outfit={settings.outfit} mood={mood} size={104} className={petCount ? 'pet-' + (petCount % 2) : ''} />
              {hearts.map((h) => (
                <span key={h} className="float-heart" aria-hidden>
                  <PixelIcon name="heart" size={14} color="#e2687a" />
                </span>
              ))}
            </button>
            <button className="console-pet" onClick={() => openProfile('pet')} aria-label="去寵物小屋">
              <PetSprite kind={petHatched ? settings.pet : 'egg'} size={40} mood={petHatched ? petMood(petState, now) : 'ok'} className={petHatched ? '' : 'egg-wobble'} />
            </button>
            <div className="ground" aria-hidden />
          </div>
          <div className="lcd-name">{settings.heroName}</div>
          <ExpBar current={level.current} need={level.need} label={`EXP（總計 ${level.total}）`} />
        </div>
        <div className="console-buttons">
          <button className="round-btn a" onClick={() => goCheckIn({ date: today })}>
            <span className="pf">A</span>
            <small>打卡</small>
          </button>
          <button className="round-btn b" onClick={pet}>
            <span className="pf">B</span>
            <small>摸摸</small>
          </button>
          <button className="round-btn c" onClick={() => openProfile('hero')}>
            <span className="pf">C</span>
            <small>狀態</small>
          </button>
        </div>
      </section>

      <Panel
        title="今日任務"
        icon="flag"
        tone="mint"
        right={tasks.tasks.length ? <span className="pf small">{doneTasks}/{tasks.tasks.length}</span> : undefined}
      >
        {!phase ? (
          <Empty icon="flag" title="目前沒有進行中的訓練階段">
            <p>到「計畫」建立或啟用一個階段，每天就會出現任務。</p>
            <Btn small onClick={() => setTab('plan')}>前往計畫</Btn>
          </Empty>
        ) : tasks.rest ? (
          <div className="rest-day">
            <PixelIcon name="moon" size={28} color="#86b6d9" />
            <div>
              <b>今天（週{WEEKDAY_LABEL[weekday(today)]}）是休息日</b>
              <p className="muted">{tasks.note && tasks.note !== '休息日' ? tasks.note : '好好睡、多喝水，讓身體恢復。想動也可以自由打卡喔！'}</p>
            </div>
          </div>
        ) : (
          <>
            {tasks.note && <p className="muted">📝 {tasks.note}</p>}
            <ProgressBar pct={tasks.tasks.length ? (doneTasks / tasks.tasks.length) * 100 : 0} />
            <ul className="tasks">
              {tasks.tasks.map((t) => (
                <li key={t.type} className={t.done ? 'done' : ''}>
                  <span className="task-icon" style={{ background: TYPE_COLOR[t.type] }}>
                    <PixelIcon name={TYPE_ICON[t.type]} size={16} color="#4a3426" />
                  </span>
                  <span className="task-name">{TYPE_LABEL[t.type]}</span>
                  {t.done ? (
                    <span className="task-done pf">
                      <PixelIcon name="check" size={14} color="#4f8a43" /> CLEAR
                    </span>
                  ) : (
                    <Btn small onClick={() => goCheckIn({ date: today, type: t.type })}>
                      打卡
                    </Btn>
                  )}
                </li>
              ))}
            </ul>
            {phase.sessionGoal && <p className="muted small">每次目標：{phase.sessionGoal}</p>}
          </>
        )}
      </Panel>

      <div className="stat-row">
        <Panel tone="pink" className="stat">
          <span className="stat-label">本週運動天數</span>
          <span className="stat-num pf">{week.activeDays}<small>/7</small></span>
          <div className="week-hearts">
            {week.days.map((d) => (
              <span key={d} className={'wh' + (d === today ? ' today' : '')} title={d}>
                <PixelIcon name="heart" size={13} color={week.activeSet.has(d) ? '#e2687a' : '#e9dccb'} />
                <small>{WEEKDAY_LABEL[weekday(d)]}</small>
              </span>
            ))}
          </div>
        </Panel>
        <Panel tone="blue" className="stat">
          <span className="stat-label">本週累積時間</span>
          <span className="stat-num pf">{week.minutes}<small>分</small></span>
          <span className="muted small">今天 {todays.reduce((s, r) => s + r.duration, 0)} 分鐘・{todays.length} 筆</span>
        </Panel>
      </div>

      <Panel title="目前訓練階段" icon="star" tone="yellow" right={<button className="link" onClick={() => setTab('plan')}>查看</button>}>
        {phase && prog ? (
          <div className="phase-mini">
            <b>{phase.name}</b>
            <p className="muted small">
              {phase.startDate.replace(/-/g, '/')} – {phase.endDate.replace(/-/g, '/')}
              {phase.goal && <>・{phase.goal}</>}
            </p>
            <ProgressBar pct={prog.percent} tone="yellow" />
            <p className="small">已完成 {prog.done}/{prog.totalScheduled} 個訓練日（{prog.percent}%）</p>
          </div>
        ) : (
          <p className="muted">還沒有進行中的階段。</p>
        )}
      </Panel>

      <Panel title="最近解鎖的徽章" icon="trophy" right={<button className="link" onClick={() => openProfile('hero')}>徽章牆</button>}>
        {recentBadges.length ? (
          <div className="recent-badges">
            {recentBadges.map((b) => (
              <div key={b.id} className="rb">
                <BadgeMedal icon={b.icon} color={b.color} size={48} />
                <span className="pf tiny">{b.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon="trophy" title="還沒有徽章">完成第一次運動就能拿到「FIRST STEP」！</Empty>
        )}
      </Panel>

      <button className="fab" onClick={() => goCheckIn({ date: today })} aria-label="快速新增運動紀錄">
        <PixelIcon name="plus" size={22} color="#4a3426" />
      </button>
    </div>
  );
}
