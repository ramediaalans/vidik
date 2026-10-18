// src/audio/audio-ring-buffer.ts
var CTRL_PLAY_CURSOR = 0;
var CTRL_WRITE_CURSOR = 1;
var CTRL_BUFFER_BYTES = 2;
var CTRL_CHANNELS = 3;
var CTRL_SAMPLE_RATE = 4;
var CTRL_BITS_PER_SAMPLE = 5;
var CTRL_BLOCK_ALIGN = 6;
var CTRL_STATE = 7;
var CTRL_LOOP_MODE = 8;
var CTRL_VOLUME = 9;
var CTRL_PAN = 10;
var CTRL_FREQUENCY = 11;
var CTRL_DATA_LENGTH = 12;
var CTRL_STOP_REQUESTED = 13;
var CTRL_FLAGS = 14;
var CTRL_RESERVED = 15;
var CTRL_3D_POS_X = 16;
var CTRL_3D_POS_Y = 17;
var CTRL_3D_POS_Z = 18;
var CTRL_3D_VEL_X = 19;
var CTRL_3D_VEL_Y = 20;
var CTRL_3D_VEL_Z = 21;
var CTRL_3D_MIN_DIST = 22;
var CTRL_3D_MAX_DIST = 23;
var CTRL_3D_MODE = 24;
var CTRL_3D_CONE_INNER = 25;
var CTRL_3D_CONE_OUTER = 26;
var CTRL_3D_CONE_ORI_X = 27;
var CTRL_3D_CONE_ORI_Y = 28;
var CTRL_3D_CONE_ORI_Z = 29;
var CTRL_3D_CONE_OUTVOL = 30;
var CTRL_3D_FLAGS = 31;
var CTRL_3D_ROLLOFF = 32;
var CTRL_3D_MIN_GAIN = 33;
var CTRL_3D_MAX_GAIN = 34;
var FLAG3D_HAS_3D = 1;
var FLAG3D_SOURCE_ROLLOFF = 2;
var CTRL_SLOTS = 64;
var CTRL_BLOCK_BYTES = 256;
var STATE_PLAYING = 1;
var FLAG_CIRCULAR = 1;
var FLAG_STREAMING = 2;
var LCTRL_POS_X = 0;
var LCTRL_POS_Y = 1;
var LCTRL_POS_Z = 2;
var LCTRL_VEL_X = 3;
var LCTRL_VEL_Y = 4;
var LCTRL_VEL_Z = 5;
var LCTRL_FRONT_X = 6;
var LCTRL_FRONT_Y = 7;
var LCTRL_FRONT_Z = 8;
var LCTRL_TOP_X = 9;
var LCTRL_TOP_Y = 10;
var LCTRL_TOP_Z = 11;
var LCTRL_DIST_FACTOR = 12;
var LCTRL_ROLLOFF_FACTOR = 13;
var LCTRL_DOPPLER_FACTOR = 14;
var LCTRL_GAIN = 15;
var LCTRL_DISTANCE_MODEL = 16;
var LCTRL_SPEED_OF_SOUND = 17;
var LCTRL_FLAGS = 18;
var LFLAG_LEFT_HANDED = 1;
var LISTENER_SLOTS = 32;
var _f32 = new Float32Array(1);
var _i32 = new Int32Array(_f32.buffer);
function i32ToFloat(i) {
  _i32[0] = i;
  return _f32[0];
}

// src/audio/spatializer.ts
var DIST_INVERSE_CLAMPED = 0;
var DIST_INVERSE = 1;
var DIST_LINEAR = 2;
var DIST_LINEAR_CLAMPED = 3;
var DIST_EXPONENT = 4;
var DIST_EXPONENT_CLAMPED = 5;
var DIST_NONE = 6;
var DEG_PER_RAD = 180 / Math.PI;
var QUARTER_PI = Math.PI / 4;
function distanceGain(model, distance, refDistance, maxDistance, rolloff) {
  if (model === DIST_NONE) return 1;
  const ref = Math.max(refDistance, 0);
  let d = Math.max(distance, 0);
  switch (model) {
    case DIST_INVERSE_CLAMPED:
      d = Math.min(Math.max(d, ref), maxDistance);
    // fallthrough
    case DIST_INVERSE: {
      const denom = ref + rolloff * (d - ref);
      if (ref <= 0 || denom <= 0) return 1;
      return ref / denom;
    }
    case DIST_LINEAR_CLAMPED:
      d = Math.max(d, ref);
    // fallthrough
    case DIST_LINEAR: {
      d = Math.min(d, maxDistance);
      const span = maxDistance - ref;
      if (span <= 0) return d > ref ? clamp01(1 - rolloff) : 1;
      return clamp01(1 - rolloff * (d - ref) / span);
    }
    case DIST_EXPONENT_CLAMPED:
      d = Math.min(Math.max(d, ref), maxDistance);
    // fallthrough
    case DIST_EXPONENT: {
      if (ref <= 0 || d <= 0) return 1;
      return Math.pow(d / ref, -rolloff);
    }
  }
  return 1;
}
function coneGain(angleDeg, inner, outer, outerGain) {
  if (inner >= 360 && outer >= 360) return 1;
  const halfInner = inner * 0.5;
  const halfOuter = outer * 0.5;
  if (angleDeg <= halfInner) return 1;
  if (angleDeg >= halfOuter) return outerGain;
  const t = (angleDeg - halfInner) / (halfOuter - halfInner);
  return 1 + t * (outerGain - 1);
}
function dopplerRatio(vlsToward, vssToward, dopplerFactor, speedOfSound) {
  if (dopplerFactor <= 0 || speedOfSound <= 0) return 1;
  const limit = speedOfSound / dopplerFactor;
  const vl = Math.min(vlsToward, limit);
  const vs = Math.min(vssToward, limit);
  const denom = speedOfSound - dopplerFactor * vs;
  if (denom <= 1e-7) return 1;
  return (speedOfSound + dopplerFactor * vl) / denom;
}
function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function makeSpatialResult() {
  return { leftGain: 1, rightGain: 1, rateMul: 1 };
}
function spatialize(p, out) {
  const dx = p.relative ? p.sPosX : p.sPosX - p.lPosX;
  const dy = p.relative ? p.sPosY : p.sPosY - p.lPosY;
  const dz = p.relative ? p.sPosZ : p.sPosZ - p.lPosZ;
  const rawDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const dist = rawDist * (p.distanceFactor > 0 ? p.distanceFactor : 1);
  let dirX = 0, dirY = 0, dirZ = 0;
  if (rawDist > 1e-7) {
    const inv = 1 / rawDist;
    dirX = dx * inv;
    dirY = dy * inv;
    dirZ = dz * inv;
  }
  let nrX = 1, nrY = 0, nrZ = 0;
  if (!p.relative) {
    const aX = p.lAtX, aY = p.lAtY, aZ = p.lAtZ;
    const uX = p.lUpX, uY = p.lUpY, uZ = p.lUpZ;
    let rX, rY, rZ;
    if (p.rightHanded) {
      rX = aY * uZ - aZ * uY;
      rY = aZ * uX - aX * uZ;
      rZ = aX * uY - aY * uX;
    } else {
      rX = uY * aZ - uZ * aY;
      rY = uZ * aX - uX * aZ;
      rZ = uX * aY - uY * aX;
    }
    const len = Math.sqrt(rX * rX + rY * rY + rZ * rZ);
    if (len > 1e-7) {
      const inv = 1 / len;
      nrX = rX * inv;
      nrY = rY * inv;
      nrZ = rZ * inv;
    } else {
      nrX = 0;
      nrY = 0;
      nrZ = 0;
    }
  }
  const pan = dirX * nrX + dirY * nrY + dirZ * nrZ;
  const theta = (clampPan(pan) + 1) * QUARTER_PI;
  let gain = p.sourceGain * distanceGain(p.distanceModel, dist, p.refDistance, p.maxDistance, p.rolloff) * sourceConeGain(p, dirX, dirY, dirZ);
  if (gain < p.minGain) gain = p.minGain;
  if (gain > p.maxGain) gain = p.maxGain;
  gain *= p.listenerGain;
  out.leftGain = gain * Math.cos(theta);
  out.rightGain = gain * Math.sin(theta);
  if (p.dopplerFactor > 0 && rawDist > 1e-7) {
    const vlsToward = p.relative ? 0 : p.lVelX * dirX + p.lVelY * dirY + p.lVelZ * dirZ;
    const vssToward = -(p.sVelX * dirX + p.sVelY * dirY + p.sVelZ * dirZ);
    out.rateMul = clampRate(dopplerRatio(vlsToward, vssToward, p.dopplerFactor, p.speedOfSound));
  } else {
    out.rateMul = 1;
  }
}
function sourceConeGain(p, dirX, dirY, dirZ) {
  if (p.coneInner >= 360 && p.coneOuter >= 360) return 1;
  const len = Math.sqrt(p.dirX * p.dirX + p.dirY * p.dirY + p.dirZ * p.dirZ);
  if (len <= 1e-7) return 1;
  const inv = 1 / len;
  const dot = -(dirX * p.dirX + dirY * p.dirY + dirZ * p.dirZ) * inv;
  const angleDeg = Math.acos(clampPan(dot)) * DEG_PER_RAD;
  return coneGain(angleDeg, p.coneInner, p.coneOuter, p.coneOuterGain);
}
function clampPan(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
function clampRate(v) {
  return v < 0.1 ? 0.1 : v > 10 ? 10 : v;
}

// src/audio/bottleship-audio-worklet.ts
var CTRL_RESET_POSITION = CTRL_RESERVED;
var STATS_PROC = 0;
var STATS_FRAMES = 1;
var STATS_ACTIVE_RING = 2;
var STATS_CLIP = 3;
var STATS_LIMITED = 4;
var STATS_PEAK_MILLI = 5;
var STATS_DISC = 6;
var STATS_MAX_JUMP_MILLI = 7;
var STATS_UNDERRUN_MID = 8;
var STATS_STARVED_BLOCKS = 9;
var STATS_ACTIVE_LEGACY = 10;
var STATS_TOP_SOURCE_ID = 11;
var STATS_TOP_SOURCE_MILLI = 12;
var STATS_SUM_SOURCE_MILLI = 13;
var STATS_MAX_CONCURRENT = 14;
var STATS_RESET = 15;
var LIMIT_T = 0.95;
var LIMIT_K = 1 - LIMIT_T;
var WORKLET_MODULE_VERSION = 10;
var DISC_THRESHOLD = 0.5;
var CONCEAL_FADE_FRAMES = 64;
var DS3DMODE_HEAD_RELATIVE = 1;
var DS3DMODE_DISABLE = 2;
var BottleShipAudioProcessor = class _BottleShipAudioProcessor extends AudioWorkletProcessor {
  static POSITION_REPORT_FRAMES = 1024;
  static POSITION_REPORT_SECONDS = 0.05;
  // Legacy chunk-based sources (postMessage path — kept for encoded audio fallback)
  sources = /* @__PURE__ */ new Map();
  // SAB ring buffer sources (zero-copy path)
  ringBuffers = /* @__PURE__ */ new Map();
  // Listener SAB (global singleton; whichever audio API the guest uses owns it)
  listenerCtrl = null;
  // Spatializer scratch — reused for every source of every block (no allocation
  // inside the render quantum).
  spatialParams = {
    lPosX: 0,
    lPosY: 0,
    lPosZ: 0,
    lVelX: 0,
    lVelY: 0,
    lVelZ: 0,
    lAtX: 0,
    lAtY: 0,
    lAtZ: 1,
    lUpX: 0,
    lUpY: 1,
    lUpZ: 0,
    listenerGain: 1,
    distanceFactor: 1,
    dopplerFactor: 1,
    speedOfSound: 340,
    distanceModel: 0,
    rightHanded: true,
    sPosX: 0,
    sPosY: 0,
    sPosZ: 0,
    sVelX: 0,
    sVelY: 0,
    sVelZ: 0,
    refDistance: 1,
    maxDistance: 1e9,
    rolloff: 1,
    coneInner: 360,
    coneOuter: 360,
    coneOuterGain: 1,
    dirX: 0,
    dirY: 0,
    dirZ: 0,
    sourceGain: 1,
    minGain: 0,
    maxGain: 1,
    relative: false
  };
  spatialOut = makeSpatialResult();
  // Signal-stats SAB (global singleton; worklet is the only counter writer)
  statsCtrl = null;
  // Last output sample per channel, for cross-block discontinuity detection
  lastOut = [0, 0];
  constructor() {
    super();
    this.port.postMessage({ type: "ready", proc: "ring", version: WORKLET_MODULE_VERSION });
    this.port.onmessage = (event) => {
      const msg = event.data;
      if (!msg || !msg.type) return;
      if (msg.type === "register_listener") {
        this.listenerCtrl = new Int32Array(msg.sab, 0, LISTENER_SLOTS);
        return;
      }
      if (msg.type === "register_stats") {
        this.statsCtrl = new Int32Array(msg.sab, 0, 16);
        return;
      }
      if (msg.type === "register") {
        const sab = msg.sab;
        const id = msg.id;
        this.ringBuffers.set(id, {
          id,
          ctrl: new Int32Array(sab, 0, CTRL_SLOTS),
          data: new DataView(sab),
          // Explicit lengths: a SAB whose byteLength is not a multiple of the element
          // size would make the 1-argument constructor throw.
          u8: new Uint8Array(sab),
          i16: new Int16Array(sab, 0, sab.byteLength >> 1),
          f32: new Float32Array(sab, 0, sab.byteLength >> 2),
          position: 0,
          loopsCompleted: 0,
          fadeIn: 0
        });
        return;
      }
      if (msg.type === "unregister") {
        this.ringBuffers.delete(msg.id);
        return;
      }
      if (msg.type === "ringDump") {
        const dump = [];
        for (const [id, rb] of this.ringBuffers.entries()) {
          const ctrl = rb.ctrl;
          const d = rb.dbg ?? {};
          const state = Atomics.load(ctrl, CTRL_STATE);
          const blockAlign = Math.max(1, Atomics.load(ctrl, CTRL_BLOCK_ALIGN) || 4);
          const totalFrames = Math.max(1, Math.floor(Math.min(Atomics.load(ctrl, CTRL_DATA_LENGTH) > 0 ? Atomics.load(ctrl, CTRL_DATA_LENGTH) : Atomics.load(ctrl, CTRL_BUFFER_BYTES), Atomics.load(ctrl, CTRL_BUFFER_BYTES)) / blockAlign));
          const frame = Math.floor(d.pos ?? 0) % totalFrames;
          const byteOff = CTRL_BLOCK_BYTES + frame * blockAlign;
          dump.push({
            id,
            state,
            pos: d.pos ?? null,
            srcPeak: d.srcPeak ?? null,
            play: Atomics.load(ctrl, CTRL_PLAY_CURSOR),
            write: Atomics.load(ctrl, CTRL_WRITE_CURSOR),
            bufBytes: Atomics.load(ctrl, CTRL_BUFFER_BYTES),
            dataLen: Atomics.load(ctrl, CTRL_DATA_LENGTH),
            sampleAtHead: rb.i16[byteOff >> 1],
            sampleAtHeadP: rb.i16[byteOff + 4 >> 1],
            starves: d.starves ?? 0,
            blocks: d.blocks ?? 0
          });
        }
        this.port.postMessage({ type: "ringDump", dump });
        return;
      }
      if (msg.type === "stop_all") {
        this.ringBuffers.clear();
        this.sources.clear();
        this.lastOut[0] = 0;
        this.lastOut[1] = 0;
        return;
      }
      if (msg.type === "play") {
        const {
          id,
          data,
          channels,
          sampleRate: sourceSampleRate,
          playbackRate,
          volume,
          pan,
          loopCount
        } = msg;
        const safeChannels = Math.max(1, Math.floor(channels ?? 1));
        const initialData = data ?? new Float32Array();
        const initialFrames = Math.floor(initialData.length / safeChannels);
        this.sources.set(id, {
          id,
          chunks: initialData.length > 0 ? [initialData] : [],
          paused: false,
          channels: safeChannels,
          sampleRate: sourceSampleRate || sampleRate,
          playbackRate: playbackRate ?? 1,
          volume: volume ?? 1,
          pan: pan ?? 0,
          loopCount: typeof loopCount === "number" ? loopCount : 1,
          loopsRemaining: typeof loopCount === "number" && loopCount <= 0 ? Infinity : Math.max(1, typeof loopCount === "number" ? loopCount : 1),
          position: 0,
          totalFrames: initialFrames,
          cursorChunkIndex: 0,
          cursorFrameBase: 0,
          lastReportedFrame: 0,
          lastReportedTime: 0
        });
      }
      if (msg.type === "append") {
        const source = this.sources.get(msg.id);
        const chunk = msg.data;
        if (source && chunk && chunk.length > 0) {
          source.chunks.push(chunk);
          const frames = Math.floor(chunk.length / Math.max(1, source.channels));
          source.totalFrames += frames;
        }
      }
      if (msg.type === "stop") {
        this.sources.delete(msg.id);
      }
      if (msg.type === "pause") {
        const source = this.sources.get(msg.id);
        if (source) source.paused = true;
      }
      if (msg.type === "resume") {
        const source = this.sources.get(msg.id);
        if (source) source.paused = false;
      }
      if (msg.type === "replace") {
        const source = this.sources.get(msg.id);
        if (source && msg.data) {
          const newData = msg.data;
          const newFrames = Math.floor(newData.length / Math.max(1, source.channels));
          source.chunks = [newData];
          source.totalFrames = newFrames;
          source.cursorChunkIndex = 0;
          source.cursorFrameBase = 0;
        }
      }
      if (msg.type === "update") {
        const source = this.sources.get(msg.id);
        if (!source) return;
        if (typeof msg.volume === "number") source.volume = msg.volume;
        if (typeof msg.pan === "number") source.pan = msg.pan;
        if (typeof msg.playbackRate === "number") source.playbackRate = msg.playbackRate;
        if (typeof msg.loopCount === "number") {
          source.loopCount = msg.loopCount;
          source.loopsRemaining = msg.loopCount <= 0 ? Infinity : Math.max(1, msg.loopCount);
        }
      }
    };
  }
  // ─── Legacy chunk helpers (unchanged) ──────────────────────────────────────
  chunkFrames(chunk, channels) {
    return Math.floor(chunk.length / Math.max(1, channels));
  }
  locateChunk(source, frameIndex) {
    if (frameIndex < 0 || source.chunks.length === 0) return null;
    let chunkIndex = source.cursorChunkIndex;
    let frameBase = source.cursorFrameBase;
    if (frameIndex < frameBase) {
      chunkIndex = 0;
      frameBase = 0;
    }
    let chunk = source.chunks[chunkIndex];
    let framesInChunk = chunk ? this.chunkFrames(chunk, source.channels) : 0;
    while (chunk && frameIndex >= frameBase + framesInChunk) {
      frameBase += framesInChunk;
      chunkIndex += 1;
      chunk = source.chunks[chunkIndex];
      framesInChunk = chunk ? this.chunkFrames(chunk, source.channels) : 0;
    }
    if (!chunk || framesInChunk <= 0) {
      source.cursorChunkIndex = Math.max(0, Math.min(chunkIndex, source.chunks.length));
      source.cursorFrameBase = frameBase;
      return null;
    }
    source.cursorChunkIndex = chunkIndex;
    source.cursorFrameBase = frameBase;
    return { chunk, frameBase, chunkFrames: framesInChunk };
  }
  sampleAt(source, frameIndex, channel) {
    const located = this.locateChunk(source, frameIndex);
    if (!located) return 0;
    const { chunk, frameBase, chunkFrames } = located;
    const localFrame = frameIndex - frameBase;
    if (localFrame < 0 || localFrame >= chunkFrames) return 0;
    const channels = Math.max(1, source.channels);
    const index = localFrame * channels + channel;
    if (index < 0 || index >= chunk.length) return 0;
    return chunk[index] ?? 0;
  }
  maybeReportPosition(id, source) {
    const now = currentTime;
    const currentFrame = Math.floor(source.position);
    if (currentFrame === source.lastReportedFrame) return;
    if (now - source.lastReportedTime < _BottleShipAudioProcessor.POSITION_REPORT_SECONDS && Math.abs(currentFrame - source.lastReportedFrame) < _BottleShipAudioProcessor.POSITION_REPORT_FRAMES) {
      return;
    }
    source.lastReportedFrame = currentFrame;
    source.lastReportedTime = now;
    this.port.postMessage({ type: "position", id, positionFrames: currentFrame });
  }
  // ─── Ring buffer inline sample reader ──────────────────────────────────────
  readSampleFloat(view, byteOffset, bitsPerSample) {
    if (bitsPerSample === 16) {
      return view.getInt16(byteOffset, true) / 32768;
    }
    if (bitsPerSample === 8) {
      return (view.getUint8(byteOffset) - 128) / 128;
    }
    if (bitsPerSample === 32) {
      return view.getFloat32(byteOffset, true);
    }
    return 0;
  }
  // ─── Main process() ────────────────────────────────────────────────────────
  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const outChannels = output.length;
    const frames = output[0].length;
    for (let ch = 0; ch < outChannels; ch++) {
      output[ch].fill(0);
    }
    let activeRing = 0;
    let underrunMid = 0;
    let starvedBlocks = 0;
    let blockTopId = 0, blockTopPeak = 0, blockSumPeak = 0, blockAudible = 0;
    for (const [id, rb] of this.ringBuffers.entries()) {
      const ctrl = rb.ctrl;
      const stopReq = Atomics.load(ctrl, CTRL_STOP_REQUESTED);
      if (stopReq) {
        Atomics.store(ctrl, CTRL_STOP_REQUESTED, 0);
        Atomics.store(ctrl, CTRL_STATE, 0);
        Atomics.store(ctrl, CTRL_PLAY_CURSOR, 0);
        rb.position = 0;
        rb.loopsCompleted = 0;
        continue;
      }
      const resetReq = Atomics.load(ctrl, CTRL_RESET_POSITION);
      if (resetReq) {
        Atomics.store(ctrl, CTRL_RESET_POSITION, 0);
        const blockAlignSeek = Math.max(1, Atomics.load(ctrl, CTRL_BLOCK_ALIGN) || 4);
        const bufferBytesSeek = Atomics.load(ctrl, CTRL_BUFFER_BYTES) || 0;
        const dataLenSeek = Atomics.load(ctrl, CTRL_DATA_LENGTH);
        const effBytesSeek = bufferBytesSeek > 0 ? Math.min(dataLenSeek > 0 ? dataLenSeek : bufferBytesSeek, bufferBytesSeek) : 0;
        const totalFramesSeek = effBytesSeek > 0 ? Math.max(1, Math.floor(effBytesSeek / blockAlignSeek)) : 1;
        const seekBytes = bufferBytesSeek > 0 ? (Atomics.load(ctrl, CTRL_PLAY_CURSOR) >>> 0) % bufferBytesSeek : 0;
        const seekFrame = Math.floor(seekBytes / blockAlignSeek) % totalFramesSeek;
        rb.position = seekFrame;
        rb.loopsCompleted = 0;
        if (bufferBytesSeek > 0) {
          Atomics.store(ctrl, CTRL_PLAY_CURSOR, seekFrame * blockAlignSeek % bufferBytesSeek);
        }
      }
      const state = Atomics.load(ctrl, CTRL_STATE);
      if (state !== STATE_PLAYING) continue;
      activeRing++;
      let srcPeak = 0;
      const bufferBytes = Atomics.load(ctrl, CTRL_BUFFER_BYTES);
      const channels = Atomics.load(ctrl, CTRL_CHANNELS) || 1;
      const sourceSampleRate = Atomics.load(ctrl, CTRL_SAMPLE_RATE) || 44100;
      const bitsPerSample = Atomics.load(ctrl, CTRL_BITS_PER_SAMPLE) || 16;
      const blockAlign = Atomics.load(ctrl, CTRL_BLOCK_ALIGN) || channels * (bitsPerSample >> 3);
      const frequency = Atomics.load(ctrl, CTRL_FREQUENCY) || sourceSampleRate;
      const loopMode = Atomics.load(ctrl, CTRL_LOOP_MODE);
      const volumeCb = Atomics.load(ctrl, CTRL_VOLUME);
      const panVal = Atomics.load(ctrl, CTRL_PAN);
      const dataLength = Atomics.load(ctrl, CTRL_DATA_LENGTH);
      const flags = Atomics.load(ctrl, CTRL_FLAGS);
      const isCircular = (flags & FLAG_CIRCULAR) !== 0;
      if (blockAlign === 0 || bufferBytes === 0) continue;
      const declaredBytes = Math.min(dataLength > 0 ? dataLength : bufferBytes, bufferBytes);
      const effectiveBytes = Math.min(declaredBytes, Math.max(0, rb.u8.length - CTRL_BLOCK_BYTES));
      if (effectiveBytes === 0) continue;
      const totalFrames = Math.floor(effectiveBytes / blockAlign);
      if (totalFrames === 0) continue;
      let rate = frequency / sampleRate;
      if (rate <= 0) continue;
      const linearVol = volumeCb <= -1e4 ? 0 : Math.pow(10, volumeCb / 2e3);
      let leftGain;
      let rightGain;
      if (panVal <= -1e4) {
        leftGain = 1;
        rightGain = 0;
      } else if (panVal >= 1e4) {
        leftGain = 0;
        rightGain = 1;
      } else if (panVal < 0) {
        leftGain = 1;
        rightGain = Math.pow(10, panVal / 2e3);
      } else if (panVal > 0) {
        leftGain = Math.pow(10, -panVal / 2e3);
        rightGain = 1;
      } else {
        leftGain = 1;
        rightGain = 1;
      }
      const flags3d = Atomics.load(ctrl, CTRL_3D_FLAGS);
      const mode3d = Atomics.load(ctrl, CTRL_3D_MODE);
      if ((flags3d & FLAG3D_HAS_3D) !== 0 && this.listenerCtrl && mode3d !== DS3DMODE_DISABLE) {
        const lctrl = this.listenerCtrl;
        const p = this.spatialParams;
        p.lPosX = i32ToFloat(Atomics.load(lctrl, LCTRL_POS_X));
        p.lPosY = i32ToFloat(Atomics.load(lctrl, LCTRL_POS_Y));
        p.lPosZ = i32ToFloat(Atomics.load(lctrl, LCTRL_POS_Z));
        p.lVelX = i32ToFloat(Atomics.load(lctrl, LCTRL_VEL_X));
        p.lVelY = i32ToFloat(Atomics.load(lctrl, LCTRL_VEL_Y));
        p.lVelZ = i32ToFloat(Atomics.load(lctrl, LCTRL_VEL_Z));
        p.lAtX = i32ToFloat(Atomics.load(lctrl, LCTRL_FRONT_X));
        p.lAtY = i32ToFloat(Atomics.load(lctrl, LCTRL_FRONT_Y));
        p.lAtZ = i32ToFloat(Atomics.load(lctrl, LCTRL_FRONT_Z));
        p.lUpX = i32ToFloat(Atomics.load(lctrl, LCTRL_TOP_X));
        p.lUpY = i32ToFloat(Atomics.load(lctrl, LCTRL_TOP_Y));
        p.lUpZ = i32ToFloat(Atomics.load(lctrl, LCTRL_TOP_Z));
        p.listenerGain = i32ToFloat(Atomics.load(lctrl, LCTRL_GAIN));
        p.distanceFactor = i32ToFloat(Atomics.load(lctrl, LCTRL_DIST_FACTOR));
        p.dopplerFactor = i32ToFloat(Atomics.load(lctrl, LCTRL_DOPPLER_FACTOR));
        p.speedOfSound = i32ToFloat(Atomics.load(lctrl, LCTRL_SPEED_OF_SOUND));
        p.distanceModel = Atomics.load(lctrl, LCTRL_DISTANCE_MODEL);
        p.rightHanded = (Atomics.load(lctrl, LCTRL_FLAGS) & LFLAG_LEFT_HANDED) === 0;
        p.sPosX = i32ToFloat(Atomics.load(ctrl, CTRL_3D_POS_X));
        p.sPosY = i32ToFloat(Atomics.load(ctrl, CTRL_3D_POS_Y));
        p.sPosZ = i32ToFloat(Atomics.load(ctrl, CTRL_3D_POS_Z));
        p.sVelX = i32ToFloat(Atomics.load(ctrl, CTRL_3D_VEL_X));
        p.sVelY = i32ToFloat(Atomics.load(ctrl, CTRL_3D_VEL_Y));
        p.sVelZ = i32ToFloat(Atomics.load(ctrl, CTRL_3D_VEL_Z));
        p.refDistance = i32ToFloat(Atomics.load(ctrl, CTRL_3D_MIN_DIST));
        p.maxDistance = i32ToFloat(Atomics.load(ctrl, CTRL_3D_MAX_DIST));
        p.rolloff = (flags3d & FLAG3D_SOURCE_ROLLOFF) !== 0 ? i32ToFloat(Atomics.load(ctrl, CTRL_3D_ROLLOFF)) : i32ToFloat(Atomics.load(lctrl, LCTRL_ROLLOFF_FACTOR));
        p.coneInner = Atomics.load(ctrl, CTRL_3D_CONE_INNER);
        p.coneOuter = Atomics.load(ctrl, CTRL_3D_CONE_OUTER);
        const coneOutVolCb = Atomics.load(ctrl, CTRL_3D_CONE_OUTVOL);
        p.coneOuterGain = coneOutVolCb <= -1e4 ? 0 : Math.min(1, Math.pow(10, coneOutVolCb / 2e3));
        p.dirX = i32ToFloat(Atomics.load(ctrl, CTRL_3D_CONE_ORI_X));
        p.dirY = i32ToFloat(Atomics.load(ctrl, CTRL_3D_CONE_ORI_Y));
        p.dirZ = i32ToFloat(Atomics.load(ctrl, CTRL_3D_CONE_ORI_Z));
        p.sourceGain = linearVol;
        p.minGain = i32ToFloat(Atomics.load(ctrl, CTRL_3D_MIN_GAIN));
        p.maxGain = i32ToFloat(Atomics.load(ctrl, CTRL_3D_MAX_GAIN));
        p.relative = mode3d === DS3DMODE_HEAD_RELATIVE;
        spatialize(p, this.spatialOut);
        leftGain *= this.spatialOut.leftGain;
        rightGain *= this.spatialOut.rightGain;
        rate *= this.spatialOut.rateMul;
      } else {
        leftGain *= linearVol;
        rightGain *= linearVol;
      }
      const isStreaming = (flags & FLAG_STREAMING) !== 0;
      const streamingHold = isStreaming && loopMode !== -1;
      const dataView = rb.data;
      const bytesPerSample = bitsPerSample >> 3;
      let fastRead = bitsPerSample === 8 ? 1 : bitsPerSample === 16 && (blockAlign & 1) === 0 ? 2 : bitsPerSample === 32 && (blockAlign & 3) === 0 ? 3 : 0;
      if (CTRL_BLOCK_BYTES + (totalFrames - 1) * blockAlign + channels * bytesPerSample > rb.u8.length) {
        fastRead = 0;
      }
      const u8 = rb.u8;
      const i16 = rb.i16;
      const f32 = rb.f32;
      let pos = rb.position;
      let loopsCompleted = rb.loopsCompleted;
      let fadeIn = rb.fadeIn;
      let alive = true;
      let concealLast0 = 0, concealLast1 = 0;
      let starvedThisSource = 0;
      const writeCursorBytes = isStreaming ? Atomics.load(ctrl, CTRL_WRITE_CURSOR) : 0;
      const writeCursorFrame = isStreaming ? Math.floor(writeCursorBytes / blockAlign) : 0;
      for (let i = 0; i < frames; i++) {
        while (pos >= totalFrames) {
          if (isCircular && (loopMode === -1 || isStreaming)) {
            pos -= totalFrames;
          } else if (loopMode === -1) {
            pos -= totalFrames;
          } else if (loopMode > 1) {
            loopsCompleted++;
            if (loopsCompleted < loopMode) {
              pos -= totalFrames;
            } else {
              Atomics.store(ctrl, CTRL_STATE, 0);
              Atomics.store(ctrl, CTRL_PLAY_CURSOR, 0);
              pos = 0;
              alive = false;
              this.port.postMessage({ type: "ended", id });
              break;
            }
          } else {
            Atomics.store(ctrl, CTRL_STATE, 0);
            Atomics.store(ctrl, CTRL_PLAY_CURSOR, 0);
            pos = 0;
            alive = false;
            this.port.postMessage({ type: "ended", id });
            break;
          }
        }
        if (!alive) break;
        if (streamingHold) {
          const playFrame = Math.floor(pos) % totalFrames;
          const available = (writeCursorFrame - playFrame + totalFrames) % totalFrames;
          if (available === 0) {
            if (i === 0) starvedBlocks++;
            else underrunMid++;
            starvedThisSource++;
            fadeIn = CONCEAL_FADE_FRAMES;
            if (CONCEAL_FADE_FRAMES > 0 && (concealLast0 !== 0 || concealLast1 !== 0)) {
              const fade = Math.min(frames - i, CONCEAL_FADE_FRAMES);
              for (let f = 0; f < fade; f++) {
                const g = 1 - (f + 1) / fade;
                output[0][i + f] += concealLast0 * g;
                if (outChannels > 1) output[1][i + f] += concealLast1 * g;
              }
            }
            break;
          }
        }
        const frameIndex = Math.floor(pos);
        const frac = pos - frameIndex;
        const wrappedFrame = isCircular ? frameIndex % totalFrames : frameIndex;
        for (let ch = 0; ch < outChannels; ch++) {
          const srcCh = Math.min(ch, channels - 1);
          const byteOff = CTRL_BLOCK_BYTES + wrappedFrame * blockAlign + srcCh * bytesPerSample;
          let nextFrame = wrappedFrame + 1;
          if (isCircular) {
            nextFrame = nextFrame % totalFrames;
          } else {
            nextFrame = Math.min(nextFrame, totalFrames - 1);
          }
          const byteOffNext = CTRL_BLOCK_BYTES + nextFrame * blockAlign + srcCh * bytesPerSample;
          let s0, s1;
          if (fastRead === 2) {
            s0 = i16[byteOff >> 1] / 32768;
            s1 = i16[byteOffNext >> 1] / 32768;
          } else if (fastRead === 1) {
            s0 = (u8[byteOff] - 128) / 128;
            s1 = (u8[byteOffNext] - 128) / 128;
          } else if (fastRead === 3) {
            s0 = f32[byteOff >> 2];
            s1 = f32[byteOffNext >> 2];
          } else {
            s0 = this.readSampleFloat(dataView, byteOff, bitsPerSample);
            s1 = this.readSampleFloat(dataView, byteOffNext, bitsPerSample);
          }
          const sample = s0 * (1 - frac) + s1 * frac;
          let gain;
          if (outChannels >= 2) {
            gain = ch === 0 ? leftGain : rightGain;
          } else {
            gain = (leftGain + rightGain) * 0.5;
          }
          const contrib = fadeIn > 0 ? sample * gain * (1 - fadeIn / CONCEAL_FADE_FRAMES) : sample * gain;
          const ca = contrib < 0 ? -contrib : contrib;
          if (ca > srcPeak) srcPeak = ca;
          output[ch][i] += contrib;
          if (ch === 0) concealLast0 = contrib;
          else if (ch === 1) concealLast1 = contrib;
        }
        if (fadeIn > 0) fadeIn--;
        pos += rate;
      }
      if (srcPeak > 0) {
        blockSumPeak += srcPeak;
        if (srcPeak > 0.01) blockAudible++;
        if (srcPeak > blockTopPeak) {
          blockTopPeak = srcPeak;
          blockTopId = id;
        }
      }
      rb.position = pos;
      rb.loopsCompleted = loopsCompleted;
      rb.fadeIn = fadeIn;
      {
        const d = rb.dbg ?? (rb.dbg = {});
        d.pos = pos;
        d.srcPeak = srcPeak;
        d.blocks = (d.blocks ?? 0) + 1;
        if (starvedThisSource) d.starves = (d.starves ?? 0) + starvedThisSource;
      }
      if (alive) {
        const playCursorBytes = Math.floor(pos) % totalFrames * blockAlign;
        Atomics.store(ctrl, CTRL_PLAY_CURSOR, playCursorBytes);
        if (!isStreaming) {
          const leadFrames = Math.min(
            Math.max(64, Math.round(sourceSampleRate * 0.045)),
            Math.max(1, totalFrames - 1)
          );
          const writeCursorFrame2 = (Math.floor(pos) + leadFrames) % totalFrames;
          Atomics.store(ctrl, CTRL_WRITE_CURSOR, writeCursorFrame2 * blockAlign);
        }
      }
    }
    for (const [id, source] of this.sources.entries()) {
      const deviceSampleRate = sampleRate;
      const playback = source.playbackRate || 1;
      const ratio = deviceSampleRate > 0 ? source.sampleRate / deviceSampleRate : 1;
      const rate = playback * ratio;
      if (rate <= 0) continue;
      const channels = source.channels || 1;
      const totalFrames = Math.floor(source.totalFrames);
      if (totalFrames <= 0) continue;
      if (source.paused) continue;
      let pos = source.position;
      let loopsRemaining = source.loopsRemaining ?? 1;
      const pan = Math.max(-1, Math.min(1, source.pan ?? 0));
      const leftGain = pan <= 0 ? 1 : 1 - pan;
      const rightGain = pan >= 0 ? 1 : 1 + pan;
      for (let i = 0; i < frames; i++) {
        while (pos >= totalFrames) {
          if (loopsRemaining === Infinity) {
            pos -= totalFrames;
            continue;
          }
          if (loopsRemaining > 1) {
            loopsRemaining -= 1;
            pos -= totalFrames;
            continue;
          }
          this.sources.delete(id);
          this.port.postMessage({ type: "ended", id });
          break;
        }
        if (!this.sources.has(id)) break;
        const frameIndex = Math.floor(pos);
        const frac = pos - frameIndex;
        for (let ch = 0; ch < outChannels; ch++) {
          const srcCh = Math.min(ch, channels - 1);
          const nextFrame = Math.min(frameIndex + 1, totalFrames - 1);
          const sampleBase = this.sampleAt(source, frameIndex, srcCh);
          const sampleNext = this.sampleAt(source, nextFrame, srcCh);
          const sample = sampleBase * (1 - frac) + sampleNext * frac;
          let gain = source.volume ?? 1;
          if (outChannels >= 2) {
            gain *= ch === 0 ? leftGain : rightGain;
          }
          output[ch][i] += sample * gain;
        }
        pos += rate;
      }
      source.position = pos;
      source.loopsRemaining = loopsRemaining;
      this.maybeReportPosition(id, source);
    }
    const stats = this.statsCtrl;
    if (stats && Atomics.load(stats, STATS_RESET)) {
      for (let f = 0; f <= 14; f++) Atomics.store(stats, f, 0);
      Atomics.store(stats, STATS_RESET, 0);
      this.lastOut[0] = 0;
      this.lastOut[1] = 0;
    }
    let clipCount = 0;
    let limitedCount = 0;
    let discCount = 0;
    let peak = 0;
    let maxJump = 0;
    for (let ch = 0; ch < outChannels; ch++) {
      const channel = output[ch];
      let prev = this.lastOut[ch] ?? 0;
      for (let i = 0; i < channel.length; i++) {
        const s = channel[i];
        const a = Math.abs(s);
        if (a > peak) peak = a;
        const jump = Math.abs(s - prev);
        if (jump > maxJump) maxJump = jump;
        if (jump > DISC_THRESHOLD) discCount++;
        prev = s;
        if (a > LIMIT_T) {
          limitedCount++;
          if (a > 1) clipCount++;
        }
      }
      if (ch < this.lastOut.length) this.lastOut[ch] = prev;
    }
    if (stats) {
      Atomics.add(stats, STATS_PROC, 1);
      Atomics.add(stats, STATS_FRAMES, frames);
      Atomics.store(stats, STATS_ACTIVE_RING, activeRing);
      Atomics.store(stats, STATS_ACTIVE_LEGACY, this.sources.size);
      if (clipCount) Atomics.add(stats, STATS_CLIP, clipCount);
      if (limitedCount) Atomics.add(stats, STATS_LIMITED, limitedCount);
      if (discCount) Atomics.add(stats, STATS_DISC, discCount);
      if (underrunMid) Atomics.add(stats, STATS_UNDERRUN_MID, underrunMid);
      const topMilli = Math.round(blockTopPeak * 1e3);
      if (topMilli > Atomics.load(stats, STATS_TOP_SOURCE_MILLI)) {
        Atomics.store(stats, STATS_TOP_SOURCE_MILLI, topMilli);
        Atomics.store(stats, STATS_TOP_SOURCE_ID, blockTopId | 0);
      }
      const sumMilli = Math.round(blockSumPeak * 1e3);
      if (sumMilli > Atomics.load(stats, STATS_SUM_SOURCE_MILLI)) {
        Atomics.store(stats, STATS_SUM_SOURCE_MILLI, sumMilli);
      }
      if (blockAudible > Atomics.load(stats, STATS_MAX_CONCURRENT)) {
        Atomics.store(stats, STATS_MAX_CONCURRENT, blockAudible);
      }
      if (starvedBlocks) Atomics.add(stats, STATS_STARVED_BLOCKS, starvedBlocks);
      const peakMilli = Math.round(peak * 1e3);
      if (peakMilli > Atomics.load(stats, STATS_PEAK_MILLI)) {
        Atomics.store(stats, STATS_PEAK_MILLI, peakMilli);
      }
      const jumpMilli = Math.round(maxJump * 1e3);
      if (jumpMilli > Atomics.load(stats, STATS_MAX_JUMP_MILLI)) {
        Atomics.store(stats, STATS_MAX_JUMP_MILLI, jumpMilli);
      }
    }
    return true;
  }
};
var BottleShipMasterProcessor = class extends AudioWorkletProcessor {
  statsCtrl = null;
  lastOut = [0, 0];
  constructor() {
    super();
    this.port.postMessage({ type: "ready", proc: "master", version: WORKLET_MODULE_VERSION });
    this.port.onmessage = (event) => {
      const msg = event.data;
      if (msg?.type === "register_master_stats") {
        this.statsCtrl = new Int32Array(msg.sab, 0, 16);
      }
    };
  }
  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const hasInput = !!input && input.length > 0 && input[0].length > 0;
    const stats = this.statsCtrl;
    if (stats && Atomics.load(stats, STATS_RESET)) {
      for (let f = 0; f <= 14; f++) Atomics.store(stats, f, 0);
      Atomics.store(stats, STATS_RESET, 0);
      this.lastOut[0] = 0;
      this.lastOut[1] = 0;
    }
    let clipCount = 0;
    let limitedCount = 0;
    let discCount = 0;
    let peak = 0;
    let maxJump = 0;
    let frames = 0;
    for (let ch = 0; ch < output.length; ch++) {
      const outCh = output[ch];
      const inCh = hasInput ? input[Math.min(ch, input.length - 1)] ?? null : null;
      frames = outCh.length;
      let prev = this.lastOut[ch] ?? 0;
      for (let i = 0; i < outCh.length; i++) {
        const s = inCh ? inCh[i] ?? 0 : 0;
        const a = Math.abs(s);
        if (a > peak) peak = a;
        const jump = Math.abs(s - prev);
        if (jump > maxJump) maxJump = jump;
        if (jump > DISC_THRESHOLD) discCount++;
        let out = s;
        if (a > LIMIT_T) {
          limitedCount++;
          if (a > 1) clipCount++;
          const t = (a - LIMIT_T) / LIMIT_K;
          out = (s < 0 ? -1 : 1) * (LIMIT_T + LIMIT_K * Math.tanh(t));
        }
        outCh[i] = out;
        prev = out;
      }
      this.lastOut[ch] = prev;
    }
    if (stats) {
      Atomics.add(stats, STATS_PROC, 1);
      Atomics.add(stats, STATS_FRAMES, frames);
      if (clipCount) Atomics.add(stats, STATS_CLIP, clipCount);
      if (limitedCount) Atomics.add(stats, STATS_LIMITED, limitedCount);
      if (discCount) Atomics.add(stats, STATS_DISC, discCount);
      const peakMilli = Math.round(peak * 1e3);
      if (peakMilli > Atomics.load(stats, STATS_PEAK_MILLI)) {
        Atomics.store(stats, STATS_PEAK_MILLI, peakMilli);
      }
      const jumpMilli = Math.round(maxJump * 1e3);
      if (jumpMilli > Atomics.load(stats, STATS_MAX_JUMP_MILLI)) {
        Atomics.store(stats, STATS_MAX_JUMP_MILLI, jumpMilli);
      }
    }
    return true;
  }
};
registerProcessor("bottleship-audio", BottleShipAudioProcessor);
registerProcessor("bottleship-audio-master", BottleShipMasterProcessor);
