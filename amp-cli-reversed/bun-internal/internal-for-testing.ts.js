(function (){"use strict";// build/release/tmp_modules/internal-for-testing.ts
var $, fmtBinding = @lazy(100), highlightJavaScript = (code) => fmtBinding(code, "highlight-javascript"), escapePowershell = (code) => fmtBinding(code, "escape-powershell"), canonicalizeIP = @lazy(80), SQL = @lazy(1), patchInternals = {
  parse: @lazy(101),
  apply: @lazy(102),
  makeDiff: @lazy(103)
}, shellLex = @lazy(104), shellParse = @lazy(105), escapeRegExp = @lazy(106), escapeRegExpForPackageNameMatching = @lazy(107), shellInternals = {
  lex: (a, ...b) => shellLex(a.raw, b),
  parse: (a, ...b) => shellParse(a.raw, b),
  builtinDisabled: @lazy(108)
}, iniInternals = {
  parse: @lazy(109),
  loadNpmrc: @lazy(110)
}, cssInternals = {
  minifyTestWithOptions: @lazy(111),
  minifyErrorTestWithOptions: @lazy(112),
  testWithOptions: @lazy(113),
  prefixTestWithOptions: @lazy(114),
  minifyTest: @lazy(115),
  prefixTest: @lazy(116),
  _test: @lazy(117),
  attrTest: @lazy(118)
}, crash_handler = @lazy(119), upgrade_test_helpers = @lazy(120), install_test_helpers = @lazy(121), jscInternals = @lazy(122), nativeFrameForTesting = @lazy(123), memfd_create = @lazy(124), setSyntheticAllocationLimitForTesting = @lazy(125), npm_manifest_test_helpers = @lazy(126), npa = @lazy(127), npmTag = @lazy(128), readTarball = @lazy(129), isArchitectureMatch = @lazy(130), isOperatingSystemMatch = @lazy(131), createSocketPair = @lazy(132), isModuleResolveFilenameSlowPathEnabled = @lazy(133), frameworkRouterInternals = @lazy(134), bindgen = @lazy(135), noOpForTesting = @lazy(136), Dequeue = @getInternalField(@internalModuleRegistry, 17) || @createInternalModuleById(17), fs = (@getInternalField(@internalModuleRegistry, 97) || @createInternalModuleById(97)).@data, fsStreamInternals = {
  writeStreamFastPath(str) {
    return str[(@getInternalField(@internalModuleRegistry, 23) || @createInternalModuleById(23)).kWriteStreamFastPath];
  }
}, arrayBufferViewHasBuffer = @lazy(137), timerInternals = {
  timerClockMs: @lazy(138)
}, decodeURIComponentSIMD = @lazy(139), getDevServerDeinitCount = @lazy(140), getCounters = @lazy(141), hasNonReifiedStatic = @lazy(142), setSocketOptions = @lazy(143), structuredCloneAdvanced = @lazy(144), lsanDoLeakCheck = @lazy(145), getEventLoopStats = @lazy(146), hostedGitInfo = {
  parseUrl: @lazy(147),
  fromUrl: @lazy(148)
};
return{
  upgrade_test_helpers,
  timerInternals,
  structuredCloneAdvanced,
  shellInternals,
  setSyntheticAllocationLimitForTesting,
  setSocketOptions,
  readTarball,
  patchInternals,
  npm_manifest_test_helpers,
  npmTag,
  npa,
  noOpForTesting,
  nativeFrameForTesting,
  memfd_create,
  lsanDoLeakCheck,
  jscInternals,
  isOperatingSystemMatch,
  isModuleResolveFilenameSlowPathEnabled,
  isArchitectureMatch,
  install_test_helpers,
  iniInternals,
  hostedGitInfo,
  highlightJavaScript,
  hasNonReifiedStatic,
  getEventLoopStats,
  getDevServerDeinitCount,
  getCounters,
  fsStreamInternals,
  fs,
  frameworkRouterInternals,
  escapeRegExpForPackageNameMatching,
  escapeRegExp,
  escapePowershell,
  decodeURIComponentSIMD,
  cssInternals,
  createSocketPair,
  crash_handler,
  canonicalizeIP,
  bindgen,
  arrayBufferViewHasBuffer,
  SQL,
  Dequeue
};})

