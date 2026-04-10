// Polyfill crypto.randomUUID and expo-modules-core uuidv4
// Must load BEFORE any Expo modules

if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {};
}

if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = function (arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
}
