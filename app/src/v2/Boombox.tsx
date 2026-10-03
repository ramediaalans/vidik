// Магнитофон в разделе «Музыка»: кнопка «Сеть», крутящиеся ролики, бегущая строка
// на шкале и пульт с горячими клавишами. Играет тот же сборник, что во вкладыше ниже.
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../media/playerContext';
import { asset } from '../media/asset';
import { hotkeyChar, isTypingTarget } from '../media/hotkeys';
import { tracks } from '../data/tracks';
import type { MixTrack } from './MixTape';
import './boombox.css';

export function Boombox({ mix }: { mix: MixTrack[] }) {
  const { play, pause, playing, current, status } = usePlayer();
  const [on, setOn] = useState(false);
  const lastPos = useRef(-1);

  const pos = current ? mix.findIndex((t) => t.artist === current.artist && t.title === current.title) : -1;

  // Включили песню из вкладыша мышкой — магнитофон тоже «включается».
  useEffect(() => {
    if (playing) setOn(true);
  }, [playing]);

  // Песня из сборника кончилась и плеер ушёл дальше по общей полке — возвращаем на сборник.
  useEffect(() => {
    if (pos >= 0) {
      lastPos.current = pos;
      return;
    }
    const last = lastPos.current;
    if (!on || last < 0 || !current || !mix[last]) return;
    const natural = tracks[mix[last].index + 1];
    if (natural && natural.artist === current.artist && natural.title === current.title) {
      play(mix[(last + 1) % mix.length].index);
    }
  }, [pos, current, on, mix, play]);

  const goTo = useCallback(
    (i: number) => {
      if (!mix.length) return;
      setOn(true);
      play(mix[(i + mix.length) % mix.length].index);
    },
    [mix, play]
  );

  const power = useCallback(() => {
    if (on) {
      pause();
      setOn(false);
      lastPos.current = -1;
    } else {
      goTo(pos >= 0 ? pos : 0);
    }
  }, [on, pause, goTo, pos]);

  const toggle = useCallback(() => {
    if (!on) return goTo(pos >= 0 ? pos : 0);
    if (playing) pause();
    else goTo(pos >= 0 ? pos : 0);
  }, [on, playing, pause, goTo, pos]);

  const next = useCallback(() => goTo((pos >= 0 ? pos : -1) + 1), [goTo, pos]);
  const prev = useCallback(() => goTo((pos >= 0 ? pos : 1) - 1), [goTo, pos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = hotkeyChar(e);
      if (key === ' ' || key === 'k') {
        // Пробел на сфокусированной кнопке и так её нажмёт — не дублируем.
        if (key === ' ' && e.target instanceof HTMLElement && e.target.closest('button, a')) return;
        e.preventDefault();
        toggle();
      } else if (key === 'ArrowRight' || key === 'l') {
        e.preventDefault();
        next();
      } else if (key === 'ArrowLeft' || key === 'j') {
        e.preventDefault();
        prev();
      } else if (key === 'p') {
        e.preventDefault();
        power();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, next, prev, power]);

  const spinning = on && playing;
  const line = !on
    ? ''
    : current
      ? `${current.artist} — ${current.title}`
      : status === 'loading'
        ? 'Заряжаем кассету…'
        : 'Кассета вставлена';
  const num = pos >= 0 ? `${pos < 6 ? 'А' : 'Б'}${(pos % 6) + 1}` : '';

  return (
    <div className="bbox">
      <div className={`bbox__set${on ? ' is-on' : ''}${spinning ? ' is-spinning' : ''}`}>
        <img className="bbox__img" src={asset('/images/music/boombox.webp')} alt="Магнитофон с кассетой" draggable={false} />
        <span className="bbox__reel bbox__reel--l" aria-hidden="true" />
        <span className="bbox__reel bbox__reel--r" aria-hidden="true" />
        <div className="bbox__shade" aria-hidden="true" />
        <div className="bbox__vfd" aria-live="polite">
          {on ? (
            <>
              {num ? <span className="bbox__num">{num}</span> : null}
              <span className="bbox__run">
                <span className="bbox__track" key={line} style={{ animationDuration: `${Math.max(8, line.length * 0.32)}s` }}>
                  <span>{line}</span>
                  <span aria-hidden="true">{line}</span>
                </span>
              </span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className={`bbox__power${on ? ' is-on' : ''}`}
          onClick={power}
          aria-pressed={on}
          aria-label={on ? 'Выключить магнитофон' : 'Включить магнитофон'}
          title={on ? 'Выключить' : 'Включить'}
        >
          <span className="bbox__cap" />
        </button>
        <span className={`bbox__plate${on ? ' is-on' : ''}`} aria-hidden="true">
          <span className="bbox__led" />
          <span className="bbox__plabel">Сеть</span>
        </span>
      </div>

      <div className="bbox__keys" role="toolbar" aria-label="Кнопки магнитофона">
        <button type="button" className={`bbox__key${on ? ' is-on' : ''}`} onClick={power}>
          <span className="bbox__ico">⏻</span>
          <span>Сеть</span>
          <kbd>P</kbd>
        </button>
        <button type="button" className="bbox__key" onClick={prev}>
          <span className="bbox__ico">◀◀</span>
          <span>Назад</span>
          <kbd>←</kbd>
        </button>
        <button type="button" className={`bbox__key bbox__key--main${spinning ? ' is-on' : ''}`} onClick={toggle}>
          <span className="bbox__ico">{spinning ? '‖' : '▶'}</span>
          <span>{spinning ? 'Пауза' : 'Плей'}</span>
          <kbd>Пробел</kbd>
        </button>
        <button type="button" className="bbox__key" onClick={next}>
          <span className="bbox__ico">▶▶</span>
          <span>Вперёд</span>
          <kbd>→</kbd>
        </button>
      </div>
    </div>
  );
}
