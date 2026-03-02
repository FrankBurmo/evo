// Registrer tsx CJS-loader slik at require('./modul') finner .ts-filer
require('tsx/cjs');

// Gjør esbuild-kompilerte eksporter writable (for test-mocking)
// esbuild bruker Object.defineProperty med get-only, configurable:false.
// Vi patcher defineProperty for å legge til set + configurable:true på slike bindings.
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function patchedDefineProperty(obj, prop, descriptor) {
  if (
    descriptor &&
    typeof descriptor.get === 'function' &&
    descriptor.set === undefined &&
    descriptor.enumerable === true &&
    descriptor.configurable === undefined
  ) {
    // Dette er sannsynligvis en esbuild live binding — gjør den settable og configurable
    const originalGet = descriptor.get;
    let overrideValue;
    let hasOverride = false;
    descriptor = {
      get: () => (hasOverride ? overrideValue : originalGet()),
      set: (v) => {
        hasOverride = true;
        overrideValue = v;
      },
      enumerable: true,
      configurable: true,
    };
  }
  return originalDefineProperty.call(Object, obj, prop, descriptor);
};
