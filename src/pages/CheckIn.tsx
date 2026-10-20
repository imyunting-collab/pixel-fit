import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { EXERCISE_TYPES, TYPE_LABEL, type ExerciseType } from '../types';
import { RecordForm } from '../components/RecordForm';
import { RecordList } from '../components/RecordList';
import { Empty, Panel } from '../components/ui';
import { sumMinutes } from '../logic/stats';

export function CheckIn() {
  const { preset, records } = useStore();
  const [type, setType] = useState<ExerciseType | 'all'>('all');
  const [month, setMonth] = useState<string>('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(20);

  const months = useMemo(() => [...new Set(records.map((r) => r.date.slice(0, 7)))].sort().reverse(), [records]);
  const filtered = records.filter(
    (r) =>
      (type === 'all' || r.type === type) &&
      (month === 'all' || r.date.startsWith(month)) &&
      (!q.trim() || (r.name + r.note).toLowerCase().includes(q.trim().toLowerCase())),
  );
  const sorted = [...filtered].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));

  return (
    <div className="page">
      <header className="top">
        <h1 className="pf-title">CHECK IN</h1>
        <span className="top-date">運動打卡</span>
      </header>

      <Panel title="新增運動紀錄" icon="plus" tone="mint">
        <RecordForm presetDate={preset.date} presetType={preset.type} presetNonce={preset.nonce} />
      </Panel>

      <Panel title="歷史紀錄" icon="clock" right={<span className="small muted">{filtered.length} 筆・{sumMinutes(filtered)} 分</span>}>
        <div className="filters">
          <div className="chips" role="group" aria-label="篩選運動類型">
            <button className={'chip' + (type === 'all' ? ' on' : '')} onClick={() => setType('all')}>全部</button>
            {EXERCISE_TYPES.map((t) => (
              <button key={t} className={'chip' + (type === t ? ' on' : '')} onClick={() => setType(t)}>
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="grid2">
            <select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="篩選月份">
              <option value="all">所有月份</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m.replace('-', ' 年 ')} 月
                </option>
              ))}
            </select>
            <input type="search" placeholder="搜尋名稱或備註" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜尋紀錄" />
          </div>
        </div>
        {records.length === 0 ? (
          <Empty icon="shoe" title="還沒有任何紀錄">在上方完成第一次打卡，冒險就開始了！</Empty>
        ) : sorted.length === 0 ? (
          <Empty icon="star" title="找不到符合條件的紀錄">試試看調整篩選條件。</Empty>
        ) : (
          <>
            <RecordList records={sorted.slice(0, limit)} />
            {sorted.length > limit && (
              <button className="btn btn-ghost btn-block" onClick={() => setLimit((l) => l + 20)}>
                顯示更多（還有 {sorted.length - limit} 筆）
              </button>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
