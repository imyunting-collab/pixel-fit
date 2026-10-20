import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { uid } from '../db';
import { addDays, diffDays, formatCN, WEEKDAY_LABEL } from '../logic/dates';
import { PHASE_STATE_LABEL, phaseProgress, phaseState, type PhaseState } from '../logic/stats';
import { PHASE_CLEAR_BONUS } from '../logic/game';
import { EXERCISE_TYPES, TYPE_LABEL, type DayPlan, type ExerciseType, type Phase } from '../types';
import { PixelIcon, ProgressBar, TYPE_COLOR, TYPE_ICON } from '../components/pixel';
import { Btn, Dialog, Empty, Field, Panel, Sheet } from '../components/ui';
import { RecordList } from '../components/RecordList';

// 顯示順序：一 二 三 四 五 六 日
const ORDER = [1, 2, 3, 4, 5, 6, 0];

function emptyWeek(): DayPlan[] {
  return Array.from({ length: 7 }, (_, i) => (i === 0 ? { rest: true, types: [], note: '' } : { rest: false, types: [], note: '' }));
}

function newPhase(today: string): Phase {
  return {
    id: uid(), name: '', startDate: today, endDate: addDays(today, 27), goal: '', items: [], sessionGoal: '',
    weekly: emptyWeek(), status: 'active', review: '', createdAt: Date.now(), updatedAt: Date.now(),
  };
}

const STATE_TONE: Record<PhaseState, string> = {
  upcoming: 'blue', active: 'mint', paused: 'yellow', awaitingReview: 'pink', completed: 'cream',
};

export function Plan() {
  const { phases, today, records, restoreSamples, toast } = useStore();
  const [editing, setEditing] = useState<Phase | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [viewing, setViewing] = useState<Phase | null>(null);

  const sorted = [...phases].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.createdAt - b.createdAt));

  return (
    <div className="page">
      <header className="top">
        <h1 className="pf-title">PLAN</h1>
        <span className="top-date">訓練計畫</span>
      </header>

      <Btn
        className="btn-block"
        onClick={() => {
          setIsNew(true);
          setEditing(newPhase(today));
        }}
      >
        ＋ 新增訓練階段
      </Btn>

      {sorted.length === 0 && (
        <Panel>
          <Empty icon="flag" title="還沒有訓練階段">
            <p>新增一個階段，安排每週要做什麼運動、哪天休息。</p>
            <Btn small variant="ghost" onClick={async () => { await restoreSamples(); toast('已加入 4 個範例階段'); }}>
              加入範例階段
            </Btn>
          </Empty>
        </Panel>
      )}

      {sorted.map((p, i) => (
        <PhaseCard key={p.id} p={p} index={i} onEdit={() => { setIsNew(false); setEditing(p); }} onView={() => setViewing(p)} records={records} today={today} />
      ))}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={isNew ? '新增訓練階段' : '編輯訓練階段'}>
        {editing && <PhaseEditor initial={editing} isNew={isNew} onDone={() => setEditing(null)} />}
      </Sheet>

      <Sheet open={!!viewing} onClose={() => setViewing(null)} title="階段紀錄">
        {viewing && <PhaseHistory p={phases.find((x) => x.id === viewing.id) || viewing} />}
      </Sheet>
    </div>
  );
}

function PhaseCard({ p, index, onEdit, onView, records, today }: {
  p: Phase; index: number; onEdit: () => void; onView: () => void; records: ReturnType<typeof useStore>['records']; today: string;
}) {
  const { savePhase, deletePhase, toast, sfx } = useStore();
  const st = phaseState(p, today);
  const prog = phaseProgress(p, records, today);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [review, setReview] = useState(p.review);

  const pause = async () => {
    await savePhase({ ...p, status: 'paused', pausedAt: today });
    toast('階段已暫停，恢復時會自動延長暫停的天數', 'info');
  };
  const resume = async () => {
    const paused = p.pausedAt ? Math.max(0, diffDays(p.pausedAt, today)) : 0;
    await savePhase({ ...p, status: 'active', pausedAt: undefined, endDate: addDays(p.endDate, paused) });
    toast(paused ? `已恢復，結束日期延後 ${paused} 天` : '已恢復進行', 'info');
  };
  const extend = async () => {
    await savePhase({ ...p, endDate: addDays(p.endDate, 7) });
    toast('已延長 7 天', 'info');
  };
  const complete = async () => {
    await savePhase({ ...p, status: 'completed', completedAt: today, review: review.trim(), pausedAt: undefined });
    sfx.success();
    setReviewOpen(false);
    toast(`QUEST CLEAR！階段完成 +${PHASE_CLEAR_BONUS} EXP`);
  };
  const reopen = async () => {
    await savePhase({ ...p, status: 'active', completedAt: undefined });
    toast(`已重新開啟階段（完成獎勵 ${PHASE_CLEAR_BONUS} EXP 會先收回）`, 'info');
  };

  return (
    <Panel tone={STATE_TONE[st] as 'mint'} className="phase-card">
      <div className="phase-head">
        <span className="pf stage-no">STAGE {index + 1}</span>
        <span className={`state-tag st-${st}`}>{PHASE_STATE_LABEL[st]}</span>
      </div>
      <h3 className="phase-name">{p.name}</h3>
      <p className="small muted">
        {formatCN(p.startDate)} → {formatCN(p.endDate)}
      </p>
      {p.goal && <p className="phase-goal">🎯 {p.goal}</p>}
      {p.sessionGoal && <p className="small">每次目標：{p.sessionGoal}</p>}
      {p.items.length > 0 && (
        <div className="items">
          {p.items.map((it) => (
            <span key={it} className="item-chip">{it}</span>
          ))}
        </div>
      )}

      <div className="week-strip">
        {ORDER.map((wd) => {
          const d = p.weekly[wd];
          return (
            <div key={wd} className={'ws-day' + (d.rest ? ' rest' : '')}>
              <span className="ws-label">{WEEKDAY_LABEL[wd]}</span>
              <span className="ws-icons">
                {d.rest ? (
                  <PixelIcon name="moon" size={12} color="#86b6d9" />
                ) : d.types.length ? (
                  d.types.slice(0, 2).map((t) => <PixelIcon key={t} name={TYPE_ICON[t]} size={12} color={TYPE_COLOR[t]} />)
                ) : (
                  <span className="muted tiny">–</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <ProgressBar pct={prog.percent} tone="yellow" />
      <p className="small">
        完成進度 {prog.done}/{prog.totalScheduled} 個訓練日（{prog.percent}%）・{prog.sessions} 筆・{prog.minutes} 分鐘
        {st === 'active' && <>・到今天應訓練 {prog.elapsedScheduled} 天</>}
      </p>
      {st === 'upcoming' && <p className="small muted">還沒開始，倒數 {diffDays(today, p.startDate)} 天</p>}
      {st === 'awaitingReview' && <p className="small">⏰ 階段時間到了！寫下回顧並按「完成」即可通關（不會算失敗）。</p>}
      {p.status === 'completed' && p.review && <p className="review">📖 回顧：{p.review}</p>}

      <div className="phase-actions">
        <Btn small variant="ghost" onClick={onView}>紀錄</Btn>
        <Btn small variant="ghost" onClick={onEdit}>編輯</Btn>
        {p.status === 'active' && <Btn small variant="ghost" onClick={pause}>暫停</Btn>}
        {p.status === 'paused' && <Btn small variant="blue" onClick={resume}>恢復</Btn>}
        {p.status !== 'completed' && <Btn small variant="ghost" onClick={extend}>延長 7 天</Btn>}
        {p.status !== 'completed' && <Btn small variant="pink" onClick={() => { setReview(p.review); setReviewOpen(true); }}>完成・回顧</Btn>}
        {p.status === 'completed' && <Btn small variant="ghost" onClick={reopen}>重新開啟</Btn>}
        <Btn small variant="danger" onClick={() => setConfirmDel(true)}>刪除</Btn>
      </div>

      <Dialog
        open={reviewOpen}
        title="階段結束回顧"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setReviewOpen(false)}>取消</Btn>
            <Btn variant="pink" onClick={complete}>完成階段</Btn>
          </>
        }
      >
        <p className="small">
          「{p.name}」共完成 {prog.done}/{prog.totalScheduled} 個訓練日、{prog.minutes} 分鐘。寫下這個階段的心得吧：
        </p>
        <textarea rows={4} value={review} onChange={(e) => setReview(e.target.value)} placeholder="例如：跑步變輕鬆了、最喜歡週三的核心課…" aria-label="階段回顧" />
      </Dialog>

      <Dialog
        open={confirmDel}
        title="刪除這個階段？"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setConfirmDel(false)}>取消</Btn>
            <Btn variant="danger" onClick={async () => { await deletePhase(p.id); setConfirmDel(false); toast('階段已刪除（運動紀錄會保留）', 'info'); }}>
              確定刪除
            </Btn>
          </>
        }
      >
        <p>只會刪除「{p.name}」這個計畫，已登記的運動紀錄不會被刪除。</p>
      </Dialog>
    </Panel>
  );
}

function PhaseEditor({ initial, isNew, onDone }: { initial: Phase; isNew: boolean; onDone: () => void }) {
  const { savePhase, toast, sfx } = useStore();
  const [p, setP] = useState<Phase>(initial);
  const [itemsText, setItemsText] = useState(initial.items.join('、'));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setDay = (wd: number, patch: Partial<DayPlan>) =>
    setP((o) => ({ ...o, weekly: o.weekly.map((d, i) => (i === wd ? { ...d, ...patch } : d)) }));

  const toggleType = (wd: number, t: ExerciseType) => {
    const d = p.weekly[wd];
    const types = d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t];
    setDay(wd, { types, rest: false });
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!p.name.trim()) err.name = '請填寫階段名稱';
    if (!p.startDate) err.startDate = '請選擇開始日期';
    if (!p.endDate) err.endDate = '請選擇結束日期';
    if (p.startDate && p.endDate && p.endDate < p.startDate) err.endDate = '結束日期不能早於開始日期';
    if (!p.weekly.some((d) => !d.rest && d.types.length)) err.weekly = '每週至少安排一天訓練（選擇運動類型）';
    setErrors(err);
    if (Object.keys(err).length) {
      sfx.error();
      toast('有欄位需要修正喔', 'err');
      return;
    }
    const items = itemsText.split(/[、,，\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
    await savePhase({ ...p, name: p.name.trim(), goal: p.goal.trim(), sessionGoal: p.sessionGoal.trim(), items });
    sfx.success();
    toast(isNew ? '已新增訓練階段' : '訓練階段已更新');
    onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="phase-form">
      <Field label="階段名稱" required error={errors.name}>
        <input value={p.name} maxLength={40} placeholder="例如：第五階段：肌耐力" onChange={(e) => setP({ ...p, name: e.target.value })} />
      </Field>
      <div className="grid2">
        <Field label="開始日期" required error={errors.startDate}>
          <input type="date" value={p.startDate} onChange={(e) => setP({ ...p, startDate: e.target.value })} />
        </Field>
        <Field label="結束日期" required error={errors.endDate}>
          <input type="date" value={p.endDate} min={p.startDate} onChange={(e) => setP({ ...p, endDate: e.target.value })} />
        </Field>
      </div>
      <Field label="訓練目標">
        <input value={p.goal} maxLength={80} placeholder="例如：體脂下降 2%" onChange={(e) => setP({ ...p, goal: e.target.value })} />
      </Field>
      <Field label="訓練項目" hint="用頓號或逗號分隔">
        <input value={itemsText} placeholder="慢跑、棒式、深蹲" onChange={(e) => setItemsText(e.target.value)} />
      </Field>
      <Field label="每次訓練目標">
        <input value={p.sessionGoal} maxLength={80} placeholder="例如：30 分鐘、心率 130 以上" onChange={(e) => setP({ ...p, sessionGoal: e.target.value })} />
      </Field>

      <div className="field">
        <span className="field-label">每週訓練安排<em className="req">*</em></span>
        {errors.weekly && <span className="field-error">{errors.weekly}</span>}
        <div className="week-editor">
          {ORDER.map((wd) => {
            const d = p.weekly[wd];
            return (
              <div key={wd} className={'we-row' + (d.rest ? ' rest' : '')}>
                <div className="we-head">
                  <b>週{WEEKDAY_LABEL[wd]}</b>
                  <button type="button" className={'chip' + (d.rest ? ' on rest-chip' : '')} aria-pressed={d.rest} onClick={() => setDay(wd, { rest: !d.rest, types: d.rest ? d.types : [] })}>
                    🌙 休息日
                  </button>
                </div>
                {!d.rest && (
                  <div className="chips">
                    {EXERCISE_TYPES.map((t) => (
                      <button type="button" key={t} aria-pressed={d.types.includes(t)} className={'chip' + (d.types.includes(t) ? ' on' : '')} style={{ ['--tc' as string]: TYPE_COLOR[t] }} onClick={() => toggleType(wd, t)}>
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
                <input className="we-note" value={d.note} maxLength={40} placeholder={d.rest ? '休息備註（選填）' : '當天備註，例如：間歇跑 6 趟'} onChange={(e) => setDay(wd, { note: e.target.value })} aria-label={`週${WEEKDAY_LABEL[wd]}備註`} />
              </div>
            );
          })}
        </div>
      </div>

      <Btn type="submit" className="btn-block">{isNew ? '建立階段' : '儲存修改'}</Btn>
    </form>
  );
}

function PhaseHistory({ p }: { p: Phase }) {
  const { records, today } = useStore();
  const prog = phaseProgress(p, records, today);
  const list = records.filter((r) => r.date >= p.startDate && r.date <= p.endDate);
  return (
    <div>
      <h3 className="phase-name">{p.name}</h3>
      <p className="small muted">
        {formatCN(p.startDate)} → {formatCN(p.endDate)}・{PHASE_STATE_LABEL[phaseState(p, today)]}
      </p>
      <div className="mini-stats">
        <div><span className="pf">{prog.activeDays}</span><small>運動天數</small></div>
        <div><span className="pf">{prog.sessions}</span><small>紀錄筆數</small></div>
        <div><span className="pf">{prog.minutes}</span><small>總分鐘</small></div>
        <div><span className="pf">{prog.percent}%</span><small>完成度</small></div>
      </div>
      {p.review && <p className="review">📖 {p.review}</p>}
      {list.length ? <RecordList records={list} /> : <Empty icon="calendar" title="這段期間還沒有紀錄" />}
    </div>
  );
}
