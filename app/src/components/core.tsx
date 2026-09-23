import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}

const BOOT_LINES = [
  'ВИДИК BIOS v1.998 · память 640K — хватит всем',
  'проверка кассетоприёмника… ок',
  'поиск телевизионных каналов… найдено 6',
  'подключение к модему… пиии-ш-ш-ш',
  'загрузка воспоминаний 1990–2005… готово'
];

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      onDone();
      return;
    }
    const timers = BOOT_LINES.map((_, i) => window.setTimeout(() => setVisible(i + 1), 320 * (i + 1)));
    const end = window.setTimeout(onDone, 320 * BOOT_LINES.length + 700);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(end);
    };
  }, [onDone]);

  return (
    <div className="boot" role="status" aria-live="polite">
      {BOOT_LINES.slice(0, visible).map((line) => (
        <div className="boot__line" key={line}>
          &gt; {line}
        </div>
      ))}
      <button className="btn btn--sm boot__skip" onClick={onDone}>
        Пропустить загрузку
      </button>
    </div>
  );
}

export function SectionHeader({
  index,
  title,
  note,
  action
}: {
  index: string;
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sec-head">
      <div>
        <div className="sec-head__index">{index}</div>
        <h2 className="display display--l">{title}</h2>
        {note ? <p className="lead" style={{ marginTop: 12 }}>{note}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Marquee({ items }: { items: string[] }) {
  const line = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {line.map((item, i) => (
          <span key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>(selector)).filter(
        (n) => n.offsetParent !== null
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal__win"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal__bar">
          <span className="mono">{title}</span>
          <button className="btn btn--sm" onClick={onClose}>
            Закрыть ✕
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
