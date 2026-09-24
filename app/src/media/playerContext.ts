// Контракт кассетника вынесен из player.tsx отдельно: там живут только компоненты,
// иначе ломается fast refresh и ругается линтер.
import { createContext, useContext } from 'react';

export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'error';

export type PlayerApi = {
  status: PlayerStatus;
  visible: boolean;
  playing: boolean;
  current: { artist: string; title: string } | null;
  /** Запустить плейлист, при необходимости с конкретного трека. */
  play: (index?: number) => void;
  pause: () => void;
  toggleVisible: () => void;
};

export const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const api = useContext(PlayerContext);
  if (!api) throw new Error('usePlayer вызван вне PlayerProvider');
  return api;
}

/** Кассетник гаснет, когда звук забирает кто-то ещё (например, эмулятор). */
export const AUDIO_CLAIM_EVENT = 'vidik:audio-claim';

export function claimAudio() {
  window.dispatchEvent(new CustomEvent(AUDIO_CLAIM_EVENT));
}
