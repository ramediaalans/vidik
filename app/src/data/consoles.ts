// Генерируется tools/games/build-consoles.py. Руками не править.
export const TV_BOX_RATIO = 1536 / 1560;
export const TV_SCREEN_CENTER_X = 42.38;
export const tvHole = {"left": 7.81, "top": 6.15, "width": 69.14, "height": 48.85};
export type ConsoleKind = "nes" | "md" | "snes";
export const consoles: Record<ConsoleKind, {
  src: string; width: number; ratio: [number, number];
  cart: { left: number; width: number; bottom: number; hide: number };
  lip: { top: number; bottom: number };
}> = {
  "nes": {
    "src": "images/tv/console-nes.webp",
    "width": 0.6,
    "ratio": [
      1520,
      802
    ],
    "cart": {
      "left": 36.91,
      "width": 47.37,
      "bottom": 76.68,
      "hide": 0.4
    },
    "lip": {
      "top": 22.32,
      "bottom": 73.94
    }
  },
  "md": {
    "src": "images/tv/console-md.webp",
    "width": 0.56,
    "ratio": [
      1524,
      990
    ],
    "cart": {
      "left": 33.01,
      "width": 35.43,
      "bottom": 80.1,
      "hide": 0.3
    },
    "lip": {
      "top": 19.29,
      "bottom": 78.08
    }
  },
  "snes": {
    "src": "images/tv/console-snes.webp",
    "width": 0.46,
    "ratio": [
      1177,
      965
    ],
    "cart": {
      "left": 18.18,
      "width": 50.98,
      "bottom": 79.48,
      "hide": 0.3
    },
    "lip": {
      "top": 19.9,
      "bottom": 77.82
    }
  }
};
