(window["webpackJsonp"] = window["webpackJsonp"] || []).push([[3],{

/***/ 10:
/***/ (function(module, exports) {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor;
      var TempCtor = function () {};
      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    }
  };
}

/***/ }),

/***/ 11:
/***/ (function(module, exports) {

module.exports = promisize;
function promisize(cb) {
  var promise;
  var res;
  var rej;
  if (cb != null && typeof cb !== 'function') throw new Error('cb must be a function');
  if (cb == null && typeof Promise !== 'undefined') {
    promise = new Promise(function (resolve, reject) {
      res = resolve;
      rej = reject;
    });
  }
  function intercept(err, result) {
    if (promise) {
      if (err) rej(err);else res(result);
    } else {
      if (cb) cb(err, result);else if (err) throw err;
    }
  }
  intercept.promise = promise;
  return intercept;
}

/***/ }),

/***/ 5:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return create_fs; });
/* harmony import */ var idb_kv_store__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);
/* harmony import */ var idb_kv_store__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(idb_kv_store__WEBPACK_IMPORTED_MODULE_0__);
/*const importStorage = () => new Promise((resolve, reject) => {
  let done = false;
  const frame = document.createElement('iframe');
  window.addEventListener('message', ({data}) => {
    if (data.method === 'storage' && !done) {
      done = true;
      resolve(data.files);
      frame.contentWindow.postMessage({method: 'clear'}, '*');
    }
  });
  frame.addEventListener('load', () => {
    frame.contentWindow.postMessage({method: 'transfer'}, '*');
  });
  frame.addEventListener('error', () => {
    if (!done) {
      done = true;
      resolve(null);
    }
  });
  frame.src = "https://diablo.rivsoft.net/storage.html";
  frame.style.display = "none";
  document.body.appendChild(frame);
  setTimeout(() => {
    if (!done) {
      done = true;
      resolve(null);
    }
  }, 10000);
});*/async function downloadFile(store,name){const file=await store.get(name.toLowerCase());if(file){const blob=new Blob([file],{type:'binary/octet-stream'});const url=URL.createObjectURL(blob);const lnk=document.createElement('a');lnk.setAttribute('href',url);lnk.setAttribute('download',name);document.body.appendChild(lnk);lnk.click();document.body.removeChild(lnk);URL.revokeObjectURL(url);}else{console.error(`File ${name} does not exist`);}}async function downloadSaves(store){for(let name of await store.keys()){if(name.match(/\.sv$/i)){downloadFile(store,name);}}}const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.onabort=()=>reject();reader.readAsArrayBuffer(file);});async function uploadFile(store,files,file){const data=new Uint8Array(await readFile(file));files.set(file.name.toLowerCase(),data);return store.set(file.name.toLowerCase(),data);}async function create_fs(load){try{const store=new idb_kv_store__WEBPACK_IMPORTED_MODULE_0___default.a('diablo_fs');const files=new Map();for(let[name,data]of Object.entries(await store.json())){files.set(name,data);}/*if (load) {
      const files = await importStorage();
      if (files) {
        for (let [name, data] of files) {
          files.set(name, data);
          store.set(name, data);
        }
      }
    }*/window.DownloadFile=name=>downloadFile(store,name);window.DownloadSaves=()=>downloadSaves(store);return{files,update:(name,data)=>store.set(name,data),delete:name=>store.remove(name),clear:()=>store.clear(),download:name=>downloadFile(store,name),upload:file=>uploadFile(store,files,file),fileUrl:async name=>{const file=await store.get(name.toLowerCase());if(file){const blob=new Blob([file],{type:'binary/octet-stream'});return URL.createObjectURL(blob);}}};}catch(e){window.DownloadFile=()=>console.error('IndexedDB is not supported');window.DownloadSaves=()=>console.error('IndexedDB is not supported');return{files:new Map(),update:()=>Promise.resolve(),delete:()=>Promise.resolve(),clear:()=>Promise.resolve(),download:()=>Promise.resolve(),upload:()=>Promise.resolve(),fileUrl:()=>Promise.resolve()};}}

/***/ }),

/***/ 6:
/***/ (function(module, exports, __webpack_require__) {

/* eslint-env browser */

module.exports = IdbKvStore;
var EventEmitter = __webpack_require__(9).EventEmitter;
var inherits = __webpack_require__(10);
var promisize = __webpack_require__(11);
var global = typeof window === 'undefined' ? self : window;
var IDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB;
IdbKvStore.INDEXEDDB_SUPPORT = IDB != null;
IdbKvStore.BROADCAST_SUPPORT = global.BroadcastChannel != null;
inherits(IdbKvStore, EventEmitter);
function IdbKvStore(name, opts, cb) {
  var self = this;
  if (typeof name !== 'string') throw new Error('A name must be supplied of type string');
  if (!IDB) throw new Error('IndexedDB not supported');
  if (typeof opts === 'function') return new IdbKvStore(name, null, opts);
  if (!(self instanceof IdbKvStore)) return new IdbKvStore(name, opts, cb);
  if (!opts) opts = {};
  EventEmitter.call(self);
  self._db = null;
  self._closed = false;
  self._channel = null;
  self._waiters = [];
  var Channel = opts.channel || global.BroadcastChannel;
  if (Channel) {
    self._channel = new Channel(name);
    self._channel.onmessage = onChange;
  }
  var request = IDB.open(name);
  request.onerror = onerror;
  request.onsuccess = onsuccess;
  request.onupgradeneeded = onupgradeneeded;
  self.on('newListener', onNewListener);
  function onerror(event) {
    handleError(event);
    self._close(event.target.error);
    if (cb) cb(event.target.error);
  }
  function onDbError(event) {
    handleError(event);
    self._close(event.target.error);
  }
  function onsuccess(event) {
    if (self._closed) {
      event.target.result.close();
    } else {
      self._db = event.target.result;
      self._db.onclose = onclose;
      self._db.onerror = onDbError;
      for (var i in self._waiters) self._waiters[i]._init(null);
      self._waiters = null;
      if (cb) cb(null);
      self.emit('open');
    }
  }
  function onupgradeneeded(event) {
    var db = event.target.result;
    db.createObjectStore('kv', {
      autoIncrement: true
    });
  }
  function onclose() {
    self._close();
  }
  function onNewListener(event) {
    if (event !== 'add' && event !== 'set' && event !== 'remove') return;
    if (!self._channel) return self.emit('error', new Error('No BroadcastChannel support'));
  }
  function onChange(event) {
    if (event.data.method === 'add') self.emit('add', event.data);else if (event.data.method === 'set') self.emit('set', event.data);else if (event.data.method === 'remove') self.emit('remove', event.data);
  }
}
IdbKvStore.prototype.get = function (key, cb) {
  return this.transaction('readonly').get(key, cb);
};
IdbKvStore.prototype.getMultiple = function (keys, cb) {
  return this.transaction('readonly').getMultiple(keys, cb);
};
IdbKvStore.prototype.set = function (key, value, cb) {
  cb = promisize(cb);
  var error = null;
  var t = this.transaction('readwrite', function (err) {
    error = error || err;
    cb(error);
  });
  t.set(key, value, function (err) {
    error = err;
  });
  return cb.promise;
};
IdbKvStore.prototype.json = function (range, cb) {
  return this.transaction('readonly').json(range, cb);
};
IdbKvStore.prototype.keys = function (range, cb) {
  return this.transaction('readonly').keys(range, cb);
};
IdbKvStore.prototype.values = function (range, cb) {
  return this.transaction('readonly').values(range, cb);
};
IdbKvStore.prototype.remove = function (key, cb) {
  cb = promisize(cb);
  var error = null;
  var t = this.transaction('readwrite', function (err) {
    error = error || err;
    cb(error);
  });
  t.remove(key, function (err) {
    error = err;
  });
  return cb.promise;
};
IdbKvStore.prototype.clear = function (cb) {
  cb = promisize(cb);
  var error = null;
  var t = this.transaction('readwrite', function (err) {
    error = error || err;
    cb(error);
  });
  t.clear(function (err) {
    error = err;
  });
  return cb.promise;
};
IdbKvStore.prototype.count = function (range, cb) {
  return this.transaction('readonly').count(range, cb);
};
IdbKvStore.prototype.add = function (key, value, cb) {
  cb = promisize(cb);
  var error = null;
  var t = this.transaction('readwrite', function (err) {
    error = error || err;
    cb(error);
  });
  t.add(key, value, function (err) {
    error = err;
  });
  return cb.promise;
};
IdbKvStore.prototype.iterator = function (range, next) {
  return this.transaction('readonly').iterator(range, next);
};
IdbKvStore.prototype.transaction = function (mode, onfinish) {
  if (this._closed) throw new Error('Database is closed');
  var transaction = new Transaction(this, mode, onfinish);
  if (this._db) transaction._init(null);else this._waiters.push(transaction);
  return transaction;
};
IdbKvStore.prototype.close = function () {
  this._close();
};
IdbKvStore.prototype._close = function (err) {
  if (this._closed) return;
  this._closed = true;
  if (this._db) this._db.close();
  if (this._channel) this._channel.close();
  this._db = null;
  this._channel = null;
  if (err) this.emit('error', err);
  this.emit('close');
  for (var i in this._waiters) this._waiters[i]._init(err || new Error('Database is closed'));
  this._waiters = null;
  this.removeAllListeners();
};
function Transaction(kvStore, mode, cb) {
  if (typeof mode === 'function') return new Transaction(kvStore, null, mode);
  this._kvStore = kvStore;
  this._mode = mode || 'readwrite';
  this._objectStore = null;
  this._waiters = null;
  this.finished = false;
  this.onfinish = promisize(cb); // `onfinish` public variable for backwards compatibility with v4.3.1
  this.done = this.onfinish.promise;
  if (this._mode !== 'readonly' && this._mode !== 'readwrite') {
    throw new Error('mode must be either "readonly" or "readwrite"');
  }
}
Transaction.prototype._init = function (err) {
  var self = this;
  if (self.finished) return;
  if (err) return self._close(err);
  var transaction = self._kvStore._db.transaction('kv', self._mode);
  transaction.oncomplete = oncomplete;
  transaction.onerror = onerror;
  transaction.onabort = onerror;
  self._objectStore = transaction.objectStore('kv');
  for (var i in self._waiters) self._waiters[i](null, self._objectStore);
  self._waiters = null;
  function oncomplete() {
    self._close(null);
  }
  function onerror(event) {
    handleError(event);
    self._close(event.target.error);
  }
};
Transaction.prototype._getObjectStore = function (cb) {
  if (this.finished) throw new Error('Transaction is finished');
  if (this._objectStore) return cb(null, this._objectStore);
  this._waiters = this._waiters || [];
  this._waiters.push(cb);
};
Transaction.prototype.set = function (key, value, cb) {
  var self = this;
  if (key == null || value == null) throw new Error('A key and value must be given');
  cb = promisize(cb);
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);
    try {
      var request = objectStore.put(value, key);
    } catch (e) {
      return cb(e);
    }
    request.onerror = handleError.bind(this, cb);
    request.onsuccess = function () {
      if (self._kvStore._channel) {
        self._kvStore._channel.postMessage({
          method: 'set',
          key: key,
          value: value
        });
      }
      cb(null);
    };
  });
  return cb.promise;
};
Transaction.prototype.add = function (key, value, cb) {
  var self = this;
  if (value == null && key != null) return self.add(undefined, key, cb);
  if (typeof value === 'function' || value == null && cb == null) return self.add(undefined, key, value);
  if (value == null) throw new Error('A value must be provided as an argument');
  cb = promisize(cb);
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);
    try {
      var request = key == null ? objectStore.add(value) : objectStore.add(value, key);
    } catch (e) {
      return cb(e);
    }
    request.onerror = handleError.bind(this, cb);
    request.onsuccess = function () {
      if (self._kvStore._channel) {
        self._kvStore._channel.postMessage({
          method: 'add',
          key: key,
          value: value
        });
      }
      cb(null);
    };
  });
  return cb.promise;
};
Transaction.prototype.get = function (key, cb) {
  var self = this;
  if (key == null) throw new Error('A key must be given as an argument');
  cb = promisize(cb);
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);
    try {
      var request = objectStore.get(key);
    } catch (e) {
      return cb(e);
    }
    request.onerror = handleError.bind(this, cb);
    request.onsuccess = function (event) {
      cb(null, event.target.result);
    };
  });
  return cb.promise;
};
Transaction.prototype.getMultiple = function (keys, cb) {
  var self = this;
  if (keys == null) throw new Error('An array of keys must be given as an argument');
  cb = promisize(cb);
  if (keys.length === 0) {
    cb(null, []);
    return cb.promise;
  }
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);

    // Implementation mostly taken from https://www.codeproject.com/Articles/744986/How-to-do-some-magic-with-indexedDB
    var sortedKeys = keys.slice().sort();
    var i = 0;
    var resultsMap = {};
    var getReturnValue = function () {
      return keys.map(function (key) {
        return resultsMap[key];
      });
    };
    var cursorReq = objectStore.openCursor();
    cursorReq.onerror = handleError.bind(this, cb);
    cursorReq.onsuccess = function (event) {
      var cursor = event.target.result;
      if (!cursor) {
        cb(null, getReturnValue());
        return;
      }
      var key = cursor.key;
      while (key > sortedKeys[i]) {
        // The cursor has passed beyond this key. Check next.
        ++i;
        if (i === sortedKeys.length) {
          // There is no next. Stop searching.
          cb(null, getReturnValue());
          return;
        }
      }
      if (key === sortedKeys[i]) {
        resultsMap[key] = cursor.value;
        // The current cursor value should be included and we should continue
        // a single step in case next item has the same key or possibly our
        // next key in sortedKeys.
        cursor.continue();
      } else {
        // cursor.key not yet at sortedKeys[i]. Forward cursor to the next key to hunt for.
        cursor.continue(sortedKeys[i]);
      }
    };
  });
  return cb.promise;
};
Transaction.prototype.json = function (range, cb) {
  var self = this;
  if (typeof range === 'function') return self.json(null, range);
  cb = promisize(cb);
  var json = {};
  self.iterator(range, function (err, cursor) {
    if (err) return cb(err);
    if (cursor) {
      json[cursor.key] = cursor.value;
      cursor.continue();
    } else {
      cb(null, json);
    }
  });
  return cb.promise;
};
Transaction.prototype.keys = function (range, cb) {
  var self = this;
  if (typeof range === 'function') return self.keys(null, range);
  cb = promisize(cb);
  var keys = [];
  self.iterator(range, function (err, cursor) {
    if (err) return cb(err);
    if (cursor) {
      keys.push(cursor.key);
      cursor.continue();
    } else {
      cb(null, keys);
    }
  });
  return cb.promise;
};
Transaction.prototype.values = function (range, cb) {
  var self = this;
  if (typeof range === 'function') return self.values(null, range);
  cb = promisize(cb);
  var values = [];
  self.iterator(range, function (err, cursor) {
    if (err) return cb(err);
    if (cursor) {
      values.push(cursor.value);
      cursor.continue();
    } else {
      cb(null, values);
    }
  });
  return cb.promise;
};
Transaction.prototype.remove = function (key, cb) {
  var self = this;
  if (key == null) throw new Error('A key must be given as an argument');
  cb = promisize(cb);
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);
    try {
      var request = objectStore.delete(key);
    } catch (e) {
      return cb(e);
    }
    request.onerror = handleError.bind(this, cb);
    request.onsuccess = function () {
      if (self._kvStore._channel) {
        self._kvStore._channel.postMessage({
          method: 'remove',
          key: key
        });
      }
      cb(null);
    };
  });
  return cb.promise;
};
Transaction.prototype.clear = function (cb) {
  var self = this;
  cb = promisize(cb);
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);
    try {
      var request = objectStore.clear();
    } catch (e) {
      return cb(e);
    }
    request.onerror = handleError.bind(this, cb);
    request.onsuccess = function () {
      cb(null);
    };
  });
  return cb.promise;
};
Transaction.prototype.count = function (range, cb) {
  var self = this;
  if (typeof range === 'function') return self.count(null, range);
  cb = promisize(cb);
  self._getObjectStore(function (err, objectStore) {
    if (err) return cb(err);
    try {
      var request = range == null ? objectStore.count() : objectStore.count(range);
    } catch (e) {
      return cb(e);
    }
    request.onerror = handleError.bind(this, cb);
    request.onsuccess = function (event) {
      cb(null, event.target.result);
    };
  });
  return cb.promise;
};
Transaction.prototype.iterator = function (range, next) {
  var self = this;
  if (typeof range === 'function') return self.iterator(null, range);
  if (typeof next !== 'function') throw new Error('A function must be given');
  self._getObjectStore(function (err, objectStore) {
    if (err) return next(err);
    try {
      var request = range == null ? objectStore.openCursor() : objectStore.openCursor(range);
    } catch (e) {
      return next(e);
    }
    request.onerror = handleError.bind(this, next);
    request.onsuccess = function (event) {
      var cursor = event.target.result;
      next(null, cursor);
    };
  });
};
Transaction.prototype.abort = function () {
  if (this.finished) throw new Error('Transaction is finished');
  if (this._objectStore) this._objectStore.transaction.abort();
  this._close(new Error('Transaction aborted'));
};
Transaction.prototype._close = function (err) {
  if (this.finished) return;
  this.finished = true;
  this._kvStore = null;
  this._objectStore = null;
  for (var i in this._waiters) this._waiters[i](err || new Error('Transaction is finished'));
  this._waiters = null;
  if (this.onfinish) this.onfinish(err);
  this.onfinish = null;
};
function handleError(cb, event) {
  if (event == null) return handleError(null, cb);
  event.preventDefault();
  event.stopPropagation();
  if (cb) cb(event.target.error);
}

/***/ }),

/***/ 60:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _fs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
const fs=Object(_fs__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"])();window.addEventListener('message',({data,source})=>{if(data.method==='transfer'){fs.then(({files})=>{source.postMessage({method:'storage',files},'*');});}else if(data.method==='clear'){fs.then(({clear})=>clear());}});

/***/ }),

/***/ 9:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



var R = typeof Reflect === 'object' ? Reflect : null;
var ReflectApply = R && typeof R.apply === 'function' ? R.apply : function ReflectApply(target, receiver, args) {
  return Function.prototype.apply.call(target, receiver, args);
};
var ReflectOwnKeys;
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys;
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}
function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}
var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
};
function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;
Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function () {
    return defaultMaxListeners;
  },
  set: function (arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});
EventEmitter.init = function () {
  if (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }
  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};
function $getMaxListeners(that) {
  if (that._maxListeners === undefined) return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}
EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};
EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = type === 'error';
  var events = this._events;
  if (events !== undefined) doError = doError && events.error === undefined;else if (!doError) return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0) er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }
  var handler = events[type];
  if (handler === undefined) return false;
  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i) ReflectApply(listeners[i], this, args);
  }
  return true;
};
function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type, listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }
  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] = prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = $getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' + existing.length + ' ' + String(type) + ' listeners ' + 'added. Use emitter.setMaxListeners() to ' + 'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }
  return target;
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.prependListener = function prependListener(type, listener) {
  return _addListener(this, type, listener, true);
};
function onceWrapper() {
  var args = [];
  for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    ReflectApply(this.listener, this.target, args);
  }
}
function _onceWrap(target, type, listener) {
  var state = {
    fired: false,
    wrapFn: undefined,
    target: target,
    type: type,
    listener: listener
  };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}
EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  this.on(type, _onceWrap(this, type, listener));
  return this;
};
EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  this.prependListener(type, _onceWrap(this, type, listener));
  return this;
};

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener = function removeListener(type, listener) {
  var list, events, position, i, originalListener;
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
  events = this._events;
  if (events === undefined) return this;
  list = events[type];
  if (list === undefined) return this;
  if (list === listener || list.listener === listener) {
    if (--this._eventsCount === 0) this._events = Object.create(null);else {
      delete events[type];
      if (events.removeListener) this.emit('removeListener', type, list.listener || listener);
    }
  } else if (typeof list !== 'function') {
    position = -1;
    for (i = list.length - 1; i >= 0; i--) {
      if (list[i] === listener || list[i].listener === listener) {
        originalListener = list[i].listener;
        position = i;
        break;
      }
    }
    if (position < 0) return this;
    if (position === 0) list.shift();else {
      spliceOne(list, position);
    }
    if (list.length === 1) events[type] = list[0];
    if (events.removeListener !== undefined) this.emit('removeListener', type, originalListener || listener);
  }
  return this;
};
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  var listeners, events, i;
  events = this._events;
  if (events === undefined) return this;

  // not listening for removeListener, no need to emit
  if (events.removeListener === undefined) {
    if (arguments.length === 0) {
      this._events = Object.create(null);
      this._eventsCount = 0;
    } else if (events[type] !== undefined) {
      if (--this._eventsCount === 0) this._events = Object.create(null);else delete events[type];
    }
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    var keys = Object.keys(events);
    var key;
    for (i = 0; i < keys.length; ++i) {
      key = keys[i];
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = Object.create(null);
    this._eventsCount = 0;
    return this;
  }
  listeners = events[type];
  if (typeof listeners === 'function') {
    this.removeListener(type, listeners);
  } else if (listeners !== undefined) {
    // LIFO order
    for (i = listeners.length - 1; i >= 0; i--) {
      this.removeListener(type, listeners[i]);
    }
  }
  return this;
};
function _listeners(target, type, unwrap) {
  var events = target._events;
  if (events === undefined) return [];
  var evlistener = events[type];
  if (evlistener === undefined) return [];
  if (typeof evlistener === 'function') return unwrap ? [evlistener.listener || evlistener] : [evlistener];
  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}
EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};
EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};
EventEmitter.listenerCount = function (emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};
EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;
  if (events !== undefined) {
    var evlistener = events[type];
    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }
  return 0;
}
EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};
function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i) copy[i] = arr[i];
  return copy;
}
function spliceOne(list, index) {
  for (; index + 1 < list.length; index++) list[index] = list[index + 1];
  list.pop();
}
function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

/***/ })

},[[60,2]]]);