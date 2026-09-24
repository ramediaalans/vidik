import { Suspense, lazy, useMemo, useState } from 'react';
import { Modal, SectionHeader } from './core';
import { asset } from '../media/asset';
import { roms, romPlatforms } from '../data/roms';
import { romArt, romArtNoText } from '../data/rom-art';
import type { Rom } from '../data/roms';

const Emulator = lazy(() => import('./Emulator').then((m) => ({ default: m.Emulator })));

export function CartridgeShelf() {
  const [platform, setPlatform] = useState('Все');
  const [active, setActive] = useState<Rom | null>(null);

  const visible = useMemo(
    () => (platform === 'Все' ? roms : roms.filter((r) => r.platform === platform)),
    [platform]
  );

  return (
    <section className="section container">
      <SectionHeader
        index="Играет в браузере"
        title="Полка с картриджами"
        note={`${roms.length} игр запускаются прямо здесь, без установки. Играть можно вдвоём на одной клавиатуре.`}
      />

      <div className="row" style={{ marginBottom: 28 }}>
        <span className="mono">Приставка:</span>
        {romPlatforms.map((p) => (
          <button
            key={p}
            className={`chip${platform === p ? ' chip--active' : ''}`}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="cart-grid">
        {visible.map((rom) => (
          <button
            key={rom.id}
            className="cart"
            onClick={() => setActive(rom)}
            aria-label={`Запустить ${rom.title}, ${rom.platform}, ${rom.year}`}
          >
            <span className="cart__label">
              <span className="cart__art">
                {romArt[rom.id] ? (
                  <img src={asset(romArt[rom.id])} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="cart__artStub pixel">{rom.platform.split(' ')[0]}</span>
                )}
              </span>
              {/* если арт уже содержит надпись — свою не дублируем */}
              {romArt[rom.id] && !romArtNoText.includes(rom.id) ? null : (
                <span className="cart__name display">{rom.title}</span>
              )}
              <span className="cart__meta pixel">
                {rom.year} · {rom.genre}
              </span>
            </span>
            <span className="cart__foot">
              <span className="mono">{rom.platform}</span>
              <span className="pixel">{rom.players === 2 ? '1–2 игрока' : '1 игрок'}</span>
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <Modal title={`${active.title} · ${active.platform}`} onClose={() => setActive(null)}>
          <Suspense fallback={<div className="pixel">Греется приставка…</div>}>
            <Emulator rom={active} />
          </Suspense>
          <div className="stack" style={{ marginTop: 20 }}>
            <h3 className="display display--m">{active.title}</h3>
            <div className="mono">
              {active.year} · {active.genre} · во дворе звали «{active.nick}»
            </div>
            <p className="lead" style={{ color: 'var(--amber)' }}>«{active.memory}»</p>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
