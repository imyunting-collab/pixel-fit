import { useState } from 'react';
import { useStore } from '../store';
import { TYPE_LABEL, type WorkoutRecord } from '../types';
import { formatCN } from '../logic/dates';
import { PixelIcon, TYPE_COLOR, TYPE_ICON } from './pixel';
import { Btn, Dialog, Sheet } from './ui';
import { RecordForm } from './RecordForm';

export function RecordItem({ r, onEdit, onDelete }: { r: WorkoutRecord; onEdit: () => void; onDelete: () => void }) {
  const { exp } = useStore();
  const e = exp.perRecord.get(r.id) ?? 0;
  const extras = [
    r.distance !== undefined ? `${r.distance} 公里` : '',
    r.sets !== undefined ? `${r.sets} 組${r.reps !== undefined ? ` × ${r.reps} 下` : ''}` : r.reps !== undefined ? `${r.reps} 下` : '',
    r.weight !== undefined ? `${r.weight} 公斤` : '',
  ].filter(Boolean);
  return (
    <li className="rec">
      <div className="rec-icon" style={{ background: TYPE_COLOR[r.type] }}>
        <PixelIcon name={TYPE_ICON[r.type]} size={20} color="#4a3426" />
      </div>
      <div className="rec-main">
        <div className="rec-title">
          <b>{r.name}</b>
          <span className="rec-mood">{r.mood}</span>
        </div>
        <div className="rec-meta">
          {TYPE_LABEL[r.type]}・{r.duration} 分鐘{extras.length ? '・' + extras.join('・') : ''}
        </div>
        <div className="rec-meta">
          身體：{r.body}
          {r.note && <span className="rec-note">「{r.note}」</span>}
        </div>
      </div>
      <div className="rec-side">
        <span className={'pf rec-exp' + (e ? '' : ' zero')}>+{e}</span>
        <div className="rec-actions">
          <button className="mini" onClick={onEdit} aria-label={`編輯 ${r.name}`}>
            編輯
          </button>
          <button className="mini danger" onClick={onDelete} aria-label={`刪除 ${r.name}`}>
            刪除
          </button>
        </div>
      </div>
    </li>
  );
}

/** 依日期分組的紀錄列表，內建編輯與刪除流程 */
export function RecordList({ records, groupByDate = true }: { records: WorkoutRecord[]; groupByDate?: boolean }) {
  const { deleteRecord, toast } = useStore();
  const [editing, setEditing] = useState<WorkoutRecord | null>(null);
  const [deleting, setDeleting] = useState<WorkoutRecord | null>(null);

  const sorted = [...records].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
  const groups: [string, WorkoutRecord[]][] = [];
  for (const r of sorted) {
    const g = groups[groups.length - 1];
    if (groupByDate && g && g[0] === r.date) g[1].push(r);
    else if (groupByDate) groups.push([r.date, [r]]);
    else if (g) g[1].push(r);
    else groups.push(['', [r]]);
  }

  return (
    <>
      {groups.map(([date, list]) => (
        <div key={date || 'all'} className="rec-group">
          {date && <div className="rec-date">{formatCN(date)}</div>}
          <ul className="rec-list">
            {list.map((r) => (
              <RecordItem key={r.id} r={r} onEdit={() => setEditing(r)} onDelete={() => setDeleting(r)} />
            ))}
          </ul>
        </div>
      ))}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="編輯紀錄">
        {editing && <RecordForm record={editing} onDone={() => setEditing(null)} />}
      </Sheet>

      <Dialog
        open={!!deleting}
        title="刪除紀錄？"
        actions={
          <>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>
              取消
            </Btn>
            <Btn
              variant="danger"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteRecord(deleting.id);
                  toast('紀錄已刪除，統計與 EXP 已同步更新', 'info');
                } catch {
                  toast('刪除失敗，請再試一次', 'err');
                }
                setDeleting(null);
              }}
            >
              確定刪除
            </Btn>
          </>
        }
      >
        {deleting && (
          <p>
            要刪除 {formatCN(deleting.date)} 的「{deleting.name}」嗎？
            <br />
            這筆紀錄帶來的 EXP 會一併扣回（已解鎖的稱號提示不會重複出現）。
          </p>
        )}
      </Dialog>
    </>
  );
}
