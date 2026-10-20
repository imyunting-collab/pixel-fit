import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { BODY_STATES, EXERCISE_TYPES, MOODS, TYPE_FIELDS, TYPE_LABEL, type ExerciseType, type WorkoutRecord } from '../types';
import { Btn, Field } from './ui';
import { PixelIcon, TYPE_COLOR, TYPE_ICON } from './pixel';

interface Draft {
  date: string;
  type: ExerciseType;
  name: string;
  duration: string;
  distance: string;
  sets: string;
  reps: string;
  weight: string;
  body: string;
  mood: string;
  note: string;
}

const NAME_HINT: Record<ExerciseType, string> = {
  run: '例如：河濱慢跑',
  core: '例如：棒式＋捲腹',
  cardio: '例如：跳繩、飛輪',
  sculpt: '例如：深蹲、臀推',
  stretch: '例如：睡前瑜珈',
  custom: '例如：羽球',
};

function toDraft(r?: Partial<WorkoutRecord>, date?: string, type?: ExerciseType): Draft {
  const s = (n?: number) => (n === undefined || n === null ? '' : String(n));
  return {
    date: r?.date ?? date ?? '',
    type: r?.type ?? type ?? 'run',
    name: r?.name ?? '',
    duration: s(r?.duration),
    distance: s(r?.distance),
    sets: s(r?.sets),
    reps: s(r?.reps),
    weight: s(r?.weight),
    body: r?.body ?? '狀態不錯',
    mood: r?.mood ?? '😊',
    note: r?.note ?? '',
  };
}

type Errors = Partial<Record<keyof Draft, string>>;

export function RecordForm({ record, presetDate, presetType, presetNonce, onDone }: {
  record?: WorkoutRecord;
  presetDate?: string;
  presetType?: ExerciseType;
  presetNonce?: number;
  onDone?: (r: WorkoutRecord) => void;
}) {
  const { today, saveRecord, toast, sfx } = useStore();
  const [d, setD] = useState<Draft>(() => toDraft(record, presetDate || today, presetType));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // 從首頁 / 月曆帶入預設日期與類型
  useEffect(() => {
    if (record) return;
    setD((old) => ({ ...old, date: presetDate || old.date || today, type: presetType || old.type }));
    setErrors({});
  }, [presetNonce, presetDate, presetType, record, today]);

  const f = TYPE_FIELDS[d.type];
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((o) => ({ ...o, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!d.date) e.date = '請選擇日期';
    else if (d.date > today) e.date = '不能登記未來的日期';
    if (!d.name.trim()) e.name = '請填寫運動名稱';
    else if (d.name.trim().length > 40) e.name = '名稱最多 40 個字';
    const dur = Number(d.duration);
    if (!d.duration.trim()) e.duration = '請填寫運動時間';
    else if (!Number.isFinite(dur) || dur <= 0) e.duration = '請輸入大於 0 的分鐘數';
    else if (dur > 600) e.duration = '單次最多 600 分鐘';
    const opt = (k: 'distance' | 'sets' | 'reps' | 'weight', max: number, int = false) => {
      if (!d[k].trim()) return;
      const n = Number(d[k]);
      if (!Number.isFinite(n) || n < 0) e[k] = '請輸入 0 以上的數字';
      else if (n > max) e[k] = `最多 ${max}`;
      else if (int && !Number.isInteger(n)) e[k] = '請輸入整數';
    };
    if (f.distance) opt('distance', 300);
    if (f.sets) {
      opt('sets', 100, true);
      opt('reps', 1000, true);
    }
    if (f.weight) opt('weight', 500);
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      sfx.error();
      toast('有欄位需要修正喔', 'err');
      return;
    }
    const num = (v: string, on: boolean) => (on && v.trim() ? Number(v) : undefined);
    setSaving(true);
    try {
      const res = await saveRecord({
        id: record?.id,
        date: d.date,
        type: d.type,
        name: d.name.trim(),
        duration: Math.round(Number(d.duration) * 10) / 10,
        distance: num(d.distance, f.distance),
        sets: num(d.sets, f.sets),
        reps: num(d.reps, f.sets),
        weight: num(d.weight, f.weight),
        body: d.body,
        mood: d.mood,
        note: d.note.trim(),
      });
      sfx.success();
      if (res.isNew) {
        toast(res.gained > 0 ? `任務完成！獲得 +${res.gained} EXP` : '打卡完成！（5 分鐘以上才會獲得 EXP）');
        setD(toDraft(undefined, d.date, d.type));
      } else {
        toast(res.gained === 0 ? '紀錄已更新' : `紀錄已更新，EXP ${res.gained > 0 ? '+' : ''}${res.gained}`, 'info');
      }
      onDone?.(res.record);
    } catch (err) {
      sfx.error();
      toast('儲存失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'err');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <div className="type-grid" role="radiogroup" aria-label="運動類型">
        {EXERCISE_TYPES.map((t) => (
          <button
            type="button"
            key={t}
            role="radio"
            aria-checked={d.type === t}
            className={'type-chip' + (d.type === t ? ' on' : '')}
            style={{ ['--tc' as string]: TYPE_COLOR[t] }}
            onClick={() => set('type', t)}
          >
            <PixelIcon name={TYPE_ICON[t]} size={18} color="#4a3426" />
            <span>{TYPE_LABEL[t]}</span>
          </button>
        ))}
      </div>

      <div className="grid2">
        <Field label="日期" required error={errors.date} hint={d.date && d.date < today ? '補登過去的紀錄' : undefined}>
          <input type="date" value={d.date} max={today} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="運動時間（分鐘）" required error={errors.duration}>
          <input type="number" inputMode="decimal" min={1} max={600} value={d.duration} placeholder="30" onChange={(e) => set('duration', e.target.value)} />
        </Field>
      </div>

      <Field label="運動名稱" required error={errors.name}>
        <input type="text" value={d.name} maxLength={40} placeholder={NAME_HINT[d.type]} onChange={(e) => set('name', e.target.value)} />
      </Field>

      {(f.distance || f.sets || f.weight) && (
        <div className="grid2">
          {f.distance && (
            <Field label="距離（公里）" hint="選填" error={errors.distance}>
              <input type="number" inputMode="decimal" min={0} step="0.01" value={d.distance} placeholder="5" onChange={(e) => set('distance', e.target.value)} />
            </Field>
          )}
          {f.weight && (
            <Field label="重量（公斤）" hint="選填" error={errors.weight}>
              <input type="number" inputMode="decimal" min={0} step="0.5" value={d.weight} placeholder="10" onChange={(e) => set('weight', e.target.value)} />
            </Field>
          )}
          {f.sets && (
            <>
              <Field label="組數" hint="選填" error={errors.sets}>
                <input type="number" inputMode="numeric" min={0} value={d.sets} placeholder="3" onChange={(e) => set('sets', e.target.value)} />
              </Field>
              <Field label="每組次數" hint="選填" error={errors.reps}>
                <input type="number" inputMode="numeric" min={0} value={d.reps} placeholder="12" onChange={(e) => set('reps', e.target.value)} />
              </Field>
            </>
          )}
        </div>
      )}

      <Field label="當天身體狀態">
        <select value={d.body} onChange={(e) => set('body', e.target.value)}>
          {BODY_STATES.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>

      <div className="field">
        <span className="field-label">心情</span>
        <div className="mood-row" role="radiogroup" aria-label="心情">
          {MOODS.map((m) => (
            <button type="button" role="radio" aria-checked={d.mood === m} key={m} className={'mood' + (d.mood === m ? ' on' : '')} onClick={() => set('mood', m)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <Field label="備註" hint="選填">
        <textarea rows={2} value={d.note} maxLength={500} placeholder="今天的感覺、心得…" onChange={(e) => set('note', e.target.value)} />
      </Field>

      <Btn type="submit" disabled={saving} className="btn-block">
        {saving ? '儲存中…' : record ? '儲存修改' : '完成打卡 ★'}
      </Btn>
    </form>
  );
}
