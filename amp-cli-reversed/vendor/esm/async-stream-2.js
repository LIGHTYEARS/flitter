// Module: async-stream-2
// Original: iwT
// Type: ESM (PT wrapper)
// Exports: m8T
// Category: util

// Module: iwT (ESM)
() => {
  (Ii(),
    U7T(),
    (m8T = class T {
      constructor(R, a) {
        ((this.iterator = R), (this.controller = a));
      }
      async *decoder() {
        let R = new Pk();
        for await (let a of this.iterator)
          for (let e of R.decode(a)) yield JSON.parse(e);
        for (let a of R.flush()) yield JSON.parse(a);
      }
      [Symbol.asyncIterator]() {
        return this.decoder();
      }
      static fromResponse(R, a) {
        if (!R.body) {
          if (
            (a.abort(),
            typeof globalThis.navigator < "u" &&
              globalThis.navigator.product === "ReactNative")
          )
            throw new f9(
              "The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api",
            );
          throw new f9("Attempted to iterate over a response with no body");
        }
        return new T(i8T(R.body), a);
      }
    }));
};
