var B = class extends Error {}, R = class extends Error {}, K = class A {
	url;
	options;
	size;
	etag;
	closed = !1;
	active = /* @__PURE__ */ new Set();
	constructor(e, s, i, r) {
		this.url = e, this.options = r, this.size = s, this.etag = i && !i.startsWith("W/") ? i : null;
	}
	static async create(e, s = {}) {
		const i = {
			timeoutMs: s.timeoutMs ?? 8e3,
			retries: s.retries ?? 2,
			retryDelayMs: s.retryDelayMs ?? 200
		}, r = new A(e, 0, null, i);
		try {
			const h = await r.fetchBytes({ method: "HEAD" }, !1), c = Number(h.headers.get("content-length"));
			if (h.status === 200 && Number.isSafeInteger(c) && c > 0) return new A(e, c, h.headers.get("etag"), i);
		} catch {}
		const a = await r.fetchBytes({ headers: { Range: "bytes=0-0" } }, !0), n = /^bytes 0-0\/(\d+)$/.exec(a.headers.get("content-range") ?? ""), o = Number(n?.[1]);
		if (a.status !== 206 || !n || !Number.isSafeInteger(o) || o <= 0 || a.bytes.length !== 1) throw new Error(`Range requests are required for WGB loading (invalid probe, status ${a.status})`);
		return new A(e, o, a.headers.get("etag"), i);
	}
	async fetchBytes(e, s, i) {
		for (let r = 0;; r++) {
			if (this.closed) throw new Error("HTTP range source closed");
			const a = new AbortController();
			this.active.add(a);
			const n = setTimeout(() => a.abort(), this.options.timeoutMs);
			let o = !1, h = this.options.retryDelayMs * 2 ** r;
			try {
				const c = await fetch(this.url, {
					...e,
					signal: a.signal,
					cache: "no-cache"
				});
				if (c.status === 408 || c.status === 429 || c.status >= 500) {
					const g = c.headers.get("retry-after");
					throw g && (h = Math.max(h, Math.min(1e3, Number(g) * 1e3 || Date.parse(g) - Date.now()))), await c.body?.cancel(), new R(`HTTP ${c.status} for ${this.url}`);
				}
				if (s && c.status !== 206) throw await c.body?.cancel(), c.status === 200 && this.etag ? new B(`WGB version changed: If-Range returned 200 for ${this.url}`) : /* @__PURE__ */ new Error(`Range request failed (${c.status}) for ${this.url}`);
				if (s && this.etag && c.headers.get("etag") !== this.etag) throw await c.body?.cancel(), new B(`WGB ETag changed for ${this.url}`);
				const l = s ? new Uint8Array(await c.arrayBuffer()) : /* @__PURE__ */ new Uint8Array(0);
				return i?.(l, c.headers), {
					status: c.status,
					headers: c.headers,
					bytes: l
				};
			} catch (c) {
				if (o = !this.closed && r < this.options.retries && (c instanceof R || c instanceof TypeError || a.signal.aborted), !o) throw c;
			} finally {
				clearTimeout(n), this.active.delete(a);
			}
			o && await new Promise((c) => setTimeout(c, Math.min(1e3, h)));
		}
	}
	async readRange(e, s, i) {
		const r = Math.max(0, Math.min(Math.floor(e), this.size)), a = Math.max(r, Math.min(Math.floor(s), this.size));
		if (a === r) return /* @__PURE__ */ new Uint8Array(0);
		const n = { Range: `bytes=${r}-${a - 1}` };
		this.etag && (n["If-Range"] = this.etag);
		const o = {
			headers: n,
			priority: i?.speculative ? "low" : "high"
		};
		return (await this.fetchBytes(o, !0, (h, c) => {
			if (c.get("content-range") !== `bytes ${r}-${a - 1}/${this.size}`) throw new B(`Wrong Content-Range for ${this.url}: ${c.get("content-range")}`);
			if (h.length !== a - r) throw new R(`Short range read: ${h.length}/${a - r} for ${this.url}`);
		})).bytes;
	}
	close() {
		this.closed = !0;
		for (const e of this.active) e.abort();
	}
}, H = class {
	size;
	sah;
	constructor(t, e) {
		this.sah = t, this.size = e;
	}
	async readRange(t, e) {
		return this.readRangeSync(t, e);
	}
	readRangeSync(t, e) {
		const s = Math.max(0, Math.min(t, this.size)), i = Math.max(s, Math.min(e, this.size)) - s, r = new Uint8Array(i);
		if (i === 0) return r;
		let a = 0;
		for (; a < i;) {
			const n = this.sah.read(r.subarray(a), { at: s + a });
			if (n <= 0) break;
			a += n;
		}
		return a === i ? r : r.subarray(0, a);
	}
	close() {
		try {
			this.sah.close();
		} catch {}
	}
};
const D = 16 * 1024 * 1024;
const j = 16777504;
function G() {
	return {
		ctlWords: 64,
		metaOffsetBytes: 256,
		metaWords: 4,
		dataOffsetBytes: 288,
		dataBytes: D,
		totalBytes: j
	};
}
function V(t) {
	if (!t) return "peer sent no layout";
	const e = G(), s = t;
	for (const i of Object.keys(e)) if (s[i] !== e[i]) return `${i}: peer ${String(s[i])} != ${e[i]}`;
	return null;
}
function O(t, e, s, i, r) {
	if (s !== i) return !1;
	if (r) {
		const a = Math.min(r.byteLength, D);
		e.set(r.subarray(0, a), 0), Atomics.store(t, 1, a), Atomics.store(t, 2, 0), Atomics.store(t, 0, 2);
	} else Atomics.store(t, 2, 1), Atomics.store(t, 0, 3);
	return Atomics.store(t, 7, s), Atomics.notify(t, 7, 1), !0;
}
const Q = 65557, J = 101010256;
function k(t, e) {
	if (e < 22) return !1;
	const s = Math.min(e, Q), i = new Uint8Array(s), r = t.read(i, { at: e - s });
	if (r < 22) return !1;
	const a = new DataView(i.buffer, i.byteOffset, r);
	for (let n = r - 22; n >= 0; n--) if (a.getUint32(n, !0) === J) return !0;
	return !1;
}
var $ = class b {
	static instance = null;
	mode = "realtime";
	manualNowMs = 0;
	manualUnixMs = 0;
	virtualTimeActive = !1;
	virtualTimeMs = 0;
	static getInstance() {
		return b.instance || (b.instance = new b()), b.instance;
	}
	setMode(e, s, i) {
		if (this.mode = e, e === "manual") {
			if (s !== void 0 && (this.manualNowMs = s), i !== void 0) this.manualUnixMs = i;
			else if (s !== void 0) {
				const r = s - this.nowMsRealtime();
				this.manualUnixMs = Date.now() + r;
			}
		}
	}
	setManualTime(e, s) {
		if (this.mode = "manual", this.manualNowMs = e, s !== void 0) this.manualUnixMs = s;
		else {
			const i = e - this.nowMsRealtime();
			this.manualUnixMs = Date.now() + i;
		}
	}
	advanceByMs(e) {
		this.mode === "manual" && (this.manualNowMs += e, this.manualUnixMs += e);
	}
	enableVirtualTime() {
		this.virtualTimeActive || (this.virtualTimeActive = !0, this.virtualTimeMs = performance.now());
	}
	advanceVirtualTime(e) {
		this.virtualTimeActive && (this.virtualTimeMs += e);
	}
	creditIdleMs(e) {
		if (!this.virtualTimeActive || e <= 0) return 0;
		const s = performance.now() + b.MAX_AHEAD_MS - this.virtualTimeMs, i = Math.max(0, Math.min(e, s));
		return this.virtualTimeMs += i, i;
	}
	wallClockMs() {
		return performance.now();
	}
	notifyPauseResume() {
		this.reanchorForward();
	}
	reanchorToWallClock() {
		this.reanchorForward();
	}
	reanchorForward() {
		this.virtualTimeActive && (this.virtualTimeMs = Math.max(this.virtualTimeMs, this.lastReturnedMs, performance.now()));
	}
	isVirtualTimeActive() {
		return this.virtualTimeActive;
	}
	resetForGameSwitch() {
		this.mode = "realtime", this.manualNowMs = 0, this.manualUnixMs = 0, this.lastReturnedMs = 0, this.virtualTimeActive && (this.virtualTimeMs = performance.now());
	}
	lastReturnedMs = 0;
	static MAX_DELTA_MS = 6e4;
	static CLAMP_DELTA_MS = 16.666;
	static MAX_AHEAD_MS = 2;
	static DEFAULT_TIMER_RESOLUTION_MS = 15.625;
	_timerResolutionMs = b.DEFAULT_TIMER_RESOLUTION_MS;
	get timerResolutionMs() {
		return this._timerResolutionMs;
	}
	setTimerResolutionMs(e) {
		this._timerResolutionMs = e !== null && e > 0 ? e : b.DEFAULT_TIMER_RESOLUTION_MS;
	}
	nowMs() {
		let e;
		if (this.mode === "manual" ? e = this.manualNowMs : this.virtualTimeActive ? e = this.virtualTimeMs : e = this.nowMsRealtime(), this.lastReturnedMs > 0 && this.mode !== "manual") {
			const s = e - this.lastReturnedMs;
			s > b.MAX_DELTA_MS && (console.warn(`[TimeService] Delta spike detected: ${s.toFixed(2)}ms. Clamping to ${b.CLAMP_DELTA_MS}ms.`), e = this.lastReturnedMs + b.CLAMP_DELTA_MS, this.virtualTimeActive && (this.virtualTimeMs = e));
		}
		return this.mode !== "manual" && e < this.lastReturnedMs && (e = this.lastReturnedMs, this.virtualTimeActive && (this.virtualTimeMs = e)), this.lastReturnedMs = e, e;
	}
	nowUnixMs() {
		return this.mode === "manual" ? this.manualUnixMs : Date.now();
	}
	nowMicros() {
		return Math.floor(this.nowMs() * 1e3);
	}
	getMode() {
		return this.mode;
	}
	nowMsRealtime() {
		return performance.now();
	}
	static fastPathGetTickCount = () => b.getInstance().nowMs() | 0;
	static fastPathQueryPerformanceCounter = (e, s, i) => {
		let r = 0;
		if (e + 4 + 4 <= i.length && (r = s.getUint32(e + 4, !0)), r !== 0 && r + 8 <= i.length) {
			const a = BigInt(b.getInstance().nowMicros());
			s.setBigUint64(r, a, !0);
		}
		return 1;
	};
	static fastPathQueryPerformanceFrequency = (e, s, i) => {
		let r = 0;
		if (e + 4 + 4 <= i.length && (r = s.getUint32(e + 4, !0)), r !== 0 && r + 8 <= i.length) {
			const a = BigInt(1e6);
			s.setBigUint64(r, a, !0);
		}
		return 1;
	};
};
let N = (function(t) {
	return t[t.SILENT = 0] = "SILENT", t[t.ERROR = 1] = "ERROR", t[t.WARN = 2] = "WARN", t[t.NORMAL = 3] = "NORMAL", t[t.VERBOSE = 4] = "VERBOSE", t;
})({}), u = (function(t) {
	return t.THUNK = "THUNK", t.USER32 = "USER32", t.GDI32 = "GDI32", t.KERNEL32 = "KERNEL32", t.D3D9 = "D3D9", t.DDRAW = "DDRAW", t.SYSTEM = "SYSTEM", t.THREAD = "THREAD", t.CALLBACK = "CALLBACK", t.COM = "COM", t.RESOURCE = "RESOURCE", t;
})({});
var Z = class {
	enabled = !1;
	dbName = "bottleship-logs";
	storeName = "verbose";
	dbPromise = null;
	pending = [];
	flushHandle = null;
	configure(t) {
		this.enabled = t.enabled, t.dbName && (this.dbName = t.dbName), t.storeName && (this.storeName = t.storeName), this.enabled || (this.pending = [], this.flushHandle !== null && (clearTimeout(this.flushHandle), this.flushHandle = null));
	}
	isEnabled() {
		return this.enabled && this.canAccess();
	}
	enqueue(t) {
		this.isEnabled() && (this.pending.push(t), this.flushHandle === null && (this.flushHandle = setTimeout(() => this.flush(), 50)));
	}
	async exportText() {
		if (!this.canAccess()) return this.pendingToText(this.pending);
		await this.flushNow();
		const t = await this.openDb();
		return new Promise((e, s) => {
			const i = t.transaction(this.storeName, "readonly").objectStore(this.storeName), r = [], a = i.openCursor();
			a.onsuccess = () => {
				const n = a.result;
				if (!n) {
					e(r.join(`
`));
					return;
				}
				const o = n.value, h = typeof o.timestamp == "number" ? o.timestamp : 0, c = N[o.level] ?? String(o.level);
				r.push(`[${(h / 1e3).toFixed(3)}s] [${c}] [${o.category}] ${o.message}`), n.continue();
			}, a.onerror = () => s(a.error);
		});
	}
	async clear() {
		if (!this.canAccess()) return;
		const t = await this.openDb();
		await new Promise((e, s) => {
			const i = t.transaction(this.storeName, "readwrite").objectStore(this.storeName).clear();
			i.onsuccess = () => e(), i.onerror = () => s(i.error);
		});
	}
	async flush() {
		if (!this.isEnabled()) {
			this.pending = [], this.flushHandle = null;
			return;
		}
		const t = this.pending.splice(0, this.pending.length);
		this.flushHandle = null, t.length !== 0 && await this.flushEntries(t);
	}
	async flushNow() {
		if (!this.isEnabled()) return;
		this.flushHandle !== null && (clearTimeout(this.flushHandle), this.flushHandle = null);
		const t = this.pending.splice(0, this.pending.length);
		t.length !== 0 && await this.flushEntries(t);
	}
	async flushEntries(t) {
		try {
			const e = await this.openDb();
			await new Promise((s, i) => {
				const r = e.transaction(this.storeName, "readwrite"), a = r.objectStore(this.storeName);
				for (const n of t) a.add({
					timestamp: n.timestamp,
					category: n.category,
					level: n.level,
					message: n.message
				});
				r.oncomplete = () => s(), r.onerror = () => i(r.error);
			});
		} catch {}
	}
	openDb() {
		return this.dbPromise ? this.dbPromise : (this.dbPromise = new Promise((t, e) => {
			const s = indexedDB.open(this.dbName, 1);
			s.onupgradeneeded = () => {
				const i = s.result;
				i.objectStoreNames.contains(this.storeName) || i.createObjectStore(this.storeName, { autoIncrement: !0 });
			}, s.onsuccess = () => t(s.result), s.onerror = () => e(s.error);
		}), this.dbPromise);
	}
	canAccess() {
		return typeof indexedDB < "u";
	}
	pendingToText(t) {
		return t.map((e) => `[${(e.timestamp / 1e3).toFixed(3)}s] [${N[e.level] ?? String(e.level)}] [${e.category}] ${e.message}`).join(`
`);
	}
};
const x = {
	THUNK: 100,
	SYSTEM: 50
}, X = 50, tt = 16;
var et = class {
	buffer = [];
	bufferSize = 50;
	globalLevel = 3;
	categoryLevels = /* @__PURE__ */ new Map();
	writeIndex = 0;
	entryCount = 0;
	verboseStore = new Z();
	streamCallback = null;
	taps = [];
	streamCategories = null;
	streamBatch = [];
	streamBatchTimer = null;
	profilingEnabled = !1;
	logCallCount = 0;
	logTotalTimeMs = 0;
	consoleCallCount = 0;
	consoleTotalTimeMs = 0;
	lastStatsReset = 0;
	categoryCounters = /* @__PURE__ */ new Map();
	consoleCounters = /* @__PURE__ */ new Map();
	globalEnabled = !0;
	setGlobalEnabled(t) {
		this.globalEnabled = t;
	}
	isGlobalEnabled() {
		return this.globalEnabled;
	}
	setLevel(t) {
		this.globalLevel = t;
	}
	setCategoryLevel(t, e) {
		this.categoryLevels.set(t, e);
	}
	setProfilingEnabled(t) {
		this.profilingEnabled = t, t && this.resetProfilingStats();
	}
	resetProfilingStats() {
		this.logCallCount = 0, this.logTotalTimeMs = 0, this.consoleCallCount = 0, this.consoleTotalTimeMs = 0, this.lastStatsReset = performance.now();
	}
	getProfilingStats() {
		return {
			calls: this.logCallCount,
			totalMs: this.logTotalTimeMs,
			consoleCalls: this.consoleCallCount,
			consoleMs: this.consoleTotalTimeMs,
			periodMs: performance.now() - this.lastStatsReset
		};
	}
	isEnabled(t, e) {
		return e === 4 ? this.verboseSuppressedByCategory(t) ? !1 : this.getCategoryLevel(t) >= 4 || this.verboseStore.isEnabled() || this.streamCallback !== null : this.getCategoryLevel(t) >= e;
	}
	verboseSuppressedByCategory(t) {
		const e = this.categoryLevels.get(t);
		return e !== void 0 && e < 4;
	}
	isConsoleEnabled(t, e) {
		return this.globalEnabled && this.getCategoryLevel(t) >= e;
	}
	getCategoryLevel(t) {
		return this.categoryLevels.get(t) ?? this.globalLevel;
	}
	resetCategoryLevels() {
		this.categoryLevels.clear();
	}
	applySeniorDebugPreset() {
		this.globalLevel = 1, this.setCategoryLevel("THUNK", 0), this.setCategoryLevel("SYSTEM", 3), this.setCategoryLevel("THREAD", 3), this.setCategoryLevel("D3D9", 3), this.setCategoryLevel("DDRAW", 3), this.setCategoryLevel("COM", 2);
	}
	getBufferSize() {
		return this.bufferSize;
	}
	setBufferSize(t) {
		const e = Math.max(1, Math.floor(t)), s = this.getOrderedEntries().slice(-e);
		this.bufferSize = e, this.buffer = s, this.writeIndex = s.length % e;
	}
	verboseLazy(t, e) {
		if (this.verboseSuppressedByCategory(t)) return;
		const s = this.globalEnabled && this.getCategoryLevel(t) >= 4, i = this.verboseStore.isEnabled(), r = this.streamCallback !== null;
		!s && !i && !r || this.verbose(t, e());
	}
	logLazy(t, e) {
		!this.globalEnabled && !this.streamCallback || this.getCategoryLevel(t) < 3 && !this.streamCallback || this.log(t, e());
	}
	verbose(t, e) {
		if (this.verboseSuppressedByCategory(t)) return;
		const s = this.globalEnabled && this.getCategoryLevel(t) >= 4, i = this.verboseStore.isEnabled(), r = this.streamCallback !== null;
		if (!s && !i && !r) return;
		const a = this.profilingEnabled ? performance.now() : 0, n = this.addToBuffer(t, 4, e);
		if (i && this.verboseStore.enqueue(n), s && this.shouldEmitToConsole(t)) {
			const o = this.profilingEnabled ? performance.now() : 0;
			console.log(`[${t}] ${e}`), this.profilingEnabled && (this.consoleCallCount++, this.consoleTotalTimeMs += performance.now() - o);
		}
		this.profilingEnabled && (this.logCallCount++, this.logTotalTimeMs += performance.now() - a);
	}
	log(t, e) {
		const s = this.profilingEnabled ? performance.now() : 0;
		if (this.addToBuffer(t, 3, e), this.globalEnabled && this.getCategoryLevel(t) >= 3 && this.shouldEmitToConsole(t)) {
			const i = this.profilingEnabled ? performance.now() : 0;
			console.log(`[${t}] ${e}`), this.profilingEnabled && (this.consoleCallCount++, this.consoleTotalTimeMs += performance.now() - i);
		}
		this.profilingEnabled && (this.logCallCount++, this.logTotalTimeMs += performance.now() - s);
	}
	info(t, e) {
		this.log(t, e);
	}
	warn(t, e) {
		const s = this.profilingEnabled ? performance.now() : 0;
		if (this.addToBuffer(t, 2, e), this.globalEnabled && this.getCategoryLevel(t) >= 2) {
			const i = this.profilingEnabled ? performance.now() : 0;
			console.warn(`[${t}] ${e}`), this.profilingEnabled && (this.consoleCallCount++, this.consoleTotalTimeMs += performance.now() - i);
		}
		this.profilingEnabled && (this.logCallCount++, this.logTotalTimeMs += performance.now() - s);
	}
	error(t, e) {
		this.addToBuffer(t, 1, e), this.globalEnabled && this.flushContext(`ERROR: ${e}`);
	}
	unimplemented(t, e) {
		const s = `Unimplemented: ${t}!${e}`;
		this.addToBuffer("THUNK", 1, s), this.globalEnabled && this.flushContext(s);
	}
	thunkCall(t, e, s) {
		const i = s ? `${t}!${e} - ${s}` : `${t}!${e}`;
		this.verbose("THUNK", i);
	}
	keepInRing(t, e) {
		if (e <= 1) return !0;
		const s = this.categoryLevels.get(t);
		return s === void 0 || s >= e;
	}
	addToBuffer(t, e, s) {
		const i = {
			timestamp: $.getInstance().nowMs(),
			category: t,
			level: e,
			message: s
		};
		if (this.keepInRing(t, e) && (this.buffer.length < this.bufferSize ? this.buffer.push(i) : this.buffer[this.writeIndex] = i, this.writeIndex = (this.writeIndex + 1) % this.bufferSize, this.entryCount++), this.taps.length) for (const r of this.taps) try {
			r(i);
		} catch {}
		return this.streamCallback && (!this.streamCategories || this.streamCategories.has(t)) && (e <= 2 || this.shouldSample(t)) && this.addToStreamBatch(i), i;
	}
	flushContext(t) {
		console.error(`🚨 BottleShip: ${t}`);
	}
	getOrderedEntries() {
		if (this.buffer.length < this.bufferSize) return [...this.buffer];
		const t = [];
		for (let e = 0; e < this.bufferSize; e++) {
			const s = (this.writeIndex + e) % this.bufferSize;
			t.push(this.buffer[s]);
		}
		return t;
	}
	dump() {
		this.flushContext("Manual dump");
	}
	clear() {
		this.buffer = [], this.writeIndex = 0, this.entryCount = 0;
	}
	enableVerboseIndexedDb(t) {
		this.verboseStore.configure(t);
	}
	exportVerboseIndexedDb() {
		return this.verboseStore.exportText();
	}
	clearVerboseIndexedDb() {
		return this.verboseStore.clear();
	}
	shouldSample(t) {
		const e = x[t];
		if (!e) return !0;
		const s = $.getInstance().nowMs(), i = this.categoryCounters.get(t) || {
			count: 0,
			windowStart: s
		};
		return s - i.windowStart >= 1e3 ? (this.categoryCounters.set(t, {
			count: 1,
			windowStart: s
		}), !0) : i.count >= e ? !1 : (i.count++, this.categoryCounters.set(t, i), !0);
	}
	shouldEmitToConsole(t) {
		const e = x[t];
		if (!e) return !0;
		const s = $.getInstance().nowMs();
		let i = this.consoleCounters.get(t);
		if (!i) return i = {
			count: 1,
			windowStart: s,
			suppressed: 0
		}, this.consoleCounters.set(t, i), !0;
		if (s - i.windowStart >= 1e3) {
			const r = i.suppressed;
			return i.count = 1, i.windowStart = s, i.suppressed = 0, r > 0 && console.log(`[${t}] … suppressed ${r} more entries in last 1s (rate limit ${e}/s)`), !0;
		}
		return i.count >= e ? (i.suppressed++, !1) : (i.count++, !0);
	}
	flushStreamBatch() {
		if (this.streamBatch.length === 0) return;
		const t = this.streamBatch.splice(0);
		if (this.streamBatchTimer !== null && (clearTimeout(this.streamBatchTimer), this.streamBatchTimer = null), this.streamCallback) try {
			this.streamCallback(t);
		} catch {}
	}
	addToStreamBatch(t) {
		if (t.level <= 2) {
			if (this.streamBatch.length > 0 && this.flushStreamBatch(), this.streamCallback) try {
				this.streamCallback([t]);
			} catch {}
			return;
		}
		this.streamBatch.push(t), this.streamBatch.length >= X ? this.flushStreamBatch() : this.streamBatchTimer || (this.streamBatchTimer = setTimeout(() => {
			this.streamBatchTimer = null, this.flushStreamBatch();
		}, tt));
	}
	setStreamCallback(t, e) {
		this.streamBatch.length > 0 && this.flushStreamBatch(), this.streamCallback = t, this.streamCategories = e ? new Set(e) : null;
	}
	addLogTap(t) {
		this.taps.includes(t) || this.taps.push(t);
	}
	removeLogTap(t) {
		const e = this.taps.indexOf(t);
		e >= 0 && this.taps.splice(e, 1);
	}
	getRecentEntries(t) {
		const e = this.getOrderedEntries();
		return t !== void 0 && t > 0 ? e.slice(-t) : e;
	}
};
const f = new et(), st = (t) => t, it = "wgb-cache";
function rt(t) {
	let e = 2166136261;
	for (let s = 0; s < t.length; s++) e = Math.imul(e ^ t.charCodeAt(s), 16777619);
	return (e >>> 0).toString(16).padStart(8, "0");
}
function w(t) {
	const [e, s] = t.split("?"), i = e.split("/").pop() || "game";
	return i.toLowerCase().endsWith(".wgb") ? i : `${s ? `${i}-${rt(s)}` : i}.wgb`;
}
function nt(t, e) {
	return t.url === e.url && t.size === e.size && t.etag === e.etag;
}
const at = "_blob-mount.wgb", I = "_cache-lru.json", z = 256 * 1024 * 1024;
var W = class {
	static cacheDir = null;
	static currentSource = null;
	static currentSourceKey = null;
	static releaseMountedSource() {
		this.currentSource && (this.currentSource.close(), this.currentSource = null), this.currentSourceKey = null;
	}
	static async writeCacheFile(t, e) {
		const s = await this.getCacheDir();
		if (!s) return;
		this.currentSourceKey === t && this.releaseMountedSource();
		const i = await s.getFileHandle(t, { create: !0 }), r = i.createSyncAccessHandle;
		if (typeof r == "function") {
			const n = await r.call(i);
			try {
				n.truncate(0);
				let o = 0;
				for (; o < e.byteLength;) {
					const h = n.write(e.subarray(o), { at: o });
					if (h <= 0) throw new Error("SAH short write");
					o += h;
				}
				n.flush();
			} finally {
				try {
					n.close();
				} catch {}
			}
			this.queueTouch(t);
			return;
		}
		const a = await i.createWritable();
		try {
			await a.write(st(e)), await a.close();
		} catch (n) {
			try {
				await a.abort();
			} catch {}
			throw n;
		}
		this.queueTouch(t);
	}
	static async getCacheDir() {
		if (this.cacheDir) return this.cacheDir;
		try {
			const t = await (await navigator.storage.getDirectory()).getDirectoryHandle("bottleship", { create: !0 });
			return this.cacheDir = await t.getDirectoryHandle(it, { create: !0 }), this.cacheDir;
		} catch (t) {
			return f.warn(u.SYSTEM, `WgbCache: OPFS unavailable: ${t}`), null;
		}
	}
	static async prepareSparseCache(t, e) {
		const s = await this.getCacheDir();
		if (!s) return null;
		let i = 0;
		try {
			i = (await (await s.getFileHandle(`${e}.sparse`)).getFile()).size;
		} catch {}
		return await this.ensureSpaceFor(Math.max(0, t - i), e) ? s : null;
	}
	static async storeVersion(t, e) {
		const s = e ?? await this.getCacheDir();
		if (!s) return;
		const i = await (await s.getFileHandle(`${w(t.url)}.version.json`, { create: !0 })).createWritable();
		try {
			await i.write(JSON.stringify(t)), await i.close();
		} catch (r) {
			throw await i.abort(), r;
		}
	}
	static lruChain = Promise.resolve();
	static queueTouch(t) {
		this.lruChain = this.lruChain.then(() => this.touchKey(t)).catch(() => {});
	}
	static async touchKey(t) {
		const e = await this.getCacheDir();
		if (!e) return;
		const s = await this.readLruMeta(e);
		s[t] = Date.now(), await this.writeLruMeta(e, s);
	}
	static async readLruMeta(t) {
		try {
			const e = await t.getFileHandle(I), s = JSON.parse(await (await e.getFile()).text());
			return s && typeof s == "object" ? s : {};
		} catch {
			return {};
		}
	}
	static async writeLruMeta(t, e) {
		try {
			const s = await (await t.getFileHandle(I, { create: !0 })).createWritable();
			await s.write(JSON.stringify(e)), await s.close();
		} catch {}
	}
	static async ensureSpaceFor(t, e) {
		let s = null;
		try {
			s = await navigator.storage?.estimate?.() ?? null;
		} catch {}
		if (!s?.quota) return !0;
		let i = s.quota - (s.usage ?? 0);
		if (i >= t + z) return !0;
		const r = await this.getCacheDir();
		if (!r) return !1;
		const a = await this.readLruMeta(r), n = [];
		for await (const [o, h] of r.entries()) if (!(h.kind !== "file" || o === I) && !(e && (o === e || o.startsWith(`${e}.`)) || this.currentSourceKey && (o === this.currentSourceKey || o.startsWith(`${this.currentSourceKey}.`)))) try {
			const c = (await h.getFile()).size;
			n.push({
				key: o,
				size: c,
				used: a[o] ?? 0
			});
		} catch {}
		n.sort((o, h) => o.used - h.used);
		for (const o of n) {
			if (i >= t + z) break;
			try {
				await r.removeEntry(o.key), delete a[o.key], i += o.size, f.log(u.SYSTEM, `WgbCache: evicted LRU "${o.key}" (${(o.size / 1024 / 1024).toFixed(1)} MB) for ${(t / 1024 / 1024).toFixed(1)} MB stage`);
			} catch {}
		}
		return await this.writeLruMeta(r, a), i >= t ? !0 : (f.warn(u.SYSTEM, `WgbCache: cannot free ${(t / 1024 / 1024).toFixed(1)} MB (free ${(i / 1024 / 1024).toFixed(1)} MB after eviction)`), !1);
	}
	static async get(t) {
		return this.getByKey(w(t));
	}
	static async getByKey(t) {
		const e = await this.getCacheDir();
		if (!e) return null;
		try {
			const s = await (await (await e.getFileHandle(t)).getFile()).arrayBuffer();
			return f.log(u.SYSTEM, `WgbCache: hit "${t}" (${(s.byteLength / 1024 / 1024).toFixed(1)} MB)`), new Uint8Array(s);
		} catch {
			return null;
		}
	}
	static async getBlob(t) {
		const e = await this.getCacheDir();
		if (!e) return null;
		try {
			const s = await (await e.getFileHandle(w(t))).getFile();
			return f.log(u.SYSTEM, `WgbCache: hit "${w(t)}" (${(s.size / 1024 / 1024).toFixed(1)} MB, disk-backed)`), s;
		} catch {
			return null;
		}
	}
	static async put(t, e) {
		try {
			await this.writeCacheFile(t, e), f.log(u.SYSTEM, `WgbCache: put "${t}" (${(e.byteLength / 1024 / 1024).toFixed(1)} MB)`);
		} catch (s) {
			f.warn(u.SYSTEM, `WgbCache: put failed for "${t}": ${s}`);
		}
	}
	static async downloadWithProgress(t, e) {
		const s = w(t);
		f.log(u.SYSTEM, `WgbCache: downloading "${s}"`);
		const i = await fetch(t);
		if (!i.ok) throw new Error(`HTTP ${i.status} ${i.statusText}`);
		const r = Number(i.headers.get("content-length") ?? "0"), a = i.body;
		let n;
		if (a) {
			const h = [];
			let c = 0;
			const l = a.getReader();
			for (;;) {
				const { done: d, value: m } = await l.read();
				if (d) break;
				h.push(m), c += m.byteLength, e(c, r);
			}
			n = new Uint8Array(c);
			let g = 0;
			for (const d of h) n.set(d, g), g += d.byteLength;
		} else {
			const h = await i.arrayBuffer();
			n = new Uint8Array(h), e(n.byteLength, n.byteLength);
		}
		const o = (n.byteLength / 1024 / 1024).toFixed(1);
		f.log(u.SYSTEM, `WgbCache: download done (${o} MB), writing to OPFS`);
		try {
			await this.writeCacheFile(s, n), await this.storeVersion({
				url: t,
				size: n.length,
				etag: i.headers.get("etag") ?? ""
			}), f.log(u.SYSTEM, `WgbCache: "${s}" cached (${o} MB)`);
		} catch (h) {
			f.warn(u.SYSTEM, `WgbCache: OPFS write failed for "${s}": ${h}`);
		}
		return n;
	}
	static async downloadToSyncSource(t, e) {
		const s = await this.getCacheDir();
		if (!s) return null;
		const i = w(t), r = `${i}.part`;
		this.releaseMountedSource();
		try {
			await s.removeEntry(r);
		} catch {}
		const a = await s.getFileHandle(r, { create: !0 });
		if (typeof a.createSyncAccessHandle != "function" || typeof a.move != "function") {
			try {
				await s.removeEntry(r);
			} catch {}
			return f.warn(u.SYSTEM, `WgbCache: createSyncAccessHandle/move unavailable — cannot stream "${i}"`), null;
		}
		f.log(u.SYSTEM, `WgbCache: streaming "${i}" to OPFS (no RAM copy)`);
		const n = await fetch(t);
		if (!n.ok) {
			try {
				await s.removeEntry(r);
			} catch {}
			throw new Error(`HTTP ${n.status} ${n.statusText}`);
		}
		const o = Number(n.headers.get("content-length") ?? "0"), h = n.body;
		if (!h) {
			try {
				await s.removeEntry(r);
			} catch {}
			return f.warn(u.SYSTEM, `WgbCache: no streaming body for "${i}" — cannot stream`), null;
		}
		if (o > 0 && !await this.ensureSpaceFor(o, i)) {
			try {
				await s.removeEntry(r);
			} catch {}
			return f.warn(u.SYSTEM, `WgbCache: quota too tight to stream "${i}" to OPFS`), null;
		}
		const c = await a.createSyncAccessHandle();
		let l = 0, g = !1;
		try {
			c.truncate(0);
			let d = 0;
			const m = h.getReader();
			for (;;) {
				const { done: S, value: E } = await m.read();
				if (S) break;
				let C = 0;
				for (; C < E.byteLength;) {
					const M = c.write(E.subarray(C), { at: d + C });
					if (M <= 0) throw new Error("SAH short write");
					C += M;
				}
				d += E.byteLength, e(d, o);
			}
			c.flush(), l = c.getSize(), g = (o <= 0 || l === o) && k(c, l);
		} finally {
			try {
				c.close();
			} catch {}
		}
		if (!g) {
			try {
				await s.removeEntry(r);
			} catch {}
			return f.warn(u.SYSTEM, `WgbCache: streamed "${i}" is not a usable bundle (${l}/${o} bytes) — discarded, not cached`), null;
		}
		try {
			await s.removeEntry(i);
		} catch {}
		return await a.move(i), await this.storeVersion({
			url: t,
			size: l,
			etag: n.headers.get("etag") ?? ""
		}), f.log(u.SYSTEM, `WgbCache: streamed "${i}" to OPFS (${(l / 1024 / 1024).toFixed(1)} MB, off-disk, no RAM copy)`), this.openSyncSourceByKey(i);
	}
	static async stageInBackground(t) {
		const e = await this.getCacheDir();
		if (!e) return !1;
		const s = w(t);
		try {
			return await e.getFileHandle(s), !0;
		} catch {}
		const i = `${s}.part`;
		try {
			await e.removeEntry(i);
		} catch {}
		const r = await fetch(t);
		if (!r.ok || !r.body) return !1;
		const a = Number(r.headers.get("content-length") ?? "0");
		if (a > 0 && !await this.ensureSpaceFor(a, s)) return f.warn(u.SYSTEM, `WgbCache: quota too tight to background-stage "${s}"`), !1;
		const n = await e.getFileHandle(i, { create: !0 });
		if (typeof n.createSyncAccessHandle != "function" || typeof n.move != "function") {
			try {
				await e.removeEntry(i);
			} catch {}
			return !1;
		}
		const o = await n.createSyncAccessHandle();
		let h = 0, c = !1;
		try {
			o.truncate(0);
			const l = r.body.getReader();
			let g = 0;
			for (;;) {
				const { done: d, value: m } = await l.read();
				if (d) break;
				let S = 0;
				for (; S < m.byteLength;) {
					const E = o.write(m.subarray(S), { at: g + S });
					if (E <= 0) throw new Error("SAH short write");
					S += E;
				}
				g += m.byteLength;
			}
			o.flush(), h = o.getSize(), c = k(o, h);
		} finally {
			try {
				o.close();
			} catch {}
		}
		if (!c || a > 0 && h !== a) {
			try {
				await e.removeEntry(i);
			} catch {}
			return f.warn(u.SYSTEM, `WgbCache: background stage of "${s}" is not a usable bundle (${h}/${a}) — discarded`), !1;
		}
		return await n.move(s), await this.storeVersion({
			url: t,
			size: h,
			etag: r.headers.get("etag") ?? ""
		}), this.queueTouch(s), !0;
	}
	static async downloadAndStore(t) {
		await this.downloadWithProgress(t, () => {});
	}
	static async openSyncSourceForUrl(t) {
		const e = w(t);
		return await this.cacheMatchesServer(t, e) ? this.openSyncSourceByKey(e) : null;
	}
	static async cacheMatchesServer(t, e) {
		const s = await this.getCacheDir();
		if (!s) return !0;
		let i;
		try {
			i = (await (await s.getFileHandle(e)).getFile()).size;
		} catch {
			return !0;
		}
		try {
			const r = await fetch(t, {
				method: "HEAD",
				cache: "no-cache",
				signal: AbortSignal.timeout(5e3)
			});
			if (!r.ok) return !0;
			const a = Number(r.headers.get("content-length") ?? "0");
			let n = null;
			try {
				const h = await (await s.getFileHandle(`${e}.version.json`)).getFile();
				n = JSON.parse(await h.text());
			} catch {}
			const o = r.headers.get("etag");
			if (!(a > 0 && a !== i || o !== null && (n === null || n.url !== t || n.etag !== o))) return !0;
			try {
				await s.removeEntry(e);
			} catch {}
			return f.log(u.SYSTEM, `WgbCache: "${e}" changed on the server (${i} → ${a} bytes) — re-downloading`), !1;
		} catch {
			return !0;
		}
	}
	static async openSyncSourceByKey(t) {
		const e = await this.getCacheDir();
		if (!e) return null;
		this.releaseMountedSource();
		try {
			const s = await e.getFileHandle(t), i = s.createSyncAccessHandle;
			if (typeof i != "function") return null;
			const r = await i.call(s), a = r.getSize();
			if (!k(r, a)) {
				try {
					r.close();
				} catch {}
				try {
					await e.removeEntry(t);
				} catch {}
				return f.warn(u.SYSTEM, `WgbCache: discarded cache entry "${t}" (${a} bytes, no ZIP end-of-central-directory) — will re-download`), null;
			}
			const n = new H(r, a);
			return this.currentSource = n, this.currentSourceKey = t, this.queueTouch(t), f.log(u.SYSTEM, `WgbCache: opened "${t}" as sync source (${(a / 1024 / 1024).toFixed(1)} MB, off-disk, no RAM copy)`), n;
		} catch {
			return null;
		}
	}
	static async mountBlobSync(t, e) {
		const s = await this.getCacheDir();
		if (!s) return null;
		this.releaseMountedSource();
		const i = t.name, r = typeof i == "string" && i ? w(i) : at;
		try {
			const a = await s.getFileHandle(r, { create: !0 });
			let n = !0;
			try {
				(await a.getFile()).size === t.size && t.size > 0 && (n = !1);
			} catch {}
			if (n && !await this.ensureSpaceFor(t.size, r)) {
				try {
					(await a.getFile()).size === 0 && await s.removeEntry(r);
				} catch {}
				return f.warn(u.SYSTEM, `WgbCache: quota too tight to stage "${r}" — falling back to async blob`), null;
			}
			const o = a.createSyncAccessHandle;
			if (typeof o != "function") return f.warn(u.SYSTEM, "WgbCache: createSyncAccessHandle unavailable — falling back to async blob"), null;
			const h = await o.call(a);
			if (n) {
				const g = performance.now();
				h.truncate(0);
				const d = 32 * 1024 * 1024;
				let m = 0;
				for (e?.(0, t.size); m < t.size;) {
					const E = Math.min(t.size, m + d), C = new Uint8Array(await t.slice(m, E).arrayBuffer());
					let M = 0;
					for (; M < C.byteLength;) {
						const L = h.write(C.subarray(M), { at: m + M });
						if (L <= 0) throw new Error("SAH short write");
						M += L;
					}
					m = E, e?.(m, t.size);
				}
				h.flush();
				const S = (t.size / 1024 / 1024).toFixed(1);
				f.log(u.SYSTEM, `WgbCache: blob "${r}" mounted to OPFS (${S} MB, ${performance.now() - g | 0}ms, sync)`);
			} else f.log(u.SYSTEM, `WgbCache: blob "${r}" reuse on-disk copy (${(t.size / 1024 / 1024).toFixed(1)} MB, sync)`);
			const c = h.getSize();
			if (!k(h, c)) {
				try {
					h.close();
				} catch {}
				try {
					await s.removeEntry(r);
				} catch {}
				return f.warn(u.SYSTEM, `WgbCache: staged blob "${r}" (${c} bytes) has no ZIP end-of-central-directory — falling back to async blob`), null;
			}
			const l = new H(h, c);
			return this.currentSource = l, this.currentSourceKey = r, this.queueTouch(r), l;
		} catch (a) {
			return f.warn(u.SYSTEM, `WgbCache: mountBlobSync failed (${a}) — falling back to async blob`), null;
		}
	}
	static keyForUrl(t) {
		return w(t);
	}
	static async getManifestOverride(t) {
		try {
			const e = await (await (await navigator.storage.getDirectory()).getDirectoryHandle("bottleship")).getFileHandle("_manifest-overrides.json"), s = JSON.parse(await (await e.getFile()).text())?.[t];
			return s && typeof s == "object" ? s : null;
		} catch {
			return null;
		}
	}
	static __testing = {
		urlToCacheKey: w,
		hasZipEocd: k
	};
	static async evict(t) {
		const e = await this.getCacheDir();
		if (!e) return;
		const s = w(t);
		try {
			await e.removeEntry(s), f.log(u.SYSTEM, `WgbCache: evicted "${s}"`);
		} catch {}
	}
};
function v(t, e, s) {
	let i = 0;
	for (; i < e.length;) {
		const r = t.write(e.subarray(i), { at: s + i });
		if (r <= 0) throw new Error("Sparse WGB cache short write");
		i += r;
	}
}
var ot = class Y {
	version;
	chunkBytes;
	dir;
	file;
	disk;
	bitmap;
	residency;
	complete = !1;
	bitmapOffset = 0;
	downloaded = 0;
	promotion = null;
	bits;
	constructor(e, s, i, r, a, n, o) {
		this.version = e, this.chunkBytes = s, this.dir = i, this.file = r, this.disk = a, this.bitmap = n, this.residency = o, this.bits = new Uint8Array(Math.ceil(Math.ceil(e.size / s) / 8));
	}
	static async open(e, s, i, r) {
		if (!e.etag || e.etag.startsWith("W/")) return null;
		let a, n;
		try {
			const o = w(e.url), h = r ?? await W.prepareSparseCache(e.size, o);
			if (!h) return null;
			const c = await h.getFileHandle(`${o}.sparse`, { create: !0 });
			a = await c.createSyncAccessHandle(), n = await (await h.getFileHandle(`${o}.bitmap`, { create: !0 })).createSyncAccessHandle();
			const l = new Y(e, s, h, c, a, n, i);
			return l.restore(), l;
		} catch {
			i.fill(0);
			try {
				a?.close();
			} catch {}
			try {
				n?.close();
			} catch {}
			return null;
		}
	}
	restore() {
		let e = !1;
		try {
			const i = /* @__PURE__ */ new Uint8Array(4);
			if (this.bitmap.read(i, { at: 0 }) === 4) {
				const r = new DataView(i.buffer).getUint32(0, !0);
				if (r > 0 && r < 16384 && this.bitmap.getSize() === 4 + r + this.bits.length) {
					const a = new Uint8Array(r);
					if (this.bitmap.read(a, { at: 4 }) !== r) throw new Error("short metadata");
					const n = JSON.parse(new TextDecoder().decode(a));
					e = nt(n, this.version) && n.chunkBytes === this.chunkBytes, this.bitmapOffset = 4 + r, e && this.bitmap.read(this.bits, { at: this.bitmapOffset }) !== this.bits.length && (e = !1);
				}
			}
		} catch {
			e = !1;
		}
		if (!e) {
			this.disk.truncate(0), this.disk.flush(), this.bits.fill(0);
			const i = new TextEncoder().encode(JSON.stringify({
				...this.version,
				chunkBytes: this.chunkBytes
			})), r = /* @__PURE__ */ new Uint8Array(4);
			new DataView(r.buffer).setUint32(0, i.length, !0), this.bitmap.truncate(0), v(this.bitmap, r, 0), v(this.bitmap, i, 4), this.bitmapOffset = 4 + i.length, v(this.bitmap, this.bits, this.bitmapOffset), this.bitmap.flush();
		}
		const s = this.disk.getSize();
		for (let i = 0; i < this.chunkCount; i++) this.has(i) && (Math.min(this.version.size, (i + 1) * this.chunkBytes) > s ? (this.bits[i >> 3] &= ~(1 << (i & 7)), v(this.bitmap, this.bits.subarray(i >> 3, (i >> 3) + 1), this.bitmapOffset + (i >> 3))) : (this.downloaded++, this.publish(i)));
		this.bitmap.flush();
	}
	get promoted() {
		return this.complete;
	}
	get chunkCount() {
		return Math.ceil(this.version.size / this.chunkBytes);
	}
	get downloadedChunks() {
		return this.downloaded;
	}
	has(e) {
		return (this.bits[e >> 3] & 1 << (e & 7)) !== 0;
	}
	publish(e) {
		Atomics.or(this.residency, e >> 5, 1 << (e & 31));
	}
	read(e) {
		if (!this.has(e)) return null;
		const s = e * this.chunkBytes, i = new Uint8Array(Math.min(this.chunkBytes, this.version.size - s));
		let r = 0;
		for (; r < i.length;) {
			const a = this.disk.read(i.subarray(r), { at: s + r });
			if (a <= 0) throw new Error(`Sparse WGB cache truncated at ${s + r}`);
			r += a;
		}
		return i;
	}
	async readAsync(e) {
		return this.promotion && await this.promotion, this.read(e);
	}
	write(e, s) {
		if (this.has(e)) return;
		const i = Math.min(this.chunkBytes, this.version.size - e * this.chunkBytes);
		if (s.length !== i) throw new Error(`Sparse WGB cache short chunk ${e}`);
		v(this.disk, s, e * this.chunkBytes), this.disk.flush();
		const r = this.bits[e >> 3] | 1 << (e & 7);
		v(this.bitmap, new Uint8Array([r]), this.bitmapOffset + (e >> 3)), this.bitmap.flush(), this.bits[e >> 3] = r, this.downloaded++, this.publish(e);
	}
	promote() {
		return this.promotion ??= this.promoteImpl();
	}
	async promoteImpl() {
		if (this.complete || this.downloaded !== this.chunkCount || !this.file.move) return this.complete;
		if (this.disk.getSize() !== this.version.size || !k(this.disk, this.version.size)) throw new Error("Completed sparse cache is not a ZIP");
		const e = w(this.version.url);
		this.disk.close();
		try {
			await this.file.move(e), await W.storeVersion(this.version, this.dir), this.complete = !0;
		} finally {
			this.disk = await this.file.createSyncAccessHandle();
		}
		return this.complete;
	}
	async close() {
		try {
			await this.promotion;
		} catch {}
		this.disk.close(), this.bitmap.close();
	}
}, ht = class {
	source;
	options;
	disk;
	changed;
	diskError = null;
	stats = {
		netFetches: 0,
		prefetches: 0,
		requests: 0,
		asyncRequests: 0,
		evictions: 0,
		netBytes: 0,
		residentBytes: 0,
		prefetchEvictedUnreadBytes: 0,
		chunksNeeded: 0,
		chunksResidentHit: 0,
		chunksDiskHit: 0,
		chunksJoinedInflight: 0,
		chunksFetchedCold: 0,
		requestsAllResident: 0,
		requestsNoNewFetch: 0,
		chunksRefetchedAfterEvict: 0,
		fillFetches: 0,
		fillBytes: 0,
		diskWriteFailures: 0
	};
	chunks = /* @__PURE__ */ new Map();
	pending = /* @__PURE__ */ new Map();
	jobsByChunk = /* @__PURE__ */ new Map();
	unread = /* @__PURE__ */ new Set();
	evicted = /* @__PURE__ */ new Set();
	queue = [];
	active = 0;
	speculativeActive = 0;
	demands = 0;
	filling = !1;
	fillBusy = !1;
	fillCursor = 0;
	fillOrder = [];
	closed = null;
	diskWritable = !0;
	constructor(t, e, s, i = () => {}) {
		this.source = t, this.options = e, this.disk = s, this.changed = i;
	}
	pump() {
		if (this.closed) return;
		this.queue.sort((e, s) => e.priority - s.priority);
		const t = Math.max(1, this.options.maxInflight >> 1);
		for (; this.active < this.options.maxInflight && this.queue.length;) {
			const e = this.queue[0];
			if (e.priority > 0 && this.speculativeActive >= t || e.priority === 2 && (this.demands > 0 || this.active > 0)) break;
			this.queue.shift();
			const s = e.priority > 0;
			this.active++, s && this.speculativeActive++, e.run().catch((i) => e.reject(i)).finally(() => {
				this.active--, s && this.speculativeActive--, this.changed(), this.pump(), this.pumpFill();
			});
		}
	}
	schedule(t, e, s) {
		return new Promise((i, r) => {
			const a = {
				priority: t,
				run: async () => {
					i(await e());
				},
				reject: r
			};
			s(a), this.queue.push(a), this.pump();
		});
	}
	remember(t, e, s) {
		if (!this.closed) for (this.chunks.has(t) || (this.stats.residentBytes += e.length), this.chunks.delete(t), this.chunks.set(t, e), s && this.unread.add(t); this.stats.residentBytes > this.options.cacheBytes && this.chunks.size > 1;) {
			const i = this.chunks.keys().next().value, r = this.chunks.get(i);
			this.chunks.delete(i), this.stats.residentBytes -= r.length, this.stats.evictions++, this.evicted.add(i), this.evicted.size > 4096 && this.evicted.delete(this.evicted.values().next().value), this.unread.delete(i) && (this.stats.prefetchEvictedUnreadBytes += r.length);
		}
	}
	persist(t, e) {
		if (!(this.closed || !this.disk || !this.diskWritable)) {
			try {
				this.disk.write(t, e);
			} catch (s) {
				this.diskWritable = !1, this.filling = !1, this.diskError = String(s), this.stats.diskWriteFailures++;
			}
			this.disk.downloadedChunks === this.disk.chunkCount && this.disk.promote().then(() => this.changed()).catch((s) => {
				this.diskError = `promotion failed: ${s}`, this.changed();
			});
		}
	}
	getChunk(t, e) {
		if (this.closed) return Promise.reject(this.closed);
		const s = this.chunks.get(t);
		if (s) return this.chunks.delete(t), this.chunks.set(t, s), Promise.resolve(s);
		const i = this.pending.get(t);
		if (i) {
			if (!e) {
				const n = this.jobsByChunk.get(t);
				n && (n.priority = 0, this.pump());
			}
			return i;
		}
		let r;
		if (this.disk?.has(t)) r = this.disk.readAsync(t).then((n) => {
			if (!n) throw new Error(`Missing disk chunk ${t}`);
			return this.remember(t, n, !1), n;
		});
		else {
			let n;
			r = this.schedule(e ? 1 : 0, async () => {
				const o = n.priority > 0, h = t * this.options.chunkBytes, c = Math.min(this.source.size, h + this.options.chunkBytes);
				o ? this.stats.prefetches++ : this.stats.netFetches++, this.evicted.has(t) && this.stats.chunksRefetchedAfterEvict++;
				const l = await this.source.readRange(h, c, {
					entryStart: h,
					entryEnd: c,
					cursor: h,
					sequential: !1,
					speculative: o
				});
				if (l.length !== c - h) throw new Error(`Short network chunk ${t}: ${l.length}/${c - h}`);
				return this.stats.netBytes += l.length, this.persist(t, l), this.remember(t, l, e), l;
			}, (o) => {
				n = o, this.jobsByChunk.set(t, o);
			});
		}
		const a = r.catch((n) => {
			throw n instanceof B && this.close(n), n;
		}).finally(() => {
			this.pending.delete(t), this.jobsByChunk.delete(t), this.changed();
		});
		return this.pending.set(t, a), a;
	}
	async read(t, e, s, i = !1) {
		if (this.closed) throw this.closed;
		if (!Number.isSafeInteger(t) || !Number.isSafeInteger(e) || t < 0 || e < 0 || t > this.source.size) throw new Error("Invalid streamed range");
		const r = Math.min(this.source.size, t + e);
		if (r === t) return /* @__PURE__ */ new Uint8Array(0);
		const a = s?.speculative === !0;
		i && this.stats.asyncRequests++, a || (this.stats.requests++, this.demands++);
		const n = Math.floor(t / this.options.chunkBytes), o = Math.floor((r - 1) / this.options.chunkBytes);
		if (!a) {
			let h = 0, c = 0;
			for (let l = n; l <= o; l++) this.stats.chunksNeeded++, this.chunks.has(l) ? this.stats.chunksResidentHit++ : this.disk?.has(l) ? this.stats.chunksDiskHit++ : this.pending.has(l) ? (this.stats.chunksJoinedInflight++, c++) : (this.stats.chunksFetchedCold++, h++), this.unread.delete(l);
			!h && !c && this.stats.requestsAllResident++, h || this.stats.requestsNoNewFetch++;
		}
		try {
			const h = [];
			for (let d = n; d <= o; d++) h.push(this.getChunk(d, a));
			const c = await Promise.all(h), l = new Uint8Array(r - t);
			let g = 0;
			for (let d = n; d <= o; d++) {
				const m = d * this.options.chunkBytes, S = Math.max(t, m), E = Math.min(r, m + c[d - n].length);
				l.set(c[d - n].subarray(S - m, E - m), S - t), g += E - S, a || this.unread.delete(d);
			}
			if (g !== l.length) throw new Error(`Short assembled range ${g}/${l.length}`);
			return s?.sequential && this.prefetch(r, s), l;
		} finally {
			a || this.demands--, this.changed(), this.pump(), this.pumpFill();
		}
	}
	prefetch(t, e) {
		const s = Math.floor(t / this.options.chunkBytes);
		for (let i = s; i < s + this.options.prefetchChunks && !(i * this.options.chunkBytes >= Math.min(this.source.size, e.entryEnd)); i++) if (!(this.chunks.has(i) || this.disk?.has(i) || this.pending.has(i))) {
			if (this.speculativeActive + this.queue.filter((r) => r.priority > 0).length >= Math.max(1, this.options.maxInflight >> 1)) break;
			this.getChunk(i, !0).catch(() => {});
		}
	}
	startFill(t = []) {
		this.fillOrder = [...new Set(t.filter((e) => Number.isInteger(e) && e >= 0 && e < Math.ceil(this.source.size / this.options.chunkBytes)))], this.filling = this.disk !== null && this.diskWritable, this.pumpFill();
	}
	pumpFill() {
		if (!this.filling || this.fillBusy || this.closed || this.demands || this.active || this.queue.length) return;
		const t = Math.ceil(this.source.size / this.options.chunkBytes);
		let e = this.fillOrder.shift();
		for (; e !== void 0 && (this.disk.has(e) || this.pending.has(e));) e = this.fillOrder.shift();
		if (e === void 0) {
			for (; this.fillCursor < t && (this.disk.has(this.fillCursor) || this.pending.has(this.fillCursor));) this.fillCursor++;
			e = this.fillCursor;
		}
		if (e >= t) {
			this.filling = !1, this.disk.promote().then(() => this.changed()).catch(() => {});
			return;
		}
		const s = e;
		let i = s;
		const r = Math.max(1, Math.floor(8 * 1024 * 1024 / this.options.chunkBytes));
		for (; i + 1 < t && i - s + 1 < r && !this.disk.has(i + 1) && !this.pending.has(i + 1);) i++;
		this.fillBusy = !0;
		const a = this.schedule(2, async () => {
			const n = s * this.options.chunkBytes, o = Math.min(this.source.size, (i + 1) * this.options.chunkBytes);
			this.stats.fillFetches++;
			const h = await this.source.readRange(n, o, {
				entryStart: n,
				entryEnd: o,
				cursor: n,
				sequential: !1,
				speculative: !0
			});
			if (h.length !== o - n) throw new Error(`Short fill range ${h.length}/${o - n}`);
			this.stats.netBytes += h.length, this.stats.fillBytes += h.length;
			for (let c = s; c <= i; c++) {
				const l = h.slice((c - s) * this.options.chunkBytes, Math.min(h.length, (c - s + 1) * this.options.chunkBytes));
				this.persist(c, l);
			}
			return h;
		}, (n) => {
			for (let o = s; o <= i; o++) this.jobsByChunk.set(o, n);
		});
		for (let n = s; n <= i; n++) {
			const o = a.then((h) => h.slice((n - s) * this.options.chunkBytes, Math.min(h.length, (n - s + 1) * this.options.chunkBytes))).finally(() => {
				this.pending.delete(n), this.jobsByChunk.delete(n);
			});
			this.pending.set(n, o), o.catch(() => {});
		}
		a.catch((n) => {
			this.filling = !1, n instanceof B && this.close(n);
		}).finally(() => {
			this.fillBusy = !1, this.changed(), setTimeout(() => this.pumpFill(), 0);
		});
	}
	close(t = /* @__PURE__ */ new Error("Stream I/O closed")) {
		if (!this.closed) {
			this.closed = t, this.filling = !1;
			for (const e of this.queue.splice(0)) e.reject(t);
			this.source instanceof K && this.source.close();
		}
	}
};
let y, _, F, p = null, U = !1, q = null;
const T = (t, e = []) => self.postMessage(t, e);
function P() {
	if (!p) return;
	const t = p.stats;
	p.diskError && p.diskError !== q && (q = p.diskError, T({
		type: "log",
		msg: `disk cache warning: ${p.diskError}`
	}));
	const e = [
		[32, p.disk?.promoted ? 1 : 0],
		[3, t.netFetches],
		[4, t.prefetches],
		[6, t.requests],
		[8, t.chunksNeeded],
		[9, t.chunksResidentHit],
		[24, t.chunksDiskHit],
		[10, t.chunksJoinedInflight],
		[11, t.chunksFetchedCold],
		[12, t.chunksRefetchedAfterEvict],
		[5, t.requestsAllResident],
		[13, t.requestsNoNewFetch],
		[14, t.evictions],
		[15, t.residentBytes / 1024],
		[21, t.netBytes / 1024],
		[22, t.prefetchEvictedUnreadBytes / 1024],
		[23, t.asyncRequests],
		[26, t.fillFetches],
		[27, t.fillBytes / 1024],
		[33, t.diskWriteFailures],
		[25, p.disk?.downloadedChunks ?? 0]
	];
	for (const [s, i] of e) Atomics.store(y, s, i | 0);
}
async function ct(t) {
	const e = V(t.layout);
	if (e) throw new Error(`SAB layout mismatch (${e})`);
	y = new Int32Array(t.sab, 0, 64), _ = new Float64Array(t.sab, 256, 4), F = new Uint8Array(t.sab, 288, D);
	const s = t.tune ?? {}, i = Math.max(64, s.chunkKB ?? 1024) * 1024, r = Math.max(1, s.maxInflight ?? 6), a = s.cacheMB ? Math.max(16, s.cacheMB) * 1024 * 1024 : r * i * 8, n = Math.max(0, s.prefetchChunks ?? 2), o = await K.create(t.url);
	if (!o.etag) throw o.close(), /* @__PURE__ */ new Error("WGB streaming requires a strong ETag");
	if (t.expected && (o.etag !== t.expected.etag || o.size !== t.expected.size)) throw o.close(), /* @__PURE__ */ new Error("WGB version changed while restarting I/O worker");
	const h = new SharedArrayBuffer(Math.ceil(Math.ceil(o.size / i) / 32) * 4), c = new Int32Array(h), l = s.disk === !1 ? null : await ot.open({
		url: t.url,
		size: o.size,
		etag: o.etag ?? ""
	}, i, c);
	if (l && l.downloadedChunks === l.chunkCount) try {
		await l.promote();
	} catch (g) {
		T({
			type: "log",
			msg: `promotion failed: ${g}`
		});
	}
	p = new ht(o, {
		chunkBytes: i,
		maxInflight: r,
		cacheBytes: a,
		prefetchChunks: n
	}, l, P), Atomics.store(y, 16, i / 1024), Atomics.store(y, 17, a / (1024 * 1024)), Atomics.store(y, 18, n), Atomics.store(y, 19, r), Atomics.store(y, 28, l ? 1 : 0), Atomics.store(y, 20, 1), P(), Atomics.store(y, 31, Date.now() | 0), setInterval(() => Atomics.store(y, 31, Date.now() | 0), 250), T({
		type: "ready",
		size: o.size,
		chunkBytes: i,
		residencySab: h,
		etag: o.etag
	});
}
async function lt(t) {
	const e = _[0], s = _[1], i = _[2];
	try {
		const r = await p.read(e, s, t);
		O(y, F, i, Atomics.load(y, 30), r);
	} catch (r) {
		O(y, F, i, Atomics.load(y, 30), null), T({
			type: "log",
			msg: `read failed off=${e} len=${s}: ${r}`
		});
	}
}
async function ut(t) {
	try {
		const e = await p.read(t.off, t.len, t.hint, !0);
		T({
			type: "aresp",
			id: t.id,
			ok: !0,
			buf: e.buffer
		}, [e.buffer]);
	} catch (e) {
		T({
			type: "aresp",
			id: t.id,
			ok: !1,
			message: String(e)
		});
	}
}
self.onmessage = (t) => {
	const e = t.data;
	U || (e?.type === "init" ? ct(e).catch((s) => T({
		type: "error",
		message: String(s)
	})) : e?.type === "req" ? lt(e.hint) : e?.type === "areq" ? ut(e) : e?.type === "fill" ? p?.startFill(e.order) : e?.type === "close" && (U = !0, p?.close(), (async () => (await p?.disk?.close(), T({ type: "closed" }), self.close()))()));
};
