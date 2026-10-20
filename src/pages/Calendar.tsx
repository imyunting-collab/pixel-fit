import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { formatCN, pad, toISO, WEEKDAY_LABEL } from '../logic/dates';
import { byDate, isRestDay, isTrainingDay, monthStats } from '../logic/stats';
import { PixelIcon } from '../components/pixel';
import { Btn, Empty, Panel } from '../components/ui';
import { RecordList } from '../components/RecordList';

export function Calendar() {
  const { records, phases, today, goCheckIn } = useStore();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string>(today);

  const [y, m] = ym.split('-').map(Number);
  const map = useMemo(() => byDate(records), [records]);
  const stats = monthStats(records, ym, today);

  // 該日期屬於哪個（未暫停的）階段，用來標記休息日 / 訓練日
  const phaseFor = (d: string) =>
    [...phases]
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
      .find((p) => p.status !== 'paused' && d >= p.startDate && d <= p.endDate);

  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // 週一開頭
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${ym}-${pad(i + 1)}`)];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setYm(toISO(d).slice(0, 7));
  };

  const selRecords = map.get(selected) || [];
  const selPhase = phaseFor(selected);

  return (
    <div className="page">
      <header className="top">
        <h1 className="pf-title">CALENDAR</h1>
        <span className="top-date">打卡月曆</span>
      </header>

      <Panel tone="cream" className="cal-panel">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="上個月">◀</button>
          <div className="cal-title">
            <span className="pf">{y}.{pad(m)}</span>
            {ym !== today.slice(0, 7) && (
              <button className="link small" onClick={() => { setYm(today.slice(0, 7)); setSelected(today); }}>回到今天</button>
            )}
          </div>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="下個月">▶</button>
        </div>
        <div className="cal-grid cal-head">
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <span key={w} className={w === 0 || w === 6 ? 'we' : ''}>{WEEKDAY_LABEL[w]}</span>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map((d, i) => {
            if (!d) return <span key={i} className="cal-cell empty" />;
            const recs = d <= today ? map.get(d) || [] : [];
            const future = d > today;
            const ph = phaseFor(d);
            const rest = !recs.length && ph && isRestDay(ph, d);
            const planned = !recs.length && ph && isTrainingDay(ph, d);
            return (
              <button
                key={d}
                className={['cal-cell', future && 'future', d === today && 'today', d === selected && 'sel', recs.length && 'done', rest && 'rest'].filter(Boolean).join(' ')}
                onClick={() => setSelected(d)}
                aria-label={`${formatCN(d)}${recs.length ? `，已運動 ${recs.length} 筆` : rest ? '，休息日' : ''}`}
              >
                <span className="cal-day">{Number(d.slice(-2))}</span>
                <span className="cal-mark">
                  {recs.length ? (
                    <PixelIcon name={recs.length >= 2 ? 'star' : 'heart'} size={13} color={recs.length >= 2 ? '#e9b949' : '#e2687a'} />
                  ) : rest ? (
                    <PixelIcon name="moon" size={11} color="#86b6d9" />
                  ) : planned && !future && d < today ? (
                    <span className="dot-miss" />
                  ) : planned ? (
                    <span className="dot-plan" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className="legend small">
          <span><PixelIcon name="heart" size={11} color="#e2687a" /> 已運動</span>
          <span><PixelIcon name="star" size={11} color="#e9b949" /> 2 筆以上</span>
          <span><PixelIcon name="moon" size={11} color="#86b6d9" /> 休息日</span>
          <span><i className="dot-plan" /> 計畫訓練日</span>
        </div>
      </Panel>

      <div className="stat-row">
        <Panel tone="pink" className="stat">
          <span className="stat-label">{m} 月運動天數</span>
          <span className="stat-num pf">{stats.activeDays}<small>天</small></span>
        </Panel>
        <Panel tone="blue" className="stat">
          <span className="stat-label">{m} 月累積時間</span>
          <span className="stat-num pf">{stats.minutes}<small>分</small></span>
        </Panel>
      </div>

      <Panel title={formatCN(selected)} icon="calendar" tone="mint">
        {selected > today ? (
          <Empty icon="clock" title="這天還沒到喔">
            {selPhase && isRestDay(selPhase, selected) ? '依計畫是休息日 🌙' : selPhase && isTrainingDay(selPhase, selected) ? `計畫：${selPhase.name}` : '未來的日期不能打卡。'}
          </Empty>
        ) : (
          <>
            {selRecords.length ? <RecordList records={selRecords} groupByDate={false} /> : (
              <Empty icon={selPhase && isRestDay(selPhase, selected) ? 'moon' : 'heart'} title={selPhase && isRestDay(selPhase, selected) ? '休息日，沒有紀錄' : '這天沒有運動紀錄'} />
            )}
            <Btn className="btn-block" onClick={() => goCheckIn({ date: selected })}>
              {selected === today ? '＋ 今天打卡' : '＋ 補登這一天'}
            </Btn>
          </>
        )}
      </Panel>
    </div>
  );
}
