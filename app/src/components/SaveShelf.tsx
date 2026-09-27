// Ячейки памяти одной игры: автослот плюс три ручные, с картинкой экрана,
// временем и выгрузкой в файл. IndexedDB стирается вместе с кешем браузера,
// поэтому кнопка «Скачать» здесь не каприз, а единственная страховка.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './core';
import {
  deleteSlot,
  exportSlot,
  formatBytes,
  importSaveFile,
  slotLabel,
  type SaveRecord,
  type SaveSlot
} from '../media/saves';
import type { Rom } from '../data/roms';

function playtime(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'меньше минуты';
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

function Thumb({ blob }: { blob?: Blob }) {
  // Ссылку считаем при рендере, а эффект нужен только чтобы её освободить.
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ''), [blob]);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );

  if (!url) return <div className="saveSlot__thumb saveSlot__thumb--empty pixel">пусто</div>;
  return <img className="saveSlot__thumb" src={url} alt="" />;
}

export function SaveShelf({
  rom,
  slots,
  manualSlots,
  onClose,
  onSave,
  onLoad,
  onChanged
}: {
  rom: Rom;
  slots: SaveRecord[];
  manualSlots: SaveSlot[];
  onClose: () => void;
  onSave: (slot: SaveSlot) => void;
  onLoad: (slot: SaveSlot) => void;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const bySlot = useMemo(() => {
    const map = new Map<SaveSlot, SaveRecord>();
    for (const record of slots) map.set(record.slot, record);
    return map;
  }, [slots]);

  const total = slots.reduce(
    (sum, item) => sum + item.state.size + (item.sram?.size ?? 0) + (item.thumb?.size ?? 0),
    0
  );

  const order: SaveSlot[] = ['auto', ...manualSlots];

  return (
    <Modal title={`Память · ${rom.title}`} onClose={onClose}>
      <div className="saveShelf">
        {order.map((slot) => {
          const record = bySlot.get(slot);
          return (
            <div className="saveSlot" key={slot}>
              <Thumb blob={record?.thumb} />
              <div className="saveSlot__body">
                <div className="display display--s">{slotLabel(slot)}</div>
                {record ? (
                  <div className="mono saveSlot__meta">
                    {new Date(record.savedAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    <br />
                    в игре {playtime(record.playedMs)} ·{' '}
                    {formatBytes(record.state.size + (record.sram?.size ?? 0))}
                    {record.sram ? ' · с батарейкой' : ''}
                  </div>
                ) : (
                  <div className="mono saveSlot__meta">Ячейка свободна</div>
                )}

                <div className="row saveSlot__row">
                  <button className="btn btn--sm" onClick={() => onLoad(slot)} disabled={!record}>
                    Загрузить
                  </button>
                  {slot === 'auto' ? null : (
                    <button className="btn btn--sm" onClick={() => onSave(slot)}>
                      Записать
                    </button>
                  )}
                  <button
                    className="btn btn--sm"
                    disabled={!record}
                    onClick={() => {
                      if (record) void exportSlot(record, rom.title);
                    }}
                  >
                    Скачать
                  </button>
                  <button
                    className="btn btn--sm"
                    disabled={!record}
                    onClick={() => {
                      void deleteSlot(rom.id, slot).then(() => {
                        setMessage(`${slotLabel(slot)} очищена.`);
                        onChanged();
                      });
                    }}
                  >
                    Стереть
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn btn--sm" onClick={() => fileRef.current?.click()}>
          Загрузить из файла
        </button>
        <span className="mono">Занято {formatBytes(total)}</span>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".vidiksave"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          void importSaveFile(file)
            .then((record) => {
              setMessage(
                record.romId === rom.id
                  ? `Загрузили в ${slotLabel(record.slot).toLowerCase()}.`
                  : 'Файл от другой игры — он сохранён, открой ту игру.'
              );
              onChanged();
            })
            .catch((error: unknown) => {
              setMessage(error instanceof Error ? error.message : 'Файл не подошёл');
            });
        }}
      />

      {message ? (
        <p className="mono" style={{ marginTop: 12, color: 'var(--amber)' }} role="status">
          {message}
        </p>
      ) : null}

      <p className="mono saveShelf__hint">
        Автослот пишется сам каждые полминуты и при выходе со страницы. Сохранёнки лежат в
        браузере и исчезнут, если почистить его данные, — важное лучше скачать файлом.
      </p>
    </Modal>
  );
}
