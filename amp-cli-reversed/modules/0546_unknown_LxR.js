function LxR() {
  if (typeof navigator > "u" || !navigator) return null;
  let T = [{
    key: "edge",
    pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "ie",
    pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "ie",
    pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "chrome",
    pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "firefox",
    pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }, {
    key: "safari",
    pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/
  }];
  for (let {
    key: R,
    pattern: a
  } of T) {
    let e = a.exec(navigator.userAgent);
    if (e) {
      let t = e[1] || 0,
        r = e[2] || 0,
        h = e[3] || 0;
      return {
        browser: R,
        version: `${t}.${r}.${h}`
      };
    }
  }
  return null;
}