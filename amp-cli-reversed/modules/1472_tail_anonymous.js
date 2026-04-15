// ----------------------------------------------------------------------------
// Original file: 1472_tail_anonymous.js
// This file was automatically split into domain-specific modules.
// The extracted classes can now be found in the '1472_tui_components' directory.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Phase 2 Split: Data Structures and Prototypes
// ----------------------------------------------------------------------------

// Extracted 17 nodes to: ./1472_tui_components/data_structures.js
// Extracted 48 nodes to: ./1472_tui_components/prototype_extensions.js


// Extracted 47 classes to: ./1472_tui_components/actions_intents.js
// Extracted 26 classes to: ./1472_tui_components/text_rendering.js
// Extracted 23 classes to: ./1472_tui_components/layout_widgets.js
// Extracted 30 classes to: ./1472_tui_components/interactive_widgets.js
// Extracted 22 classes to: ./1472_tui_components/jetbrains_wizard.js
// Extracted 276 classes to: ./1472_tui_components/misc_utils.js

jR();
O0();
xk0 = {
  apiKey: "AMP_API_KEY",
  "github-access-token": "AMP_GITHUB_TOKEN"
};
O0();
rR();
rR();
rR();
rR();
Pg = dk0(E_);
eA = new KXT();
rR();
rR();
(T => {
  T.BUILD = "build", T.LAYOUT = "layout", T.PAINT = "paint", T.RENDER = "render";
})(LtT ||= {});
cP = 1000 / Hk0;
qk0 = {
  left: 1,
  top: 1,
  right: 0,
  bottom: 0
};
rR();
rR();
rR();
rR();
O0();
rR();
lx0 = new Set([" ", "\t", `
`, "\r", "\v", "\f", "\xA0", "\u1680", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200A", "\u2028", "\u2029", "\u202F", "\u205F", "\u3000", "\uFEFF"]), Ax0 = new Set(["/", "\\", ".", ",", ";", ":", "!", "?", "(", ")", "[", "]", "{", "}", "<", ">", "'", '"', "=", "+", "-", "*", "&", "|", "^", "%", "$", "#", "@", "~", "`", "_"]);
om();
oa();
lm();
de();
Xw = {};
Ra(Xw, {
  spaceSeparated: () => m3,
  overloadedBoolean: () => UY,
  number: () => R0,
  commaSeparated: () => VP,
  commaOrSpaceSeparated: () => ih,
  booleanish: () => va,
  boolean: () => U9
});
U9 = Km(), va = Km(), UY = Km(), R0 = Km(), m3 = Km(), VP = Km(), ih = Km();
$F = Object.keys(Xw);
Z1T = af({
  properties: {
    ariaActiveDescendant: null,
    ariaAtomic: va,
    ariaAutoComplete: null,
    ariaBusy: va,
    ariaChecked: va,
    ariaColCount: R0,
    ariaColIndex: R0,
    ariaColSpan: R0,
    ariaControls: m3,
    ariaCurrent: null,
    ariaDescribedBy: m3,
    ariaDetails: null,
    ariaDisabled: va,
    ariaDropEffect: m3,
    ariaErrorMessage: null,
    ariaExpanded: va,
    ariaFlowTo: m3,
    ariaGrabbed: va,
    ariaHasPopup: null,
    ariaHidden: va,
    ariaInvalid: null,
    ariaKeyShortcuts: null,
    ariaLabel: null,
    ariaLabelledBy: m3,
    ariaLevel: R0,
    ariaLive: null,
    ariaModal: va,
    ariaMultiLine: va,
    ariaMultiSelectable: va,
    ariaOrientation: null,
    ariaOwns: m3,
    ariaPlaceholder: null,
    ariaPosInSet: R0,
    ariaPressed: va,
    ariaReadOnly: va,
    ariaRelevant: null,
    ariaRequired: va,
    ariaRoleDescription: m3,
    ariaRowCount: R0,
    ariaRowIndex: R0,
    ariaRowSpan: R0,
    ariaSelected: va,
    ariaSetSize: R0,
    ariaSort: null,
    ariaValueMax: R0,
    ariaValueMin: R0,
    ariaValueNow: R0,
    ariaValueText: null,
    role: null
  },
  transform(T, R) {
    return R === "role" ? R : "aria-" + R.slice(4).toLowerCase();
  }
});
Kx0 = af({
  attributes: {
    acceptcharset: "accept-charset",
    classname: "class",
    htmlfor: "for",
    httpequiv: "http-equiv"
  },
  mustUseProperty: ["checked", "multiple", "muted", "selected"],
  properties: {
    abbr: null,
    accept: VP,
    acceptCharset: m3,
    accessKey: m3,
    action: null,
    allow: null,
    allowFullScreen: U9,
    allowPaymentRequest: U9,
    allowUserMedia: U9,
    alt: null,
    as: null,
    async: U9,
    autoCapitalize: null,
    autoComplete: m3,
    autoFocus: U9,
    autoPlay: U9,
    blocking: m3,
    capture: null,
    charSet: null,
    checked: U9,
    cite: null,
    className: m3,
    cols: R0,
    colSpan: null,
    content: null,
    contentEditable: va,
    controls: U9,
    controlsList: m3,
    coords: R0 | VP,
    crossOrigin: null,
    data: null,
    dateTime: null,
    decoding: null,
    default: U9,
    defer: U9,
    dir: null,
    dirName: null,
    disabled: U9,
    download: UY,
    draggable: va,
    encType: null,
    enterKeyHint: null,
    fetchPriority: null,
    form: null,
    formAction: null,
    formEncType: null,
    formMethod: null,
    formNoValidate: U9,
    formTarget: null,
    headers: m3,
    height: R0,
    hidden: UY,
    high: R0,
    href: null,
    hrefLang: null,
    htmlFor: m3,
    httpEquiv: m3,
    id: null,
    imageSizes: null,
    imageSrcSet: null,
    inert: U9,
    inputMode: null,
    integrity: null,
    is: null,
    isMap: U9,
    itemId: null,
    itemProp: m3,
    itemRef: m3,
    itemScope: U9,
    itemType: m3,
    kind: null,
    label: null,
    lang: null,
    language: null,
    list: null,
    loading: null,
    loop: U9,
    low: R0,
    manifest: null,
    max: null,
    maxLength: R0,
    media: null,
    method: null,
    min: null,
    minLength: R0,
    multiple: U9,
    muted: U9,
    name: null,
    nonce: null,
    noModule: U9,
    noValidate: U9,
    onAbort: null,
    onAfterPrint: null,
    onAuxClick: null,
    onBeforeMatch: null,
    onBeforePrint: null,
    onBeforeToggle: null,
    onBeforeUnload: null,
    onBlur: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onContextLost: null,
    onContextMenu: null,
    onContextRestored: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFormData: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLanguageChange: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadEnd: null,
    onLoadStart: null,
    onMessage: null,
    onMessageError: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRejectionHandled: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onScrollEnd: null,
    onSecurityPolicyViolation: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onSlotChange: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnhandledRejection: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onWheel: null,
    open: U9,
    optimum: R0,
    pattern: null,
    ping: m3,
    placeholder: null,
    playsInline: U9,
    popover: null,
    popoverTarget: null,
    popoverTargetAction: null,
    poster: null,
    preload: null,
    readOnly: U9,
    referrerPolicy: null,
    rel: m3,
    required: U9,
    reversed: U9,
    rows: R0,
    rowSpan: R0,
    sandbox: m3,
    scope: null,
    scoped: U9,
    seamless: U9,
    selected: U9,
    shadowRootClonable: U9,
    shadowRootDelegatesFocus: U9,
    shadowRootMode: null,
    shape: null,
    size: R0,
    sizes: null,
    slot: null,
    span: R0,
    spellCheck: va,
    src: null,
    srcDoc: null,
    srcLang: null,
    srcSet: null,
    start: R0,
    step: null,
    style: null,
    tabIndex: R0,
    target: null,
    title: null,
    translate: null,
    type: null,
    typeMustMatch: U9,
    useMap: null,
    value: va,
    width: R0,
    wrap: null,
    writingSuggestions: null,
    align: null,
    aLink: null,
    archive: m3,
    axis: null,
    background: null,
    bgColor: null,
    border: R0,
    borderColor: null,
    bottomMargin: R0,
    cellPadding: null,
    cellSpacing: null,
    char: null,
    charOff: null,
    classId: null,
    clear: null,
    code: null,
    codeBase: null,
    codeType: null,
    color: null,
    compact: U9,
    declare: U9,
    event: null,
    face: null,
    frame: null,
    frameBorder: null,
    hSpace: R0,
    leftMargin: R0,
    link: null,
    longDesc: null,
    lowSrc: null,
    marginHeight: R0,
    marginWidth: R0,
    noResize: U9,
    noHref: U9,
    noShade: U9,
    noWrap: U9,
    object: null,
    profile: null,
    prompt: null,
    rev: null,
    rightMargin: R0,
    rules: null,
    scheme: null,
    scrolling: va,
    standby: null,
    summary: null,
    text: null,
    topMargin: R0,
    valueType: null,
    version: null,
    vAlign: null,
    vLink: null,
    vSpace: R0,
    allowTransparency: null,
    autoCorrect: null,
    autoSave: null,
    disablePictureInPicture: U9,
    disableRemotePlayback: U9,
    prefix: null,
    property: null,
    results: R0,
    security: null,
    unselectable: null
  },
  space: "html",
  transform: TYT
}), Vx0 = af({
  attributes: {
    accentHeight: "accent-height",
    alignmentBaseline: "alignment-baseline",
    arabicForm: "arabic-form",
    baselineShift: "baseline-shift",
    capHeight: "cap-height",
    className: "class",
    clipPath: "clip-path",
    clipRule: "clip-rule",
    colorInterpolation: "color-interpolation",
    colorInterpolationFilters: "color-interpolation-filters",
    colorProfile: "color-profile",
    colorRendering: "color-rendering",
    crossOrigin: "crossorigin",
    dataType: "datatype",
    dominantBaseline: "dominant-baseline",
    enableBackground: "enable-background",
    fillOpacity: "fill-opacity",
    fillRule: "fill-rule",
    floodColor: "flood-color",
    floodOpacity: "flood-opacity",
    fontFamily: "font-family",
    fontSize: "font-size",
    fontSizeAdjust: "font-size-adjust",
    fontStretch: "font-stretch",
    fontStyle: "font-style",
    fontVariant: "font-variant",
    fontWeight: "font-weight",
    glyphName: "glyph-name",
    glyphOrientationHorizontal: "glyph-orientation-horizontal",
    glyphOrientationVertical: "glyph-orientation-vertical",
    hrefLang: "hreflang",
    horizAdvX: "horiz-adv-x",
    horizOriginX: "horiz-origin-x",
    horizOriginY: "horiz-origin-y",
    imageRendering: "image-rendering",
    letterSpacing: "letter-spacing",
    lightingColor: "lighting-color",
    markerEnd: "marker-end",
    markerMid: "marker-mid",
    markerStart: "marker-start",
    navDown: "nav-down",
    navDownLeft: "nav-down-left",
    navDownRight: "nav-down-right",
    navLeft: "nav-left",
    navNext: "nav-next",
    navPrev: "nav-prev",
    navRight: "nav-right",
    navUp: "nav-up",
    navUpLeft: "nav-up-left",
    navUpRight: "nav-up-right",
    onAbort: "onabort",
    onActivate: "onactivate",
    onAfterPrint: "onafterprint",
    onBeforePrint: "onbeforeprint",
    onBegin: "onbegin",
    onCancel: "oncancel",
    onCanPlay: "oncanplay",
    onCanPlayThrough: "oncanplaythrough",
    onChange: "onchange",
    onClick: "onclick",
    onClose: "onclose",
    onCopy: "oncopy",
    onCueChange: "oncuechange",
    onCut: "oncut",
    onDblClick: "ondblclick",
    onDrag: "ondrag",
    onDragEnd: "ondragend",
    onDragEnter: "ondragenter",
    onDragExit: "ondragexit",
    onDragLeave: "ondragleave",
    onDragOver: "ondragover",
    onDragStart: "ondragstart",
    onDrop: "ondrop",
    onDurationChange: "ondurationchange",
    onEmptied: "onemptied",
    onEnd: "onend",
    onEnded: "onended",
    onError: "onerror",
    onFocus: "onfocus",
    onFocusIn: "onfocusin",
    onFocusOut: "onfocusout",
    onHashChange: "onhashchange",
    onInput: "oninput",
    onInvalid: "oninvalid",
    onKeyDown: "onkeydown",
    onKeyPress: "onkeypress",
    onKeyUp: "onkeyup",
    onLoad: "onload",
    onLoadedData: "onloadeddata",
    onLoadedMetadata: "onloadedmetadata",
    onLoadStart: "onloadstart",
    onMessage: "onmessage",
    onMouseDown: "onmousedown",
    onMouseEnter: "onmouseenter",
    onMouseLeave: "onmouseleave",
    onMouseMove: "onmousemove",
    onMouseOut: "onmouseout",
    onMouseOver: "onmouseover",
    onMouseUp: "onmouseup",
    onMouseWheel: "onmousewheel",
    onOffline: "onoffline",
    onOnline: "ononline",
    onPageHide: "onpagehide",
    onPageShow: "onpageshow",
    onPaste: "onpaste",
    onPause: "onpause",
    onPlay: "onplay",
    onPlaying: "onplaying",
    onPopState: "onpopstate",
    onProgress: "onprogress",
    onRateChange: "onratechange",
    onRepeat: "onrepeat",
    onReset: "onreset",
    onResize: "onresize",
    onScroll: "onscroll",
    onSeeked: "onseeked",
    onSeeking: "onseeking",
    onSelect: "onselect",
    onShow: "onshow",
    onStalled: "onstalled",
    onStorage: "onstorage",
    onSubmit: "onsubmit",
    onSuspend: "onsuspend",
    onTimeUpdate: "ontimeupdate",
    onToggle: "ontoggle",
    onUnload: "onunload",
    onVolumeChange: "onvolumechange",
    onWaiting: "onwaiting",
    onZoom: "onzoom",
    overlinePosition: "overline-position",
    overlineThickness: "overline-thickness",
    paintOrder: "paint-order",
    panose1: "panose-1",
    pointerEvents: "pointer-events",
    referrerPolicy: "referrerpolicy",
    renderingIntent: "rendering-intent",
    shapeRendering: "shape-rendering",
    stopColor: "stop-color",
    stopOpacity: "stop-opacity",
    strikethroughPosition: "strikethrough-position",
    strikethroughThickness: "strikethrough-thickness",
    strokeDashArray: "stroke-dasharray",
    strokeDashOffset: "stroke-dashoffset",
    strokeLineCap: "stroke-linecap",
    strokeLineJoin: "stroke-linejoin",
    strokeMiterLimit: "stroke-miterlimit",
    strokeOpacity: "stroke-opacity",
    strokeWidth: "stroke-width",
    tabIndex: "tabindex",
    textAnchor: "text-anchor",
    textDecoration: "text-decoration",
    textRendering: "text-rendering",
    transformOrigin: "transform-origin",
    typeOf: "typeof",
    underlinePosition: "underline-position",
    underlineThickness: "underline-thickness",
    unicodeBidi: "unicode-bidi",
    unicodeRange: "unicode-range",
    unitsPerEm: "units-per-em",
    vAlphabetic: "v-alphabetic",
    vHanging: "v-hanging",
    vIdeographic: "v-ideographic",
    vMathematical: "v-mathematical",
    vectorEffect: "vector-effect",
    vertAdvY: "vert-adv-y",
    vertOriginX: "vert-origin-x",
    vertOriginY: "vert-origin-y",
    wordSpacing: "word-spacing",
    writingMode: "writing-mode",
    xHeight: "x-height",
    playbackOrder: "playbackorder",
    timelineBegin: "timelinebegin"
  },
  properties: {
    about: ih,
    accentHeight: R0,
    accumulate: null,
    additive: null,
    alignmentBaseline: null,
    alphabetic: R0,
    amplitude: R0,
    arabicForm: null,
    ascent: R0,
    attributeName: null,
    attributeType: null,
    azimuth: R0,
    bandwidth: null,
    baselineShift: null,
    baseFrequency: null,
    baseProfile: null,
    bbox: null,
    begin: null,
    bias: R0,
    by: null,
    calcMode: null,
    capHeight: R0,
    className: m3,
    clip: null,
    clipPath: null,
    clipPathUnits: null,
    clipRule: null,
    color: null,
    colorInterpolation: null,
    colorInterpolationFilters: null,
    colorProfile: null,
    colorRendering: null,
    content: null,
    contentScriptType: null,
    contentStyleType: null,
    crossOrigin: null,
    cursor: null,
    cx: null,
    cy: null,
    d: null,
    dataType: null,
    defaultAction: null,
    descent: R0,
    diffuseConstant: R0,
    direction: null,
    display: null,
    dur: null,
    divisor: R0,
    dominantBaseline: null,
    download: U9,
    dx: null,
    dy: null,
    edgeMode: null,
    editable: null,
    elevation: R0,
    enableBackground: null,
    end: null,
    event: null,
    exponent: R0,
    externalResourcesRequired: null,
    fill: null,
    fillOpacity: R0,
    fillRule: null,
    filter: null,
    filterRes: null,
    filterUnits: null,
    floodColor: null,
    floodOpacity: null,
    focusable: null,
    focusHighlight: null,
    fontFamily: null,
    fontSize: null,
    fontSizeAdjust: null,
    fontStretch: null,
    fontStyle: null,
    fontVariant: null,
    fontWeight: null,
    format: null,
    fr: null,
    from: null,
    fx: null,
    fy: null,
    g1: VP,
    g2: VP,
    glyphName: VP,
    glyphOrientationHorizontal: null,
    glyphOrientationVertical: null,
    glyphRef: null,
    gradientTransform: null,
    gradientUnits: null,
    handler: null,
    hanging: R0,
    hatchContentUnits: null,
    hatchUnits: null,
    height: null,
    href: null,
    hrefLang: null,
    horizAdvX: R0,
    horizOriginX: R0,
    horizOriginY: R0,
    id: null,
    ideographic: R0,
    imageRendering: null,
    initialVisibility: null,
    in: null,
    in2: null,
    intercept: R0,
    k: R0,
    k1: R0,
    k2: R0,
    k3: R0,
    k4: R0,
    kernelMatrix: ih,
    kernelUnitLength: null,
    keyPoints: null,
    keySplines: null,
    keyTimes: null,
    kerning: null,
    lang: null,
    lengthAdjust: null,
    letterSpacing: null,
    lightingColor: null,
    limitingConeAngle: R0,
    local: null,
    markerEnd: null,
    markerMid: null,
    markerStart: null,
    markerHeight: null,
    markerUnits: null,
    markerWidth: null,
    mask: null,
    maskContentUnits: null,
    maskUnits: null,
    mathematical: null,
    max: null,
    media: null,
    mediaCharacterEncoding: null,
    mediaContentEncodings: null,
    mediaSize: R0,
    mediaTime: null,
    method: null,
    min: null,
    mode: null,
    name: null,
    navDown: null,
    navDownLeft: null,
    navDownRight: null,
    navLeft: null,
    navNext: null,
    navPrev: null,
    navRight: null,
    navUp: null,
    navUpLeft: null,
    navUpRight: null,
    numOctaves: null,
    observer: null,
    offset: null,
    onAbort: null,
    onActivate: null,
    onAfterPrint: null,
    onBeforePrint: null,
    onBegin: null,
    onCancel: null,
    onCanPlay: null,
    onCanPlayThrough: null,
    onChange: null,
    onClick: null,
    onClose: null,
    onCopy: null,
    onCueChange: null,
    onCut: null,
    onDblClick: null,
    onDrag: null,
    onDragEnd: null,
    onDragEnter: null,
    onDragExit: null,
    onDragLeave: null,
    onDragOver: null,
    onDragStart: null,
    onDrop: null,
    onDurationChange: null,
    onEmptied: null,
    onEnd: null,
    onEnded: null,
    onError: null,
    onFocus: null,
    onFocusIn: null,
    onFocusOut: null,
    onHashChange: null,
    onInput: null,
    onInvalid: null,
    onKeyDown: null,
    onKeyPress: null,
    onKeyUp: null,
    onLoad: null,
    onLoadedData: null,
    onLoadedMetadata: null,
    onLoadStart: null,
    onMessage: null,
    onMouseDown: null,
    onMouseEnter: null,
    onMouseLeave: null,
    onMouseMove: null,
    onMouseOut: null,
    onMouseOver: null,
    onMouseUp: null,
    onMouseWheel: null,
    onOffline: null,
    onOnline: null,
    onPageHide: null,
    onPageShow: null,
    onPaste: null,
    onPause: null,
    onPlay: null,
    onPlaying: null,
    onPopState: null,
    onProgress: null,
    onRateChange: null,
    onRepeat: null,
    onReset: null,
    onResize: null,
    onScroll: null,
    onSeeked: null,
    onSeeking: null,
    onSelect: null,
    onShow: null,
    onStalled: null,
    onStorage: null,
    onSubmit: null,
    onSuspend: null,
    onTimeUpdate: null,
    onToggle: null,
    onUnload: null,
    onVolumeChange: null,
    onWaiting: null,
    onZoom: null,
    opacity: null,
    operator: null,
    order: null,
    orient: null,
    orientation: null,
    origin: null,
    overflow: null,
    overlay: null,
    overlinePosition: R0,
    overlineThickness: R0,
    paintOrder: null,
    panose1: null,
    path: null,
    pathLength: R0,
    patternContentUnits: null,
    patternTransform: null,
    patternUnits: null,
    phase: null,
    ping: m3,
    pitch: null,
    playbackOrder: null,
    pointerEvents: null,
    points: null,
    pointsAtX: R0,
    pointsAtY: R0,
    pointsAtZ: R0,
    preserveAlpha: null,
    preserveAspectRatio: null,
    primitiveUnits: null,
    propagate: null,
    property: ih,
    r: null,
    radius: null,
    referrerPolicy: null,
    refX: null,
    refY: null,
    rel: ih,
    rev: ih,
    renderingIntent: null,
    repeatCount: null,
    repeatDur: null,
    requiredExtensions: ih,
    requiredFeatures: ih,
    requiredFonts: ih,
    requiredFormats: ih,
    resource: null,
    restart: null,
    result: null,
    rotate: null,
    rx: null,
    ry: null,
    scale: null,
    seed: null,
    shapeRendering: null,
    side: null,
    slope: null,
    snapshotTime: null,
    specularConstant: R0,
    specularExponent: R0,
    spreadMethod: null,
    spacing: null,
    startOffset: null,
    stdDeviation: null,
    stemh: null,
    stemv: null,
    stitchTiles: null,
    stopColor: null,
    stopOpacity: null,
    strikethroughPosition: R0,
    strikethroughThickness: R0,
    string: null,
    stroke: null,
    strokeDashArray: ih,
    strokeDashOffset: null,
    strokeLineCap: null,
    strokeLineJoin: null,
    strokeMiterLimit: R0,
    strokeOpacity: R0,
    strokeWidth: null,
    style: null,
    surfaceScale: R0,
    syncBehavior: null,
    syncBehaviorDefault: null,
    syncMaster: null,
    syncTolerance: null,
    syncToleranceDefault: null,
    systemLanguage: ih,
    tabIndex: R0,
    tableValues: null,
    target: null,
    targetX: R0,
    targetY: R0,
    textAnchor: null,
    textDecoration: null,
    textRendering: null,
    textLength: null,
    timelineBegin: null,
    title: null,
    transformBehavior: null,
    type: null,
    typeOf: ih,
    to: null,
    transform: null,
    transformOrigin: null,
    u1: null,
    u2: null,
    underlinePosition: R0,
    underlineThickness: R0,
    unicode: null,
    unicodeBidi: null,
    unicodeRange: null,
    unitsPerEm: R0,
    values: null,
    vAlphabetic: R0,
    vMathematical: R0,
    vectorEffect: null,
    vHanging: R0,
    vIdeographic: R0,
    version: null,
    vertAdvY: R0,
    vertOriginX: R0,
    vertOriginY: R0,
    viewBox: null,
    viewTarget: null,
    visibility: null,
    width: null,
    widths: null,
    wordSpacing: null,
    writingMode: null,
    x: null,
    x1: null,
    x2: null,
    xChannelSelector: null,
    xHeight: R0,
    y: null,
    y1: null,
    y2: null,
    yChannelSelector: null,
    z: null,
    zoomAndPan: null
  },
  space: "svg",
  transform: J1T
}), RYT = af({
  properties: {
    xLinkActuate: null,
    xLinkArcRole: null,
    xLinkHref: null,
    xLinkRole: null,
    xLinkShow: null,
    xLinkTitle: null,
    xLinkType: null
  },
  space: "xlink",
  transform(T, R) {
    return "xlink:" + R.slice(5).toLowerCase();
  }
}), aYT = af({
  attributes: {
    xmlnsxlink: "xmlns:xlink"
  },
  properties: {
    xmlnsXLink: null,
    xmlns: null
  },
  space: "xmlns",
  transform: TYT
}), eYT = af({
  properties: {
    xmlBase: null,
    xmlLang: null,
    xmlSpace: null
  },
  space: "xml",
  transform(T, R) {
    return "xml:" + R.slice(3).toLowerCase();
  }
}), Xx0 = /[A-Z]/g, nfT = /-[a-z]/g, Yx0 = /^data[-\w.:]+$/i;
GtT = Q1T([Z1T, Kx0, RYT, aYT, eYT], "html"), KtT = Q1T([Z1T, Vx0, RYT, aYT, eYT], "svg");
AfT = /[#.]/g;
tf0 = ["altGlyph", "altGlyphDef", "altGlyphItem", "animateColor", "animateMotion", "animateTransform", "clipPath", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "foreignObject", "glyphRef", "linearGradient", "radialGradient", "solidColor", "textArea", "textPath"], rf0 = rYT(GtT, "div"), hf0 = rYT(KtT, "g", tf0);
cf0 = {
  html: "http://www.w3.org/1999/xhtml",
  mathml: "http://www.w3.org/1998/Math/MathML",
  svg: "http://www.w3.org/2000/svg",
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
}, hYT = {}.hasOwnProperty, sf0 = Object.prototype;
(function (T) {
  T[T.EOF = -1] = "EOF", T[T.NULL = 0] = "NULL", T[T.TABULATION = 9] = "TABULATION", T[T.CARRIAGE_RETURN = 13] = "CARRIAGE_RETURN", T[T.LINE_FEED = 10] = "LINE_FEED", T[T.FORM_FEED = 12] = "FORM_FEED", T[T.SPACE = 32] = "SPACE", T[T.EXCLAMATION_MARK = 33] = "EXCLAMATION_MARK", T[T.QUOTATION_MARK = 34] = "QUOTATION_MARK", T[T.AMPERSAND = 38] = "AMPERSAND", T[T.APOSTROPHE = 39] = "APOSTROPHE", T[T.HYPHEN_MINUS = 45] = "HYPHEN_MINUS", T[T.SOLIDUS = 47] = "SOLIDUS", T[T.DIGIT_0 = 48] = "DIGIT_0", T[T.DIGIT_9 = 57] = "DIGIT_9", T[T.SEMICOLON = 59] = "SEMICOLON", T[T.LESS_THAN_SIGN = 60] = "LESS_THAN_SIGN", T[T.EQUALS_SIGN = 61] = "EQUALS_SIGN", T[T.GREATER_THAN_SIGN = 62] = "GREATER_THAN_SIGN", T[T.QUESTION_MARK = 63] = "QUESTION_MARK", T[T.LATIN_CAPITAL_A = 65] = "LATIN_CAPITAL_A", T[T.LATIN_CAPITAL_Z = 90] = "LATIN_CAPITAL_Z", T[T.RIGHT_SQUARE_BRACKET = 93] = "RIGHT_SQUARE_BRACKET", T[T.GRAVE_ACCENT = 96] = "GRAVE_ACCENT", T[T.LATIN_SMALL_A = 97] = "LATIN_SMALL_A", T[T.LATIN_SMALL_Z = 122] = "LATIN_SMALL_Z";
})(HT || (HT = {}));
sr = {
  DASH_DASH: "--",
  CDATA_START: "[CDATA[",
  DOCTYPE: "doctype",
  SCRIPT: "script",
  PUBLIC: "public",
  SYSTEM: "system"
};
(function (T) {
  T.controlCharacterInInputStream = "control-character-in-input-stream", T.noncharacterInInputStream = "noncharacter-in-input-stream", T.surrogateInInputStream = "surrogate-in-input-stream", T.nonVoidHtmlElementStartTagWithTrailingSolidus = "non-void-html-element-start-tag-with-trailing-solidus", T.endTagWithAttributes = "end-tag-with-attributes", T.endTagWithTrailingSolidus = "end-tag-with-trailing-solidus", T.unexpectedSolidusInTag = "unexpected-solidus-in-tag", T.unexpectedNullCharacter = "unexpected-null-character", T.unexpectedQuestionMarkInsteadOfTagName = "unexpected-question-mark-instead-of-tag-name", T.invalidFirstCharacterOfTagName = "invalid-first-character-of-tag-name", T.unexpectedEqualsSignBeforeAttributeName = "unexpected-equals-sign-before-attribute-name", T.missingEndTagName = "missing-end-tag-name", T.unexpectedCharacterInAttributeName = "unexpected-character-in-attribute-name", T.unknownNamedCharacterReference = "unknown-named-character-reference", T.missingSemicolonAfterCharacterReference = "missing-semicolon-after-character-reference", T.unexpectedCharacterAfterDoctypeSystemIdentifier = "unexpected-character-after-doctype-system-identifier", T.unexpectedCharacterInUnquotedAttributeValue = "unexpected-character-in-unquoted-attribute-value", T.eofBeforeTagName = "eof-before-tag-name", T.eofInTag = "eof-in-tag", T.missingAttributeValue = "missing-attribute-value", T.missingWhitespaceBetweenAttributes = "missing-whitespace-between-attributes", T.missingWhitespaceAfterDoctypePublicKeyword = "missing-whitespace-after-doctype-public-keyword", T.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers = "missing-whitespace-between-doctype-public-and-system-identifiers", T.missingWhitespaceAfterDoctypeSystemKeyword = "missing-whitespace-after-doctype-system-keyword", T.missingQuoteBeforeDoctypePublicIdentifier = "missing-quote-before-doctype-public-identifier", T.missingQuoteBeforeDoctypeSystemIdentifier = "missing-quote-before-doctype-system-identifier", T.missingDoctypePublicIdentifier = "missing-doctype-public-identifier", T.missingDoctypeSystemIdentifier = "missing-doctype-system-identifier", T.abruptDoctypePublicIdentifier = "abrupt-doctype-public-identifier", T.abruptDoctypeSystemIdentifier = "abrupt-doctype-system-identifier", T.cdataInHtmlContent = "cdata-in-html-content", T.incorrectlyOpenedComment = "incorrectly-opened-comment", T.eofInScriptHtmlCommentLikeText = "eof-in-script-html-comment-like-text", T.eofInDoctype = "eof-in-doctype", T.nestedComment = "nested-comment", T.abruptClosingOfEmptyComment = "abrupt-closing-of-empty-comment", T.eofInComment = "eof-in-comment", T.incorrectlyClosedComment = "incorrectly-closed-comment", T.eofInCdata = "eof-in-cdata", T.absenceOfDigitsInNumericCharacterReference = "absence-of-digits-in-numeric-character-reference", T.nullCharacterReference = "null-character-reference", T.surrogateCharacterReference = "surrogate-character-reference", T.characterReferenceOutsideUnicodeRange = "character-reference-outside-unicode-range", T.controlCharacterReference = "control-character-reference", T.noncharacterCharacterReference = "noncharacter-character-reference", T.missingWhitespaceBeforeDoctypeName = "missing-whitespace-before-doctype-name", T.missingDoctypeName = "missing-doctype-name", T.invalidCharacterSequenceAfterDoctypeName = "invalid-character-sequence-after-doctype-name", T.duplicateAttribute = "duplicate-attribute", T.nonConformingDoctype = "non-conforming-doctype", T.missingDoctype = "missing-doctype", T.misplacedDoctype = "misplaced-doctype", T.endTagWithoutMatchingOpenElement = "end-tag-without-matching-open-element", T.closingOfElementWithOpenChildElements = "closing-of-element-with-open-child-elements", T.disallowedContentInNoscriptInHead = "disallowed-content-in-noscript-in-head", T.openElementsLeftAfterEof = "open-elements-left-after-eof", T.abandonedHeadElementChild = "abandoned-head-element-child", T.misplacedStartTagForHeadElement = "misplaced-start-tag-for-head-element", T.nestedNoscriptInHead = "nested-noscript-in-head", T.eofInElementThatCanContainOnlyText = "eof-in-element-that-can-contain-only-text";
})(vR || (vR = {}));
(function (T) {
  T[T.CHARACTER = 0] = "CHARACTER", T[T.NULL_CHARACTER = 1] = "NULL_CHARACTER", T[T.WHITESPACE_CHARACTER = 2] = "WHITESPACE_CHARACTER", T[T.START_TAG = 3] = "START_TAG", T[T.END_TAG = 4] = "END_TAG", T[T.COMMENT = 5] = "COMMENT", T[T.DOCTYPE = 6] = "DOCTYPE", T[T.EOF = 7] = "EOF", T[T.HIBERNATION = 8] = "HIBERNATION";
})(u8 || (u8 = {}));
AYT = new Uint16Array("\u1D41<\xD5\u0131\u028A\u049D\u057B\u05D0\u0675\u06DE\u07A2\u07D6\u080F\u0A4A\u0A91\u0DA1\u0E6D\u0F09\u0F26\u10CA\u1228\u12E1\u1415\u149D\u14C3\u14DF\u1525\x00\x00\x00\x00\x00\x00\u156B\u16CD\u198D\u1C12\u1DDD\u1F7E\u2060\u21B0\u228D\u23C0\u23FB\u2442\u2824\u2912\u2D08\u2E48\u2FCE\u3016\u32BA\u3639\u37AC\u38FE\u3A28\u3A71\u3AE0\u3B2E\u0800EMabcfglmnoprstu\\bfms\x7F\x84\x8B\x90\x95\x98\xA6\xB3\xB9\xC8\xCFlig\u803B\xC6\u40C6P\u803B&\u4026cute\u803B\xC1\u40C1reve;\u4102\u0100iyx}rc\u803B\xC2\u40C2;\u4410r;\uC000\uD835\uDD04rave\u803B\xC0\u40C0pha;\u4391acr;\u4100d;\u6A53\u0100gp\x9D\xA1on;\u4104f;\uC000\uD835\uDD38plyFunction;\u6061ing\u803B\xC5\u40C5\u0100cs\xBE\xC3r;\uC000\uD835\uDC9Cign;\u6254ilde\u803B\xC3\u40C3ml\u803B\xC4\u40C4\u0400aceforsu\xE5\xFB\xFE\u0117\u011C\u0122\u0127\u012A\u0100cr\xEA\xF2kslash;\u6216\u0176\xF6\xF8;\u6AE7ed;\u6306y;\u4411\u0180crt\u0105\u010B\u0114ause;\u6235noullis;\u612Ca;\u4392r;\uC000\uD835\uDD05pf;\uC000\uD835\uDD39eve;\u42D8c\xF2\u0113mpeq;\u624E\u0700HOacdefhilorsu\u014D\u0151\u0156\u0180\u019E\u01A2\u01B5\u01B7\u01BA\u01DC\u0215\u0273\u0278\u027Ecy;\u4427PY\u803B\xA9\u40A9\u0180cpy\u015D\u0162\u017Aute;\u4106\u0100;i\u0167\u0168\u62D2talDifferentialD;\u6145leys;\u612D\u0200aeio\u0189\u018E\u0194\u0198ron;\u410Cdil\u803B\xC7\u40C7rc;\u4108nint;\u6230ot;\u410A\u0100dn\u01A7\u01ADilla;\u40B8terDot;\u40B7\xF2\u017Fi;\u43A7rcle\u0200DMPT\u01C7\u01CB\u01D1\u01D6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01E2\u01F8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020FoubleQuote;\u601Duote;\u6019\u0200lnpu\u021E\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6A74\u0180git\u022F\u0236\u023Aruent;\u6261nt;\u622FourIntegral;\u622E\u0100fr\u024C\u024E;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6A2Fcr;\uC000\uD835\uDC9Ep\u0100;C\u0284\u0285\u62D3ap;\u624D\u0580DJSZacefios\u02A0\u02AC\u02B0\u02B4\u02B8\u02CB\u02D7\u02E1\u02E6\u0333\u048D\u0100;o\u0179\u02A5trahd;\u6911cy;\u4402cy;\u4405cy;\u440F\u0180grs\u02BF\u02C4\u02C7ger;\u6021r;\u61A1hv;\u6AE4\u0100ay\u02D0\u02D5ron;\u410E;\u4414l\u0100;t\u02DD\u02DE\u6207a;\u4394r;\uC000\uD835\uDD07\u0100af\u02EB\u0327\u0100cm\u02F0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031Ccute;\u40B4o\u0174\u030B\u030D;\u42D9bleAcute;\u42DDrave;\u4060ilde;\u42DCond;\u62C4ferentialD;\u6146\u0470\u033D\x00\x00\x00\u0342\u0354\x00\u0405f;\uC000\uD835\uDD3B\u0180;DE\u0348\u0349\u034D\u40A8ot;\u60DCqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03CF\u03E2\u03F8ontourIntegra\xEC\u0239o\u0274\u0379\x00\x00\u037B\xBB\u0349nArrow;\u61D3\u0100eo\u0387\u03A4ft\u0180ART\u0390\u0396\u03A1rrow;\u61D0ightArrow;\u61D4e\xE5\u02CAng\u0100LR\u03AB\u03C4eft\u0100AR\u03B3\u03B9rrow;\u67F8ightArrow;\u67FAightArrow;\u67F9ight\u0100AT\u03D8\u03DErrow;\u61D2ee;\u62A8p\u0241\u03E9\x00\x00\u03EFrrow;\u61D1ownArrow;\u61D5erticalBar;\u6225n\u0300ABLRTa\u0412\u042A\u0430\u045E\u047F\u037Crrow\u0180;BU\u041D\u041E\u0422\u6193ar;\u6913pArrow;\u61F5reve;\u4311eft\u02D2\u043A\x00\u0446\x00\u0450ightVector;\u6950eeVector;\u695Eector\u0100;B\u0459\u045A\u61BDar;\u6956ight\u01D4\u0467\x00\u0471eeVector;\u695Fector\u0100;B\u047A\u047B\u61C1ar;\u6957ee\u0100;A\u0486\u0487\u62A4rrow;\u61A7\u0100ct\u0492\u0497r;\uC000\uD835\uDC9Frok;\u4110\u0800NTacdfglmopqstux\u04BD\u04C0\u04C4\u04CB\u04DE\u04E2\u04E7\u04EE\u04F5\u0521\u052F\u0536\u0552\u055D\u0560\u0565G;\u414AH\u803B\xD0\u40D0cute\u803B\xC9\u40C9\u0180aiy\u04D2\u04D7\u04DCron;\u411Arc\u803B\xCA\u40CA;\u442Dot;\u4116r;\uC000\uD835\uDD08rave\u803B\xC8\u40C8ement;\u6208\u0100ap\u04FA\u04FEcr;\u4112ty\u0253\u0506\x00\x00\u0512mallSquare;\u65FBerySmallSquare;\u65AB\u0100gp\u0526\u052Aon;\u4118f;\uC000\uD835\uDD3Csilon;\u4395u\u0100ai\u053C\u0549l\u0100;T\u0542\u0543\u6A75ilde;\u6242librium;\u61CC\u0100ci\u0557\u055Ar;\u6130m;\u6A73a;\u4397ml\u803B\xCB\u40CB\u0100ip\u056A\u056Fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058D\u05B2\u05CCy;\u4424r;\uC000\uD835\uDD09lled\u0253\u0597\x00\x00\u05A3mallSquare;\u65FCerySmallSquare;\u65AA\u0370\u05BA\x00\u05BF\x00\x00\u05C4f;\uC000\uD835\uDD3DAll;\u6200riertrf;\u6131c\xF2\u05CB\u0600JTabcdfgorst\u05E8\u05EC\u05EF\u05FA\u0600\u0612\u0616\u061B\u061D\u0623\u066C\u0672cy;\u4403\u803B>\u403Emma\u0100;d\u05F7\u05F8\u4393;\u43DCreve;\u411E\u0180eiy\u0607\u060C\u0610dil;\u4122rc;\u411C;\u4413ot;\u4120r;\uC000\uD835\uDD0A;\u62D9pf;\uC000\uD835\uDD3Eeater\u0300EFGLST\u0635\u0644\u064E\u0656\u065B\u0666qual\u0100;L\u063E\u063F\u6265ess;\u62DBullEqual;\u6267reater;\u6AA2ess;\u6277lantEqual;\u6A7Eilde;\u6273cr;\uC000\uD835\uDCA2;\u626B\u0400Aacfiosu\u0685\u068B\u0696\u069B\u069E\u06AA\u06BE\u06CARDcy;\u442A\u0100ct\u0690\u0694ek;\u42C7;\u405Eirc;\u4124r;\u610ClbertSpace;\u610B\u01F0\u06AF\x00\u06B2f;\u610DizontalLine;\u6500\u0100ct\u06C3\u06C5\xF2\u06A9rok;\u4126mp\u0144\u06D0\u06D8ownHum\xF0\u012Fqual;\u624F\u0700EJOacdfgmnostu\u06FA\u06FE\u0703\u0707\u070E\u071A\u071E\u0721\u0728\u0744\u0778\u078B\u078F\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803B\xCD\u40CD\u0100iy\u0713\u0718rc\u803B\xCE\u40CE;\u4418ot;\u4130r;\u6111rave\u803B\xCC\u40CC\u0180;ap\u0720\u072F\u073F\u0100cg\u0734\u0737r;\u412AinaryI;\u6148lie\xF3\u03DD\u01F4\u0749\x00\u0762\u0100;e\u074D\u074E\u622C\u0100gr\u0753\u0758ral;\u622Bsection;\u62C2isible\u0100CT\u076C\u0772omma;\u6063imes;\u6062\u0180gpt\u077F\u0783\u0788on;\u412Ef;\uC000\uD835\uDD40a;\u4399cr;\u6110ilde;\u4128\u01EB\u079A\x00\u079Ecy;\u4406l\u803B\xCF\u40CF\u0280cfosu\u07AC\u07B7\u07BC\u07C2\u07D0\u0100iy\u07B1\u07B5rc;\u4134;\u4419r;\uC000\uD835\uDD0Dpf;\uC000\uD835\uDD41\u01E3\u07C7\x00\u07CCr;\uC000\uD835\uDCA5rcy;\u4408kcy;\u4404\u0380HJacfos\u07E4\u07E8\u07EC\u07F1\u07FD\u0802\u0808cy;\u4425cy;\u440Cppa;\u439A\u0100ey\u07F6\u07FBdil;\u4136;\u441Ar;\uC000\uD835\uDD0Epf;\uC000\uD835\uDD42cr;\uC000\uD835\uDCA6\u0580JTaceflmost\u0825\u0829\u082C\u0850\u0863\u09B3\u09B8\u09C7\u09CD\u0A37\u0A47cy;\u4409\u803B<\u403C\u0280cmnpr\u0837\u083C\u0841\u0844\u084Dute;\u4139bda;\u439Bg;\u67EAlacetrf;\u6112r;\u619E\u0180aey\u0857\u085C\u0861ron;\u413Ddil;\u413B;\u441B\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087E\u08A9\u08B1\u08E0\u08E6\u08FC\u092F\u095B\u0390\u096A\u0100nr\u0883\u088FgleBracket;\u67E8row\u0180;BR\u0899\u089A\u089E\u6190ar;\u61E4ightArrow;\u61C6eiling;\u6308o\u01F5\u08B7\x00\u08C3bleBracket;\u67E6n\u01D4\u08C8\x00\u08D2eeVector;\u6961ector\u0100;B\u08DB\u08DC\u61C3ar;\u6959loor;\u630Aight\u0100AV\u08EF\u08F5rrow;\u6194ector;\u694E\u0100er\u0901\u0917e\u0180;AV\u0909\u090A\u0910\u62A3rrow;\u61A4ector;\u695Aiangle\u0180;BE\u0924\u0925\u0929\u62B2ar;\u69CFqual;\u62B4p\u0180DTV\u0937\u0942\u094CownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61BFar;\u6958ector\u0100;B\u0965\u0966\u61BCar;\u6952ight\xE1\u039Cs\u0300EFGLST\u097E\u098B\u0995\u099D\u09A2\u09ADqualGreater;\u62DAullEqual;\u6266reater;\u6276ess;\u6AA1lantEqual;\u6A7Dilde;\u6272r;\uC000\uD835\uDD0F\u0100;e\u09BD\u09BE\u62D8ftarrow;\u61DAidot;\u413F\u0180npw\u09D4\u0A16\u0A1Bg\u0200LRlr\u09DE\u09F7\u0A02\u0A10eft\u0100AR\u09E6\u09ECrrow;\u67F5ightArrow;\u67F7ightArrow;\u67F6eft\u0100ar\u03B3\u0A0Aight\xE1\u03BFight\xE1\u03CAf;\uC000\uD835\uDD43er\u0100LR\u0A22\u0A2CeftArrow;\u6199ightArrow;\u6198\u0180cht\u0A3E\u0A40\u0A42\xF2\u084C;\u61B0rok;\u4141;\u626A\u0400acefiosu\u0A5A\u0A5D\u0A60\u0A77\u0A7C\u0A85\u0A8B\u0A8Ep;\u6905y;\u441C\u0100dl\u0A65\u0A6FiumSpace;\u605Flintrf;\u6133r;\uC000\uD835\uDD10nusPlus;\u6213pf;\uC000\uD835\uDD44c\xF2\u0A76;\u439C\u0480Jacefostu\u0AA3\u0AA7\u0AAD\u0AC0\u0B14\u0B19\u0D91\u0D97\u0D9Ecy;\u440Acute;\u4143\u0180aey\u0AB4\u0AB9\u0ABEron;\u4147dil;\u4145;\u441D\u0180gsw\u0AC7\u0AF0\u0B0Eative\u0180MTV\u0AD3\u0ADF\u0AE8ediumSpace;\u600Bhi\u0100cn\u0AE6\u0AD8\xEB\u0AD9eryThi\xEE\u0AD9ted\u0100GL\u0AF8\u0B06reaterGreate\xF2\u0673essLes\xF3\u0A48Line;\u400Ar;\uC000\uD835\uDD11\u0200Bnpt\u0B22\u0B28\u0B37\u0B3Areak;\u6060BreakingSpace;\u40A0f;\u6115\u0680;CDEGHLNPRSTV\u0B55\u0B56\u0B6A\u0B7C\u0BA1\u0BEB\u0C04\u0C5E\u0C84\u0CA6\u0CD8\u0D61\u0D85\u6AEC\u0100ou\u0B5B\u0B64ngruent;\u6262pCap;\u626DoubleVerticalBar;\u6226\u0180lqx\u0B83\u0B8A\u0B9Bement;\u6209ual\u0100;T\u0B92\u0B93\u6260ilde;\uC000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0BB6\u0BB7\u0BBD\u0BC9\u0BD3\u0BD8\u0BE5\u626Fqual;\u6271ullEqual;\uC000\u2267\u0338reater;\uC000\u226B\u0338ess;\u6279lantEqual;\uC000\u2A7E\u0338ilde;\u6275ump\u0144\u0BF2\u0BFDownHump;\uC000\u224E\u0338qual;\uC000\u224F\u0338e\u0100fs\u0C0A\u0C27tTriangle\u0180;BE\u0C1A\u0C1B\u0C21\u62EAar;\uC000\u29CF\u0338qual;\u62ECs\u0300;EGLST\u0C35\u0C36\u0C3C\u0C44\u0C4B\u0C58\u626Equal;\u6270reater;\u6278ess;\uC000\u226A\u0338lantEqual;\uC000\u2A7D\u0338ilde;\u6274ested\u0100GL\u0C68\u0C79reaterGreater;\uC000\u2AA2\u0338essLess;\uC000\u2AA1\u0338recedes\u0180;ES\u0C92\u0C93\u0C9B\u6280qual;\uC000\u2AAF\u0338lantEqual;\u62E0\u0100ei\u0CAB\u0CB9verseElement;\u620CghtTriangle\u0180;BE\u0CCB\u0CCC\u0CD2\u62EBar;\uC000\u29D0\u0338qual;\u62ED\u0100qu\u0CDD\u0D0CuareSu\u0100bp\u0CE8\u0CF9set\u0100;E\u0CF0\u0CF3\uC000\u228F\u0338qual;\u62E2erset\u0100;E\u0D03\u0D06\uC000\u2290\u0338qual;\u62E3\u0180bcp\u0D13\u0D24\u0D4Eset\u0100;E\u0D1B\u0D1E\uC000\u2282\u20D2qual;\u6288ceeds\u0200;EST\u0D32\u0D33\u0D3B\u0D46\u6281qual;\uC000\u2AB0\u0338lantEqual;\u62E1ilde;\uC000\u227F\u0338erset\u0100;E\u0D58\u0D5B\uC000\u2283\u20D2qual;\u6289ilde\u0200;EFT\u0D6E\u0D6F\u0D75\u0D7F\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uC000\uD835\uDCA9ilde\u803B\xD1\u40D1;\u439D\u0700Eacdfgmoprstuv\u0DBD\u0DC2\u0DC9\u0DD5\u0DDB\u0DE0\u0DE7\u0DFC\u0E02\u0E20\u0E22\u0E32\u0E3F\u0E44lig;\u4152cute\u803B\xD3\u40D3\u0100iy\u0DCE\u0DD3rc\u803B\xD4\u40D4;\u441Eblac;\u4150r;\uC000\uD835\uDD12rave\u803B\xD2\u40D2\u0180aei\u0DEE\u0DF2\u0DF6cr;\u414Cga;\u43A9cron;\u439Fpf;\uC000\uD835\uDD46enCurly\u0100DQ\u0E0E\u0E1AoubleQuote;\u601Cuote;\u6018;\u6A54\u0100cl\u0E27\u0E2Cr;\uC000\uD835\uDCAAash\u803B\xD8\u40D8i\u016C\u0E37\u0E3Cde\u803B\xD5\u40D5es;\u6A37ml\u803B\xD6\u40D6er\u0100BP\u0E4B\u0E60\u0100ar\u0E50\u0E53r;\u603Eac\u0100ek\u0E5A\u0E5C;\u63DEet;\u63B4arenthesis;\u63DC\u0480acfhilors\u0E7F\u0E87\u0E8A\u0E8F\u0E92\u0E94\u0E9D\u0EB0\u0EFCrtialD;\u6202y;\u441Fr;\uC000\uD835\uDD13i;\u43A6;\u43A0usMinus;\u40B1\u0100ip\u0EA2\u0EADncareplan\xE5\u069Df;\u6119\u0200;eio\u0EB9\u0EBA\u0EE0\u0EE4\u6ABBcedes\u0200;EST\u0EC8\u0EC9\u0ECF\u0EDA\u627Aqual;\u6AAFlantEqual;\u627Cilde;\u627Eme;\u6033\u0100dp\u0EE9\u0EEEuct;\u620Fortion\u0100;a\u0225\u0EF9l;\u621D\u0100ci\u0F01\u0F06r;\uC000\uD835\uDCAB;\u43A8\u0200Ufos\u0F11\u0F16\u0F1B\u0F1FOT\u803B\"\u4022r;\uC000\uD835\uDD14pf;\u611Acr;\uC000\uD835\uDCAC\u0600BEacefhiorsu\u0F3E\u0F43\u0F47\u0F60\u0F73\u0FA7\u0FAA\u0FAD\u1096\u10A9\u10B4\u10BEarr;\u6910G\u803B\xAE\u40AE\u0180cnr\u0F4E\u0F53\u0F56ute;\u4154g;\u67EBr\u0100;t\u0F5C\u0F5D\u61A0l;\u6916\u0180aey\u0F67\u0F6C\u0F71ron;\u4158dil;\u4156;\u4420\u0100;v\u0F78\u0F79\u611Cerse\u0100EU\u0F82\u0F99\u0100lq\u0F87\u0F8Eement;\u620Builibrium;\u61CBpEquilibrium;\u696Fr\xBB\u0F79o;\u43A1ght\u0400ACDFTUVa\u0FC1\u0FEB\u0FF3\u1022\u1028\u105B\u1087\u03D8\u0100nr\u0FC6\u0FD2gleBracket;\u67E9row\u0180;BL\u0FDC\u0FDD\u0FE1\u6192ar;\u61E5eftArrow;\u61C4eiling;\u6309o\u01F5\u0FF9\x00\u1005bleBracket;\u67E7n\u01D4\u100A\x00\u1014eeVector;\u695Dector\u0100;B\u101D\u101E\u61C2ar;\u6955loor;\u630B\u0100er\u102D\u1043e\u0180;AV\u1035\u1036\u103C\u62A2rrow;\u61A6ector;\u695Biangle\u0180;BE\u1050\u1051\u1055\u62B3ar;\u69D0qual;\u62B5p\u0180DTV\u1063\u106E\u1078ownVector;\u694FeeVector;\u695Cector\u0100;B\u1082\u1083\u61BEar;\u6954ector\u0100;B\u1091\u1092\u61C0ar;\u6953\u0100pu\u109B\u109Ef;\u611DndImplies;\u6970ightarrow;\u61DB\u0100ch\u10B9\u10BCr;\u611B;\u61B1leDelayed;\u69F4\u0680HOacfhimoqstu\u10E4\u10F1\u10F7\u10FD\u1119\u111E\u1151\u1156\u1161\u1167\u11B5\u11BB\u11BF\u0100Cc\u10E9\u10EEHcy;\u4429y;\u4428FTcy;\u442Ccute;\u415A\u0280;aeiy\u1108\u1109\u110E\u1113\u1117\u6ABCron;\u4160dil;\u415Erc;\u415C;\u4421r;\uC000\uD835\uDD16ort\u0200DLRU\u112A\u1134\u113E\u1149ownArrow\xBB\u041EeftArrow\xBB\u089AightArrow\xBB\u0FDDpArrow;\u6191gma;\u43A3allCircle;\u6218pf;\uC000\uD835\uDD4A\u0272\u116D\x00\x00\u1170t;\u621Aare\u0200;ISU\u117B\u117C\u1189\u11AF\u65A1ntersection;\u6293u\u0100bp\u118F\u119Eset\u0100;E\u1197\u1198\u628Fqual;\u6291erset\u0100;E\u11A8\u11A9\u6290qual;\u6292nion;\u6294cr;\uC000\uD835\uDCAEar;\u62C6\u0200bcmp\u11C8\u11DB\u1209\u120B\u0100;s\u11CD\u11CE\u62D0et\u0100;E\u11CD\u11D5qual;\u6286\u0100ch\u11E0\u1205eeds\u0200;EST\u11ED\u11EE\u11F4\u11FF\u627Bqual;\u6AB0lantEqual;\u627Dilde;\u627FTh\xE1\u0F8C;\u6211\u0180;es\u1212\u1213\u1223\u62D1rset\u0100;E\u121C\u121D\u6283qual;\u6287et\xBB\u1213\u0580HRSacfhiors\u123E\u1244\u1249\u1255\u125E\u1271\u1276\u129F\u12C2\u12C8\u12D1ORN\u803B\xDE\u40DEADE;\u6122\u0100Hc\u124E\u1252cy;\u440By;\u4426\u0100bu\u125A\u125C;\u4009;\u43A4\u0180aey\u1265\u126A\u126Fron;\u4164dil;\u4162;\u4422r;\uC000\uD835\uDD17\u0100ei\u127B\u1289\u01F2\u1280\x00\u1287efore;\u6234a;\u4398\u0100cn\u128E\u1298kSpace;\uC000\u205F\u200ASpace;\u6009lde\u0200;EFT\u12AB\u12AC\u12B2\u12BC\u623Cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uC000\uD835\uDD4BipleDot;\u60DB\u0100ct\u12D6\u12DBr;\uC000\uD835\uDCAFrok;\u4166\u0AE1\u12F7\u130E\u131A\u1326\x00\u132C\u1331\x00\x00\x00\x00\x00\u1338\u133D\u1377\u1385\x00\u13FF\u1404\u140A\u1410\u0100cr\u12FB\u1301ute\u803B\xDA\u40DAr\u0100;o\u1307\u1308\u619Fcir;\u6949r\u01E3\u1313\x00\u1316y;\u440Eve;\u416C\u0100iy\u131E\u1323rc\u803B\xDB\u40DB;\u4423blac;\u4170r;\uC000\uD835\uDD18rave\u803B\xD9\u40D9acr;\u416A\u0100di\u1341\u1369er\u0100BP\u1348\u135D\u0100ar\u134D\u1350r;\u405Fac\u0100ek\u1357\u1359;\u63DFet;\u63B5arenthesis;\u63DDon\u0100;P\u1370\u1371\u62C3lus;\u628E\u0100gp\u137B\u137Fon;\u4172f;\uC000\uD835\uDD4C\u0400ADETadps\u1395\u13AE\u13B8\u13C4\u03E8\u13D2\u13D7\u13F3rrow\u0180;BD\u1150\u13A0\u13A4ar;\u6912ownArrow;\u61C5ownArrow;\u6195quilibrium;\u696Eee\u0100;A\u13CB\u13CC\u62A5rrow;\u61A5own\xE1\u03F3er\u0100LR\u13DE\u13E8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13F9\u13FA\u43D2on;\u43A5ing;\u416Ecr;\uC000\uD835\uDCB0ilde;\u4168ml\u803B\xDC\u40DC\u0480Dbcdefosv\u1427\u142C\u1430\u1433\u143E\u1485\u148A\u1490\u1496ash;\u62ABar;\u6AEBy;\u4412ash\u0100;l\u143B\u143C\u62A9;\u6AE6\u0100er\u1443\u1445;\u62C1\u0180bty\u144C\u1450\u147Aar;\u6016\u0100;i\u144F\u1455cal\u0200BLST\u1461\u1465\u146A\u1474ar;\u6223ine;\u407Ceparator;\u6758ilde;\u6240ThinSpace;\u600Ar;\uC000\uD835\uDD19pf;\uC000\uD835\uDD4Dcr;\uC000\uD835\uDCB1dash;\u62AA\u0280cefos\u14A7\u14AC\u14B1\u14B6\u14BCirc;\u4174dge;\u62C0r;\uC000\uD835\uDD1Apf;\uC000\uD835\uDD4Ecr;\uC000\uD835\uDCB2\u0200fios\u14CB\u14D0\u14D2\u14D8r;\uC000\uD835\uDD1B;\u439Epf;\uC000\uD835\uDD4Fcr;\uC000\uD835\uDCB3\u0480AIUacfosu\u14F1\u14F5\u14F9\u14FD\u1504\u150F\u1514\u151A\u1520cy;\u442Fcy;\u4407cy;\u442Ecute\u803B\xDD\u40DD\u0100iy\u1509\u150Drc;\u4176;\u442Br;\uC000\uD835\uDD1Cpf;\uC000\uD835\uDD50cr;\uC000\uD835\uDCB4ml;\u4178\u0400Hacdefos\u1535\u1539\u153F\u154B\u154F\u155D\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417D;\u4417ot;\u417B\u01F2\u1554\x00\u155BoWidt\xE8\u0AD9a;\u4396r;\u6128pf;\u6124cr;\uC000\uD835\uDCB5\u0BE1\u1583\u158A\u1590\x00\u15B0\u15B6\u15BF\x00\x00\x00\x00\u15C6\u15DB\u15EB\u165F\u166D\x00\u1695\u169B\u16B2\u16B9\x00\u16BEcute\u803B\xE1\u40E1reve;\u4103\u0300;Ediuy\u159C\u159D\u15A1\u15A3\u15A8\u15AD\u623E;\uC000\u223E\u0333;\u623Frc\u803B\xE2\u40E2te\u80BB\xB4\u0306;\u4430lig\u803B\xE6\u40E6\u0100;r\xB2\u15BA;\uC000\uD835\uDD1Erave\u803B\xE0\u40E0\u0100ep\u15CA\u15D6\u0100fp\u15CF\u15D4sym;\u6135\xE8\u15D3ha;\u43B1\u0100ap\u15DFc\u0100cl\u15E4\u15E7r;\u4101g;\u6A3F\u0264\u15F0\x00\x00\u160A\u0280;adsv\u15FA\u15FB\u15FF\u1601\u1607\u6227nd;\u6A55;\u6A5Clope;\u6A58;\u6A5A\u0380;elmrsz\u1618\u1619\u161B\u161E\u163F\u164F\u1659\u6220;\u69A4e\xBB\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163A\u163C\u163E;\u69A8;\u69A9;\u69AA;\u69AB;\u69AC;\u69AD;\u69AE;\u69AFt\u0100;v\u1645\u1646\u621Fb\u0100;d\u164C\u164D\u62BE;\u699D\u0100pt\u1654\u1657h;\u6222\xBB\xB9arr;\u637C\u0100gp\u1663\u1667on;\u4105f;\uC000\uD835\uDD52\u0380;Eaeiop\u12C1\u167B\u167D\u1682\u1684\u1687\u168A;\u6A70cir;\u6A6F;\u624Ad;\u624Bs;\u4027rox\u0100;e\u12C1\u1692\xF1\u1683ing\u803B\xE5\u40E5\u0180cty\u16A1\u16A6\u16A8r;\uC000\uD835\uDCB6;\u402Amp\u0100;e\u12C1\u16AF\xF1\u0288ilde\u803B\xE3\u40E3ml\u803B\xE4\u40E4\u0100ci\u16C2\u16C8onin\xF4\u0272nt;\u6A11\u0800Nabcdefiklnoprsu\u16ED\u16F1\u1730\u173C\u1743\u1748\u1778\u177D\u17E0\u17E6\u1839\u1850\u170D\u193D\u1948\u1970ot;\u6AED\u0100cr\u16F6\u171Ek\u0200ceps\u1700\u1705\u170D\u1713ong;\u624Cpsilon;\u43F6rime;\u6035im\u0100;e\u171A\u171B\u623Dq;\u62CD\u0176\u1722\u1726ee;\u62BDed\u0100;g\u172C\u172D\u6305e\xBB\u172Drk\u0100;t\u135C\u1737brk;\u63B6\u0100oy\u1701\u1741;\u4431quo;\u601E\u0280cmprt\u1753\u175B\u1761\u1764\u1768aus\u0100;e\u010A\u0109ptyv;\u69B0s\xE9\u170Cno\xF5\u0113\u0180ahw\u176F\u1771\u1773;\u43B2;\u6136een;\u626Cr;\uC000\uD835\uDD1Fg\u0380costuvw\u178D\u179D\u17B3\u17C1\u17D5\u17DB\u17DE\u0180aiu\u1794\u1796\u179A\xF0\u0760rc;\u65EFp\xBB\u1371\u0180dpt\u17A4\u17A8\u17ADot;\u6A00lus;\u6A01imes;\u6A02\u0271\u17B9\x00\x00\u17BEcup;\u6A06ar;\u6605riangle\u0100du\u17CD\u17D2own;\u65BDp;\u65B3plus;\u6A04e\xE5\u1444\xE5\u14ADarow;\u690D\u0180ako\u17ED\u1826\u1835\u0100cn\u17F2\u1823k\u0180lst\u17FA\u05AB\u1802ozenge;\u69EBriangle\u0200;dlr\u1812\u1813\u1818\u181D\u65B4own;\u65BEeft;\u65C2ight;\u65B8k;\u6423\u01B1\u182B\x00\u1833\u01B2\u182F\x00\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183E\u184D\u0100;q\u1843\u1846\uC000=\u20E5uiv;\uC000\u2261\u20E5t;\u6310\u0200ptwx\u1859\u185E\u1867\u186Cf;\uC000\uD835\uDD53\u0100;t\u13CB\u1863om\xBB\u13CCtie;\u62C8\u0600DHUVbdhmptuv\u1885\u1896\u18AA\u18BB\u18D7\u18DB\u18EC\u18FF\u1905\u190A\u1910\u1921\u0200LRlr\u188E\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18A1\u18A2\u18A4\u18A6\u18A8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18B3\u18B5\u18B7\u18B9;\u655D;\u655A;\u655C;\u6559\u0380;HLRhlr\u18CA\u18CB\u18CD\u18CF\u18D1\u18D3\u18D5\u6551;\u656C;\u6563;\u6560;\u656B;\u6562;\u655Fox;\u69C9\u0200LRlr\u18E4\u18E6\u18E8\u18EA;\u6555;\u6552;\u6510;\u650C\u0280;DUdu\u06BD\u18F7\u18F9\u18FB\u18FD;\u6565;\u6568;\u652C;\u6534inus;\u629Flus;\u629Eimes;\u62A0\u0200LRlr\u1919\u191B\u191D\u191F;\u655B;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193B\u6502;\u656A;\u6561;\u655E;\u653C;\u6524;\u651C\u0100ev\u0123\u1942bar\u803B\xA6\u40A6\u0200ceio\u1951\u1956\u195A\u1960r;\uC000\uD835\uDCB7mi;\u604Fm\u0100;e\u171A\u171Cl\u0180;bh\u1968\u1969\u196B\u405C;\u69C5sub;\u67C8\u016C\u1974\u197El\u0100;e\u1979\u197A\u6022t\xBB\u197Ap\u0180;Ee\u012F\u1985\u1987;\u6AAE\u0100;q\u06DC\u06DB\u0CE1\u19A7\x00\u19E8\u1A11\u1A15\u1A32\x00\u1A37\u1A50\x00\x00\u1AB4\x00\x00\u1AC1\x00\x00\u1B21\u1B2E\u1B4D\u1B52\x00\u1BFD\x00\u1C0C\u0180cpr\u19AD\u19B2\u19DDute;\u4107\u0300;abcds\u19BF\u19C0\u19C4\u19CA\u19D5\u19D9\u6229nd;\u6A44rcup;\u6A49\u0100au\u19CF\u19D2p;\u6A4Bp;\u6A47ot;\u6A40;\uC000\u2229\uFE00\u0100eo\u19E2\u19E5t;\u6041\xEE\u0693\u0200aeiu\u19F0\u19FB\u1A01\u1A05\u01F0\u19F5\x00\u19F8s;\u6A4Don;\u410Ddil\u803B\xE7\u40E7rc;\u4109ps\u0100;s\u1A0C\u1A0D\u6A4Cm;\u6A50ot;\u410B\u0180dmn\u1A1B\u1A20\u1A26il\u80BB\xB8\u01ADptyv;\u69B2t\u8100\xA2;e\u1A2D\u1A2E\u40A2r\xE4\u01B2r;\uC000\uD835\uDD20\u0180cei\u1A3D\u1A40\u1A4Dy;\u4447ck\u0100;m\u1A47\u1A48\u6713ark\xBB\u1A48;\u43C7r\u0380;Ecefms\u1A5F\u1A60\u1A62\u1A6B\u1AA4\u1AAA\u1AAE\u65CB;\u69C3\u0180;el\u1A69\u1A6A\u1A6D\u42C6q;\u6257e\u0261\u1A74\x00\x00\u1A88rrow\u0100lr\u1A7C\u1A81eft;\u61BAight;\u61BB\u0280RSacd\u1A92\u1A94\u1A96\u1A9A\u1A9F\xBB\u0F47;\u64C8st;\u629Birc;\u629Aash;\u629Dnint;\u6A10id;\u6AEFcir;\u69C2ubs\u0100;u\u1ABB\u1ABC\u6663it\xBB\u1ABC\u02EC\u1AC7\u1AD4\u1AFA\x00\u1B0Aon\u0100;e\u1ACD\u1ACE\u403A\u0100;q\xC7\xC6\u026D\u1AD9\x00\x00\u1AE2a\u0100;t\u1ADE\u1ADF\u402C;\u4040\u0180;fl\u1AE8\u1AE9\u1AEB\u6201\xEE\u1160e\u0100mx\u1AF1\u1AF6ent\xBB\u1AE9e\xF3\u024D\u01E7\u1AFE\x00\u1B07\u0100;d\u12BB\u1B02ot;\u6A6Dn\xF4\u0246\u0180fry\u1B10\u1B14\u1B17;\uC000\uD835\uDD54o\xE4\u0254\u8100\xA9;s\u0155\u1B1Dr;\u6117\u0100ao\u1B25\u1B29rr;\u61B5ss;\u6717\u0100cu\u1B32\u1B37r;\uC000\uD835\uDCB8\u0100bp\u1B3C\u1B44\u0100;e\u1B41\u1B42\u6ACF;\u6AD1\u0100;e\u1B49\u1B4A\u6AD0;\u6AD2dot;\u62EF\u0380delprvw\u1B60\u1B6C\u1B77\u1B82\u1BAC\u1BD4\u1BF9arr\u0100lr\u1B68\u1B6A;\u6938;\u6935\u0270\u1B72\x00\x00\u1B75r;\u62DEc;\u62DFarr\u0100;p\u1B7F\u1B80\u61B6;\u693D\u0300;bcdos\u1B8F\u1B90\u1B96\u1BA1\u1BA5\u1BA8\u622Arcap;\u6A48\u0100au\u1B9B\u1B9Ep;\u6A46p;\u6A4Aot;\u628Dr;\u6A45;\uC000\u222A\uFE00\u0200alrv\u1BB5\u1BBF\u1BDE\u1BE3rr\u0100;m\u1BBC\u1BBD\u61B7;\u693Cy\u0180evw\u1BC7\u1BD4\u1BD8q\u0270\u1BCE\x00\x00\u1BD2re\xE3\u1B73u\xE3\u1B75ee;\u62CEedge;\u62CFen\u803B\xA4\u40A4earrow\u0100lr\u1BEE\u1BF3eft\xBB\u1B80ight\xBB\u1BBDe\xE4\u1BDD\u0100ci\u1C01\u1C07onin\xF4\u01F7nt;\u6231lcty;\u632D\u0980AHabcdefhijlorstuwz\u1C38\u1C3B\u1C3F\u1C5D\u1C69\u1C75\u1C8A\u1C9E\u1CAC\u1CB7\u1CFB\u1CFF\u1D0D\u1D7B\u1D91\u1DAB\u1DBB\u1DC6\u1DCDr\xF2\u0381ar;\u6965\u0200glrs\u1C48\u1C4D\u1C52\u1C54ger;\u6020eth;\u6138\xF2\u1133h\u0100;v\u1C5A\u1C5B\u6010\xBB\u090A\u016B\u1C61\u1C67arow;\u690Fa\xE3\u0315\u0100ay\u1C6E\u1C73ron;\u410F;\u4434\u0180;ao\u0332\u1C7C\u1C84\u0100gr\u02BF\u1C81r;\u61CAtseq;\u6A77\u0180glm\u1C91\u1C94\u1C98\u803B\xB0\u40B0ta;\u43B4ptyv;\u69B1\u0100ir\u1CA3\u1CA8sht;\u697F;\uC000\uD835\uDD21ar\u0100lr\u1CB3\u1CB5\xBB\u08DC\xBB\u101E\u0280aegsv\u1CC2\u0378\u1CD6\u1CDC\u1CE0m\u0180;os\u0326\u1CCA\u1CD4nd\u0100;s\u0326\u1CD1uit;\u6666amma;\u43DDin;\u62F2\u0180;io\u1CE7\u1CE8\u1CF8\u40F7de\u8100\xF7;o\u1CE7\u1CF0ntimes;\u62C7n\xF8\u1CF7cy;\u4452c\u026F\u1D06\x00\x00\u1D0Arn;\u631Eop;\u630D\u0280lptuw\u1D18\u1D1D\u1D22\u1D49\u1D55lar;\u4024f;\uC000\uD835\uDD55\u0280;emps\u030B\u1D2D\u1D37\u1D3D\u1D42q\u0100;d\u0352\u1D33ot;\u6251inus;\u6238lus;\u6214quare;\u62A1blebarwedg\xE5\xFAn\u0180adh\u112E\u1D5D\u1D67ownarrow\xF3\u1C83arpoon\u0100lr\u1D72\u1D76ef\xF4\u1CB4igh\xF4\u1CB6\u0162\u1D7F\u1D85karo\xF7\u0F42\u026F\u1D8A\x00\x00\u1D8Ern;\u631Fop;\u630C\u0180cot\u1D98\u1DA3\u1DA6\u0100ry\u1D9D\u1DA1;\uC000\uD835\uDCB9;\u4455l;\u69F6rok;\u4111\u0100dr\u1DB0\u1DB4ot;\u62F1i\u0100;f\u1DBA\u1816\u65BF\u0100ah\u1DC0\u1DC3r\xF2\u0429a\xF2\u0FA6angle;\u69A6\u0100ci\u1DD2\u1DD5y;\u445Fgrarr;\u67FF\u0900Dacdefglmnopqrstux\u1E01\u1E09\u1E19\u1E38\u0578\u1E3C\u1E49\u1E61\u1E7E\u1EA5\u1EAF\u1EBD\u1EE1\u1F2A\u1F37\u1F44\u1F4E\u1F5A\u0100Do\u1E06\u1D34o\xF4\u1C89\u0100cs\u1E0E\u1E14ute\u803B\xE9\u40E9ter;\u6A6E\u0200aioy\u1E22\u1E27\u1E31\u1E36ron;\u411Br\u0100;c\u1E2D\u1E2E\u6256\u803B\xEA\u40EAlon;\u6255;\u444Dot;\u4117\u0100Dr\u1E41\u1E45ot;\u6252;\uC000\uD835\uDD22\u0180;rs\u1E50\u1E51\u1E57\u6A9Aave\u803B\xE8\u40E8\u0100;d\u1E5C\u1E5D\u6A96ot;\u6A98\u0200;ils\u1E6A\u1E6B\u1E72\u1E74\u6A99nters;\u63E7;\u6113\u0100;d\u1E79\u1E7A\u6A95ot;\u6A97\u0180aps\u1E85\u1E89\u1E97cr;\u4113ty\u0180;sv\u1E92\u1E93\u1E95\u6205et\xBB\u1E93p\u01001;\u1E9D\u1EA4\u0133\u1EA1\u1EA3;\u6004;\u6005\u6003\u0100gs\u1EAA\u1EAC;\u414Bp;\u6002\u0100gp\u1EB4\u1EB8on;\u4119f;\uC000\uD835\uDD56\u0180als\u1EC4\u1ECE\u1ED2r\u0100;s\u1ECA\u1ECB\u62D5l;\u69E3us;\u6A71i\u0180;lv\u1EDA\u1EDB\u1EDF\u43B5on\xBB\u1EDB;\u43F5\u0200csuv\u1EEA\u1EF3\u1F0B\u1F23\u0100io\u1EEF\u1E31rc\xBB\u1E2E\u0269\u1EF9\x00\x00\u1EFB\xED\u0548ant\u0100gl\u1F02\u1F06tr\xBB\u1E5Dess\xBB\u1E7A\u0180aei\u1F12\u1F16\u1F1Als;\u403Dst;\u625Fv\u0100;D\u0235\u1F20D;\u6A78parsl;\u69E5\u0100Da\u1F2F\u1F33ot;\u6253rr;\u6971\u0180cdi\u1F3E\u1F41\u1EF8r;\u612Fo\xF4\u0352\u0100ah\u1F49\u1F4B;\u43B7\u803B\xF0\u40F0\u0100mr\u1F53\u1F57l\u803B\xEB\u40EBo;\u60AC\u0180cip\u1F61\u1F64\u1F67l;\u4021s\xF4\u056E\u0100eo\u1F6C\u1F74ctatio\xEE\u0559nential\xE5\u0579\u09E1\u1F92\x00\u1F9E\x00\u1FA1\u1FA7\x00\x00\u1FC6\u1FCC\x00\u1FD3\x00\u1FE6\u1FEA\u2000\x00\u2008\u205Allingdotse\xF1\u1E44y;\u4444male;\u6640\u0180ilr\u1FAD\u1FB3\u1FC1lig;\u8000\uFB03\u0269\u1FB9\x00\x00\u1FBDg;\u8000\uFB00ig;\u8000\uFB04;\uC000\uD835\uDD23lig;\u8000\uFB01lig;\uC000fj\u0180alt\u1FD9\u1FDC\u1FE1t;\u666Dig;\u8000\uFB02ns;\u65B1of;\u4192\u01F0\u1FEE\x00\u1FF3f;\uC000\uD835\uDD57\u0100ak\u05BF\u1FF7\u0100;v\u1FFC\u1FFD\u62D4;\u6AD9artint;\u6A0D\u0100ao\u200C\u2055\u0100cs\u2011\u2052\u03B1\u201A\u2030\u2038\u2045\u2048\x00\u2050\u03B2\u2022\u2025\u2027\u202A\u202C\x00\u202E\u803B\xBD\u40BD;\u6153\u803B\xBC\u40BC;\u6155;\u6159;\u615B\u01B3\u2034\x00\u2036;\u6154;\u6156\u02B4\u203E\u2041\x00\x00\u2043\u803B\xBE\u40BE;\u6157;\u615C5;\u6158\u01B6\u204C\x00\u204E;\u615A;\u615D8;\u615El;\u6044wn;\u6322cr;\uC000\uD835\uDCBB\u0880Eabcdefgijlnorstv\u2082\u2089\u209F\u20A5\u20B0\u20B4\u20F0\u20F5\u20FA\u20FF\u2103\u2112\u2138\u0317\u213E\u2152\u219E\u0100;l\u064D\u2087;\u6A8C\u0180cmp\u2090\u2095\u209Dute;\u41F5ma\u0100;d\u209C\u1CDA\u43B3;\u6A86reve;\u411F\u0100iy\u20AA\u20AErc;\u411D;\u4433ot;\u4121\u0200;lqs\u063E\u0642\u20BD\u20C9\u0180;qs\u063E\u064C\u20C4lan\xF4\u0665\u0200;cdl\u0665\u20D2\u20D5\u20E5c;\u6AA9ot\u0100;o\u20DC\u20DD\u6A80\u0100;l\u20E2\u20E3\u6A82;\u6A84\u0100;e\u20EA\u20ED\uC000\u22DB\uFE00s;\u6A94r;\uC000\uD835\uDD24\u0100;g\u0673\u061Bmel;\u6137cy;\u4453\u0200;Eaj\u065A\u210C\u210E\u2110;\u6A92;\u6AA5;\u6AA4\u0200Eaes\u211B\u211D\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6A8Arox\xBB\u2124\u0100;q\u212E\u212F\u6A88\u0100;q\u212E\u211Bim;\u62E7pf;\uC000\uD835\uDD58\u0100ci\u2143\u2146r;\u610Am\u0180;el\u066B\u214E\u2150;\u6A8E;\u6A90\u8300>;cdlqr\u05EE\u2160\u216A\u216E\u2173\u2179\u0100ci\u2165\u2167;\u6AA7r;\u6A7Aot;\u62D7Par;\u6995uest;\u6A7C\u0280adels\u2184\u216A\u2190\u0656\u219B\u01F0\u2189\x00\u218Epro\xF8\u209Er;\u6978q\u0100lq\u063F\u2196les\xF3\u2088i\xED\u066B\u0100en\u21A3\u21ADrtneqq;\uC000\u2269\uFE00\xC5\u21AA\u0500Aabcefkosy\u21C4\u21C7\u21F1\u21F5\u21FA\u2218\u221D\u222F\u2268\u227Dr\xF2\u03A0\u0200ilmr\u21D0\u21D4\u21D7\u21DBrs\xF0\u1484f\xBB\u2024il\xF4\u06A9\u0100dr\u21E0\u21E4cy;\u444A\u0180;cw\u08F4\u21EB\u21EFir;\u6948;\u61ADar;\u610Firc;\u4125\u0180alr\u2201\u220E\u2213rts\u0100;u\u2209\u220A\u6665it\xBB\u220Alip;\u6026con;\u62B9r;\uC000\uD835\uDD25s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223A\u223E\u2243\u225E\u2263rr;\u61FFtht;\u623Bk\u0100lr\u2249\u2253eftarrow;\u61A9ightarrow;\u61AAf;\uC000\uD835\uDD59bar;\u6015\u0180clt\u226F\u2274\u2278r;\uC000\uD835\uDCBDas\xE8\u21F4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xBB\u1C5B\u0AE1\u22A3\x00\u22AA\x00\u22B8\u22C5\u22CE\x00\u22D5\u22F3\x00\x00\u22F8\u2322\u2367\u2362\u237F\x00\u2386\u23AA\u23B4cute\u803B\xED\u40ED\u0180;iy\u0771\u22B0\u22B5rc\u803B\xEE\u40EE;\u4438\u0100cx\u22BC\u22BFy;\u4435cl\u803B\xA1\u40A1\u0100fr\u039F\u22C9;\uC000\uD835\uDD26rave\u803B\xEC\u40EC\u0200;ino\u073E\u22DD\u22E9\u22EE\u0100in\u22E2\u22E6nt;\u6A0Ct;\u622Dfin;\u69DCta;\u6129lig;\u4133\u0180aop\u22FE\u231A\u231D\u0180cgt\u2305\u2308\u2317r;\u412B\u0180elp\u071F\u230F\u2313in\xE5\u078Ear\xF4\u0720h;\u4131f;\u62B7ed;\u41B5\u0280;cfot\u04F4\u232C\u2331\u233D\u2341are;\u6105in\u0100;t\u2338\u2339\u621Eie;\u69DDdo\xF4\u2319\u0280;celp\u0757\u234C\u2350\u235B\u2361al;\u62BA\u0100gr\u2355\u2359er\xF3\u1563\xE3\u234Darhk;\u6A17rod;\u6A3C\u0200cgpt\u236F\u2372\u2376\u237By;\u4451on;\u412Ff;\uC000\uD835\uDD5Aa;\u43B9uest\u803B\xBF\u40BF\u0100ci\u238A\u238Fr;\uC000\uD835\uDCBEn\u0280;Edsv\u04F4\u239B\u239D\u23A1\u04F3;\u62F9ot;\u62F5\u0100;v\u23A6\u23A7\u62F4;\u62F3\u0100;i\u0777\u23AElde;\u4129\u01EB\u23B8\x00\u23BCcy;\u4456l\u803B\xEF\u40EF\u0300cfmosu\u23CC\u23D7\u23DC\u23E1\u23E7\u23F5\u0100iy\u23D1\u23D5rc;\u4135;\u4439r;\uC000\uD835\uDD27ath;\u4237pf;\uC000\uD835\uDD5B\u01E3\u23EC\x00\u23F1r;\uC000\uD835\uDCBFrcy;\u4458kcy;\u4454\u0400acfghjos\u240B\u2416\u2422\u2427\u242D\u2431\u2435\u243Bppa\u0100;v\u2413\u2414\u43BA;\u43F0\u0100ey\u241B\u2420dil;\u4137;\u443Ar;\uC000\uD835\uDD28reen;\u4138cy;\u4445cy;\u445Cpf;\uC000\uD835\uDD5Ccr;\uC000\uD835\uDCC0\u0B80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248D\u2491\u250E\u253D\u255A\u2580\u264E\u265E\u2665\u2679\u267D\u269A\u26B2\u26D8\u275D\u2768\u278B\u27C0\u2801\u2812\u0180art\u2477\u247A\u247Cr\xF2\u09C6\xF2\u0395ail;\u691Barr;\u690E\u0100;g\u0994\u248B;\u6A8Bar;\u6962\u0963\u24A5\x00\u24AA\x00\u24B1\x00\x00\x00\x00\x00\u24B5\u24BA\x00\u24C6\u24C8\u24CD\x00\u24F9ute;\u413Amptyv;\u69B4ra\xEE\u084Cbda;\u43BBg\u0180;dl\u088E\u24C1\u24C3;\u6991\xE5\u088E;\u6A85uo\u803B\xAB\u40ABr\u0400;bfhlpst\u0899\u24DE\u24E6\u24E9\u24EB\u24EE\u24F1\u24F5\u0100;f\u089D\u24E3s;\u691Fs;\u691D\xEB\u2252p;\u61ABl;\u6939im;\u6973l;\u61A2\u0180;ae\u24FF\u2500\u2504\u6AABil;\u6919\u0100;s\u2509\u250A\u6AAD;\uC000\u2AAD\uFE00\u0180abr\u2515\u2519\u251Drr;\u690Crk;\u6772\u0100ak\u2522\u252Cc\u0100ek\u2528\u252A;\u407B;\u405B\u0100es\u2531\u2533;\u698Bl\u0100du\u2539\u253B;\u698F;\u698D\u0200aeuy\u2546\u254B\u2556\u2558ron;\u413E\u0100di\u2550\u2554il;\u413C\xEC\u08B0\xE2\u2529;\u443B\u0200cqrs\u2563\u2566\u256D\u257Da;\u6936uo\u0100;r\u0E19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694Bh;\u61B2\u0280;fgqs\u258B\u258C\u0989\u25F3\u25FF\u6264t\u0280ahlrt\u2598\u25A4\u25B7\u25C2\u25E8rrow\u0100;t\u0899\u25A1a\xE9\u24F6arpoon\u0100du\u25AF\u25B4own\xBB\u045Ap\xBB\u0966eftarrows;\u61C7ight\u0180ahs\u25CD\u25D6\u25DErrow\u0100;s\u08F4\u08A7arpoon\xF3\u0F98quigarro\xF7\u21F0hreetimes;\u62CB\u0180;qs\u258B\u0993\u25FAlan\xF4\u09AC\u0280;cdgs\u09AC\u260A\u260D\u261D\u2628c;\u6AA8ot\u0100;o\u2614\u2615\u6A7F\u0100;r\u261A\u261B\u6A81;\u6A83\u0100;e\u2622\u2625\uC000\u22DA\uFE00s;\u6A93\u0280adegs\u2633\u2639\u263D\u2649\u264Bppro\xF8\u24C6ot;\u62D6q\u0100gq\u2643\u2645\xF4\u0989gt\xF2\u248C\xF4\u099Bi\xED\u09B2\u0180ilr\u2655\u08E1\u265Asht;\u697C;\uC000\uD835\uDD29\u0100;E\u099C\u2663;\u6A91\u0161\u2669\u2676r\u0100du\u25B2\u266E\u0100;l\u0965\u2673;\u696Alk;\u6584cy;\u4459\u0280;acht\u0A48\u2688\u268B\u2691\u2696r\xF2\u25C1orne\xF2\u1D08ard;\u696Bri;\u65FA\u0100io\u269F\u26A4dot;\u4140ust\u0100;a\u26AC\u26AD\u63B0che\xBB\u26AD\u0200Eaes\u26BB\u26BD\u26C9\u26D4;\u6268p\u0100;p\u26C3\u26C4\u6A89rox\xBB\u26C4\u0100;q\u26CE\u26CF\u6A87\u0100;q\u26CE\u26BBim;\u62E6\u0400abnoptwz\u26E9\u26F4\u26F7\u271A\u272F\u2741\u2747\u2750\u0100nr\u26EE\u26F1g;\u67ECr;\u61FDr\xEB\u08C1g\u0180lmr\u26FF\u270D\u2714eft\u0100ar\u09E6\u2707ight\xE1\u09F2apsto;\u67FCight\xE1\u09FDparrow\u0100lr\u2725\u2729ef\xF4\u24EDight;\u61AC\u0180afl\u2736\u2739\u273Dr;\u6985;\uC000\uD835\uDD5Dus;\u6A2Dimes;\u6A34\u0161\u274B\u274Fst;\u6217\xE1\u134E\u0180;ef\u2757\u2758\u1800\u65CAnge\xBB\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277C\u2785\u2787r\xF2\u08A8orne\xF2\u1D8Car\u0100;d\u0F98\u2783;\u696D;\u600Eri;\u62BF\u0300achiqt\u2798\u279D\u0A40\u27A2\u27AE\u27BBquo;\u6039r;\uC000\uD835\uDCC1m\u0180;eg\u09B2\u27AA\u27AC;\u6A8D;\u6A8F\u0100bu\u252A\u27B3o\u0100;r\u0E1F\u27B9;\u601Arok;\u4142\u8400<;cdhilqr\u082B\u27D2\u2639\u27DC\u27E0\u27E5\u27EA\u27F0\u0100ci\u27D7\u27D9;\u6AA6r;\u6A79re\xE5\u25F2mes;\u62C9arr;\u6976uest;\u6A7B\u0100Pi\u27F5\u27F9ar;\u6996\u0180;ef\u2800\u092D\u181B\u65C3r\u0100du\u2807\u280Dshar;\u694Ahar;\u6966\u0100en\u2817\u2821rtneqq;\uC000\u2268\uFE00\xC5\u281E\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288E\u2893\u28A0\u28A5\u28A8\u28DA\u28E2\u28E4\u0A83\u28F3\u2902Dot;\u623A\u0200clpr\u284E\u2852\u2863\u287Dr\u803B\xAF\u40AF\u0100et\u2857\u2859;\u6642\u0100;e\u285E\u285F\u6720se\xBB\u285F\u0100;s\u103B\u2868to\u0200;dlu\u103B\u2873\u2877\u287Bow\xEE\u048Cef\xF4\u090F\xF0\u13D1ker;\u65AE\u0100oy\u2887\u288Cmma;\u6A29;\u443Cash;\u6014asuredangle\xBB\u1626r;\uC000\uD835\uDD2Ao;\u6127\u0180cdn\u28AF\u28B4\u28C9ro\u803B\xB5\u40B5\u0200;acd\u1464\u28BD\u28C0\u28C4s\xF4\u16A7ir;\u6AF0ot\u80BB\xB7\u01B5us\u0180;bd\u28D2\u1903\u28D3\u6212\u0100;u\u1D3C\u28D8;\u6A2A\u0163\u28DE\u28E1p;\u6ADB\xF2\u2212\xF0\u0A81\u0100dp\u28E9\u28EEels;\u62A7f;\uC000\uD835\uDD5E\u0100ct\u28F8\u28FDr;\uC000\uD835\uDCC2pos\xBB\u159D\u0180;lm\u2909\u290A\u290D\u43BCtimap;\u62B8\u0C00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297E\u2989\u2998\u29DA\u29E9\u2A15\u2A1A\u2A58\u2A5D\u2A83\u2A95\u2AA4\u2AA8\u2B04\u2B07\u2B44\u2B7F\u2BAE\u2C34\u2C67\u2C7C\u2CE9\u0100gt\u2947\u294B;\uC000\u22D9\u0338\u0100;v\u2950\u0BCF\uC000\u226B\u20D2\u0180elt\u295A\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61CDightarrow;\u61CE;\uC000\u22D8\u0338\u0100;v\u297B\u0C47\uC000\u226A\u20D2ightarrow;\u61CF\u0100Dd\u298E\u2993ash;\u62AFash;\u62AE\u0280bcnpt\u29A3\u29A7\u29AC\u29B1\u29CCla\xBB\u02DEute;\u4144g;\uC000\u2220\u20D2\u0280;Eiop\u0D84\u29BC\u29C0\u29C5\u29C8;\uC000\u2A70\u0338d;\uC000\u224B\u0338s;\u4149ro\xF8\u0D84ur\u0100;a\u29D3\u29D4\u666El\u0100;s\u29D3\u0B38\u01F3\u29DF\x00\u29E3p\u80BB\xA0\u0B37mp\u0100;e\u0BF9\u0C00\u0280aeouy\u29F4\u29FE\u2A03\u2A10\u2A13\u01F0\u29F9\x00\u29FB;\u6A43on;\u4148dil;\u4146ng\u0100;d\u0D7E\u2A0Aot;\uC000\u2A6D\u0338p;\u6A42;\u443Dash;\u6013\u0380;Aadqsx\u0B92\u2A29\u2A2D\u2A3B\u2A41\u2A45\u2A50rr;\u61D7r\u0100hr\u2A33\u2A36k;\u6924\u0100;o\u13F2\u13F0ot;\uC000\u2250\u0338ui\xF6\u0B63\u0100ei\u2A4A\u2A4Ear;\u6928\xED\u0B98ist\u0100;s\u0BA0\u0B9Fr;\uC000\uD835\uDD2B\u0200Eest\u0BC5\u2A66\u2A79\u2A7C\u0180;qs\u0BBC\u2A6D\u0BE1\u0180;qs\u0BBC\u0BC5\u2A74lan\xF4\u0BE2i\xED\u0BEA\u0100;r\u0BB6\u2A81\xBB\u0BB7\u0180Aap\u2A8A\u2A8D\u2A91r\xF2\u2971rr;\u61AEar;\u6AF2\u0180;sv\u0F8D\u2A9C\u0F8C\u0100;d\u2AA1\u2AA2\u62FC;\u62FAcy;\u445A\u0380AEadest\u2AB7\u2ABA\u2ABE\u2AC2\u2AC5\u2AF6\u2AF9r\xF2\u2966;\uC000\u2266\u0338rr;\u619Ar;\u6025\u0200;fqs\u0C3B\u2ACE\u2AE3\u2AEFt\u0100ar\u2AD4\u2AD9rro\xF7\u2AC1ightarro\xF7\u2A90\u0180;qs\u0C3B\u2ABA\u2AEAlan\xF4\u0C55\u0100;s\u0C55\u2AF4\xBB\u0C36i\xED\u0C5D\u0100;r\u0C35\u2AFEi\u0100;e\u0C1A\u0C25i\xE4\u0D90\u0100pt\u2B0C\u2B11f;\uC000\uD835\uDD5F\u8180\xAC;in\u2B19\u2B1A\u2B36\u40ACn\u0200;Edv\u0B89\u2B24\u2B28\u2B2E;\uC000\u22F9\u0338ot;\uC000\u22F5\u0338\u01E1\u0B89\u2B33\u2B35;\u62F7;\u62F6i\u0100;v\u0CB8\u2B3C\u01E1\u0CB8\u2B41\u2B43;\u62FE;\u62FD\u0180aor\u2B4B\u2B63\u2B69r\u0200;ast\u0B7B\u2B55\u2B5A\u2B5Flle\xEC\u0B7Bl;\uC000\u2AFD\u20E5;\uC000\u2202\u0338lint;\u6A14\u0180;ce\u0C92\u2B70\u2B73u\xE5\u0CA5\u0100;c\u0C98\u2B78\u0100;e\u0C92\u2B7D\xF1\u0C98\u0200Aait\u2B88\u2B8B\u2B9D\u2BA7r\xF2\u2988rr\u0180;cw\u2B94\u2B95\u2B99\u619B;\uC000\u2933\u0338;\uC000\u219D\u0338ghtarrow\xBB\u2B95ri\u0100;e\u0CCB\u0CD6\u0380chimpqu\u2BBD\u2BCD\u2BD9\u2B04\u0B78\u2BE4\u2BEF\u0200;cer\u0D32\u2BC6\u0D37\u2BC9u\xE5\u0D45;\uC000\uD835\uDCC3ort\u026D\u2B05\x00\x00\u2BD6ar\xE1\u2B56m\u0100;e\u0D6E\u2BDF\u0100;q\u0D74\u0D73su\u0100bp\u2BEB\u2BED\xE5\u0CF8\xE5\u0D0B\u0180bcp\u2BF6\u2C11\u2C19\u0200;Ees\u2BFF\u2C00\u0D22\u2C04\u6284;\uC000\u2AC5\u0338et\u0100;e\u0D1B\u2C0Bq\u0100;q\u0D23\u2C00c\u0100;e\u0D32\u2C17\xF1\u0D38\u0200;Ees\u2C22\u2C23\u0D5F\u2C27\u6285;\uC000\u2AC6\u0338et\u0100;e\u0D58\u2C2Eq\u0100;q\u0D60\u2C23\u0200gilr\u2C3D\u2C3F\u2C45\u2C47\xEC\u0BD7lde\u803B\xF1\u40F1\xE7\u0C43iangle\u0100lr\u2C52\u2C5Ceft\u0100;e\u0C1A\u2C5A\xF1\u0C26ight\u0100;e\u0CCB\u2C65\xF1\u0CD7\u0100;m\u2C6C\u2C6D\u43BD\u0180;es\u2C74\u2C75\u2C79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2C8F\u2C94\u2C99\u2C9E\u2CA3\u2CB0\u2CB6\u2CD3\u2CE3ash;\u62ADarr;\u6904p;\uC000\u224D\u20D2ash;\u62AC\u0100et\u2CA8\u2CAC;\uC000\u2265\u20D2;\uC000>\u20D2nfin;\u69DE\u0180Aet\u2CBD\u2CC1\u2CC5rr;\u6902;\uC000\u2264\u20D2\u0100;r\u2CCA\u2CCD\uC000<\u20D2ie;\uC000\u22B4\u20D2\u0100At\u2CD8\u2CDCrr;\u6903rie;\uC000\u22B5\u20D2im;\uC000\u223C\u20D2\u0180Aan\u2CF0\u2CF4\u2D02rr;\u61D6r\u0100hr\u2CFA\u2CFDk;\u6923\u0100;o\u13E7\u13E5ear;\u6927\u1253\u1A95\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\u2D2D\x00\u2D38\u2D48\u2D60\u2D65\u2D72\u2D84\u1B07\x00\x00\u2D8D\u2DAB\x00\u2DC8\u2DCE\x00\u2DDC\u2E19\u2E2B\u2E3E\u2E43\u0100cs\u2D31\u1A97ute\u803B\xF3\u40F3\u0100iy\u2D3C\u2D45r\u0100;c\u1A9E\u2D42\u803B\xF4\u40F4;\u443E\u0280abios\u1AA0\u2D52\u2D57\u01C8\u2D5Alac;\u4151v;\u6A38old;\u69BClig;\u4153\u0100cr\u2D69\u2D6Dir;\u69BF;\uC000\uD835\uDD2C\u036F\u2D79\x00\x00\u2D7C\x00\u2D82n;\u42DBave\u803B\xF2\u40F2;\u69C1\u0100bm\u2D88\u0DF4ar;\u69B5\u0200acit\u2D95\u2D98\u2DA5\u2DA8r\xF2\u1A80\u0100ir\u2D9D\u2DA0r;\u69BEoss;\u69BBn\xE5\u0E52;\u69C0\u0180aei\u2DB1\u2DB5\u2DB9cr;\u414Dga;\u43C9\u0180cdn\u2DC0\u2DC5\u01CDron;\u43BF;\u69B6pf;\uC000\uD835\uDD60\u0180ael\u2DD4\u2DD7\u01D2r;\u69B7rp;\u69B9\u0380;adiosv\u2DEA\u2DEB\u2DEE\u2E08\u2E0D\u2E10\u2E16\u6228r\xF2\u1A86\u0200;efm\u2DF7\u2DF8\u2E02\u2E05\u6A5Dr\u0100;o\u2DFE\u2DFF\u6134f\xBB\u2DFF\u803B\xAA\u40AA\u803B\xBA\u40BAgof;\u62B6r;\u6A56lope;\u6A57;\u6A5B\u0180clo\u2E1F\u2E21\u2E27\xF2\u2E01ash\u803B\xF8\u40F8l;\u6298i\u016C\u2E2F\u2E34de\u803B\xF5\u40F5es\u0100;a\u01DB\u2E3As;\u6A36ml\u803B\xF6\u40F6bar;\u633D\u0AE1\u2E5E\x00\u2E7D\x00\u2E80\u2E9D\x00\u2EA2\u2EB9\x00\x00\u2ECB\u0E9C\x00\u2F13\x00\x00\u2F2B\u2FBC\x00\u2FC8r\u0200;ast\u0403\u2E67\u2E72\u0E85\u8100\xB6;l\u2E6D\u2E6E\u40B6le\xEC\u0403\u0269\u2E78\x00\x00\u2E7Bm;\u6AF3;\u6AFDy;\u443Fr\u0280cimpt\u2E8B\u2E8F\u2E93\u1865\u2E97nt;\u4025od;\u402Eil;\u6030enk;\u6031r;\uC000\uD835\uDD2D\u0180imo\u2EA8\u2EB0\u2EB4\u0100;v\u2EAD\u2EAE\u43C6;\u43D5ma\xF4\u0A76ne;\u660E\u0180;tv\u2EBF\u2EC0\u2EC8\u43C0chfork\xBB\u1FFD;\u43D6\u0100au\u2ECF\u2EDFn\u0100ck\u2ED5\u2EDDk\u0100;h\u21F4\u2EDB;\u610E\xF6\u21F4s\u0480;abcdemst\u2EF3\u2EF4\u1908\u2EF9\u2EFD\u2F04\u2F06\u2F0A\u2F0E\u402Bcir;\u6A23ir;\u6A22\u0100ou\u1D40\u2F02;\u6A25;\u6A72n\u80BB\xB1\u0E9Dim;\u6A26wo;\u6A27\u0180ipu\u2F19\u2F20\u2F25ntint;\u6A15f;\uC000\uD835\uDD61nd\u803B\xA3\u40A3\u0500;Eaceinosu\u0EC8\u2F3F\u2F41\u2F44\u2F47\u2F81\u2F89\u2F92\u2F7E\u2FB6;\u6AB3p;\u6AB7u\xE5\u0ED9\u0100;c\u0ECE\u2F4C\u0300;acens\u0EC8\u2F59\u2F5F\u2F66\u2F68\u2F7Eppro\xF8\u2F43urlye\xF1\u0ED9\xF1\u0ECE\u0180aes\u2F6F\u2F76\u2F7Approx;\u6AB9qq;\u6AB5im;\u62E8i\xED\u0EDFme\u0100;s\u2F88\u0EAE\u6032\u0180Eas\u2F78\u2F90\u2F7A\xF0\u2F75\u0180dfp\u0EEC\u2F99\u2FAF\u0180als\u2FA0\u2FA5\u2FAAlar;\u632Eine;\u6312urf;\u6313\u0100;t\u0EFB\u2FB4\xEF\u0EFBrel;\u62B0\u0100ci\u2FC0\u2FC5r;\uC000\uD835\uDCC5;\u43C8ncsp;\u6008\u0300fiopsu\u2FDA\u22E2\u2FDF\u2FE5\u2FEB\u2FF1r;\uC000\uD835\uDD2Epf;\uC000\uD835\uDD62rime;\u6057cr;\uC000\uD835\uDCC6\u0180aeo\u2FF8\u3009\u3013t\u0100ei\u2FFE\u3005rnion\xF3\u06B0nt;\u6A16st\u0100;e\u3010\u3011\u403F\xF1\u1F19\xF4\u0F14\u0A80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30E0\u310E\u312B\u3147\u3162\u3172\u318E\u3206\u3215\u3224\u3229\u3258\u326E\u3272\u3290\u32B0\u32B7\u0180art\u3047\u304A\u304Cr\xF2\u10B3\xF2\u03DDail;\u691Car\xF2\u1C65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307F\u308F\u3094\u30CC\u0100eu\u306D\u3071;\uC000\u223D\u0331te;\u4155i\xE3\u116Emptyv;\u69B3g\u0200;del\u0FD1\u3089\u308B\u308D;\u6992;\u69A5\xE5\u0FD1uo\u803B\xBB\u40BBr\u0580;abcfhlpstw\u0FDC\u30AC\u30AF\u30B7\u30B9\u30BC\u30BE\u30C0\u30C3\u30C7\u30CAp;\u6975\u0100;f\u0FE0\u30B4s;\u6920;\u6933s;\u691E\xEB\u225D\xF0\u272El;\u6945im;\u6974l;\u61A3;\u619D\u0100ai\u30D1\u30D5il;\u691Ao\u0100;n\u30DB\u30DC\u6236al\xF3\u0F1E\u0180abr\u30E7\u30EA\u30EEr\xF2\u17E5rk;\u6773\u0100ak\u30F3\u30FDc\u0100ek\u30F9\u30FB;\u407D;\u405D\u0100es\u3102\u3104;\u698Cl\u0100du\u310A\u310C;\u698E;\u6990\u0200aeuy\u3117\u311C\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xEC\u0FF2\xE2\u30FA;\u4440\u0200clqs\u3134\u3137\u313D\u3144a;\u6937dhar;\u6969uo\u0100;r\u020E\u020Dh;\u61B3\u0180acg\u314E\u315F\u0F44l\u0200;ips\u0F78\u3158\u315B\u109Cn\xE5\u10BBar\xF4\u0FA9t;\u65AD\u0180ilr\u3169\u1023\u316Esht;\u697D;\uC000\uD835\uDD2F\u0100ao\u3177\u3186r\u0100du\u317D\u317F\xBB\u047B\u0100;l\u1091\u3184;\u696C\u0100;v\u318B\u318C\u43C1;\u43F1\u0180gns\u3195\u31F9\u31FCht\u0300ahlrst\u31A4\u31B0\u31C2\u31D8\u31E4\u31EErrow\u0100;t\u0FDC\u31ADa\xE9\u30C8arpoon\u0100du\u31BB\u31BFow\xEE\u317Ep\xBB\u1092eft\u0100ah\u31CA\u31D0rrow\xF3\u0FEAarpoon\xF3\u0551ightarrows;\u61C9quigarro\xF7\u30CBhreetimes;\u62CCg;\u42DAingdotse\xF1\u1F32\u0180ahm\u320D\u3210\u3213r\xF2\u0FEAa\xF2\u0551;\u600Foust\u0100;a\u321E\u321F\u63B1che\xBB\u321Fmid;\u6AEE\u0200abpt\u3232\u323D\u3240\u3252\u0100nr\u3237\u323Ag;\u67EDr;\u61FEr\xEB\u1003\u0180afl\u3247\u324A\u324Er;\u6986;\uC000\uD835\uDD63us;\u6A2Eimes;\u6A35\u0100ap\u325D\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6A12ar\xF2\u31E3\u0200achq\u327B\u3280\u10BC\u3285quo;\u603Ar;\uC000\uD835\uDCC7\u0100bu\u30FB\u328Ao\u0100;r\u0214\u0213\u0180hir\u3297\u329B\u32A0re\xE5\u31F8mes;\u62CAi\u0200;efl\u32AA\u1059\u1821\u32AB\u65B9tri;\u69CEluhar;\u6968;\u611E\u0D61\u32D5\u32DB\u32DF\u332C\u3338\u3371\x00\u337A\u33A4\x00\x00\u33EC\u33F0\x00\u3428\u3448\u345A\u34AD\u34B1\u34CA\u34F1\x00\u3616\x00\x00\u3633cute;\u415Bqu\xEF\u27BA\u0500;Eaceinpsy\u11ED\u32F3\u32F5\u32FF\u3302\u330B\u330F\u331F\u3326\u3329;\u6AB4\u01F0\u32FA\x00\u32FC;\u6AB8on;\u4161u\xE5\u11FE\u0100;d\u11F3\u3307il;\u415Frc;\u415D\u0180Eas\u3316\u3318\u331B;\u6AB6p;\u6ABAim;\u62E9olint;\u6A13i\xED\u1204;\u4441ot\u0180;be\u3334\u1D47\u3335\u62C5;\u6A66\u0380Aacmstx\u3346\u334A\u3357\u335B\u335E\u3363\u336Drr;\u61D8r\u0100hr\u3350\u3352\xEB\u2228\u0100;o\u0A36\u0A34t\u803B\xA7\u40A7i;\u403Bwar;\u6929m\u0100in\u3369\xF0nu\xF3\xF1t;\u6736r\u0100;o\u3376\u2055\uC000\uD835\uDD30\u0200acoy\u3382\u3386\u3391\u33A0rp;\u666F\u0100hy\u338B\u338Fcy;\u4449;\u4448rt\u026D\u3399\x00\x00\u339Ci\xE4\u1464ara\xEC\u2E6F\u803B\xAD\u40AD\u0100gm\u33A8\u33B4ma\u0180;fv\u33B1\u33B2\u33B2\u43C3;\u43C2\u0400;deglnpr\u12AB\u33C5\u33C9\u33CE\u33D6\u33DE\u33E1\u33E6ot;\u6A6A\u0100;q\u12B1\u12B0\u0100;E\u33D3\u33D4\u6A9E;\u6AA0\u0100;E\u33DB\u33DC\u6A9D;\u6A9Fe;\u6246lus;\u6A24arr;\u6972ar\xF2\u113D\u0200aeit\u33F8\u3408\u340F\u3417\u0100ls\u33FD\u3404lsetm\xE9\u336Ahp;\u6A33parsl;\u69E4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341C\u341D\u6AAA\u0100;s\u3422\u3423\u6AAC;\uC000\u2AAC\uFE00\u0180flp\u342E\u3433\u3442tcy;\u444C\u0100;b\u3438\u3439\u402F\u0100;a\u343E\u343F\u69C4r;\u633Ff;\uC000\uD835\uDD64a\u0100dr\u344D\u0402es\u0100;u\u3454\u3455\u6660it\xBB\u3455\u0180csu\u3460\u3479\u349F\u0100au\u3465\u346Fp\u0100;s\u1188\u346B;\uC000\u2293\uFE00p\u0100;s\u11B4\u3475;\uC000\u2294\uFE00u\u0100bp\u347F\u348F\u0180;es\u1197\u119C\u3486et\u0100;e\u1197\u348D\xF1\u119D\u0180;es\u11A8\u11AD\u3496et\u0100;e\u11A8\u349D\xF1\u11AE\u0180;af\u117B\u34A6\u05B0r\u0165\u34AB\u05B1\xBB\u117Car\xF2\u1148\u0200cemt\u34B9\u34BE\u34C2\u34C5r;\uC000\uD835\uDCC8tm\xEE\xF1i\xEC\u3415ar\xE6\u11BE\u0100ar\u34CE\u34D5r\u0100;f\u34D4\u17BF\u6606\u0100an\u34DA\u34EDight\u0100ep\u34E3\u34EApsilo\xEE\u1EE0h\xE9\u2EAFs\xBB\u2852\u0280bcmnp\u34FB\u355E\u1209\u358B\u358E\u0480;Edemnprs\u350E\u350F\u3511\u3515\u351E\u3523\u352C\u3531\u3536\u6282;\u6AC5ot;\u6ABD\u0100;d\u11DA\u351Aot;\u6AC3ult;\u6AC1\u0100Ee\u3528\u352A;\u6ACB;\u628Alus;\u6ABFarr;\u6979\u0180eiu\u353D\u3552\u3555t\u0180;en\u350E\u3545\u354Bq\u0100;q\u11DA\u350Feq\u0100;q\u352B\u3528m;\u6AC7\u0100bp\u355A\u355C;\u6AD5;\u6AD3c\u0300;acens\u11ED\u356C\u3572\u3579\u357B\u3326ppro\xF8\u32FAurlye\xF1\u11FE\xF1\u11F3\u0180aes\u3582\u3588\u331Bppro\xF8\u331Aq\xF1\u3317g;\u666A\u0680123;Edehlmnps\u35A9\u35AC\u35AF\u121C\u35B2\u35B4\u35C0\u35C9\u35D5\u35DA\u35DF\u35E8\u35ED\u803B\xB9\u40B9\u803B\xB2\u40B2\u803B\xB3\u40B3;\u6AC6\u0100os\u35B9\u35BCt;\u6ABEub;\u6AD8\u0100;d\u1222\u35C5ot;\u6AC4s\u0100ou\u35CF\u35D2l;\u67C9b;\u6AD7arr;\u697Bult;\u6AC2\u0100Ee\u35E4\u35E6;\u6ACC;\u628Blus;\u6AC0\u0180eiu\u35F4\u3609\u360Ct\u0180;en\u121C\u35FC\u3602q\u0100;q\u1222\u35B2eq\u0100;q\u35E7\u35E4m;\u6AC8\u0100bp\u3611\u3613;\u6AD4;\u6AD6\u0180Aan\u361C\u3620\u362Drr;\u61D9r\u0100hr\u3626\u3628\xEB\u222E\u0100;o\u0A2B\u0A29war;\u692Alig\u803B\xDF\u40DF\u0BE1\u3651\u365D\u3660\u12CE\u3673\u3679\x00\u367E\u36C2\x00\x00\x00\x00\x00\u36DB\u3703\x00\u3709\u376C\x00\x00\x00\u3787\u0272\u3656\x00\x00\u365Bget;\u6316;\u43C4r\xEB\u0E5F\u0180aey\u3666\u366B\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uC000\uD835\uDD31\u0200eiko\u3686\u369D\u36B5\u36BC\u01F2\u368B\x00\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369B\u43B8ym;\u43D1\u0100cn\u36A2\u36B2k\u0100as\u36A8\u36AEppro\xF8\u12C1im\xBB\u12ACs\xF0\u129E\u0100as\u36BA\u36AE\xF0\u12C1rn\u803B\xFE\u40FE\u01EC\u031F\u36C6\u22E7es\u8180\xD7;bd\u36CF\u36D0\u36D8\u40D7\u0100;a\u190F\u36D5r;\u6A31;\u6A30\u0180eps\u36E1\u36E3\u3700\xE1\u2A4D\u0200;bcf\u0486\u36EC\u36F0\u36F4ot;\u6336ir;\u6AF1\u0100;o\u36F9\u36FC\uC000\uD835\uDD65rk;\u6ADA\xE1\u3362rime;\u6034\u0180aip\u370F\u3712\u3764d\xE5\u1248\u0380adempst\u3721\u374D\u3740\u3751\u3757\u375C\u375Fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65B5own\xBB\u1DBBeft\u0100;e\u2800\u373E\xF1\u092E;\u625Cight\u0100;e\u32AA\u374B\xF1\u105Aot;\u65ECinus;\u6A3Alus;\u6A39b;\u69CDime;\u6A3Bezium;\u63E2\u0180cht\u3772\u377D\u3781\u0100ry\u3777\u377B;\uC000\uD835\uDCC9;\u4446cy;\u445Brok;\u4167\u0100io\u378B\u378Ex\xF4\u1777head\u0100lr\u3797\u37A0eftarro\xF7\u084Fightarrow\xBB\u0F5D\u0900AHabcdfghlmoprstuw\u37D0\u37D3\u37D7\u37E4\u37F0\u37FC\u380E\u381C\u3823\u3834\u3851\u385D\u386B\u38A9\u38CC\u38D2\u38EA\u38F6r\xF2\u03EDar;\u6963\u0100cr\u37DC\u37E2ute\u803B\xFA\u40FA\xF2\u1150r\u01E3\u37EA\x00\u37EDy;\u445Eve;\u416D\u0100iy\u37F5\u37FArc\u803B\xFB\u40FB;\u4443\u0180abh\u3803\u3806\u380Br\xF2\u13ADlac;\u4171a\xF2\u13C3\u0100ir\u3813\u3818sht;\u697E;\uC000\uD835\uDD32rave\u803B\xF9\u40F9\u0161\u3827\u3831r\u0100lr\u382C\u382E\xBB\u0957\xBB\u1083lk;\u6580\u0100ct\u3839\u384D\u026F\u383F\x00\x00\u384Arn\u0100;e\u3845\u3846\u631Cr\xBB\u3846op;\u630Fri;\u65F8\u0100al\u3856\u385Acr;\u416B\u80BB\xA8\u0349\u0100gp\u3862\u3866on;\u4173f;\uC000\uD835\uDD66\u0300adhlsu\u114B\u3878\u387D\u1372\u3891\u38A0own\xE1\u13B3arpoon\u0100lr\u3888\u388Cef\xF4\u382Digh\xF4\u382Fi\u0180;hl\u3899\u389A\u389C\u43C5\xBB\u13FAon\xBB\u389Aparrows;\u61C8\u0180cit\u38B0\u38C4\u38C8\u026F\u38B6\x00\x00\u38C1rn\u0100;e\u38BC\u38BD\u631Dr\xBB\u38BDop;\u630Eng;\u416Fri;\u65F9cr;\uC000\uD835\uDCCA\u0180dir\u38D9\u38DD\u38E2ot;\u62F0lde;\u4169i\u0100;f\u3730\u38E8\xBB\u1813\u0100am\u38EF\u38F2r\xF2\u38A8l\u803B\xFC\u40FCangle;\u69A7\u0780ABDacdeflnoprsz\u391C\u391F\u3929\u392D\u39B5\u39B8\u39BD\u39DF\u39E4\u39E8\u39F3\u39F9\u39FD\u3A01\u3A20r\xF2\u03F7ar\u0100;v\u3926\u3927\u6AE8;\u6AE9as\xE8\u03E1\u0100nr\u3932\u3937grt;\u699C\u0380eknprst\u34E3\u3946\u394B\u3952\u395D\u3964\u3996app\xE1\u2415othin\xE7\u1E96\u0180hir\u34EB\u2EC8\u3959op\xF4\u2FB5\u0100;h\u13B7\u3962\xEF\u318D\u0100iu\u3969\u396Dgm\xE1\u33B3\u0100bp\u3972\u3984setneq\u0100;q\u397D\u3980\uC000\u228A\uFE00;\uC000\u2ACB\uFE00setneq\u0100;q\u398F\u3992\uC000\u228B\uFE00;\uC000\u2ACC\uFE00\u0100hr\u399B\u399Fet\xE1\u369Ciangle\u0100lr\u39AA\u39AFeft\xBB\u0925ight\xBB\u1051y;\u4432ash\xBB\u1036\u0180elr\u39C4\u39D2\u39D7\u0180;be\u2DEA\u39CB\u39CFar;\u62BBq;\u625Alip;\u62EE\u0100bt\u39DC\u1468a\xF2\u1469r;\uC000\uD835\uDD33tr\xE9\u39AEsu\u0100bp\u39EF\u39F1\xBB\u0D1C\xBB\u0D59pf;\uC000\uD835\uDD67ro\xF0\u0EFBtr\xE9\u39B4\u0100cu\u3A06\u3A0Br;\uC000\uD835\uDCCB\u0100bp\u3A10\u3A18n\u0100Ee\u3980\u3A16\xBB\u397En\u0100Ee\u3992\u3A1E\xBB\u3990igzag;\u699A\u0380cefoprs\u3A36\u3A3B\u3A56\u3A5B\u3A54\u3A61\u3A6Airc;\u4175\u0100di\u3A40\u3A51\u0100bg\u3A45\u3A49ar;\u6A5Fe\u0100;q\u15FA\u3A4F;\u6259erp;\u6118r;\uC000\uD835\uDD34pf;\uC000\uD835\uDD68\u0100;e\u1479\u3A66at\xE8\u1479cr;\uC000\uD835\uDCCC\u0AE3\u178E\u3A87\x00\u3A8B\x00\u3A90\u3A9B\x00\x00\u3A9D\u3AA8\u3AAB\u3AAF\x00\x00\u3AC3\u3ACE\x00\u3AD8\u17DC\u17DFtr\xE9\u17D1r;\uC000\uD835\uDD35\u0100Aa\u3A94\u3A97r\xF2\u03C3r\xF2\u09F6;\u43BE\u0100Aa\u3AA1\u3AA4r\xF2\u03B8r\xF2\u09EBa\xF0\u2713is;\u62FB\u0180dpt\u17A4\u3AB5\u3ABE\u0100fl\u3ABA\u17A9;\uC000\uD835\uDD69im\xE5\u17B2\u0100Aa\u3AC7\u3ACAr\xF2\u03CEr\xF2\u0A01\u0100cq\u3AD2\u17B8r;\uC000\uD835\uDCCD\u0100pt\u17D6\u3ADCr\xE9\u17D4\u0400acefiosu\u3AF0\u3AFD\u3B08\u3B0C\u3B11\u3B15\u3B1B\u3B21c\u0100uy\u3AF6\u3AFBte\u803B\xFD\u40FD;\u444F\u0100iy\u3B02\u3B06rc;\u4177;\u444Bn\u803B\xA5\u40A5r;\uC000\uD835\uDD36cy;\u4457pf;\uC000\uD835\uDD6Acr;\uC000\uD835\uDCCE\u0100cm\u3B26\u3B29y;\u444El\u803B\xFF\u40FF\u0500acdefhiosw\u3B42\u3B48\u3B54\u3B58\u3B64\u3B69\u3B6D\u3B74\u3B7A\u3B80cute;\u417A\u0100ay\u3B4D\u3B52ron;\u417E;\u4437ot;\u417C\u0100et\u3B5D\u3B61tr\xE6\u155Fa;\u43B6r;\uC000\uD835\uDD37cy;\u4436grarr;\u61DDpf;\uC000\uD835\uDD6Bcr;\uC000\uD835\uDCCF\u0100jn\u3B85\u3B87;\u600Dj;\u600C".split("").map(T => T.charCodeAt(0))), mf0 = new Uint16Array("\u0200aglq\t\x15\x18\x1B\u026D\x0F\x00\x00\x12p;\u4026os;\u4027t;\u403Et;\u403Cuot;\u4022".split("").map(T => T.charCodeAt(0))), uf0 = new Map([[0, 65533], [128, 8364], [130, 8218], [131, 402], [132, 8222], [133, 8230], [134, 8224], [135, 8225], [136, 710], [137, 8240], [138, 352], [139, 8249], [140, 338], [142, 381], [145, 8216], [146, 8217], [147, 8220], [148, 8221], [149, 8226], [150, 8211], [151, 8212], [152, 732], [153, 8482], [154, 353], [155, 8250], [156, 339], [158, 382], [159, 376]]), yf0 = (vF = String.fromCodePoint) !== null && vF !== void 0 ? vF : function (T) {
  let R = "";
  if (T > 65535) T -= 65536, R += String.fromCharCode(T >>> 10 & 1023 | 55296), T = 56320 | T & 1023;
  return R += String.fromCharCode(T), R;
};
(function (T) {
  T[T.NUM = 35] = "NUM", T[T.SEMI = 59] = "SEMI", T[T.EQUALS = 61] = "EQUALS", T[T.ZERO = 48] = "ZERO", T[T.NINE = 57] = "NINE", T[T.LOWER_A = 97] = "LOWER_A", T[T.LOWER_F = 102] = "LOWER_F", T[T.LOWER_X = 120] = "LOWER_X", T[T.LOWER_Z = 122] = "LOWER_Z", T[T.UPPER_A = 65] = "UPPER_A", T[T.UPPER_F = 70] = "UPPER_F", T[T.UPPER_Z = 90] = "UPPER_Z";
})(Pe || (Pe = {}));
(function (T) {
  T[T.VALUE_LENGTH = 49152] = "VALUE_LENGTH", T[T.BRANCH_LENGTH = 16256] = "BRANCH_LENGTH", T[T.JUMP_TABLE = 127] = "JUMP_TABLE";
})(tA || (tA = {}));
(function (T) {
  T[T.EntityStart = 0] = "EntityStart", T[T.NumericStart = 1] = "NumericStart", T[T.NumericDecimal = 2] = "NumericDecimal", T[T.NumericHex = 3] = "NumericHex", T[T.NamedEntity = 4] = "NamedEntity";
})(oe || (oe = {}));
(function (T) {
  T[T.Legacy = 0] = "Legacy", T[T.Strict = 1] = "Strict", T[T.Attribute = 2] = "Attribute";
})(Fo || (Fo = {}));
DQ0 = pYT(AYT), wQ0 = pYT(mf0);
(function (T) {
  T.HTML = "http://www.w3.org/1999/xhtml", T.MATHML = "http://www.w3.org/1998/Math/MathML", T.SVG = "http://www.w3.org/2000/svg", T.XLINK = "http://www.w3.org/1999/xlink", T.XML = "http://www.w3.org/XML/1998/namespace", T.XMLNS = "http://www.w3.org/2000/xmlns/";
})(VR || (VR = {}));
(function (T) {
  T.TYPE = "type", T.ACTION = "action", T.ENCODING = "encoding", T.PROMPT = "prompt", T.NAME = "name", T.COLOR = "color", T.FACE = "face", T.SIZE = "size";
})(gb || (gb = {}));
(function (T) {
  T.NO_QUIRKS = "no-quirks", T.QUIRKS = "quirks", T.LIMITED_QUIRKS = "limited-quirks";
})(oi || (oi = {}));
(function (T) {
  T.A = "a", T.ADDRESS = "address", T.ANNOTATION_XML = "annotation-xml", T.APPLET = "applet", T.AREA = "area", T.ARTICLE = "article", T.ASIDE = "aside", T.B = "b", T.BASE = "base", T.BASEFONT = "basefont", T.BGSOUND = "bgsound", T.BIG = "big", T.BLOCKQUOTE = "blockquote", T.BODY = "body", T.BR = "br", T.BUTTON = "button", T.CAPTION = "caption", T.CENTER = "center", T.CODE = "code", T.COL = "col", T.COLGROUP = "colgroup", T.DD = "dd", T.DESC = "desc", T.DETAILS = "details", T.DIALOG = "dialog", T.DIR = "dir", T.DIV = "div", T.DL = "dl", T.DT = "dt", T.EM = "em", T.EMBED = "embed", T.FIELDSET = "fieldset", T.FIGCAPTION = "figcaption", T.FIGURE = "figure", T.FONT = "font", T.FOOTER = "footer", T.FOREIGN_OBJECT = "foreignObject", T.FORM = "form", T.FRAME = "frame", T.FRAMESET = "frameset", T.H1 = "h1", T.H2 = "h2", T.H3 = "h3", T.H4 = "h4", T.H5 = "h5", T.H6 = "h6", T.HEAD = "head", T.HEADER = "header", T.HGROUP = "hgroup", T.HR = "hr", T.HTML = "html", T.I = "i", T.IMG = "img", T.IMAGE = "image", T.INPUT = "input", T.IFRAME = "iframe", T.KEYGEN = "keygen", T.LABEL = "label", T.LI = "li", T.LINK = "link", T.LISTING = "listing", T.MAIN = "main", T.MALIGNMARK = "malignmark", T.MARQUEE = "marquee", T.MATH = "math", T.MENU = "menu", T.META = "meta", T.MGLYPH = "mglyph", T.MI = "mi", T.MO = "mo", T.MN = "mn", T.MS = "ms", T.MTEXT = "mtext", T.NAV = "nav", T.NOBR = "nobr", T.NOFRAMES = "noframes", T.NOEMBED = "noembed", T.NOSCRIPT = "noscript", T.OBJECT = "object", T.OL = "ol", T.OPTGROUP = "optgroup", T.OPTION = "option", T.P = "p", T.PARAM = "param", T.PLAINTEXT = "plaintext", T.PRE = "pre", T.RB = "rb", T.RP = "rp", T.RT = "rt", T.RTC = "rtc", T.RUBY = "ruby", T.S = "s", T.SCRIPT = "script", T.SEARCH = "search", T.SECTION = "section", T.SELECT = "select", T.SOURCE = "source", T.SMALL = "small", T.SPAN = "span", T.STRIKE = "strike", T.STRONG = "strong", T.STYLE = "style", T.SUB = "sub", T.SUMMARY = "summary", T.SUP = "sup", T.TABLE = "table", T.TBODY = "tbody", T.TEMPLATE = "template", T.TEXTAREA = "textarea", T.TFOOT = "tfoot", T.TD = "td", T.TH = "th", T.THEAD = "thead", T.TITLE = "title", T.TR = "tr", T.TRACK = "track", T.TT = "tt", T.U = "u", T.UL = "ul", T.SVG = "svg", T.VAR = "var", T.WBR = "wbr", T.XMP = "xmp";
})(pR || (pR = {}));
(function (T) {
  T[T.UNKNOWN = 0] = "UNKNOWN", T[T.A = 1] = "A", T[T.ADDRESS = 2] = "ADDRESS", T[T.ANNOTATION_XML = 3] = "ANNOTATION_XML", T[T.APPLET = 4] = "APPLET", T[T.AREA = 5] = "AREA", T[T.ARTICLE = 6] = "ARTICLE", T[T.ASIDE = 7] = "ASIDE", T[T.B = 8] = "B", T[T.BASE = 9] = "BASE", T[T.BASEFONT = 10] = "BASEFONT", T[T.BGSOUND = 11] = "BGSOUND", T[T.BIG = 12] = "BIG", T[T.BLOCKQUOTE = 13] = "BLOCKQUOTE", T[T.BODY = 14] = "BODY", T[T.BR = 15] = "BR", T[T.BUTTON = 16] = "BUTTON", T[T.CAPTION = 17] = "CAPTION", T[T.CENTER = 18] = "CENTER", T[T.CODE = 19] = "CODE", T[T.COL = 20] = "COL", T[T.COLGROUP = 21] = "COLGROUP", T[T.DD = 22] = "DD", T[T.DESC = 23] = "DESC", T[T.DETAILS = 24] = "DETAILS", T[T.DIALOG = 25] = "DIALOG", T[T.DIR = 26] = "DIR", T[T.DIV = 27] = "DIV", T[T.DL = 28] = "DL", T[T.DT = 29] = "DT", T[T.EM = 30] = "EM", T[T.EMBED = 31] = "EMBED", T[T.FIELDSET = 32] = "FIELDSET", T[T.FIGCAPTION = 33] = "FIGCAPTION", T[T.FIGURE = 34] = "FIGURE", T[T.FONT = 35] = "FONT", T[T.FOOTER = 36] = "FOOTER", T[T.FOREIGN_OBJECT = 37] = "FOREIGN_OBJECT", T[T.FORM = 38] = "FORM", T[T.FRAME = 39] = "FRAME", T[T.FRAMESET = 40] = "FRAMESET", T[T.H1 = 41] = "H1", T[T.H2 = 42] = "H2", T[T.H3 = 43] = "H3", T[T.H4 = 44] = "H4", T[T.H5 = 45] = "H5", T[T.H6 = 46] = "H6", T[T.HEAD = 47] = "HEAD", T[T.HEADER = 48] = "HEADER", T[T.HGROUP = 49] = "HGROUP", T[T.HR = 50] = "HR", T[T.HTML = 51] = "HTML", T[T.I = 52] = "I", T[T.IMG = 53] = "IMG", T[T.IMAGE = 54] = "IMAGE", T[T.INPUT = 55] = "INPUT", T[T.IFRAME = 56] = "IFRAME", T[T.KEYGEN = 57] = "KEYGEN", T[T.LABEL = 58] = "LABEL", T[T.LI = 59] = "LI", T[T.LINK = 60] = "LINK", T[T.LISTING = 61] = "LISTING", T[T.MAIN = 62] = "MAIN", T[T.MALIGNMARK = 63] = "MALIGNMARK", T[T.MARQUEE = 64] = "MARQUEE", T[T.MATH = 65] = "MATH", T[T.MENU = 66] = "MENU", T[T.META = 67] = "META", T[T.MGLYPH = 68] = "MGLYPH", T[T.MI = 69] = "MI", T[T.MO = 70] = "MO", T[T.MN = 71] = "MN", T[T.MS = 72] = "MS", T[T.MTEXT = 73] = "MTEXT", T[T.NAV = 74] = "NAV", T[T.NOBR = 75] = "NOBR", T[T.NOFRAMES = 76] = "NOFRAMES", T[T.NOEMBED = 77] = "NOEMBED", T[T.NOSCRIPT = 78] = "NOSCRIPT", T[T.OBJECT = 79] = "OBJECT", T[T.OL = 80] = "OL", T[T.OPTGROUP = 81] = "OPTGROUP", T[T.OPTION = 82] = "OPTION", T[T.P = 83] = "P", T[T.PARAM = 84] = "PARAM", T[T.PLAINTEXT = 85] = "PLAINTEXT", T[T.PRE = 86] = "PRE", T[T.RB = 87] = "RB", T[T.RP = 88] = "RP", T[T.RT = 89] = "RT", T[T.RTC = 90] = "RTC", T[T.RUBY = 91] = "RUBY", T[T.S = 92] = "S", T[T.SCRIPT = 93] = "SCRIPT", T[T.SEARCH = 94] = "SEARCH", T[T.SECTION = 95] = "SECTION", T[T.SELECT = 96] = "SELECT", T[T.SOURCE = 97] = "SOURCE", T[T.SMALL = 98] = "SMALL", T[T.SPAN = 99] = "SPAN", T[T.STRIKE = 100] = "STRIKE", T[T.STRONG = 101] = "STRONG", T[T.STYLE = 102] = "STYLE", T[T.SUB = 103] = "SUB", T[T.SUMMARY = 104] = "SUMMARY", T[T.SUP = 105] = "SUP", T[T.TABLE = 106] = "TABLE", T[T.TBODY = 107] = "TBODY", T[T.TEMPLATE = 108] = "TEMPLATE", T[T.TEXTAREA = 109] = "TEXTAREA", T[T.TFOOT = 110] = "TFOOT", T[T.TD = 111] = "TD", T[T.TH = 112] = "TH", T[T.THEAD = 113] = "THEAD", T[T.TITLE = 114] = "TITLE", T[T.TR = 115] = "TR", T[T.TRACK = 116] = "TRACK", T[T.TT = 117] = "TT", T[T.U = 118] = "U", T[T.UL = 119] = "UL", T[T.SVG = 120] = "SVG", T[T.VAR = 121] = "VAR", T[T.WBR = 122] = "WBR", T[T.XMP = 123] = "XMP";
})(sT || (sT = {}));
$f0 = new Map([[pR.A, sT.A], [pR.ADDRESS, sT.ADDRESS], [pR.ANNOTATION_XML, sT.ANNOTATION_XML], [pR.APPLET, sT.APPLET], [pR.AREA, sT.AREA], [pR.ARTICLE, sT.ARTICLE], [pR.ASIDE, sT.ASIDE], [pR.B, sT.B], [pR.BASE, sT.BASE], [pR.BASEFONT, sT.BASEFONT], [pR.BGSOUND, sT.BGSOUND], [pR.BIG, sT.BIG], [pR.BLOCKQUOTE, sT.BLOCKQUOTE], [pR.BODY, sT.BODY], [pR.BR, sT.BR], [pR.BUTTON, sT.BUTTON], [pR.CAPTION, sT.CAPTION], [pR.CENTER, sT.CENTER], [pR.CODE, sT.CODE], [pR.COL, sT.COL], [pR.COLGROUP, sT.COLGROUP], [pR.DD, sT.DD], [pR.DESC, sT.DESC], [pR.DETAILS, sT.DETAILS], [pR.DIALOG, sT.DIALOG], [pR.DIR, sT.DIR], [pR.DIV, sT.DIV], [pR.DL, sT.DL], [pR.DT, sT.DT], [pR.EM, sT.EM], [pR.EMBED, sT.EMBED], [pR.FIELDSET, sT.FIELDSET], [pR.FIGCAPTION, sT.FIGCAPTION], [pR.FIGURE, sT.FIGURE], [pR.FONT, sT.FONT], [pR.FOOTER, sT.FOOTER], [pR.FOREIGN_OBJECT, sT.FOREIGN_OBJECT], [pR.FORM, sT.FORM], [pR.FRAME, sT.FRAME], [pR.FRAMESET, sT.FRAMESET], [pR.H1, sT.H1], [pR.H2, sT.H2], [pR.H3, sT.H3], [pR.H4, sT.H4], [pR.H5, sT.H5], [pR.H6, sT.H6], [pR.HEAD, sT.HEAD], [pR.HEADER, sT.HEADER], [pR.HGROUP, sT.HGROUP], [pR.HR, sT.HR], [pR.HTML, sT.HTML], [pR.I, sT.I], [pR.IMG, sT.IMG], [pR.IMAGE, sT.IMAGE], [pR.INPUT, sT.INPUT], [pR.IFRAME, sT.IFRAME], [pR.KEYGEN, sT.KEYGEN], [pR.LABEL, sT.LABEL], [pR.LI, sT.LI], [pR.LINK, sT.LINK], [pR.LISTING, sT.LISTING], [pR.MAIN, sT.MAIN], [pR.MALIGNMARK, sT.MALIGNMARK], [pR.MARQUEE, sT.MARQUEE], [pR.MATH, sT.MATH], [pR.MENU, sT.MENU], [pR.META, sT.META], [pR.MGLYPH, sT.MGLYPH], [pR.MI, sT.MI], [pR.MO, sT.MO], [pR.MN, sT.MN], [pR.MS, sT.MS], [pR.MTEXT, sT.MTEXT], [pR.NAV, sT.NAV], [pR.NOBR, sT.NOBR], [pR.NOFRAMES, sT.NOFRAMES], [pR.NOEMBED, sT.NOEMBED], [pR.NOSCRIPT, sT.NOSCRIPT], [pR.OBJECT, sT.OBJECT], [pR.OL, sT.OL], [pR.OPTGROUP, sT.OPTGROUP], [pR.OPTION, sT.OPTION], [pR.P, sT.P], [pR.PARAM, sT.PARAM], [pR.PLAINTEXT, sT.PLAINTEXT], [pR.PRE, sT.PRE], [pR.RB, sT.RB], [pR.RP, sT.RP], [pR.RT, sT.RT], [pR.RTC, sT.RTC], [pR.RUBY, sT.RUBY], [pR.S, sT.S], [pR.SCRIPT, sT.SCRIPT], [pR.SEARCH, sT.SEARCH], [pR.SECTION, sT.SECTION], [pR.SELECT, sT.SELECT], [pR.SOURCE, sT.SOURCE], [pR.SMALL, sT.SMALL], [pR.SPAN, sT.SPAN], [pR.STRIKE, sT.STRIKE], [pR.STRONG, sT.STRONG], [pR.STYLE, sT.STYLE], [pR.SUB, sT.SUB], [pR.SUMMARY, sT.SUMMARY], [pR.SUP, sT.SUP], [pR.TABLE, sT.TABLE], [pR.TBODY, sT.TBODY], [pR.TEMPLATE, sT.TEMPLATE], [pR.TEXTAREA, sT.TEXTAREA], [pR.TFOOT, sT.TFOOT], [pR.TD, sT.TD], [pR.TH, sT.TH], [pR.THEAD, sT.THEAD], [pR.TITLE, sT.TITLE], [pR.TR, sT.TR], [pR.TRACK, sT.TRACK], [pR.TT, sT.TT], [pR.U, sT.U], [pR.UL, sT.UL], [pR.SVG, sT.SVG], [pR.VAR, sT.VAR], [pR.WBR, sT.WBR], [pR.XMP, sT.XMP]]);
QR = sT, vf0 = {
  [VR.HTML]: new Set([QR.ADDRESS, QR.APPLET, QR.AREA, QR.ARTICLE, QR.ASIDE, QR.BASE, QR.BASEFONT, QR.BGSOUND, QR.BLOCKQUOTE, QR.BODY, QR.BR, QR.BUTTON, QR.CAPTION, QR.CENTER, QR.COL, QR.COLGROUP, QR.DD, QR.DETAILS, QR.DIR, QR.DIV, QR.DL, QR.DT, QR.EMBED, QR.FIELDSET, QR.FIGCAPTION, QR.FIGURE, QR.FOOTER, QR.FORM, QR.FRAME, QR.FRAMESET, QR.H1, QR.H2, QR.H3, QR.H4, QR.H5, QR.H6, QR.HEAD, QR.HEADER, QR.HGROUP, QR.HR, QR.HTML, QR.IFRAME, QR.IMG, QR.INPUT, QR.LI, QR.LINK, QR.LISTING, QR.MAIN, QR.MARQUEE, QR.MENU, QR.META, QR.NAV, QR.NOEMBED, QR.NOFRAMES, QR.NOSCRIPT, QR.OBJECT, QR.OL, QR.P, QR.PARAM, QR.PLAINTEXT, QR.PRE, QR.SCRIPT, QR.SECTION, QR.SELECT, QR.SOURCE, QR.STYLE, QR.SUMMARY, QR.TABLE, QR.TBODY, QR.TD, QR.TEMPLATE, QR.TEXTAREA, QR.TFOOT, QR.TH, QR.THEAD, QR.TITLE, QR.TR, QR.TRACK, QR.UL, QR.WBR, QR.XMP]),
  [VR.MATHML]: new Set([QR.MI, QR.MO, QR.MN, QR.MS, QR.MTEXT, QR.ANNOTATION_XML]),
  [VR.SVG]: new Set([QR.TITLE, QR.FOREIGN_OBJECT, QR.DESC]),
  [VR.XLINK]: new Set(),
  [VR.XML]: new Set(),
  [VR.XMLNS]: new Set()
}, qY = new Set([QR.H1, QR.H2, QR.H3, QR.H4, QR.H5, QR.H6]), BQ0 = new Set([pR.STYLE, pR.SCRIPT, pR.XMP, pR.IFRAME, pR.NOEMBED, pR.NOFRAMES, pR.PLAINTEXT]);
(function (T) {
  T[T.DATA = 0] = "DATA", T[T.RCDATA = 1] = "RCDATA", T[T.RAWTEXT = 2] = "RAWTEXT", T[T.SCRIPT_DATA = 3] = "SCRIPT_DATA", T[T.PLAINTEXT = 4] = "PLAINTEXT", T[T.TAG_OPEN = 5] = "TAG_OPEN", T[T.END_TAG_OPEN = 6] = "END_TAG_OPEN", T[T.TAG_NAME = 7] = "TAG_NAME", T[T.RCDATA_LESS_THAN_SIGN = 8] = "RCDATA_LESS_THAN_SIGN", T[T.RCDATA_END_TAG_OPEN = 9] = "RCDATA_END_TAG_OPEN", T[T.RCDATA_END_TAG_NAME = 10] = "RCDATA_END_TAG_NAME", T[T.RAWTEXT_LESS_THAN_SIGN = 11] = "RAWTEXT_LESS_THAN_SIGN", T[T.RAWTEXT_END_TAG_OPEN = 12] = "RAWTEXT_END_TAG_OPEN", T[T.RAWTEXT_END_TAG_NAME = 13] = "RAWTEXT_END_TAG_NAME", T[T.SCRIPT_DATA_LESS_THAN_SIGN = 14] = "SCRIPT_DATA_LESS_THAN_SIGN", T[T.SCRIPT_DATA_END_TAG_OPEN = 15] = "SCRIPT_DATA_END_TAG_OPEN", T[T.SCRIPT_DATA_END_TAG_NAME = 16] = "SCRIPT_DATA_END_TAG_NAME", T[T.SCRIPT_DATA_ESCAPE_START = 17] = "SCRIPT_DATA_ESCAPE_START", T[T.SCRIPT_DATA_ESCAPE_START_DASH = 18] = "SCRIPT_DATA_ESCAPE_START_DASH", T[T.SCRIPT_DATA_ESCAPED = 19] = "SCRIPT_DATA_ESCAPED", T[T.SCRIPT_DATA_ESCAPED_DASH = 20] = "SCRIPT_DATA_ESCAPED_DASH", T[T.SCRIPT_DATA_ESCAPED_DASH_DASH = 21] = "SCRIPT_DATA_ESCAPED_DASH_DASH", T[T.SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 22] = "SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN", T[T.SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 23] = "SCRIPT_DATA_ESCAPED_END_TAG_OPEN", T[T.SCRIPT_DATA_ESCAPED_END_TAG_NAME = 24] = "SCRIPT_DATA_ESCAPED_END_TAG_NAME", T[T.SCRIPT_DATA_DOUBLE_ESCAPE_START = 25] = "SCRIPT_DATA_DOUBLE_ESCAPE_START", T[T.SCRIPT_DATA_DOUBLE_ESCAPED = 26] = "SCRIPT_DATA_DOUBLE_ESCAPED", T[T.SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 27] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH", T[T.SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 28] = "SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH", T[T.SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 29] = "SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN", T[T.SCRIPT_DATA_DOUBLE_ESCAPE_END = 30] = "SCRIPT_DATA_DOUBLE_ESCAPE_END", T[T.BEFORE_ATTRIBUTE_NAME = 31] = "BEFORE_ATTRIBUTE_NAME", T[T.ATTRIBUTE_NAME = 32] = "ATTRIBUTE_NAME", T[T.AFTER_ATTRIBUTE_NAME = 33] = "AFTER_ATTRIBUTE_NAME", T[T.BEFORE_ATTRIBUTE_VALUE = 34] = "BEFORE_ATTRIBUTE_VALUE", T[T.ATTRIBUTE_VALUE_DOUBLE_QUOTED = 35] = "ATTRIBUTE_VALUE_DOUBLE_QUOTED", T[T.ATTRIBUTE_VALUE_SINGLE_QUOTED = 36] = "ATTRIBUTE_VALUE_SINGLE_QUOTED", T[T.ATTRIBUTE_VALUE_UNQUOTED = 37] = "ATTRIBUTE_VALUE_UNQUOTED", T[T.AFTER_ATTRIBUTE_VALUE_QUOTED = 38] = "AFTER_ATTRIBUTE_VALUE_QUOTED", T[T.SELF_CLOSING_START_TAG = 39] = "SELF_CLOSING_START_TAG", T[T.BOGUS_COMMENT = 40] = "BOGUS_COMMENT", T[T.MARKUP_DECLARATION_OPEN = 41] = "MARKUP_DECLARATION_OPEN", T[T.COMMENT_START = 42] = "COMMENT_START", T[T.COMMENT_START_DASH = 43] = "COMMENT_START_DASH", T[T.COMMENT = 44] = "COMMENT", T[T.COMMENT_LESS_THAN_SIGN = 45] = "COMMENT_LESS_THAN_SIGN", T[T.COMMENT_LESS_THAN_SIGN_BANG = 46] = "COMMENT_LESS_THAN_SIGN_BANG", T[T.COMMENT_LESS_THAN_SIGN_BANG_DASH = 47] = "COMMENT_LESS_THAN_SIGN_BANG_DASH", T[T.COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH = 48] = "COMMENT_LESS_THAN_SIGN_BANG_DASH_DASH", T[T.COMMENT_END_DASH = 49] = "COMMENT_END_DASH", T[T.COMMENT_END = 50] = "COMMENT_END", T[T.COMMENT_END_BANG = 51] = "COMMENT_END_BANG", T[T.DOCTYPE = 52] = "DOCTYPE", T[T.BEFORE_DOCTYPE_NAME = 53] = "BEFORE_DOCTYPE_NAME", T[T.DOCTYPE_NAME = 54] = "DOCTYPE_NAME", T[T.AFTER_DOCTYPE_NAME = 55] = "AFTER_DOCTYPE_NAME", T[T.AFTER_DOCTYPE_PUBLIC_KEYWORD = 56] = "AFTER_DOCTYPE_PUBLIC_KEYWORD", T[T.BEFORE_DOCTYPE_PUBLIC_IDENTIFIER = 57] = "BEFORE_DOCTYPE_PUBLIC_IDENTIFIER", T[T.DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED = 58] = "DOCTYPE_PUBLIC_IDENTIFIER_DOUBLE_QUOTED", T[T.DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED = 59] = "DOCTYPE_PUBLIC_IDENTIFIER_SINGLE_QUOTED", T[T.AFTER_DOCTYPE_PUBLIC_IDENTIFIER = 60] = "AFTER_DOCTYPE_PUBLIC_IDENTIFIER", T[T.BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS = 61] = "BETWEEN_DOCTYPE_PUBLIC_AND_SYSTEM_IDENTIFIERS", T[T.AFTER_DOCTYPE_SYSTEM_KEYWORD = 62] = "AFTER_DOCTYPE_SYSTEM_KEYWORD", T[T.BEFORE_DOCTYPE_SYSTEM_IDENTIFIER = 63] = "BEFORE_DOCTYPE_SYSTEM_IDENTIFIER", T[T.DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED = 64] = "DOCTYPE_SYSTEM_IDENTIFIER_DOUBLE_QUOTED", T[T.DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED = 65] = "DOCTYPE_SYSTEM_IDENTIFIER_SINGLE_QUOTED", T[T.AFTER_DOCTYPE_SYSTEM_IDENTIFIER = 66] = "AFTER_DOCTYPE_SYSTEM_IDENTIFIER", T[T.BOGUS_DOCTYPE = 67] = "BOGUS_DOCTYPE", T[T.CDATA_SECTION = 68] = "CDATA_SECTION", T[T.CDATA_SECTION_BRACKET = 69] = "CDATA_SECTION_BRACKET", T[T.CDATA_SECTION_END = 70] = "CDATA_SECTION_END", T[T.CHARACTER_REFERENCE = 71] = "CHARACTER_REFERENCE", T[T.AMBIGUOUS_AMPERSAND = 72] = "AMBIGUOUS_AMPERSAND";
})(zT || (zT = {}));
gr = {
  DATA: zT.DATA,
  RCDATA: zT.RCDATA,
  RAWTEXT: zT.RAWTEXT,
  SCRIPT_DATA: zT.SCRIPT_DATA,
  PLAINTEXT: zT.PLAINTEXT,
  CDATA_SECTION: zT.CDATA_SECTION
};
mYT = new Set([sT.DD, sT.DT, sT.LI, sT.OPTGROUP, sT.OPTION, sT.P, sT.RB, sT.RP, sT.RT, sT.RTC]), PfT = new Set([...mYT, sT.CAPTION, sT.COLGROUP, sT.TBODY, sT.TD, sT.TFOOT, sT.TH, sT.THEAD, sT.TR]), Yw = new Set([sT.APPLET, sT.CAPTION, sT.HTML, sT.MARQUEE, sT.OBJECT, sT.TABLE, sT.TD, sT.TEMPLATE, sT.TH]), df0 = new Set([...Yw, sT.OL, sT.UL]), Ef0 = new Set([...Yw, sT.BUTTON]), kfT = new Set([sT.ANNOTATION_XML, sT.MI, sT.MN, sT.MO, sT.MS, sT.MTEXT]), xfT = new Set([sT.DESC, sT.FOREIGN_OBJECT, sT.TITLE]), Cf0 = new Set([sT.TR, sT.TEMPLATE, sT.HTML]), Lf0 = new Set([sT.TBODY, sT.TFOOT, sT.THEAD, sT.TEMPLATE, sT.HTML]), Mf0 = new Set([sT.TABLE, sT.TEMPLATE, sT.HTML]), Df0 = new Set([sT.TD, sT.TH]);
(function (T) {
  T[T.Marker = 0] = "Marker", T[T.Element = 1] = "Element";
})(us || (us = {}));
ffT = {
  type: us.Marker
};
kl = {
  createDocument() {
    return {
      nodeName: "#document",
      mode: oi.NO_QUIRKS,
      childNodes: []
    };
  },
  createDocumentFragment() {
    return {
      nodeName: "#document-fragment",
      childNodes: []
    };
  },
  createElement(T, R, a) {
    return {
      nodeName: T,
      tagName: T,
      attrs: a,
      namespaceURI: R,
      childNodes: [],
      parentNode: null
    };
  },
  createCommentNode(T) {
    return {
      nodeName: "#comment",
      data: T,
      parentNode: null
    };
  },
  createTextNode(T) {
    return {
      nodeName: "#text",
      value: T,
      parentNode: null
    };
  },
  appendChild(T, R) {
    T.childNodes.push(R), R.parentNode = T;
  },
  insertBefore(T, R, a) {
    let e = T.childNodes.indexOf(a);
    T.childNodes.splice(e, 0, R), R.parentNode = T;
  },
  setTemplateContent(T, R) {
    T.content = R;
  },
  getTemplateContent(T) {
    return T.content;
  },
  setDocumentType(T, R, a, e) {
    let t = T.childNodes.find(r => r.nodeName === "#documentType");
    if (t) t.name = R, t.publicId = a, t.systemId = e;else {
      let r = {
        nodeName: "#documentType",
        name: R,
        publicId: a,
        systemId: e,
        parentNode: null
      };
      kl.appendChild(T, r);
    }
  },
  setDocumentMode(T, R) {
    T.mode = R;
  },
  getDocumentMode(T) {
    return T.mode;
  },
  detachNode(T) {
    if (T.parentNode) {
      let R = T.parentNode.childNodes.indexOf(T);
      T.parentNode.childNodes.splice(R, 1), T.parentNode = null;
    }
  },
  insertText(T, R) {
    if (T.childNodes.length > 0) {
      let a = T.childNodes[T.childNodes.length - 1];
      if (kl.isTextNode(a)) {
        a.value += R;
        return;
      }
    }
    kl.appendChild(T, kl.createTextNode(R));
  },
  insertTextBefore(T, R, a) {
    let e = T.childNodes[T.childNodes.indexOf(a) - 1];
    if (e && kl.isTextNode(e)) e.value += R;else kl.insertBefore(T, kl.createTextNode(R), a);
  },
  adoptAttributes(T, R) {
    let a = new Set(T.attrs.map(e => e.name));
    for (let e = 0; e < R.length; e++) if (!a.has(R[e].name)) T.attrs.push(R[e]);
  },
  getFirstChild(T) {
    return T.childNodes[0];
  },
  getChildNodes(T) {
    return T.childNodes;
  },
  getParentNode(T) {
    return T.parentNode;
  },
  getAttrList(T) {
    return T.attrs;
  },
  getTagName(T) {
    return T.tagName;
  },
  getNamespaceURI(T) {
    return T.namespaceURI;
  },
  getTextNodeContent(T) {
    return T.value;
  },
  getCommentNodeContent(T) {
    return T.data;
  },
  getDocumentTypeNodeName(T) {
    return T.name;
  },
  getDocumentTypeNodePublicId(T) {
    return T.publicId;
  },
  getDocumentTypeNodeSystemId(T) {
    return T.systemId;
  },
  isTextNode(T) {
    return T.nodeName === "#text";
  },
  isCommentNode(T) {
    return T.nodeName === "#comment";
  },
  isDocumentTypeNode(T) {
    return T.nodeName === "#documentType";
  },
  isElementNode(T) {
    return Object.prototype.hasOwnProperty.call(T, "tagName");
  },
  setNodeSourceCodeLocation(T, R) {
    T.sourceCodeLocation = R;
  },
  getNodeSourceCodeLocation(T) {
    return T.sourceCodeLocation;
  },
  updateNodeSourceCodeLocation(T, R) {
    T.sourceCodeLocation = {
      ...T.sourceCodeLocation,
      ...R
    };
  }
}, kYT = ["+//silmaril//dtd html pro v0r11 19970101//", "-//as//dtd html 3.0 aswedit + extensions//", "-//advasoft ltd//dtd html 3.0 aswedit + extensions//", "-//ietf//dtd html 2.0 level 1//", "-//ietf//dtd html 2.0 level 2//", "-//ietf//dtd html 2.0 strict level 1//", "-//ietf//dtd html 2.0 strict level 2//", "-//ietf//dtd html 2.0 strict//", "-//ietf//dtd html 2.0//", "-//ietf//dtd html 2.1e//", "-//ietf//dtd html 3.0//", "-//ietf//dtd html 3.2 final//", "-//ietf//dtd html 3.2//", "-//ietf//dtd html 3//", "-//ietf//dtd html level 0//", "-//ietf//dtd html level 1//", "-//ietf//dtd html level 2//", "-//ietf//dtd html level 3//", "-//ietf//dtd html strict level 0//", "-//ietf//dtd html strict level 1//", "-//ietf//dtd html strict level 2//", "-//ietf//dtd html strict level 3//", "-//ietf//dtd html strict//", "-//ietf//dtd html//", "-//metrius//dtd metrius presentational//", "-//microsoft//dtd internet explorer 2.0 html strict//", "-//microsoft//dtd internet explorer 2.0 html//", "-//microsoft//dtd internet explorer 2.0 tables//", "-//microsoft//dtd internet explorer 3.0 html strict//", "-//microsoft//dtd internet explorer 3.0 html//", "-//microsoft//dtd internet explorer 3.0 tables//", "-//netscape comm. corp.//dtd html//", "-//netscape comm. corp.//dtd strict html//", "-//o'reilly and associates//dtd html 2.0//", "-//o'reilly and associates//dtd html extended 1.0//", "-//o'reilly and associates//dtd html extended relaxed 1.0//", "-//sq//dtd html 2.0 hotmetal + extensions//", "-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//", "-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//", "-//spyglass//dtd html 2.0 extended//", "-//sun microsystems corp.//dtd hotjava html//", "-//sun microsystems corp.//dtd hotjava strict html//", "-//w3c//dtd html 3 1995-03-24//", "-//w3c//dtd html 3.2 draft//", "-//w3c//dtd html 3.2 final//", "-//w3c//dtd html 3.2//", "-//w3c//dtd html 3.2s draft//", "-//w3c//dtd html 4.0 frameset//", "-//w3c//dtd html 4.0 transitional//", "-//w3c//dtd html experimental 19960712//", "-//w3c//dtd html experimental 970421//", "-//w3c//dtd w3 html//", "-//w3o//dtd w3 html 3.0//", "-//webtechs//dtd mozilla html 2.0//", "-//webtechs//dtd mozilla html//"], Nf0 = [...kYT, "-//w3c//dtd html 4.01 frameset//", "-//w3c//dtd html 4.01 transitional//"], Uf0 = new Set(["-//w3o//dtd w3 html strict 3.0//en//", "-/w3c/dtd html 4.0 transitional/en", "html"]), xYT = ["-//w3c//dtd xhtml 1.0 frameset//", "-//w3c//dtd xhtml 1.0 transitional//"], Hf0 = [...xYT, "-//w3c//dtd html 4.01 frameset//", "-//w3c//dtd html 4.01 transitional//"];
gfT = {
  TEXT_HTML: "text/html",
  APPLICATION_XML: "application/xhtml+xml"
}, Gf0 = new Map(["attributeName", "attributeType", "baseFrequency", "baseProfile", "calcMode", "clipPathUnits", "diffuseConstant", "edgeMode", "filterUnits", "glyphRef", "gradientTransform", "gradientUnits", "kernelMatrix", "kernelUnitLength", "keyPoints", "keySplines", "keyTimes", "lengthAdjust", "limitingConeAngle", "markerHeight", "markerUnits", "markerWidth", "maskContentUnits", "maskUnits", "numOctaves", "pathLength", "patternContentUnits", "patternTransform", "patternUnits", "pointsAtX", "pointsAtY", "pointsAtZ", "preserveAlpha", "preserveAspectRatio", "primitiveUnits", "refX", "refY", "repeatCount", "repeatDur", "requiredExtensions", "requiredFeatures", "specularConstant", "specularExponent", "spreadMethod", "startOffset", "stdDeviation", "stitchTiles", "surfaceScale", "systemLanguage", "tableValues", "targetX", "targetY", "textLength", "viewBox", "viewTarget", "xChannelSelector", "yChannelSelector", "zoomAndPan"].map(T => [T.toLowerCase(), T])), Kf0 = new Map([["xlink:actuate", {
  prefix: "xlink",
  name: "actuate",
  namespace: VR.XLINK
}], ["xlink:arcrole", {
  prefix: "xlink",
  name: "arcrole",
  namespace: VR.XLINK
}], ["xlink:href", {
  prefix: "xlink",
  name: "href",
  namespace: VR.XLINK
}], ["xlink:role", {
  prefix: "xlink",
  name: "role",
  namespace: VR.XLINK
}], ["xlink:show", {
  prefix: "xlink",
  name: "show",
  namespace: VR.XLINK
}], ["xlink:title", {
  prefix: "xlink",
  name: "title",
  namespace: VR.XLINK
}], ["xlink:type", {
  prefix: "xlink",
  name: "type",
  namespace: VR.XLINK
}], ["xml:lang", {
  prefix: "xml",
  name: "lang",
  namespace: VR.XML
}], ["xml:space", {
  prefix: "xml",
  name: "space",
  namespace: VR.XML
}], ["xmlns", {
  prefix: "",
  name: "xmlns",
  namespace: VR.XMLNS
}], ["xmlns:xlink", {
  prefix: "xmlns",
  name: "xlink",
  namespace: VR.XMLNS
}]]), Vf0 = new Map(["altGlyph", "altGlyphDef", "altGlyphItem", "animateColor", "animateMotion", "animateTransform", "clipPath", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence", "foreignObject", "glyphRef", "linearGradient", "radialGradient", "textPath"].map(T => [T.toLowerCase(), T])), Xf0 = new Set([sT.B, sT.BIG, sT.BLOCKQUOTE, sT.BODY, sT.BR, sT.CENTER, sT.CODE, sT.DD, sT.DIV, sT.DL, sT.DT, sT.EM, sT.EMBED, sT.H1, sT.H2, sT.H3, sT.H4, sT.H5, sT.H6, sT.HEAD, sT.HR, sT.I, sT.IMG, sT.LI, sT.LISTING, sT.MENU, sT.META, sT.NOBR, sT.OL, sT.P, sT.PRE, sT.RUBY, sT.S, sT.SMALL, sT.SPAN, sT.STRONG, sT.STRIKE, sT.SUB, sT.SUP, sT.TABLE, sT.TT, sT.U, sT.UL, sT.VAR]);
(function (T) {
  T[T.INITIAL = 0] = "INITIAL", T[T.BEFORE_HTML = 1] = "BEFORE_HTML", T[T.BEFORE_HEAD = 2] = "BEFORE_HEAD", T[T.IN_HEAD = 3] = "IN_HEAD", T[T.IN_HEAD_NO_SCRIPT = 4] = "IN_HEAD_NO_SCRIPT", T[T.AFTER_HEAD = 5] = "AFTER_HEAD", T[T.IN_BODY = 6] = "IN_BODY", T[T.TEXT = 7] = "TEXT", T[T.IN_TABLE = 8] = "IN_TABLE", T[T.IN_TABLE_TEXT = 9] = "IN_TABLE_TEXT", T[T.IN_CAPTION = 10] = "IN_CAPTION", T[T.IN_COLUMN_GROUP = 11] = "IN_COLUMN_GROUP", T[T.IN_TABLE_BODY = 12] = "IN_TABLE_BODY", T[T.IN_ROW = 13] = "IN_ROW", T[T.IN_CELL = 14] = "IN_CELL", T[T.IN_SELECT = 15] = "IN_SELECT", T[T.IN_SELECT_IN_TABLE = 16] = "IN_SELECT_IN_TABLE", T[T.IN_TEMPLATE = 17] = "IN_TEMPLATE", T[T.AFTER_BODY = 18] = "AFTER_BODY", T[T.IN_FRAMESET = 19] = "IN_FRAMESET", T[T.AFTER_FRAMESET = 20] = "AFTER_FRAMESET", T[T.AFTER_AFTER_BODY = 21] = "AFTER_AFTER_BODY", T[T.AFTER_AFTER_FRAMESET = 22] = "AFTER_AFTER_FRAMESET";
})(YT || (YT = {}));
tI0 = {
  startLine: -1,
  startCol: -1,
  startOffset: -1,
  endLine: -1,
  endCol: -1,
  endOffset: -1
}, gYT = new Set([sT.TABLE, sT.TBODY, sT.TFOOT, sT.THEAD, sT.TR]), $fT = {
  scriptingEnabled: !0,
  sourceCodeLocationInfo: !1,
  treeAdapter: kl,
  onParseError: null
};
Wg0 = {
  abandonedHeadElementChild: {
    reason: "Unexpected metadata element after head",
    description: "Unexpected element after head. Expected the element before `</head>`",
    url: !1
  },
  abruptClosingOfEmptyComment: {
    reason: "Unexpected abruptly closed empty comment",
    description: "Unexpected `>` or `->`. Expected `-->` to close comments"
  },
  abruptDoctypePublicIdentifier: {
    reason: "Unexpected abruptly closed public identifier",
    description: "Unexpected `>`. Expected a closing `\"` or `'` after the public identifier"
  },
  abruptDoctypeSystemIdentifier: {
    reason: "Unexpected abruptly closed system identifier",
    description: "Unexpected `>`. Expected a closing `\"` or `'` after the identifier identifier"
  },
  absenceOfDigitsInNumericCharacterReference: {
    reason: "Unexpected non-digit at start of numeric character reference",
    description: "Unexpected `%c`. Expected `[0-9]` for decimal references or `[0-9a-fA-F]` for hexadecimal references"
  },
  cdataInHtmlContent: {
    reason: "Unexpected CDATA section in HTML",
    description: "Unexpected `<![CDATA[` in HTML. Remove it, use a comment, or encode special characters instead"
  },
  characterReferenceOutsideUnicodeRange: {
    reason: "Unexpected too big numeric character reference",
    description: "Unexpectedly high character reference. Expected character references to be at most hexadecimal 10ffff (or decimal 1114111)"
  },
  closingOfElementWithOpenChildElements: {
    reason: "Unexpected closing tag with open child elements",
    description: "Unexpectedly closing tag. Expected other tags to be closed first",
    url: !1
  },
  controlCharacterInInputStream: {
    reason: "Unexpected control character",
    description: "Unexpected control character `%x`. Expected a non-control code point, 0x00, or ASCII whitespace"
  },
  controlCharacterReference: {
    reason: "Unexpected control character reference",
    description: "Unexpectedly control character in reference. Expected a non-control code point, 0x00, or ASCII whitespace"
  },
  disallowedContentInNoscriptInHead: {
    reason: "Disallowed content inside `<noscript>` in `<head>`",
    description: "Unexpected text character `%c`. Only use text in `<noscript>`s in `<body>`",
    url: !1
  },
  duplicateAttribute: {
    reason: "Unexpected duplicate attribute",
    description: "Unexpectedly double attribute. Expected attributes to occur only once"
  },
  endTagWithAttributes: {
    reason: "Unexpected attribute on closing tag",
    description: "Unexpected attribute. Expected `>` instead"
  },
  endTagWithTrailingSolidus: {
    reason: "Unexpected slash at end of closing tag",
    description: "Unexpected `%c-1`. Expected `>` instead"
  },
  endTagWithoutMatchingOpenElement: {
    reason: "Unexpected unopened end tag",
    description: "Unexpected end tag. Expected no end tag or another end tag",
    url: !1
  },
  eofBeforeTagName: {
    reason: "Unexpected end of file",
    description: "Unexpected end of file. Expected tag name instead"
  },
  eofInCdata: {
    reason: "Unexpected end of file in CDATA",
    description: "Unexpected end of file. Expected `]]>` to close the CDATA"
  },
  eofInComment: {
    reason: "Unexpected end of file in comment",
    description: "Unexpected end of file. Expected `-->` to close the comment"
  },
  eofInDoctype: {
    reason: "Unexpected end of file in doctype",
    description: "Unexpected end of file. Expected a valid doctype (such as `<!doctype html>`)"
  },
  eofInElementThatCanContainOnlyText: {
    reason: "Unexpected end of file in element that can only contain text",
    description: "Unexpected end of file. Expected text or a closing tag",
    url: !1
  },
  eofInScriptHtmlCommentLikeText: {
    reason: "Unexpected end of file in comment inside script",
    description: "Unexpected end of file. Expected `-->` to close the comment"
  },
  eofInTag: {
    reason: "Unexpected end of file in tag",
    description: "Unexpected end of file. Expected `>` to close the tag"
  },
  incorrectlyClosedComment: {
    reason: "Incorrectly closed comment",
    description: "Unexpected `%c-1`. Expected `-->` to close the comment"
  },
  incorrectlyOpenedComment: {
    reason: "Incorrectly opened comment",
    description: "Unexpected `%c`. Expected `<!--` to open the comment"
  },
  invalidCharacterSequenceAfterDoctypeName: {
    reason: "Invalid sequence after doctype name",
    description: "Unexpected sequence at `%c`. Expected `public` or `system`"
  },
  invalidFirstCharacterOfTagName: {
    reason: "Invalid first character in tag name",
    description: "Unexpected `%c`. Expected an ASCII letter instead"
  },
  misplacedDoctype: {
    reason: "Misplaced doctype",
    description: "Unexpected doctype. Expected doctype before head",
    url: !1
  },
  misplacedStartTagForHeadElement: {
    reason: "Misplaced `<head>` start tag",
    description: "Unexpected start tag `<head>`. Expected `<head>` directly after doctype",
    url: !1
  },
  missingAttributeValue: {
    reason: "Missing attribute value",
    description: "Unexpected `%c-1`. Expected an attribute value or no `%c-1` instead"
  },
  missingDoctype: {
    reason: "Missing doctype before other content",
    description: "Expected a `<!doctype html>` before anything else",
    url: !1
  },
  missingDoctypeName: {
    reason: "Missing doctype name",
    description: "Unexpected doctype end at `%c`. Expected `html` instead"
  },
  missingDoctypePublicIdentifier: {
    reason: "Missing public identifier in doctype",
    description: "Unexpected `%c`. Expected identifier for `public` instead"
  },
  missingDoctypeSystemIdentifier: {
    reason: "Missing system identifier in doctype",
    description: 'Unexpected `%c`. Expected identifier for `system` instead (suggested: `"about:legacy-compat"`)'
  },
  missingEndTagName: {
    reason: "Missing name in end tag",
    description: "Unexpected `%c`. Expected an ASCII letter instead"
  },
  missingQuoteBeforeDoctypePublicIdentifier: {
    reason: "Missing quote before public identifier in doctype",
    description: "Unexpected `%c`. Expected `\"` or `'` instead"
  },
  missingQuoteBeforeDoctypeSystemIdentifier: {
    reason: "Missing quote before system identifier in doctype",
    description: "Unexpected `%c`. Expected `\"` or `'` instead"
  },
  missingSemicolonAfterCharacterReference: {
    reason: "Missing semicolon after character reference",
    description: "Unexpected `%c`. Expected `;` instead"
  },
  missingWhitespaceAfterDoctypePublicKeyword: {
    reason: "Missing whitespace after public identifier in doctype",
    description: "Unexpected `%c`. Expected ASCII whitespace instead"
  },
  missingWhitespaceAfterDoctypeSystemKeyword: {
    reason: "Missing whitespace after system identifier in doctype",
    description: "Unexpected `%c`. Expected ASCII whitespace instead"
  },
  missingWhitespaceBeforeDoctypeName: {
    reason: "Missing whitespace before doctype name",
    description: "Unexpected `%c`. Expected ASCII whitespace instead"
  },
  missingWhitespaceBetweenAttributes: {
    reason: "Missing whitespace between attributes",
    description: "Unexpected `%c`. Expected ASCII whitespace instead"
  },
  missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers: {
    reason: "Missing whitespace between public and system identifiers in doctype",
    description: "Unexpected `%c`. Expected ASCII whitespace instead"
  },
  nestedComment: {
    reason: "Unexpected nested comment",
    description: "Unexpected `<!--`. Expected `-->`"
  },
  nestedNoscriptInHead: {
    reason: "Unexpected nested `<noscript>` in `<head>`",
    description: "Unexpected `<noscript>`. Expected a closing tag or a meta element",
    url: !1
  },
  nonConformingDoctype: {
    reason: "Unexpected non-conforming doctype declaration",
    description: 'Expected `<!doctype html>` or `<!doctype html system "about:legacy-compat">`',
    url: !1
  },
  nonVoidHtmlElementStartTagWithTrailingSolidus: {
    reason: "Unexpected trailing slash on start tag of non-void element",
    description: "Unexpected `/`. Expected `>` instead"
  },
  noncharacterCharacterReference: {
    reason: "Unexpected noncharacter code point referenced by character reference",
    description: "Unexpected code point. Do not use noncharacters in HTML"
  },
  noncharacterInInputStream: {
    reason: "Unexpected noncharacter character",
    description: "Unexpected code point `%x`. Do not use noncharacters in HTML"
  },
  nullCharacterReference: {
    reason: "Unexpected NULL character referenced by character reference",
    description: "Unexpected code point. Do not use NULL characters in HTML"
  },
  openElementsLeftAfterEof: {
    reason: "Unexpected end of file",
    description: "Unexpected end of file. Expected closing tag instead",
    url: !1
  },
  surrogateCharacterReference: {
    reason: "Unexpected surrogate character referenced by character reference",
    description: "Unexpected code point. Do not use lone surrogate characters in HTML"
  },
  surrogateInInputStream: {
    reason: "Unexpected surrogate character",
    description: "Unexpected code point `%x`. Do not use lone surrogate characters in HTML"
  },
  unexpectedCharacterAfterDoctypeSystemIdentifier: {
    reason: "Invalid character after system identifier in doctype",
    description: "Unexpected character at `%c`. Expected `>`"
  },
  unexpectedCharacterInAttributeName: {
    reason: "Unexpected character in attribute name",
    description: "Unexpected `%c`. Expected whitespace, `/`, `>`, `=`, or probably an ASCII letter"
  },
  unexpectedCharacterInUnquotedAttributeValue: {
    reason: "Unexpected character in unquoted attribute value",
    description: "Unexpected `%c`. Quote the attribute value to include it"
  },
  unexpectedEqualsSignBeforeAttributeName: {
    reason: "Unexpected equals sign before attribute name",
    description: "Unexpected `%c`. Add an attribute name before it"
  },
  unexpectedNullCharacter: {
    reason: "Unexpected NULL character",
    description: "Unexpected code point `%x`. Do not use NULL characters in HTML"
  },
  unexpectedQuestionMarkInsteadOfTagName: {
    reason: "Unexpected question mark instead of tag name",
    description: "Unexpected `%c`. Expected an ASCII letter instead"
  },
  unexpectedSolidusInTag: {
    reason: "Unexpected slash in tag",
    description: "Unexpected `%c-1`. Expected it followed by `>` or in a quoted attribute value"
  },
  unknownNamedCharacterReference: {
    reason: "Unexpected unknown named character reference",
    description: "Unexpected character reference. Expected known named character references"
  }
}, zg0 = /-[a-z]/g, Fg0 = /%c(?:([-+])(\d+))?/g, Gg0 = /%x/g, Kg0 = {
  2: !0,
  1: !1,
  0: null
}, Vg0 = {};
T$0 = {};
LfT = {
  AElig: "\xC6",
  AMP: "&",
  Aacute: "\xC1",
  Abreve: "\u0102",
  Acirc: "\xC2",
  Acy: "\u0410",
  Afr: "\uD835\uDD04",
  Agrave: "\xC0",
  Alpha: "\u0391",
  Amacr: "\u0100",
  And: "\u2A53",
  Aogon: "\u0104",
  Aopf: "\uD835\uDD38",
  ApplyFunction: "\u2061",
  Aring: "\xC5",
  Ascr: "\uD835\uDC9C",
  Assign: "\u2254",
  Atilde: "\xC3",
  Auml: "\xC4",
  Backslash: "\u2216",
  Barv: "\u2AE7",
  Barwed: "\u2306",
  Bcy: "\u0411",
  Because: "\u2235",
  Bernoullis: "\u212C",
  Beta: "\u0392",
  Bfr: "\uD835\uDD05",
  Bopf: "\uD835\uDD39",
  Breve: "\u02D8",
  Bscr: "\u212C",
  Bumpeq: "\u224E",
  CHcy: "\u0427",
  COPY: "\xA9",
  Cacute: "\u0106",
  Cap: "\u22D2",
  CapitalDifferentialD: "\u2145",
  Cayleys: "\u212D",
  Ccaron: "\u010C",
  Ccedil: "\xC7",
  Ccirc: "\u0108",
  Cconint: "\u2230",
  Cdot: "\u010A",
  Cedilla: "\xB8",
  CenterDot: "\xB7",
  Cfr: "\u212D",
  Chi: "\u03A7",
  CircleDot: "\u2299",
  CircleMinus: "\u2296",
  CirclePlus: "\u2295",
  CircleTimes: "\u2297",
  ClockwiseContourIntegral: "\u2232",
  CloseCurlyDoubleQuote: "\u201D",
  CloseCurlyQuote: "\u2019",
  Colon: "\u2237",
  Colone: "\u2A74",
  Congruent: "\u2261",
  Conint: "\u222F",
  ContourIntegral: "\u222E",
  Copf: "\u2102",
  Coproduct: "\u2210",
  CounterClockwiseContourIntegral: "\u2233",
  Cross: "\u2A2F",
  Cscr: "\uD835\uDC9E",
  Cup: "\u22D3",
  CupCap: "\u224D",
  DD: "\u2145",
  DDotrahd: "\u2911",
  DJcy: "\u0402",
  DScy: "\u0405",
  DZcy: "\u040F",
  Dagger: "\u2021",
  Darr: "\u21A1",
  Dashv: "\u2AE4",
  Dcaron: "\u010E",
  Dcy: "\u0414",
  Del: "\u2207",
  Delta: "\u0394",
  Dfr: "\uD835\uDD07",
  DiacriticalAcute: "\xB4",
  DiacriticalDot: "\u02D9",
  DiacriticalDoubleAcute: "\u02DD",
  DiacriticalGrave: "`",
  DiacriticalTilde: "\u02DC",
  Diamond: "\u22C4",
  DifferentialD: "\u2146",
  Dopf: "\uD835\uDD3B",
  Dot: "\xA8",
  DotDot: "\u20DC",
  DotEqual: "\u2250",
  DoubleContourIntegral: "\u222F",
  DoubleDot: "\xA8",
  DoubleDownArrow: "\u21D3",
  DoubleLeftArrow: "\u21D0",
  DoubleLeftRightArrow: "\u21D4",
  DoubleLeftTee: "\u2AE4",
  DoubleLongLeftArrow: "\u27F8",
  DoubleLongLeftRightArrow: "\u27FA",
  DoubleLongRightArrow: "\u27F9",
  DoubleRightArrow: "\u21D2",
  DoubleRightTee: "\u22A8",
  DoubleUpArrow: "\u21D1",
  DoubleUpDownArrow: "\u21D5",
  DoubleVerticalBar: "\u2225",
  DownArrow: "\u2193",
  DownArrowBar: "\u2913",
  DownArrowUpArrow: "\u21F5",
  DownBreve: "\u0311",
  DownLeftRightVector: "\u2950",
  DownLeftTeeVector: "\u295E",
  DownLeftVector: "\u21BD",
  DownLeftVectorBar: "\u2956",
  DownRightTeeVector: "\u295F",
  DownRightVector: "\u21C1",
  DownRightVectorBar: "\u2957",
  DownTee: "\u22A4",
  DownTeeArrow: "\u21A7",
  Downarrow: "\u21D3",
  Dscr: "\uD835\uDC9F",
  Dstrok: "\u0110",
  ENG: "\u014A",
  ETH: "\xD0",
  Eacute: "\xC9",
  Ecaron: "\u011A",
  Ecirc: "\xCA",
  Ecy: "\u042D",
  Edot: "\u0116",
  Efr: "\uD835\uDD08",
  Egrave: "\xC8",
  Element: "\u2208",
  Emacr: "\u0112",
  EmptySmallSquare: "\u25FB",
  EmptyVerySmallSquare: "\u25AB",
  Eogon: "\u0118",
  Eopf: "\uD835\uDD3C",
  Epsilon: "\u0395",
  Equal: "\u2A75",
  EqualTilde: "\u2242",
  Equilibrium: "\u21CC",
  Escr: "\u2130",
  Esim: "\u2A73",
  Eta: "\u0397",
  Euml: "\xCB",
  Exists: "\u2203",
  ExponentialE: "\u2147",
  Fcy: "\u0424",
  Ffr: "\uD835\uDD09",
  FilledSmallSquare: "\u25FC",
  FilledVerySmallSquare: "\u25AA",
  Fopf: "\uD835\uDD3D",
  ForAll: "\u2200",
  Fouriertrf: "\u2131",
  Fscr: "\u2131",
  GJcy: "\u0403",
  GT: ">",
  Gamma: "\u0393",
  Gammad: "\u03DC",
  Gbreve: "\u011E",
  Gcedil: "\u0122",
  Gcirc: "\u011C",
  Gcy: "\u0413",
  Gdot: "\u0120",
  Gfr: "\uD835\uDD0A",
  Gg: "\u22D9",
  Gopf: "\uD835\uDD3E",
  GreaterEqual: "\u2265",
  GreaterEqualLess: "\u22DB",
  GreaterFullEqual: "\u2267",
  GreaterGreater: "\u2AA2",
  GreaterLess: "\u2277",
  GreaterSlantEqual: "\u2A7E",
  GreaterTilde: "\u2273",
  Gscr: "\uD835\uDCA2",
  Gt: "\u226B",
  HARDcy: "\u042A",
  Hacek: "\u02C7",
  Hat: "^",
  Hcirc: "\u0124",
  Hfr: "\u210C",
  HilbertSpace: "\u210B",
  Hopf: "\u210D",
  HorizontalLine: "\u2500",
  Hscr: "\u210B",
  Hstrok: "\u0126",
  HumpDownHump: "\u224E",
  HumpEqual: "\u224F",
  IEcy: "\u0415",
  IJlig: "\u0132",
  IOcy: "\u0401",
  Iacute: "\xCD",
  Icirc: "\xCE",
  Icy: "\u0418",
  Idot: "\u0130",
  Ifr: "\u2111",
  Igrave: "\xCC",
  Im: "\u2111",
  Imacr: "\u012A",
  ImaginaryI: "\u2148",
  Implies: "\u21D2",
  Int: "\u222C",
  Integral: "\u222B",
  Intersection: "\u22C2",
  InvisibleComma: "\u2063",
  InvisibleTimes: "\u2062",
  Iogon: "\u012E",
  Iopf: "\uD835\uDD40",
  Iota: "\u0399",
  Iscr: "\u2110",
  Itilde: "\u0128",
  Iukcy: "\u0406",
  Iuml: "\xCF",
  Jcirc: "\u0134",
  Jcy: "\u0419",
  Jfr: "\uD835\uDD0D",
  Jopf: "\uD835\uDD41",
  Jscr: "\uD835\uDCA5",
  Jsercy: "\u0408",
  Jukcy: "\u0404",
  KHcy: "\u0425",
  KJcy: "\u040C",
  Kappa: "\u039A",
  Kcedil: "\u0136",
  Kcy: "\u041A",
  Kfr: "\uD835\uDD0E",
  Kopf: "\uD835\uDD42",
  Kscr: "\uD835\uDCA6",
  LJcy: "\u0409",
  LT: "<",
  Lacute: "\u0139",
  Lambda: "\u039B",
  Lang: "\u27EA",
  Laplacetrf: "\u2112",
  Larr: "\u219E",
  Lcaron: "\u013D",
  Lcedil: "\u013B",
  Lcy: "\u041B",
  LeftAngleBracket: "\u27E8",
  LeftArrow: "\u2190",
  LeftArrowBar: "\u21E4",
  LeftArrowRightArrow: "\u21C6",
  LeftCeiling: "\u2308",
  LeftDoubleBracket: "\u27E6",
  LeftDownTeeVector: "\u2961",
  LeftDownVector: "\u21C3",
  LeftDownVectorBar: "\u2959",
  LeftFloor: "\u230A",
  LeftRightArrow: "\u2194",
  LeftRightVector: "\u294E",
  LeftTee: "\u22A3",
  LeftTeeArrow: "\u21A4",
  LeftTeeVector: "\u295A",
  LeftTriangle: "\u22B2",
  LeftTriangleBar: "\u29CF",
  LeftTriangleEqual: "\u22B4",
  LeftUpDownVector: "\u2951",
  LeftUpTeeVector: "\u2960",
  LeftUpVector: "\u21BF",
  LeftUpVectorBar: "\u2958",
  LeftVector: "\u21BC",
  LeftVectorBar: "\u2952",
  Leftarrow: "\u21D0",
  Leftrightarrow: "\u21D4",
  LessEqualGreater: "\u22DA",
  LessFullEqual: "\u2266",
  LessGreater: "\u2276",
  LessLess: "\u2AA1",
  LessSlantEqual: "\u2A7D",
  LessTilde: "\u2272",
  Lfr: "\uD835\uDD0F",
  Ll: "\u22D8",
  Lleftarrow: "\u21DA",
  Lmidot: "\u013F",
  LongLeftArrow: "\u27F5",
  LongLeftRightArrow: "\u27F7",
  LongRightArrow: "\u27F6",
  Longleftarrow: "\u27F8",
  Longleftrightarrow: "\u27FA",
  Longrightarrow: "\u27F9",
  Lopf: "\uD835\uDD43",
  LowerLeftArrow: "\u2199",
  LowerRightArrow: "\u2198",
  Lscr: "\u2112",
  Lsh: "\u21B0",
  Lstrok: "\u0141",
  Lt: "\u226A",
  Map: "\u2905",
  Mcy: "\u041C",
  MediumSpace: "\u205F",
  Mellintrf: "\u2133",
  Mfr: "\uD835\uDD10",
  MinusPlus: "\u2213",
  Mopf: "\uD835\uDD44",
  Mscr: "\u2133",
  Mu: "\u039C",
  NJcy: "\u040A",
  Nacute: "\u0143",
  Ncaron: "\u0147",
  Ncedil: "\u0145",
  Ncy: "\u041D",
  NegativeMediumSpace: "\u200B",
  NegativeThickSpace: "\u200B",
  NegativeThinSpace: "\u200B",
  NegativeVeryThinSpace: "\u200B",
  NestedGreaterGreater: "\u226B",
  NestedLessLess: "\u226A",
  NewLine: `
`,
  Nfr: "\uD835\uDD11",
  NoBreak: "\u2060",
  NonBreakingSpace: "\xA0",
  Nopf: "\u2115",
  Not: "\u2AEC",
  NotCongruent: "\u2262",
  NotCupCap: "\u226D",
  NotDoubleVerticalBar: "\u2226",
  NotElement: "\u2209",
  NotEqual: "\u2260",
  NotEqualTilde: "\u2242\u0338",
  NotExists: "\u2204",
  NotGreater: "\u226F",
  NotGreaterEqual: "\u2271",
  NotGreaterFullEqual: "\u2267\u0338",
  NotGreaterGreater: "\u226B\u0338",
  NotGreaterLess: "\u2279",
  NotGreaterSlantEqual: "\u2A7E\u0338",
  NotGreaterTilde: "\u2275",
  NotHumpDownHump: "\u224E\u0338",
  NotHumpEqual: "\u224F\u0338",
  NotLeftTriangle: "\u22EA",
  NotLeftTriangleBar: "\u29CF\u0338",
  NotLeftTriangleEqual: "\u22EC",
  NotLess: "\u226E",
  NotLessEqual: "\u2270",
  NotLessGreater: "\u2278",
  NotLessLess: "\u226A\u0338",
  NotLessSlantEqual: "\u2A7D\u0338",
  NotLessTilde: "\u2274",
  NotNestedGreaterGreater: "\u2AA2\u0338",
  NotNestedLessLess: "\u2AA1\u0338",
  NotPrecedes: "\u2280",
  NotPrecedesEqual: "\u2AAF\u0338",
  NotPrecedesSlantEqual: "\u22E0",
  NotReverseElement: "\u220C",
  NotRightTriangle: "\u22EB",
  NotRightTriangleBar: "\u29D0\u0338",
  NotRightTriangleEqual: "\u22ED",
  NotSquareSubset: "\u228F\u0338",
  NotSquareSubsetEqual: "\u22E2",
  NotSquareSuperset: "\u2290\u0338",
  NotSquareSupersetEqual: "\u22E3",
  NotSubset: "\u2282\u20D2",
  NotSubsetEqual: "\u2288",
  NotSucceeds: "\u2281",
  NotSucceedsEqual: "\u2AB0\u0338",
  NotSucceedsSlantEqual: "\u22E1",
  NotSucceedsTilde: "\u227F\u0338",
  NotSuperset: "\u2283\u20D2",
  NotSupersetEqual: "\u2289",
  NotTilde: "\u2241",
  NotTildeEqual: "\u2244",
  NotTildeFullEqual: "\u2247",
  NotTildeTilde: "\u2249",
  NotVerticalBar: "\u2224",
  Nscr: "\uD835\uDCA9",
  Ntilde: "\xD1",
  Nu: "\u039D",
  OElig: "\u0152",
  Oacute: "\xD3",
  Ocirc: "\xD4",
  Ocy: "\u041E",
  Odblac: "\u0150",
  Ofr: "\uD835\uDD12",
  Ograve: "\xD2",
  Omacr: "\u014C",
  Omega: "\u03A9",
  Omicron: "\u039F",
  Oopf: "\uD835\uDD46",
  OpenCurlyDoubleQuote: "\u201C",
  OpenCurlyQuote: "\u2018",
  Or: "\u2A54",
  Oscr: "\uD835\uDCAA",
  Oslash: "\xD8",
  Otilde: "\xD5",
  Otimes: "\u2A37",
  Ouml: "\xD6",
  OverBar: "\u203E",
  OverBrace: "\u23DE",
  OverBracket: "\u23B4",
  OverParenthesis: "\u23DC",
  PartialD: "\u2202",
  Pcy: "\u041F",
  Pfr: "\uD835\uDD13",
  Phi: "\u03A6",
  Pi: "\u03A0",
  PlusMinus: "\xB1",
  Poincareplane: "\u210C",
  Popf: "\u2119",
  Pr: "\u2ABB",
  Precedes: "\u227A",
  PrecedesEqual: "\u2AAF",
  PrecedesSlantEqual: "\u227C",
  PrecedesTilde: "\u227E",
  Prime: "\u2033",
  Product: "\u220F",
  Proportion: "\u2237",
  Proportional: "\u221D",
  Pscr: "\uD835\uDCAB",
  Psi: "\u03A8",
  QUOT: '"',
  Qfr: "\uD835\uDD14",
  Qopf: "\u211A",
  Qscr: "\uD835\uDCAC",
  RBarr: "\u2910",
  REG: "\xAE",
  Racute: "\u0154",
  Rang: "\u27EB",
  Rarr: "\u21A0",
  Rarrtl: "\u2916",
  Rcaron: "\u0158",
  Rcedil: "\u0156",
  Rcy: "\u0420",
  Re: "\u211C",
  ReverseElement: "\u220B",
  ReverseEquilibrium: "\u21CB",
  ReverseUpEquilibrium: "\u296F",
  Rfr: "\u211C",
  Rho: "\u03A1",
  RightAngleBracket: "\u27E9",
  RightArrow: "\u2192",
  RightArrowBar: "\u21E5",
  RightArrowLeftArrow: "\u21C4",
  RightCeiling: "\u2309",
  RightDoubleBracket: "\u27E7",
  RightDownTeeVector: "\u295D",
  RightDownVector: "\u21C2",
  RightDownVectorBar: "\u2955",
  RightFloor: "\u230B",
  RightTee: "\u22A2",
  RightTeeArrow: "\u21A6",
  RightTeeVector: "\u295B",
  RightTriangle: "\u22B3",
  RightTriangleBar: "\u29D0",
  RightTriangleEqual: "\u22B5",
  RightUpDownVector: "\u294F",
  RightUpTeeVector: "\u295C",
  RightUpVector: "\u21BE",
  RightUpVectorBar: "\u2954",
  RightVector: "\u21C0",
  RightVectorBar: "\u2953",
  Rightarrow: "\u21D2",
  Ropf: "\u211D",
  RoundImplies: "\u2970",
  Rrightarrow: "\u21DB",
  Rscr: "\u211B",
  Rsh: "\u21B1",
  RuleDelayed: "\u29F4",
  SHCHcy: "\u0429",
  SHcy: "\u0428",
  SOFTcy: "\u042C",
  Sacute: "\u015A",
  Sc: "\u2ABC",
  Scaron: "\u0160",
  Scedil: "\u015E",
  Scirc: "\u015C",
  Scy: "\u0421",
  Sfr: "\uD835\uDD16",
  ShortDownArrow: "\u2193",
  ShortLeftArrow: "\u2190",
  ShortRightArrow: "\u2192",
  ShortUpArrow: "\u2191",
  Sigma: "\u03A3",
  SmallCircle: "\u2218",
  Sopf: "\uD835\uDD4A",
  Sqrt: "\u221A",
  Square: "\u25A1",
  SquareIntersection: "\u2293",
  SquareSubset: "\u228F",
  SquareSubsetEqual: "\u2291",
  SquareSuperset: "\u2290",
  SquareSupersetEqual: "\u2292",
  SquareUnion: "\u2294",
  Sscr: "\uD835\uDCAE",
  Star: "\u22C6",
  Sub: "\u22D0",
  Subset: "\u22D0",
  SubsetEqual: "\u2286",
  Succeeds: "\u227B",
  SucceedsEqual: "\u2AB0",
  SucceedsSlantEqual: "\u227D",
  SucceedsTilde: "\u227F",
  SuchThat: "\u220B",
  Sum: "\u2211",
  Sup: "\u22D1",
  Superset: "\u2283",
  SupersetEqual: "\u2287",
  Supset: "\u22D1",
  THORN: "\xDE",
  TRADE: "\u2122",
  TSHcy: "\u040B",
  TScy: "\u0426",
  Tab: "\t",
  Tau: "\u03A4",
  Tcaron: "\u0164",
  Tcedil: "\u0162",
  Tcy: "\u0422",
  Tfr: "\uD835\uDD17",
  Therefore: "\u2234",
  Theta: "\u0398",
  ThickSpace: "\u205F\u200A",
  ThinSpace: "\u2009",
  Tilde: "\u223C",
  TildeEqual: "\u2243",
  TildeFullEqual: "\u2245",
  TildeTilde: "\u2248",
  Topf: "\uD835\uDD4B",
  TripleDot: "\u20DB",
  Tscr: "\uD835\uDCAF",
  Tstrok: "\u0166",
  Uacute: "\xDA",
  Uarr: "\u219F",
  Uarrocir: "\u2949",
  Ubrcy: "\u040E",
  Ubreve: "\u016C",
  Ucirc: "\xDB",
  Ucy: "\u0423",
  Udblac: "\u0170",
  Ufr: "\uD835\uDD18",
  Ugrave: "\xD9",
  Umacr: "\u016A",
  UnderBar: "_",
  UnderBrace: "\u23DF",
  UnderBracket: "\u23B5",
  UnderParenthesis: "\u23DD",
  Union: "\u22C3",
  UnionPlus: "\u228E",
  Uogon: "\u0172",
  Uopf: "\uD835\uDD4C",
  UpArrow: "\u2191",
  UpArrowBar: "\u2912",
  UpArrowDownArrow: "\u21C5",
  UpDownArrow: "\u2195",
  UpEquilibrium: "\u296E",
  UpTee: "\u22A5",
  UpTeeArrow: "\u21A5",
  Uparrow: "\u21D1",
  Updownarrow: "\u21D5",
  UpperLeftArrow: "\u2196",
  UpperRightArrow: "\u2197",
  Upsi: "\u03D2",
  Upsilon: "\u03A5",
  Uring: "\u016E",
  Uscr: "\uD835\uDCB0",
  Utilde: "\u0168",
  Uuml: "\xDC",
  VDash: "\u22AB",
  Vbar: "\u2AEB",
  Vcy: "\u0412",
  Vdash: "\u22A9",
  Vdashl: "\u2AE6",
  Vee: "\u22C1",
  Verbar: "\u2016",
  Vert: "\u2016",
  VerticalBar: "\u2223",
  VerticalLine: "|",
  VerticalSeparator: "\u2758",
  VerticalTilde: "\u2240",
  VeryThinSpace: "\u200A",
  Vfr: "\uD835\uDD19",
  Vopf: "\uD835\uDD4D",
  Vscr: "\uD835\uDCB1",
  Vvdash: "\u22AA",
  Wcirc: "\u0174",
  Wedge: "\u22C0",
  Wfr: "\uD835\uDD1A",
  Wopf: "\uD835\uDD4E",
  Wscr: "\uD835\uDCB2",
  Xfr: "\uD835\uDD1B",
  Xi: "\u039E",
  Xopf: "\uD835\uDD4F",
  Xscr: "\uD835\uDCB3",
  YAcy: "\u042F",
  YIcy: "\u0407",
  YUcy: "\u042E",
  Yacute: "\xDD",
  Ycirc: "\u0176",
  Ycy: "\u042B",
  Yfr: "\uD835\uDD1C",
  Yopf: "\uD835\uDD50",
  Yscr: "\uD835\uDCB4",
  Yuml: "\u0178",
  ZHcy: "\u0416",
  Zacute: "\u0179",
  Zcaron: "\u017D",
  Zcy: "\u0417",
  Zdot: "\u017B",
  ZeroWidthSpace: "\u200B",
  Zeta: "\u0396",
  Zfr: "\u2128",
  Zopf: "\u2124",
  Zscr: "\uD835\uDCB5",
  aacute: "\xE1",
  abreve: "\u0103",
  ac: "\u223E",
  acE: "\u223E\u0333",
  acd: "\u223F",
  acirc: "\xE2",
  acute: "\xB4",
  acy: "\u0430",
  aelig: "\xE6",
  af: "\u2061",
  afr: "\uD835\uDD1E",
  agrave: "\xE0",
  alefsym: "\u2135",
  aleph: "\u2135",
  alpha: "\u03B1",
  amacr: "\u0101",
  amalg: "\u2A3F",
  amp: "&",
  and: "\u2227",
  andand: "\u2A55",
  andd: "\u2A5C",
  andslope: "\u2A58",
  andv: "\u2A5A",
  ang: "\u2220",
  ange: "\u29A4",
  angle: "\u2220",
  angmsd: "\u2221",
  angmsdaa: "\u29A8",
  angmsdab: "\u29A9",
  angmsdac: "\u29AA",
  angmsdad: "\u29AB",
  angmsdae: "\u29AC",
  angmsdaf: "\u29AD",
  angmsdag: "\u29AE",
  angmsdah: "\u29AF",
  angrt: "\u221F",
  angrtvb: "\u22BE",
  angrtvbd: "\u299D",
  angsph: "\u2222",
  angst: "\xC5",
  angzarr: "\u237C",
  aogon: "\u0105",
  aopf: "\uD835\uDD52",
  ap: "\u2248",
  apE: "\u2A70",
  apacir: "\u2A6F",
  ape: "\u224A",
  apid: "\u224B",
  apos: "'",
  approx: "\u2248",
  approxeq: "\u224A",
  aring: "\xE5",
  ascr: "\uD835\uDCB6",
  ast: "*",
  asymp: "\u2248",
  asympeq: "\u224D",
  atilde: "\xE3",
  auml: "\xE4",
  awconint: "\u2233",
  awint: "\u2A11",
  bNot: "\u2AED",
  backcong: "\u224C",
  backepsilon: "\u03F6",
  backprime: "\u2035",
  backsim: "\u223D",
  backsimeq: "\u22CD",
  barvee: "\u22BD",
  barwed: "\u2305",
  barwedge: "\u2305",
  bbrk: "\u23B5",
  bbrktbrk: "\u23B6",
  bcong: "\u224C",
  bcy: "\u0431",
  bdquo: "\u201E",
  becaus: "\u2235",
  because: "\u2235",
  bemptyv: "\u29B0",
  bepsi: "\u03F6",
  bernou: "\u212C",
  beta: "\u03B2",
  beth: "\u2136",
  between: "\u226C",
  bfr: "\uD835\uDD1F",
  bigcap: "\u22C2",
  bigcirc: "\u25EF",
  bigcup: "\u22C3",
  bigodot: "\u2A00",
  bigoplus: "\u2A01",
  bigotimes: "\u2A02",
  bigsqcup: "\u2A06",
  bigstar: "\u2605",
  bigtriangledown: "\u25BD",
  bigtriangleup: "\u25B3",
  biguplus: "\u2A04",
  bigvee: "\u22C1",
  bigwedge: "\u22C0",
  bkarow: "\u290D",
  blacklozenge: "\u29EB",
  blacksquare: "\u25AA",
  blacktriangle: "\u25B4",
  blacktriangledown: "\u25BE",
  blacktriangleleft: "\u25C2",
  blacktriangleright: "\u25B8",
  blank: "\u2423",
  blk12: "\u2592",
  blk14: "\u2591",
  blk34: "\u2593",
  block: "\u2588",
  bne: "=\u20E5",
  bnequiv: "\u2261\u20E5",
  bnot: "\u2310",
  bopf: "\uD835\uDD53",
  bot: "\u22A5",
  bottom: "\u22A5",
  bowtie: "\u22C8",
  boxDL: "\u2557",
  boxDR: "\u2554",
  boxDl: "\u2556",
  boxDr: "\u2553",
  boxH: "\u2550",
  boxHD: "\u2566",
  boxHU: "\u2569",
  boxHd: "\u2564",
  boxHu: "\u2567",
  boxUL: "\u255D",
  boxUR: "\u255A",
  boxUl: "\u255C",
  boxUr: "\u2559",
  boxV: "\u2551",
  boxVH: "\u256C",
  boxVL: "\u2563",
  boxVR: "\u2560",
  boxVh: "\u256B",
  boxVl: "\u2562",
  boxVr: "\u255F",
  boxbox: "\u29C9",
  boxdL: "\u2555",
  boxdR: "\u2552",
  boxdl: "\u2510",
  boxdr: "\u250C",
  boxh: "\u2500",
  boxhD: "\u2565",
  boxhU: "\u2568",
  boxhd: "\u252C",
  boxhu: "\u2534",
  boxminus: "\u229F",
  boxplus: "\u229E",
  boxtimes: "\u22A0",
  boxuL: "\u255B",
  boxuR: "\u2558",
  boxul: "\u2518",
  boxur: "\u2514",
  boxv: "\u2502",
  boxvH: "\u256A",
  boxvL: "\u2561",
  boxvR: "\u255E",
  boxvh: "\u253C",
  boxvl: "\u2524",
  boxvr: "\u251C",
  bprime: "\u2035",
  breve: "\u02D8",
  brvbar: "\xA6",
  bscr: "\uD835\uDCB7",
  bsemi: "\u204F",
  bsim: "\u223D",
  bsime: "\u22CD",
  bsol: "\\",
  bsolb: "\u29C5",
  bsolhsub: "\u27C8",
  bull: "\u2022",
  bullet: "\u2022",
  bump: "\u224E",
  bumpE: "\u2AAE",
  bumpe: "\u224F",
  bumpeq: "\u224F",
  cacute: "\u0107",
  cap: "\u2229",
  capand: "\u2A44",
  capbrcup: "\u2A49",
  capcap: "\u2A4B",
  capcup: "\u2A47",
  capdot: "\u2A40",
  caps: "\u2229\uFE00",
  caret: "\u2041",
  caron: "\u02C7",
  ccaps: "\u2A4D",
  ccaron: "\u010D",
  ccedil: "\xE7",
  ccirc: "\u0109",
  ccups: "\u2A4C",
  ccupssm: "\u2A50",
  cdot: "\u010B",
  cedil: "\xB8",
  cemptyv: "\u29B2",
  cent: "\xA2",
  centerdot: "\xB7",
  cfr: "\uD835\uDD20",
  chcy: "\u0447",
  check: "\u2713",
  checkmark: "\u2713",
  chi: "\u03C7",
  cir: "\u25CB",
  cirE: "\u29C3",
  circ: "\u02C6",
  circeq: "\u2257",
  circlearrowleft: "\u21BA",
  circlearrowright: "\u21BB",
  circledR: "\xAE",
  circledS: "\u24C8",
  circledast: "\u229B",
  circledcirc: "\u229A",
  circleddash: "\u229D",
  cire: "\u2257",
  cirfnint: "\u2A10",
  cirmid: "\u2AEF",
  cirscir: "\u29C2",
  clubs: "\u2663",
  clubsuit: "\u2663",
  colon: ":",
  colone: "\u2254",
  coloneq: "\u2254",
  comma: ",",
  commat: "@",
  comp: "\u2201",
  compfn: "\u2218",
  complement: "\u2201",
  complexes: "\u2102",
  cong: "\u2245",
  congdot: "\u2A6D",
  conint: "\u222E",
  copf: "\uD835\uDD54",
  coprod: "\u2210",
  copy: "\xA9",
  copysr: "\u2117",
  crarr: "\u21B5",
  cross: "\u2717",
  cscr: "\uD835\uDCB8",
  csub: "\u2ACF",
  csube: "\u2AD1",
  csup: "\u2AD0",
  csupe: "\u2AD2",
  ctdot: "\u22EF",
  cudarrl: "\u2938",
  cudarrr: "\u2935",
  cuepr: "\u22DE",
  cuesc: "\u22DF",
  cularr: "\u21B6",
  cularrp: "\u293D",
  cup: "\u222A",
  cupbrcap: "\u2A48",
  cupcap: "\u2A46",
  cupcup: "\u2A4A",
  cupdot: "\u228D",
  cupor: "\u2A45",
  cups: "\u222A\uFE00",
  curarr: "\u21B7",
  curarrm: "\u293C",
  curlyeqprec: "\u22DE",
  curlyeqsucc: "\u22DF",
  curlyvee: "\u22CE",
  curlywedge: "\u22CF",
  curren: "\xA4",
  curvearrowleft: "\u21B6",
  curvearrowright: "\u21B7",
  cuvee: "\u22CE",
  cuwed: "\u22CF",
  cwconint: "\u2232",
  cwint: "\u2231",
  cylcty: "\u232D",
  dArr: "\u21D3",
  dHar: "\u2965",
  dagger: "\u2020",
  daleth: "\u2138",
  darr: "\u2193",
  dash: "\u2010",
  dashv: "\u22A3",
  dbkarow: "\u290F",
  dblac: "\u02DD",
  dcaron: "\u010F",
  dcy: "\u0434",
  dd: "\u2146",
  ddagger: "\u2021",
  ddarr: "\u21CA",
  ddotseq: "\u2A77",
  deg: "\xB0",
  delta: "\u03B4",
  demptyv: "\u29B1",
  dfisht: "\u297F",
  dfr: "\uD835\uDD21",
  dharl: "\u21C3",
  dharr: "\u21C2",
  diam: "\u22C4",
  diamond: "\u22C4",
  diamondsuit: "\u2666",
  diams: "\u2666",
  die: "\xA8",
  digamma: "\u03DD",
  disin: "\u22F2",
  div: "\xF7",
  divide: "\xF7",
  divideontimes: "\u22C7",
  divonx: "\u22C7",
  djcy: "\u0452",
  dlcorn: "\u231E",
  dlcrop: "\u230D",
  dollar: "$",
  dopf: "\uD835\uDD55",
  dot: "\u02D9",
  doteq: "\u2250",
  doteqdot: "\u2251",
  dotminus: "\u2238",
  dotplus: "\u2214",
  dotsquare: "\u22A1",
  doublebarwedge: "\u2306",
  downarrow: "\u2193",
  downdownarrows: "\u21CA",
  downharpoonleft: "\u21C3",
  downharpoonright: "\u21C2",
  drbkarow: "\u2910",
  drcorn: "\u231F",
  drcrop: "\u230C",
  dscr: "\uD835\uDCB9",
  dscy: "\u0455",
  dsol: "\u29F6",
  dstrok: "\u0111",
  dtdot: "\u22F1",
  dtri: "\u25BF",
  dtrif: "\u25BE",
  duarr: "\u21F5",
  duhar: "\u296F",
  dwangle: "\u29A6",
  dzcy: "\u045F",
  dzigrarr: "\u27FF",
  eDDot: "\u2A77",
  eDot: "\u2251",
  eacute: "\xE9",
  easter: "\u2A6E",
  ecaron: "\u011B",
  ecir: "\u2256",
  ecirc: "\xEA",
  ecolon: "\u2255",
  ecy: "\u044D",
  edot: "\u0117",
  ee: "\u2147",
  efDot: "\u2252",
  efr: "\uD835\uDD22",
  eg: "\u2A9A",
  egrave: "\xE8",
  egs: "\u2A96",
  egsdot: "\u2A98",
  el: "\u2A99",
  elinters: "\u23E7",
  ell: "\u2113",
  els: "\u2A95",
  elsdot: "\u2A97",
  emacr: "\u0113",
  empty: "\u2205",
  emptyset: "\u2205",
  emptyv: "\u2205",
  emsp13: "\u2004",
  emsp14: "\u2005",
  emsp: "\u2003",
  eng: "\u014B",
  ensp: "\u2002",
  eogon: "\u0119",
  eopf: "\uD835\uDD56",
  epar: "\u22D5",
  eparsl: "\u29E3",
  eplus: "\u2A71",
  epsi: "\u03B5",
  epsilon: "\u03B5",
  epsiv: "\u03F5",
  eqcirc: "\u2256",
  eqcolon: "\u2255",
  eqsim: "\u2242",
  eqslantgtr: "\u2A96",
  eqslantless: "\u2A95",
  equals: "=",
  equest: "\u225F",
  equiv: "\u2261",
  equivDD: "\u2A78",
  eqvparsl: "\u29E5",
  erDot: "\u2253",
  erarr: "\u2971",
  escr: "\u212F",
  esdot: "\u2250",
  esim: "\u2242",
  eta: "\u03B7",
  eth: "\xF0",
  euml: "\xEB",
  euro: "\u20AC",
  excl: "!",
  exist: "\u2203",
  expectation: "\u2130",
  exponentiale: "\u2147",
  fallingdotseq: "\u2252",
  fcy: "\u0444",
  female: "\u2640",
  ffilig: "\uFB03",
  fflig: "\uFB00",
  ffllig: "\uFB04",
  ffr: "\uD835\uDD23",
  filig: "\uFB01",
  fjlig: "fj",
  flat: "\u266D",
  fllig: "\uFB02",
  fltns: "\u25B1",
  fnof: "\u0192",
  fopf: "\uD835\uDD57",
  forall: "\u2200",
  fork: "\u22D4",
  forkv: "\u2AD9",
  fpartint: "\u2A0D",
  frac12: "\xBD",
  frac13: "\u2153",
  frac14: "\xBC",
  frac15: "\u2155",
  frac16: "\u2159",
  frac18: "\u215B",
  frac23: "\u2154",
  frac25: "\u2156",
  frac34: "\xBE",
  frac35: "\u2157",
  frac38: "\u215C",
  frac45: "\u2158",
  frac56: "\u215A",
  frac58: "\u215D",
  frac78: "\u215E",
  frasl: "\u2044",
  frown: "\u2322",
  fscr: "\uD835\uDCBB",
  gE: "\u2267",
  gEl: "\u2A8C",
  gacute: "\u01F5",
  gamma: "\u03B3",
  gammad: "\u03DD",
  gap: "\u2A86",
  gbreve: "\u011F",
  gcirc: "\u011D",
  gcy: "\u0433",
  gdot: "\u0121",
  ge: "\u2265",
  gel: "\u22DB",
  geq: "\u2265",
  geqq: "\u2267",
  geqslant: "\u2A7E",
  ges: "\u2A7E",
  gescc: "\u2AA9",
  gesdot: "\u2A80",
  gesdoto: "\u2A82",
  gesdotol: "\u2A84",
  gesl: "\u22DB\uFE00",
  gesles: "\u2A94",
  gfr: "\uD835\uDD24",
  gg: "\u226B",
  ggg: "\u22D9",
  gimel: "\u2137",
  gjcy: "\u0453",
  gl: "\u2277",
  glE: "\u2A92",
  gla: "\u2AA5",
  glj: "\u2AA4",
  gnE: "\u2269",
  gnap: "\u2A8A",
  gnapprox: "\u2A8A",
  gne: "\u2A88",
  gneq: "\u2A88",
  gneqq: "\u2269",
  gnsim: "\u22E7",
  gopf: "\uD835\uDD58",
  grave: "`",
  gscr: "\u210A",
  gsim: "\u2273",
  gsime: "\u2A8E",
  gsiml: "\u2A90",
  gt: ">",
  gtcc: "\u2AA7",
  gtcir: "\u2A7A",
  gtdot: "\u22D7",
  gtlPar: "\u2995",
  gtquest: "\u2A7C",
  gtrapprox: "\u2A86",
  gtrarr: "\u2978",
  gtrdot: "\u22D7",
  gtreqless: "\u22DB",
  gtreqqless: "\u2A8C",
  gtrless: "\u2277",
  gtrsim: "\u2273",
  gvertneqq: "\u2269\uFE00",
  gvnE: "\u2269\uFE00",
  hArr: "\u21D4",
  hairsp: "\u200A",
  half: "\xBD",
  hamilt: "\u210B",
  hardcy: "\u044A",
  harr: "\u2194",
  harrcir: "\u2948",
  harrw: "\u21AD",
  hbar: "\u210F",
  hcirc: "\u0125",
  hearts: "\u2665",
  heartsuit: "\u2665",
  hellip: "\u2026",
  hercon: "\u22B9",
  hfr: "\uD835\uDD25",
  hksearow: "\u2925",
  hkswarow: "\u2926",
  hoarr: "\u21FF",
  homtht: "\u223B",
  hookleftarrow: "\u21A9",
  hookrightarrow: "\u21AA",
  hopf: "\uD835\uDD59",
  horbar: "\u2015",
  hscr: "\uD835\uDCBD",
  hslash: "\u210F",
  hstrok: "\u0127",
  hybull: "\u2043",
  hyphen: "\u2010",
  iacute: "\xED",
  ic: "\u2063",
  icirc: "\xEE",
  icy: "\u0438",
  iecy: "\u0435",
  iexcl: "\xA1",
  iff: "\u21D4",
  ifr: "\uD835\uDD26",
  igrave: "\xEC",
  ii: "\u2148",
  iiiint: "\u2A0C",
  iiint: "\u222D",
  iinfin: "\u29DC",
  iiota: "\u2129",
  ijlig: "\u0133",
  imacr: "\u012B",
  image: "\u2111",
  imagline: "\u2110",
  imagpart: "\u2111",
  imath: "\u0131",
  imof: "\u22B7",
  imped: "\u01B5",
  in: "\u2208",
  incare: "\u2105",
  infin: "\u221E",
  infintie: "\u29DD",
  inodot: "\u0131",
  int: "\u222B",
  intcal: "\u22BA",
  integers: "\u2124",
  intercal: "\u22BA",
  intlarhk: "\u2A17",
  intprod: "\u2A3C",
  iocy: "\u0451",
  iogon: "\u012F",
  iopf: "\uD835\uDD5A",
  iota: "\u03B9",
  iprod: "\u2A3C",
  iquest: "\xBF",
  iscr: "\uD835\uDCBE",
  isin: "\u2208",
  isinE: "\u22F9",
  isindot: "\u22F5",
  isins: "\u22F4",
  isinsv: "\u22F3",
  isinv: "\u2208",
  it: "\u2062",
  itilde: "\u0129",
  iukcy: "\u0456",
  iuml: "\xEF",
  jcirc: "\u0135",
  jcy: "\u0439",
  jfr: "\uD835\uDD27",
  jmath: "\u0237",
  jopf: "\uD835\uDD5B",
  jscr: "\uD835\uDCBF",
  jsercy: "\u0458",
  jukcy: "\u0454",
  kappa: "\u03BA",
  kappav: "\u03F0",
  kcedil: "\u0137",
  kcy: "\u043A",
  kfr: "\uD835\uDD28",
  kgreen: "\u0138",
  khcy: "\u0445",
  kjcy: "\u045C",
  kopf: "\uD835\uDD5C",
  kscr: "\uD835\uDCC0",
  lAarr: "\u21DA",
  lArr: "\u21D0",
  lAtail: "\u291B",
  lBarr: "\u290E",
  lE: "\u2266",
  lEg: "\u2A8B",
  lHar: "\u2962",
  lacute: "\u013A",
  laemptyv: "\u29B4",
  lagran: "\u2112",
  lambda: "\u03BB",
  lang: "\u27E8",
  langd: "\u2991",
  langle: "\u27E8",
  lap: "\u2A85",
  laquo: "\xAB",
  larr: "\u2190",
  larrb: "\u21E4",
  larrbfs: "\u291F",
  larrfs: "\u291D",
  larrhk: "\u21A9",
  larrlp: "\u21AB",
  larrpl: "\u2939",
  larrsim: "\u2973",
  larrtl: "\u21A2",
  lat: "\u2AAB",
  latail: "\u2919",
  late: "\u2AAD",
  lates: "\u2AAD\uFE00",
  lbarr: "\u290C",
  lbbrk: "\u2772",
  lbrace: "{",
  lbrack: "[",
  lbrke: "\u298B",
  lbrksld: "\u298F",
  lbrkslu: "\u298D",
  lcaron: "\u013E",
  lcedil: "\u013C",
  lceil: "\u2308",
  lcub: "{",
  lcy: "\u043B",
  ldca: "\u2936",
  ldquo: "\u201C",
  ldquor: "\u201E",
  ldrdhar: "\u2967",
  ldrushar: "\u294B",
  ldsh: "\u21B2",
  le: "\u2264",
  leftarrow: "\u2190",
  leftarrowtail: "\u21A2",
  leftharpoondown: "\u21BD",
  leftharpoonup: "\u21BC",
  leftleftarrows: "\u21C7",
  leftrightarrow: "\u2194",
  leftrightarrows: "\u21C6",
  leftrightharpoons: "\u21CB",
  leftrightsquigarrow: "\u21AD",
  leftthreetimes: "\u22CB",
  leg: "\u22DA",
  leq: "\u2264",
  leqq: "\u2266",
  leqslant: "\u2A7D",
  les: "\u2A7D",
  lescc: "\u2AA8",
  lesdot: "\u2A7F",
  lesdoto: "\u2A81",
  lesdotor: "\u2A83",
  lesg: "\u22DA\uFE00",
  lesges: "\u2A93",
  lessapprox: "\u2A85",
  lessdot: "\u22D6",
  lesseqgtr: "\u22DA",
  lesseqqgtr: "\u2A8B",
  lessgtr: "\u2276",
  lesssim: "\u2272",
  lfisht: "\u297C",
  lfloor: "\u230A",
  lfr: "\uD835\uDD29",
  lg: "\u2276",
  lgE: "\u2A91",
  lhard: "\u21BD",
  lharu: "\u21BC",
  lharul: "\u296A",
  lhblk: "\u2584",
  ljcy: "\u0459",
  ll: "\u226A",
  llarr: "\u21C7",
  llcorner: "\u231E",
  llhard: "\u296B",
  lltri: "\u25FA",
  lmidot: "\u0140",
  lmoust: "\u23B0",
  lmoustache: "\u23B0",
  lnE: "\u2268",
  lnap: "\u2A89",
  lnapprox: "\u2A89",
  lne: "\u2A87",
  lneq: "\u2A87",
  lneqq: "\u2268",
  lnsim: "\u22E6",
  loang: "\u27EC",
  loarr: "\u21FD",
  lobrk: "\u27E6",
  longleftarrow: "\u27F5",
  longleftrightarrow: "\u27F7",
  longmapsto: "\u27FC",
  longrightarrow: "\u27F6",
  looparrowleft: "\u21AB",
  looparrowright: "\u21AC",
  lopar: "\u2985",
  lopf: "\uD835\uDD5D",
  loplus: "\u2A2D",
  lotimes: "\u2A34",
  lowast: "\u2217",
  lowbar: "_",
  loz: "\u25CA",
  lozenge: "\u25CA",
  lozf: "\u29EB",
  lpar: "(",
  lparlt: "\u2993",
  lrarr: "\u21C6",
  lrcorner: "\u231F",
  lrhar: "\u21CB",
  lrhard: "\u296D",
  lrm: "\u200E",
  lrtri: "\u22BF",
  lsaquo: "\u2039",
  lscr: "\uD835\uDCC1",
  lsh: "\u21B0",
  lsim: "\u2272",
  lsime: "\u2A8D",
  lsimg: "\u2A8F",
  lsqb: "[",
  lsquo: "\u2018",
  lsquor: "\u201A",
  lstrok: "\u0142",
  lt: "<",
  ltcc: "\u2AA6",
  ltcir: "\u2A79",
  ltdot: "\u22D6",
  lthree: "\u22CB",
  ltimes: "\u22C9",
  ltlarr: "\u2976",
  ltquest: "\u2A7B",
  ltrPar: "\u2996",
  ltri: "\u25C3",
  ltrie: "\u22B4",
  ltrif: "\u25C2",
  lurdshar: "\u294A",
  luruhar: "\u2966",
  lvertneqq: "\u2268\uFE00",
  lvnE: "\u2268\uFE00",
  mDDot: "\u223A",
  macr: "\xAF",
  male: "\u2642",
  malt: "\u2720",
  maltese: "\u2720",
  map: "\u21A6",
  mapsto: "\u21A6",
  mapstodown: "\u21A7",
  mapstoleft: "\u21A4",
  mapstoup: "\u21A5",
  marker: "\u25AE",
  mcomma: "\u2A29",
  mcy: "\u043C",
  mdash: "\u2014",
  measuredangle: "\u2221",
  mfr: "\uD835\uDD2A",
  mho: "\u2127",
  micro: "\xB5",
  mid: "\u2223",
  midast: "*",
  midcir: "\u2AF0",
  middot: "\xB7",
  minus: "\u2212",
  minusb: "\u229F",
  minusd: "\u2238",
  minusdu: "\u2A2A",
  mlcp: "\u2ADB",
  mldr: "\u2026",
  mnplus: "\u2213",
  models: "\u22A7",
  mopf: "\uD835\uDD5E",
  mp: "\u2213",
  mscr: "\uD835\uDCC2",
  mstpos: "\u223E",
  mu: "\u03BC",
  multimap: "\u22B8",
  mumap: "\u22B8",
  nGg: "\u22D9\u0338",
  nGt: "\u226B\u20D2",
  nGtv: "\u226B\u0338",
  nLeftarrow: "\u21CD",
  nLeftrightarrow: "\u21CE",
  nLl: "\u22D8\u0338",
  nLt: "\u226A\u20D2",
  nLtv: "\u226A\u0338",
  nRightarrow: "\u21CF",
  nVDash: "\u22AF",
  nVdash: "\u22AE",
  nabla: "\u2207",
  nacute: "\u0144",
  nang: "\u2220\u20D2",
  nap: "\u2249",
  napE: "\u2A70\u0338",
  napid: "\u224B\u0338",
  napos: "\u0149",
  napprox: "\u2249",
  natur: "\u266E",
  natural: "\u266E",
  naturals: "\u2115",
  nbsp: "\xA0",
  nbump: "\u224E\u0338",
  nbumpe: "\u224F\u0338",
  ncap: "\u2A43",
  ncaron: "\u0148",
  ncedil: "\u0146",
  ncong: "\u2247",
  ncongdot: "\u2A6D\u0338",
  ncup: "\u2A42",
  ncy: "\u043D",
  ndash: "\u2013",
  ne: "\u2260",
  neArr: "\u21D7",
  nearhk: "\u2924",
  nearr: "\u2197",
  nearrow: "\u2197",
  nedot: "\u2250\u0338",
  nequiv: "\u2262",
  nesear: "\u2928",
  nesim: "\u2242\u0338",
  nexist: "\u2204",
  nexists: "\u2204",
  nfr: "\uD835\uDD2B",
  ngE: "\u2267\u0338",
  nge: "\u2271",
  ngeq: "\u2271",
  ngeqq: "\u2267\u0338",
  ngeqslant: "\u2A7E\u0338",
  nges: "\u2A7E\u0338",
  ngsim: "\u2275",
  ngt: "\u226F",
  ngtr: "\u226F",
  nhArr: "\u21CE",
  nharr: "\u21AE",
  nhpar: "\u2AF2",
  ni: "\u220B",
  nis: "\u22FC",
  nisd: "\u22FA",
  niv: "\u220B",
  njcy: "\u045A",
  nlArr: "\u21CD",
  nlE: "\u2266\u0338",
  nlarr: "\u219A",
  nldr: "\u2025",
  nle: "\u2270",
  nleftarrow: "\u219A",
  nleftrightarrow: "\u21AE",
  nleq: "\u2270",
  nleqq: "\u2266\u0338",
  nleqslant: "\u2A7D\u0338",
  nles: "\u2A7D\u0338",
  nless: "\u226E",
  nlsim: "\u2274",
  nlt: "\u226E",
  nltri: "\u22EA",
  nltrie: "\u22EC",
  nmid: "\u2224",
  nopf: "\uD835\uDD5F",
  not: "\xAC",
  notin: "\u2209",
  notinE: "\u22F9\u0338",
  notindot: "\u22F5\u0338",
  notinva: "\u2209",
  notinvb: "\u22F7",
  notinvc: "\u22F6",
  notni: "\u220C",
  notniva: "\u220C",
  notnivb: "\u22FE",
  notnivc: "\u22FD",
  npar: "\u2226",
  nparallel: "\u2226",
  nparsl: "\u2AFD\u20E5",
  npart: "\u2202\u0338",
  npolint: "\u2A14",
  npr: "\u2280",
  nprcue: "\u22E0",
  npre: "\u2AAF\u0338",
  nprec: "\u2280",
  npreceq: "\u2AAF\u0338",
  nrArr: "\u21CF",
  nrarr: "\u219B",
  nrarrc: "\u2933\u0338",
  nrarrw: "\u219D\u0338",
  nrightarrow: "\u219B",
  nrtri: "\u22EB",
  nrtrie: "\u22ED",
  nsc: "\u2281",
  nsccue: "\u22E1",
  nsce: "\u2AB0\u0338",
  nscr: "\uD835\uDCC3",
  nshortmid: "\u2224",
  nshortparallel: "\u2226",
  nsim: "\u2241",
  nsime: "\u2244",
  nsimeq: "\u2244",
  nsmid: "\u2224",
  nspar: "\u2226",
  nsqsube: "\u22E2",
  nsqsupe: "\u22E3",
  nsub: "\u2284",
  nsubE: "\u2AC5\u0338",
  nsube: "\u2288",
  nsubset: "\u2282\u20D2",
  nsubseteq: "\u2288",
  nsubseteqq: "\u2AC5\u0338",
  nsucc: "\u2281",
  nsucceq: "\u2AB0\u0338",
  nsup: "\u2285",
  nsupE: "\u2AC6\u0338",
  nsupe: "\u2289",
  nsupset: "\u2283\u20D2",
  nsupseteq: "\u2289",
  nsupseteqq: "\u2AC6\u0338",
  ntgl: "\u2279",
  ntilde: "\xF1",
  ntlg: "\u2278",
  ntriangleleft: "\u22EA",
  ntrianglelefteq: "\u22EC",
  ntriangleright: "\u22EB",
  ntrianglerighteq: "\u22ED",
  nu: "\u03BD",
  num: "#",
  numero: "\u2116",
  numsp: "\u2007",
  nvDash: "\u22AD",
  nvHarr: "\u2904",
  nvap: "\u224D\u20D2",
  nvdash: "\u22AC",
  nvge: "\u2265\u20D2",
  nvgt: ">\u20D2",
  nvinfin: "\u29DE",
  nvlArr: "\u2902",
  nvle: "\u2264\u20D2",
  nvlt: "<\u20D2",
  nvltrie: "\u22B4\u20D2",
  nvrArr: "\u2903",
  nvrtrie: "\u22B5\u20D2",
  nvsim: "\u223C\u20D2",
  nwArr: "\u21D6",
  nwarhk: "\u2923",
  nwarr: "\u2196",
  nwarrow: "\u2196",
  nwnear: "\u2927",
  oS: "\u24C8",
  oacute: "\xF3",
  oast: "\u229B",
  ocir: "\u229A",
  ocirc: "\xF4",
  ocy: "\u043E",
  odash: "\u229D",
  odblac: "\u0151",
  odiv: "\u2A38",
  odot: "\u2299",
  odsold: "\u29BC",
  oelig: "\u0153",
  ofcir: "\u29BF",
  ofr: "\uD835\uDD2C",
  ogon: "\u02DB",
  ograve: "\xF2",
  ogt: "\u29C1",
  ohbar: "\u29B5",
  ohm: "\u03A9",
  oint: "\u222E",
  olarr: "\u21BA",
  olcir: "\u29BE",
  olcross: "\u29BB",
  oline: "\u203E",
  olt: "\u29C0",
  omacr: "\u014D",
  omega: "\u03C9",
  omicron: "\u03BF",
  omid: "\u29B6",
  ominus: "\u2296",
  oopf: "\uD835\uDD60",
  opar: "\u29B7",
  operp: "\u29B9",
  oplus: "\u2295",
  or: "\u2228",
  orarr: "\u21BB",
  ord: "\u2A5D",
  order: "\u2134",
  orderof: "\u2134",
  ordf: "\xAA",
  ordm: "\xBA",
  origof: "\u22B6",
  oror: "\u2A56",
  orslope: "\u2A57",
  orv: "\u2A5B",
  oscr: "\u2134",
  oslash: "\xF8",
  osol: "\u2298",
  otilde: "\xF5",
  otimes: "\u2297",
  otimesas: "\u2A36",
  ouml: "\xF6",
  ovbar: "\u233D",
  par: "\u2225",
  para: "\xB6",
  parallel: "\u2225",
  parsim: "\u2AF3",
  parsl: "\u2AFD",
  part: "\u2202",
  pcy: "\u043F",
  percnt: "%",
  period: ".",
  permil: "\u2030",
  perp: "\u22A5",
  pertenk: "\u2031",
  pfr: "\uD835\uDD2D",
  phi: "\u03C6",
  phiv: "\u03D5",
  phmmat: "\u2133",
  phone: "\u260E",
  pi: "\u03C0",
  pitchfork: "\u22D4",
  piv: "\u03D6",
  planck: "\u210F",
  planckh: "\u210E",
  plankv: "\u210F",
  plus: "+",
  plusacir: "\u2A23",
  plusb: "\u229E",
  pluscir: "\u2A22",
  plusdo: "\u2214",
  plusdu: "\u2A25",
  pluse: "\u2A72",
  plusmn: "\xB1",
  plussim: "\u2A26",
  plustwo: "\u2A27",
  pm: "\xB1",
  pointint: "\u2A15",
  popf: "\uD835\uDD61",
  pound: "\xA3",
  pr: "\u227A",
  prE: "\u2AB3",
  prap: "\u2AB7",
  prcue: "\u227C",
  pre: "\u2AAF",
  prec: "\u227A",
  precapprox: "\u2AB7",
  preccurlyeq: "\u227C",
  preceq: "\u2AAF",
  precnapprox: "\u2AB9",
  precneqq: "\u2AB5",
  precnsim: "\u22E8",
  precsim: "\u227E",
  prime: "\u2032",
  primes: "\u2119",
  prnE: "\u2AB5",
  prnap: "\u2AB9",
  prnsim: "\u22E8",
  prod: "\u220F",
  profalar: "\u232E",
  profline: "\u2312",
  profsurf: "\u2313",
  prop: "\u221D",
  propto: "\u221D",
  prsim: "\u227E",
  prurel: "\u22B0",
  pscr: "\uD835\uDCC5",
  psi: "\u03C8",
  puncsp: "\u2008",
  qfr: "\uD835\uDD2E",
  qint: "\u2A0C",
  qopf: "\uD835\uDD62",
  qprime: "\u2057",
  qscr: "\uD835\uDCC6",
  quaternions: "\u210D",
  quatint: "\u2A16",
  quest: "?",
  questeq: "\u225F",
  quot: '"',
  rAarr: "\u21DB",
  rArr: "\u21D2",
  rAtail: "\u291C",
  rBarr: "\u290F",
  rHar: "\u2964",
  race: "\u223D\u0331",
  racute: "\u0155",
  radic: "\u221A",
  raemptyv: "\u29B3",
  rang: "\u27E9",
  rangd: "\u2992",
  range: "\u29A5",
  rangle: "\u27E9",
  raquo: "\xBB",
  rarr: "\u2192",
  rarrap: "\u2975",
  rarrb: "\u21E5",
  rarrbfs: "\u2920",
  rarrc: "\u2933",
  rarrfs: "\u291E",
  rarrhk: "\u21AA",
  rarrlp: "\u21AC",
  rarrpl: "\u2945",
  rarrsim: "\u2974",
  rarrtl: "\u21A3",
  rarrw: "\u219D",
  ratail: "\u291A",
  ratio: "\u2236",
  rationals: "\u211A",
  rbarr: "\u290D",
  rbbrk: "\u2773",
  rbrace: "}",
  rbrack: "]",
  rbrke: "\u298C",
  rbrksld: "\u298E",
  rbrkslu: "\u2990",
  rcaron: "\u0159",
  rcedil: "\u0157",
  rceil: "\u2309",
  rcub: "}",
  rcy: "\u0440",
  rdca: "\u2937",
  rdldhar: "\u2969",
  rdquo: "\u201D",
  rdquor: "\u201D",
  rdsh: "\u21B3",
  real: "\u211C",
  realine: "\u211B",
  realpart: "\u211C",
  reals: "\u211D",
  rect: "\u25AD",
  reg: "\xAE",
  rfisht: "\u297D",
  rfloor: "\u230B",
  rfr: "\uD835\uDD2F",
  rhard: "\u21C1",
  rharu: "\u21C0",
  rharul: "\u296C",
  rho: "\u03C1",
  rhov: "\u03F1",
  rightarrow: "\u2192",
  rightarrowtail: "\u21A3",
  rightharpoondown: "\u21C1",
  rightharpoonup: "\u21C0",
  rightleftarrows: "\u21C4",
  rightleftharpoons: "\u21CC",
  rightrightarrows: "\u21C9",
  rightsquigarrow: "\u219D",
  rightthreetimes: "\u22CC",
  ring: "\u02DA",
  risingdotseq: "\u2253",
  rlarr: "\u21C4",
  rlhar: "\u21CC",
  rlm: "\u200F",
  rmoust: "\u23B1",
  rmoustache: "\u23B1",
  rnmid: "\u2AEE",
  roang: "\u27ED",
  roarr: "\u21FE",
  robrk: "\u27E7",
  ropar: "\u2986",
  ropf: "\uD835\uDD63",
  roplus: "\u2A2E",
  rotimes: "\u2A35",
  rpar: ")",
  rpargt: "\u2994",
  rppolint: "\u2A12",
  rrarr: "\u21C9",
  rsaquo: "\u203A",
  rscr: "\uD835\uDCC7",
  rsh: "\u21B1",
  rsqb: "]",
  rsquo: "\u2019",
  rsquor: "\u2019",
  rthree: "\u22CC",
  rtimes: "\u22CA",
  rtri: "\u25B9",
  rtrie: "\u22B5",
  rtrif: "\u25B8",
  rtriltri: "\u29CE",
  ruluhar: "\u2968",
  rx: "\u211E",
  sacute: "\u015B",
  sbquo: "\u201A",
  sc: "\u227B",
  scE: "\u2AB4",
  scap: "\u2AB8",
  scaron: "\u0161",
  sccue: "\u227D",
  sce: "\u2AB0",
  scedil: "\u015F",
  scirc: "\u015D",
  scnE: "\u2AB6",
  scnap: "\u2ABA",
  scnsim: "\u22E9",
  scpolint: "\u2A13",
  scsim: "\u227F",
  scy: "\u0441",
  sdot: "\u22C5",
  sdotb: "\u22A1",
  sdote: "\u2A66",
  seArr: "\u21D8",
  searhk: "\u2925",
  searr: "\u2198",
  searrow: "\u2198",
  sect: "\xA7",
  semi: ";",
  seswar: "\u2929",
  setminus: "\u2216",
  setmn: "\u2216",
  sext: "\u2736",
  sfr: "\uD835\uDD30",
  sfrown: "\u2322",
  sharp: "\u266F",
  shchcy: "\u0449",
  shcy: "\u0448",
  shortmid: "\u2223",
  shortparallel: "\u2225",
  shy: "\xAD",
  sigma: "\u03C3",
  sigmaf: "\u03C2",
  sigmav: "\u03C2",
  sim: "\u223C",
  simdot: "\u2A6A",
  sime: "\u2243",
  simeq: "\u2243",
  simg: "\u2A9E",
  simgE: "\u2AA0",
  siml: "\u2A9D",
  simlE: "\u2A9F",
  simne: "\u2246",
  simplus: "\u2A24",
  simrarr: "\u2972",
  slarr: "\u2190",
  smallsetminus: "\u2216",
  smashp: "\u2A33",
  smeparsl: "\u29E4",
  smid: "\u2223",
  smile: "\u2323",
  smt: "\u2AAA",
  smte: "\u2AAC",
  smtes: "\u2AAC\uFE00",
  softcy: "\u044C",
  sol: "/",
  solb: "\u29C4",
  solbar: "\u233F",
  sopf: "\uD835\uDD64",
  spades: "\u2660",
  spadesuit: "\u2660",
  spar: "\u2225",
  sqcap: "\u2293",
  sqcaps: "\u2293\uFE00",
  sqcup: "\u2294",
  sqcups: "\u2294\uFE00",
  sqsub: "\u228F",
  sqsube: "\u2291",
  sqsubset: "\u228F",
  sqsubseteq: "\u2291",
  sqsup: "\u2290",
  sqsupe: "\u2292",
  sqsupset: "\u2290",
  sqsupseteq: "\u2292",
  squ: "\u25A1",
  square: "\u25A1",
  squarf: "\u25AA",
  squf: "\u25AA",
  srarr: "\u2192",
  sscr: "\uD835\uDCC8",
  ssetmn: "\u2216",
  ssmile: "\u2323",
  sstarf: "\u22C6",
  star: "\u2606",
  starf: "\u2605",
  straightepsilon: "\u03F5",
  straightphi: "\u03D5",
  strns: "\xAF",
  sub: "\u2282",
  subE: "\u2AC5",
  subdot: "\u2ABD",
  sube: "\u2286",
  subedot: "\u2AC3",
  submult: "\u2AC1",
  subnE: "\u2ACB",
  subne: "\u228A",
  subplus: "\u2ABF",
  subrarr: "\u2979",
  subset: "\u2282",
  subseteq: "\u2286",
  subseteqq: "\u2AC5",
  subsetneq: "\u228A",
  subsetneqq: "\u2ACB",
  subsim: "\u2AC7",
  subsub: "\u2AD5",
  subsup: "\u2AD3",
  succ: "\u227B",
  succapprox: "\u2AB8",
  succcurlyeq: "\u227D",
  succeq: "\u2AB0",
  succnapprox: "\u2ABA",
  succneqq: "\u2AB6",
  succnsim: "\u22E9",
  succsim: "\u227F",
  sum: "\u2211",
  sung: "\u266A",
  sup1: "\xB9",
  sup2: "\xB2",
  sup3: "\xB3",
  sup: "\u2283",
  supE: "\u2AC6",
  supdot: "\u2ABE",
  supdsub: "\u2AD8",
  supe: "\u2287",
  supedot: "\u2AC4",
  suphsol: "\u27C9",
  suphsub: "\u2AD7",
  suplarr: "\u297B",
  supmult: "\u2AC2",
  supnE: "\u2ACC",
  supne: "\u228B",
  supplus: "\u2AC0",
  supset: "\u2283",
  supseteq: "\u2287",
  supseteqq: "\u2AC6",
  supsetneq: "\u228B",
  supsetneqq: "\u2ACC",
  supsim: "\u2AC8",
  supsub: "\u2AD4",
  supsup: "\u2AD6",
  swArr: "\u21D9",
  swarhk: "\u2926",
  swarr: "\u2199",
  swarrow: "\u2199",
  swnwar: "\u292A",
  szlig: "\xDF",
  target: "\u2316",
  tau: "\u03C4",
  tbrk: "\u23B4",
  tcaron: "\u0165",
  tcedil: "\u0163",
  tcy: "\u0442",
  tdot: "\u20DB",
  telrec: "\u2315",
  tfr: "\uD835\uDD31",
  there4: "\u2234",
  therefore: "\u2234",
  theta: "\u03B8",
  thetasym: "\u03D1",
  thetav: "\u03D1",
  thickapprox: "\u2248",
  thicksim: "\u223C",
  thinsp: "\u2009",
  thkap: "\u2248",
  thksim: "\u223C",
  thorn: "\xFE",
  tilde: "\u02DC",
  times: "\xD7",
  timesb: "\u22A0",
  timesbar: "\u2A31",
  timesd: "\u2A30",
  tint: "\u222D",
  toea: "\u2928",
  top: "\u22A4",
  topbot: "\u2336",
  topcir: "\u2AF1",
  topf: "\uD835\uDD65",
  topfork: "\u2ADA",
  tosa: "\u2929",
  tprime: "\u2034",
  trade: "\u2122",
  triangle: "\u25B5",
  triangledown: "\u25BF",
  triangleleft: "\u25C3",
  trianglelefteq: "\u22B4",
  triangleq: "\u225C",
  triangleright: "\u25B9",
  trianglerighteq: "\u22B5",
  tridot: "\u25EC",
  trie: "\u225C",
  triminus: "\u2A3A",
  triplus: "\u2A39",
  trisb: "\u29CD",
  tritime: "\u2A3B",
  trpezium: "\u23E2",
  tscr: "\uD835\uDCC9",
  tscy: "\u0446",
  tshcy: "\u045B",
  tstrok: "\u0167",
  twixt: "\u226C",
  twoheadleftarrow: "\u219E",
  twoheadrightarrow: "\u21A0",
  uArr: "\u21D1",
  uHar: "\u2963",
  uacute: "\xFA",
  uarr: "\u2191",
  ubrcy: "\u045E",
  ubreve: "\u016D",
  ucirc: "\xFB",
  ucy: "\u0443",
  udarr: "\u21C5",
  udblac: "\u0171",
  udhar: "\u296E",
  ufisht: "\u297E",
  ufr: "\uD835\uDD32",
  ugrave: "\xF9",
  uharl: "\u21BF",
  uharr: "\u21BE",
  uhblk: "\u2580",
  ulcorn: "\u231C",
  ulcorner: "\u231C",
  ulcrop: "\u230F",
  ultri: "\u25F8",
  umacr: "\u016B",
  uml: "\xA8",
  uogon: "\u0173",
  uopf: "\uD835\uDD66",
  uparrow: "\u2191",
  updownarrow: "\u2195",
  upharpoonleft: "\u21BF",
  upharpoonright: "\u21BE",
  uplus: "\u228E",
  upsi: "\u03C5",
  upsih: "\u03D2",
  upsilon: "\u03C5",
  upuparrows: "\u21C8",
  urcorn: "\u231D",
  urcorner: "\u231D",
  urcrop: "\u230E",
  uring: "\u016F",
  urtri: "\u25F9",
  uscr: "\uD835\uDCCA",
  utdot: "\u22F0",
  utilde: "\u0169",
  utri: "\u25B5",
  utrif: "\u25B4",
  uuarr: "\u21C8",
  uuml: "\xFC",
  uwangle: "\u29A7",
  vArr: "\u21D5",
  vBar: "\u2AE8",
  vBarv: "\u2AE9",
  vDash: "\u22A8",
  vangrt: "\u299C",
  varepsilon: "\u03F5",
  varkappa: "\u03F0",
  varnothing: "\u2205",
  varphi: "\u03D5",
  varpi: "\u03D6",
  varpropto: "\u221D",
  varr: "\u2195",
  varrho: "\u03F1",
  varsigma: "\u03C2",
  varsubsetneq: "\u228A\uFE00",
  varsubsetneqq: "\u2ACB\uFE00",
  varsupsetneq: "\u228B\uFE00",
  varsupsetneqq: "\u2ACC\uFE00",
  vartheta: "\u03D1",
  vartriangleleft: "\u22B2",
  vartriangleright: "\u22B3",
  vcy: "\u0432",
  vdash: "\u22A2",
  vee: "\u2228",
  veebar: "\u22BB",
  veeeq: "\u225A",
  vellip: "\u22EE",
  verbar: "|",
  vert: "|",
  vfr: "\uD835\uDD33",
  vltri: "\u22B2",
  vnsub: "\u2282\u20D2",
  vnsup: "\u2283\u20D2",
  vopf: "\uD835\uDD67",
  vprop: "\u221D",
  vrtri: "\u22B3",
  vscr: "\uD835\uDCCB",
  vsubnE: "\u2ACB\uFE00",
  vsubne: "\u228A\uFE00",
  vsupnE: "\u2ACC\uFE00",
  vsupne: "\u228B\uFE00",
  vzigzag: "\u299A",
  wcirc: "\u0175",
  wedbar: "\u2A5F",
  wedge: "\u2227",
  wedgeq: "\u2259",
  weierp: "\u2118",
  wfr: "\uD835\uDD34",
  wopf: "\uD835\uDD68",
  wp: "\u2118",
  wr: "\u2240",
  wreath: "\u2240",
  wscr: "\uD835\uDCCC",
  xcap: "\u22C2",
  xcirc: "\u25EF",
  xcup: "\u22C3",
  xdtri: "\u25BD",
  xfr: "\uD835\uDD35",
  xhArr: "\u27FA",
  xharr: "\u27F7",
  xi: "\u03BE",
  xlArr: "\u27F8",
  xlarr: "\u27F5",
  xmap: "\u27FC",
  xnis: "\u22FB",
  xodot: "\u2A00",
  xopf: "\uD835\uDD69",
  xoplus: "\u2A01",
  xotime: "\u2A02",
  xrArr: "\u27F9",
  xrarr: "\u27F6",
  xscr: "\uD835\uDCCD",
  xsqcup: "\u2A06",
  xuplus: "\u2A04",
  xutri: "\u25B3",
  xvee: "\u22C1",
  xwedge: "\u22C0",
  yacute: "\xFD",
  yacy: "\u044F",
  ycirc: "\u0177",
  ycy: "\u044B",
  yen: "\xA5",
  yfr: "\uD835\uDD36",
  yicy: "\u0457",
  yopf: "\uD835\uDD6A",
  yscr: "\uD835\uDCCE",
  yucy: "\u044E",
  yuml: "\xFF",
  zacute: "\u017A",
  zcaron: "\u017E",
  zcy: "\u0437",
  zdot: "\u017C",
  zeetrf: "\u2128",
  zeta: "\u03B6",
  zfr: "\uD835\uDD37",
  zhcy: "\u0436",
  zigrarr: "\u21DD",
  zopf: "\uD835\uDD6B",
  zscr: "\uD835\uDCCF",
  zwj: "\u200D",
  zwnj: "\u200C"
}, a$0 = {}.hasOwnProperty;
MfT = {}.hasOwnProperty;
Mt = mp(/[A-Za-z]/), Sr = mp(/[\dA-Za-z]/), r$0 = mp(/[#-'*+\--9=?A-Z^-~]/);
KY = mp(/\d/), h$0 = mp(/[\dA-Fa-f]/), i$0 = mp(/[!-/:-@[-`{-~]/);
HH = mp(/\p{P}|\p{S}/u), Qb = mp(/\s/);
c$0 = {
  tokenize: s$0
};
o$0 = {
  tokenize: n$0
}, DfT = {
  tokenize: l$0
};
VY = {
  name: "attention",
  resolveAll: A$0,
  tokenize: p$0
};
_$0 = {
  name: "autolink",
  tokenize: b$0
};
JO = {
  partial: !0,
  tokenize: m$0
};
zYT = {
  continuation: {
    tokenize: y$0
  },
  exit: P$0,
  name: "blockQuote",
  tokenize: u$0
};
FYT = {
  name: "characterEscape",
  tokenize: k$0
};
GYT = {
  name: "characterReference",
  tokenize: x$0
};
BfT = {
  partial: !0,
  tokenize: I$0
}, NfT = {
  concrete: !0,
  name: "codeFenced",
  tokenize: f$0
};
EF = {
  name: "codeIndented",
  tokenize: $$0
}, g$0 = {
  partial: !0,
  tokenize: v$0
};
j$0 = {
  name: "codeText",
  previous: O$0,
  resolve: S$0,
  tokenize: d$0
};
C$0 = {
  resolve: M$0,
  tokenize: D$0
}, L$0 = {
  partial: !0,
  tokenize: w$0
};
B$0 = {
  name: "definition",
  tokenize: U$0
}, N$0 = {
  partial: !0,
  tokenize: H$0
};
W$0 = {
  name: "hardBreakEscape",
  tokenize: q$0
};
z$0 = {
  name: "headingAtx",
  resolve: F$0,
  tokenize: G$0
};
K$0 = ["address", "article", "aside", "base", "basefont", "blockquote", "body", "caption", "center", "col", "colgroup", "dd", "details", "dialog", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hr", "html", "iframe", "legend", "li", "link", "main", "menu", "menuitem", "nav", "noframes", "ol", "optgroup", "option", "p", "param", "search", "section", "summary", "table", "tbody", "td", "tfoot", "th", "thead", "title", "tr", "track", "ul"], UfT = ["pre", "script", "style", "textarea"], V$0 = {
  concrete: !0,
  name: "htmlFlow",
  resolveTo: Q$0,
  tokenize: Z$0
}, X$0 = {
  partial: !0,
  tokenize: Tv0
}, Y$0 = {
  partial: !0,
  tokenize: J$0
};
Rv0 = {
  name: "htmlText",
  tokenize: av0
};
erT = {
  name: "labelEnd",
  resolveAll: hv0,
  resolveTo: iv0,
  tokenize: cv0
}, ev0 = {
  tokenize: sv0
}, tv0 = {
  tokenize: ov0
}, rv0 = {
  tokenize: nv0
};
lv0 = {
  name: "labelStartImage",
  resolveAll: erT.resolveAll,
  tokenize: Av0
};
pv0 = {
  name: "labelStartLink",
  resolveAll: erT.resolveAll,
  tokenize: _v0
};
CF = {
  name: "lineEnding",
  tokenize: bv0
};
WM = {
  name: "thematicBreak",
  tokenize: mv0
};
nr = {
  continuation: {
    tokenize: kv0
  },
  exit: fv0,
  name: "list",
  tokenize: Pv0
}, uv0 = {
  partial: !0,
  tokenize: Iv0
}, yv0 = {
  partial: !0,
  tokenize: xv0
};
HfT = {
  name: "setextUnderline",
  resolveTo: gv0,
  tokenize: $v0
};
vv0 = {
  tokenize: jv0
};
Sv0 = {
  resolveAll: JYT()
}, Ov0 = ZYT("string"), dv0 = ZYT("text");
TQT = {};
Ra(TQT, {
  text: () => Bv0,
  string: () => wv0,
  insideSpan: () => Nv0,
  flowInitial: () => Mv0,
  flow: () => Dv0,
  document: () => Cv0,
  disable: () => Hv0,
  contentInitial: () => Lv0,
  attentionMarkers: () => Uv0
});
Cv0 = {
  [42]: nr,
  [43]: nr,
  [45]: nr,
  [48]: nr,
  [49]: nr,
  [50]: nr,
  [51]: nr,
  [52]: nr,
  [53]: nr,
  [54]: nr,
  [55]: nr,
  [56]: nr,
  [57]: nr,
  [62]: zYT
}, Lv0 = {
  [91]: B$0
}, Mv0 = {
  [-2]: EF,
  [-1]: EF,
  [32]: EF
}, Dv0 = {
  [35]: z$0,
  [42]: WM,
  [45]: [HfT, WM],
  [60]: V$0,
  [61]: HfT,
  [95]: WM,
  [96]: NfT,
  [126]: NfT
}, wv0 = {
  [38]: GYT,
  [92]: FYT
}, Bv0 = {
  [-5]: CF,
  [-4]: CF,
  [-3]: CF,
  [33]: lv0,
  [38]: GYT,
  [42]: VY,
  [60]: [_$0, Rv0],
  [91]: pv0,
  [92]: [W$0, FYT],
  [93]: erT,
  [95]: VY,
  [96]: j$0
}, Nv0 = {
  null: [VY, Sv0]
}, Uv0 = {
  null: [42, 95]
}, Hv0 = {
  null: []
};
WfT = /[\0\t\n\r]/g;
Vv0 = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
aQT = {}.hasOwnProperty;
zfT = {}.hasOwnProperty;
Rj0 = {}.hasOwnProperty;
hQT.peek = nj0;
iQT = [];
oQT.peek = fj0;
nQT.peek = Ij0;
lQT.peek = gj0;
AQT.peek = $j0;
_QT.peek = vj0;
bQT.peek = jj0;
Mj0 = qH(["break", "delete", "emphasis", "footnote", "footnoteReference", "image", "imageReference", "inlineCode", "inlineMath", "link", "linkReference", "mdxJsxTextElement", "mdxTextExpression", "strong", "text", "textDirective"]);
uQT.peek = Bj0;
hrT = {
  blockquote: ej0,
  break: KfT,
  code: ij0,
  definition: sj0,
  emphasis: hQT,
  hardBreak: KfT,
  heading: xj0,
  html: oQT,
  image: nQT,
  imageReference: lQT,
  inlineCode: AQT,
  link: _QT,
  linkReference: bQT,
  list: dj0,
  listItem: Cj0,
  paragraph: Lj0,
  root: Dj0,
  strong: uQT,
  text: Nj0,
  thematicBreak: Hj0
}, Wj0 = [qj0];
u_ = ["autolink", "destinationLiteral", "destinationRaw", "reference", "titleQuote", "titleApostrophe"], zj0 = [{
  character: "\t",
  after: "[\\r\\n]",
  inConstruct: "phrasing"
}, {
  character: "\t",
  before: "[\\r\\n]",
  inConstruct: "phrasing"
}, {
  character: "\t",
  inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
}, {
  character: "\r",
  inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde", "codeFencedMetaGraveAccent", "codeFencedMetaTilde", "destinationLiteral", "headingAtx"]
}, {
  character: `
`,
  inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde", "codeFencedMetaGraveAccent", "codeFencedMetaTilde", "destinationLiteral", "headingAtx"]
}, {
  character: " ",
  after: "[\\r\\n]",
  inConstruct: "phrasing"
}, {
  character: " ",
  before: "[\\r\\n]",
  inConstruct: "phrasing"
}, {
  character: " ",
  inConstruct: ["codeFencedLangGraveAccent", "codeFencedLangTilde"]
}, {
  character: "!",
  after: "\\[",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  character: '"',
  inConstruct: "titleQuote"
}, {
  atBreak: !0,
  character: "#"
}, {
  character: "#",
  inConstruct: "headingAtx",
  after: `(?:[\r
]|$)`
}, {
  character: "&",
  after: "[#A-Za-z]",
  inConstruct: "phrasing"
}, {
  character: "'",
  inConstruct: "titleApostrophe"
}, {
  character: "(",
  inConstruct: "destinationRaw"
}, {
  before: "\\]",
  character: "(",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  atBreak: !0,
  before: "\\d+",
  character: ")"
}, {
  character: ")",
  inConstruct: "destinationRaw"
}, {
  atBreak: !0,
  character: "*",
  after: `(?:[ 	\r
*])`
}, {
  character: "*",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  atBreak: !0,
  character: "+",
  after: `(?:[ 	\r
])`
}, {
  atBreak: !0,
  character: "-",
  after: `(?:[ 	\r
-])`
}, {
  atBreak: !0,
  before: "\\d+",
  character: ".",
  after: `(?:[ 	\r
]|$)`
}, {
  atBreak: !0,
  character: "<",
  after: "[!/?A-Za-z]"
}, {
  character: "<",
  after: "[!/?A-Za-z]",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  character: "<",
  inConstruct: "destinationLiteral"
}, {
  atBreak: !0,
  character: "="
}, {
  atBreak: !0,
  character: ">"
}, {
  character: ">",
  inConstruct: "destinationLiteral"
}, {
  atBreak: !0,
  character: "["
}, {
  character: "[",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  character: "[",
  inConstruct: ["label", "reference"]
}, {
  character: "\\",
  after: "[\\r\\n]",
  inConstruct: "phrasing"
}, {
  character: "]",
  inConstruct: ["label", "reference"]
}, {
  atBreak: !0,
  character: "_"
}, {
  character: "_",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  atBreak: !0,
  character: "`"
}, {
  character: "`",
  inConstruct: ["codeFencedLangGraveAccent", "codeFencedMetaGraveAccent"]
}, {
  character: "`",
  inConstruct: "phrasing",
  notInConstruct: u_
}, {
  atBreak: !0,
  character: "~"
}];
Yj0 = /\r?\n|\r/g;
LF = c0(g8T(), 1);
lS0 = {}.hasOwnProperty;
AS0 = new irT().freeze();
mS0 = AS0().use(Jv0).use(cS0).freeze();
NF = ["autolink", "link", "image", "label"];
PQT.peek = qS0;
xQT.peek = ZS0;
_O0 = {
  tokenize: kO0,
  partial: !0
}, fQT = {
  tokenize: xO0,
  partial: !0
}, IQT = {
  tokenize: fO0,
  partial: !0
}, gQT = {
  tokenize: IO0,
  partial: !0
}, bO0 = {
  tokenize: gO0,
  partial: !0
}, $QT = {
  name: "wwwAutolink",
  tokenize: yO0,
  previous: jQT
}, vQT = {
  name: "protocolAutolink",
  tokenize: PO0,
  previous: SQT
}, wn = {
  name: "emailAutolink",
  tokenize: uO0,
  previous: OQT
}, ho = {};
while (y_ < 123) if (ho[y_] = wn, y_++, y_ === 58) y_ = 65;else if (y_ === 91) y_ = 97;
ho[43] = wn;
ho[45] = wn;
ho[46] = wn;
ho[95] = wn;
ho[72] = [wn, vQT];
ho[104] = [wn, vQT];
ho[87] = [wn, $QT];
ho[119] = [wn, $QT];
$O0 = {
  tokenize: LO0,
  partial: !0
};
HO0 = {
  name: "tasklistCheck",
  tokenize: qO0
};
GO0 = {};
rR();
$x();
s0();
rR();
hd0 = {
  getEnv(T) {
    return process.env[T];
  },
  getPlatform() {
    return "darwin";
  },
  execSync: rd0
};
kN();
Px();
rR();
Mh();
lIT = tB.join(Bd0(), "amp-url-image-preview-cache"), Nd0 = new Set(["localhost", "127.0.0.1", "ampcode.com", "www.ampcode.com"]), Ud0 = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp"
}, AIT = new Map(), qF = new Map();
rR();
rR();
Fd0 = c0(XNR(), 1), Gd0 = c0(YNR(), 1), Kd0 = c0(hUR(), 1);
Jd0 = /^L(?<line>\d+)(?:(?<columnSeparator>:|C)(?<column>\d+))?(?:-L(?<endLine>\d+)(?:(?<endColumnSeparator>:|C)(?<endColumn>\d+))?)?$/;
aE0 = mS0().use(KO0);
oa();
rR();
de();
nP = a9();
rR();
rR();
Mh();
rR();
rR();
rR();
yIT = [WtT, HtT];
O0();
WE0 = /[\\/_ +.#"@[({&]/, qE0 = /[\\/_ +.#"@[({&]/g, zE0 = /[\s-]/, DZT = /[\s-]/g;
de();
QE0 = ["*", "+", ".", ":", "'"];
kIT = ["ctrl+x", "y", "z"];
fIT = [{
  type: "command",
  text: 'amp -x "What package manager do we use here?"'
}, {
  type: "command",
  text: 'amp -x "Run the linter and fix the errors"'
}, {
  type: "hint",
  text: "Use Ctrl+O to open the command palette"
}, {
  type: "hint",
  text: "Use Ctrl+G to edit the prompt in your $EDITOR"
}, {
  type: "hint",
  text: "Use the `prompt: queue` command to enqueue messages without interrupting the agent"
}, {
  type: "hint",
  text: "Use the `thread: browser` command to open your thread in the browser"
}, {
  type: "hint",
  text: "Use the `thread: new` command to start a fresh thread"
}, {
  type: "hint",
  text: "Use the `thread: handoff` command to draft a new thread with relevant context"
}, {
  type: "hint",
  text: "Use the `thread: visibility` command to change thread visibility settings"
}, {
  type: "hint",
  text: "Use the `settings: open in editor` command to configure Amp"
}, {
  type: "hint",
  text: "Use the `agents-md: generate` command to create an AGENTS.md"
}, {
  type: "hint",
  text: "Use Tab/Shift+Tab to navigate to previous messages to edit or restore to a previous state"
}, {
  type: "prompt",
  text: '"Use the oracle to review the code we just wrote."'
}, {
  type: "prompt",
  text: '"Use subagents to update these components to use the new attribute we added."'
}, {
  type: "prompt",
  text: '"Do not write any code yet. Plan first."'
}, {
  type: "prompt",
  text: '"Think hard before you start implementing."'
}, {
  type: "prompt",
  text: `"Use 'psql' to change all blog_posts to have comments"`
}, {
  type: "prompt",
  text: '"Run <build command> and fix all the errors"'
}, {
  type: "quote",
  text: `"We are at the 'introduction of photography' period of programming. Painting by hand just doesn't have the same appeal anymore" - Orta Therox`
}, {
  type: "quote",
  text: '"Programming in the normal way feels like walking. You type out each expression, stepping incrementally toward your goal. When programming with AI, each move is bigger than a step. You lift off the ground." - Mary Rose Cook'
}, {
  type: "quote",
  text: '"Tomorrow all this may change, but right now after daily experience writing code with LLMs I strongly believe the maximum quality of work is reached using the human+LLM equation." - antirez'
}, {
  type: "quote",
  text: `"The magic that's coming now is the most powerful yet. And that means that we're beginning a profound period of exploration and creativity, trying to understand how to make that magic work and to derive new advantages from its power." - Tim O'Reilly`
}, {
  type: "quote",
  text: `"They're applying years of hard-won engineering wisdom to shape and constrain the AI's output. The AI is accelerating their implementation, but their expertise is what keeps the code maintainable." - Addy Osmani`
}, {
  type: "quote",
  text: '"I love computers just for the\u2014sheer machine of it. This is the most exciting new thing that computers have been doing, probably in my lifetime." - DHH'
}, {
  type: "quote",
  text: `"We wouldn't even need to bother looking at the AI-generated code any more, just like we don't bother looking at the machine code generated by a compiler." - Martin Kleppmann`
}, {
  type: "quote",
  text: '"Real progress is messy, iterative, and deeply intertwined with the tools we build. Large language models are the latest, most dramatic example of that truth." - Daniel Lemire'
}, {
  type: "quote",
  text: `"'Human in the loop' is evolving from 'human who fixes AI mistakes' to 'human who directs AI work.'" - Ethan Mollick`
}, {
  type: "quote",
  text: `"I'm trying to code like a surgeon. A surgeon isn't a manager, they do the actual work! But their skills and time are highly leveraged." - Geoffrey Litt`
}, {
  type: "quote",
  text: `"It's important to do things fast. You learn more per unit time because you make contact with reality more frequently." - Nat Friedman`
}, {
  type: "quote",
  text: '"Once coding speed jumps, everything around it becomes the constraint. Your throughput gets capped by whatever is slowest." - Paul Dix'
}, {
  type: "quote",
  text: '"Bubble or no bubble, no one knows anything." - Benedict Evans'
}, {
  type: "quote",
  text: `"I actually don't think documentation is too important: LLMs can read the code a lot faster than you to figure out how to use it." - Simon Willison`
}, {
  type: "quote",
  text: `"The vast majority of AI tokens in the future will be used on things we don't even do today as workers." - Aaron Levie`
}, {
  type: "quote",
  text: `"Once you're airborne, you're suddenly immune to the length of the runway. You have days, not months. Time to break some things." - Kent Beck`
}, {
  type: "quote",
  text: '"Absolutely every fundamental assumption about how I work has to be questioned. There are days when it feels like I would be better off if I did not know anything about programming and started from scratch." - David Crawshaw'
}, {
  type: "quote",
  text: '"Code was the easiest part." - Andrej Karpathy'
}, {
  type: "quote",
  text: `"It's amazing for learning a codebase you're not familiar with, so it's great for discovery. Getting us out of writing boilerplate, getting us out of memorizing APIs, getting us out of looking up that thing from Stack Overflow." - Jeremy Howard`
}, {
  type: "quote",
  text: `"Don't anthropomorphize them!" - Steven Sinofsky`
}], tC0 = {
  primary: {
    r: 140,
    g: 38,
    b: 0
  },
  secondary: {
    r: 255,
    g: 225,
    b: 102
  }
};
$x();
s0();
jR();
lC0 = [{
  long: "neo",
  description: "Use the Neo TUI",
  type: "boolean",
  default: !1
}, {
  long: "url",
  short: "u",
  description: "Amp server URL",
  type: "string",
  default: ""
}, {
  long: "api-key",
  short: "k",
  description: "API key (overrides stored credentials)",
  type: "string",
  default: ""
}], AC0 = Rx0({
  name: "amp neo",
  description: "Start the Neo TUI",
  options: lC0,
  positionals: [],
  action: async ({
    options: T
  }) => gIT(T),
  subcommands: [{
    name: "threads",
    alias: "t",
    description: "List and manage threads",
    options: [],
    positionals: [],
    subcommands: [{
      name: "continue",
      alias: "c",
      description: "Continue an existing thread",
      options: [],
      positionals: [{
        name: "thread-id",
        description: "Thread ID to continue",
        required: !0
      }],
      action: async ({
        globalOptions: T,
        positionals: R
      }) => {
        let a = T;
        if (!R["thread-id"]) throw "must provide thread ID";
        let e = mr(R["thread-id"]);
        if (!e) throw "invalid thread ID";
        await gIT(a, e);
      }
    }]
  }]
});
rR();
na();
vC0 = K.object({
  clientId: K.string().optional(),
  clientSecret: K.string().optional(),
  authUrl: K.string().optional(),
  authorizationUrl: K.string().optional(),
  tokenUrl: K.string().optional(),
  scopes: K.array(K.string()).optional(),
  redirectUrl: K.string().optional(),
  client_id: K.string().optional(),
  client_secret: K.string().optional(),
  auth_url: K.string().optional(),
  authorization_url: K.string().optional(),
  token_url: K.string().optional(),
  redirect_url: K.string().optional()
}).refine(T => {
  let R = T.clientId || T.client_id,
    a = T.authUrl || T.authorizationUrl || T.auth_url || T.authorization_url,
    e = T.tokenUrl || T.token_url;
  return R && a && e;
}, {
  message: "OAuth config requires clientId (or client_id), authUrl/authorizationUrl (or auth_url/authorization_url), and tokenUrl (or token_url)"
}), jC0 = K.object({
  command: K.string(),
  args: K.array(K.string()).optional(),
  env: K.record(K.string(), K.string()).optional()
}).strict(), SC0 = K.looseObject({
  url: K.string(),
  headers: K.record(K.string(), K.string()).optional(),
  transport: K.string().optional(),
  oauth: vC0.optional()
}), OC0 = K.union([jC0, SC0]), dC0 = K.record(K.string(), OC0);
rR();
jR();
kN();
Px();
b9T();
kN();
b9T();
rO();
m9T();
Px();
UC0 = {
  outputResult(T, R, a) {
    let e = {
      tool: T.toolName,
      arguments: R,
      ...(T.context && {
        context: T.context
      }),
      ...(T.threadId && {
        threadId: T.threadId
      }),
      ...a
    };
    T.stdout.write(JSON.stringify(e, null, 2));
  },
  outputError(T, R, a) {
    let e = {
      tool: T.toolName,
      arguments: R,
      ...(T.context && {
        context: T.context
      }),
      ...(T.threadId && {
        threadId: T.threadId
      }),
      ...a
    };
    T.stdout.write(JSON.stringify(e, null, 2));
  }
}, HC0 = {
  outputResult(T, R, a) {
    if (T.stdout.write(`tool: ${T.toolName}
`), T.stdout.write(`arguments: ${JSON.stringify(R)}
`), T.context) T.stdout.write(`context: ${T.context}
`);
    if (T.stdout.write(`action: ${a.action}
`), a.matchedEntry && a.matchIndex !== void 0) T.stdout.write(`matched-rule: ${a.matchIndex}
`);
    if (a.source) T.stdout.write(`source: ${a.source}`);
    if (a.error) T.stdout.write(`error: ${a.error}
`);
  },
  outputError(T, R, a) {
    if (a.details) {
      T.stderr.write(`Error: ${a.error}
`);
      for (let e of a.details) T.stderr.write(`  ${e.path}: ${e.message}
`);
    } else T.stderr.write(`Error testing permissions: ${a.error}
`);
  }
};
rR();
Za();
gc();
s0();
jR();
Ei();
Za();
Ge();
ip();
c40 = K.object({
  filename: K.string(),
  fileSummary: K.string()
}), s40 = K.object({
  summary: K.string(),
  fileOrder: K.array(c40)
});
P0();
jR();
SIT = [["diff", "HEAD"], ["ls-files", "--others", "--exclude-standard"]];
Ks();
rR();
s0();
jR();
rR();
Zt();
s0();
Jk = {
  agentMode: "smart",
  launchCount: 0,
  shortcutsHintUsed: !1
};
JZT = yrT(), dIT = Promise.resolve();
rR();
nDT();
rR();
Lh();
Qt();
Ei();
Am(); /*!
      *  decimal.js v10.5.0
      *  An arbitrary-precision Decimal type for JavaScript.
      *  https://github.com/MikeMcl/decimal.js
      *  Copyright (c) 2025 Michael Mclaughlin <M8ch88l@gmail.com>
      *  MIT Licence
      */
AQ = {
  precision: 20,
  rounding: 4,
  modulo: 1,
  toExpNeg: -7,
  toExpPos: 21,
  minE: -lP,
  maxE: lP,
  crypto: !1
}, DA = XH + "Invalid argument: ", tJT = XH + "Precision limit exceeded", rJT = XH + "crypto unavailable", nt = Math.floor, Ka = Math.pow, C40 = /^0b([01]+(\.[01]*)?|\.[01]+)(p[+-]?\d+)?$/i, L40 = /^0x([0-9a-f]+(\.[0-9a-f]*)?|\.[0-9a-f]+)(p[+-]?\d+)?$/i, M40 = /^0o([0-7]+(\.[0-7]*)?|\.[0-7]+)(p[+-]?\d+)?$/i, iJT = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i, w40 = sB.length - 1, pQ = oB.length - 1, WR = {
  toStringTag: hJT
};
WR.absoluteValue = WR.abs = function () {
  var T = new this.constructor(this);
  if (T.s < 0) T.s = 1;
  return Q0(T);
};
WR.ceil = function () {
  return Q0(new this.constructor(this), this.e + 1, 2);
};
WR.clampedTo = WR.clamp = function (T, R) {
  var a,
    e = this,
    t = e.constructor;
  if (T = new t(T), R = new t(R), !T.s || !R.s) return new t(NaN);
  if (T.gt(R)) throw Error(DA + R);
  return a = e.cmp(T), a < 0 ? T : e.cmp(R) > 0 ? R : new t(e);
};
WR.comparedTo = WR.cmp = function (T) {
  var R,
    a,
    e,
    t,
    r = this,
    h = r.d,
    i = (T = new r.constructor(T)).d,
    c = r.s,
    s = T.s;
  if (!h || !i) return !c || !s ? NaN : c !== s ? c : h === i ? 0 : !h ^ c < 0 ? 1 : -1;
  if (!h[0] || !i[0]) return h[0] ? c : i[0] ? -s : 0;
  if (c !== s) return c;
  if (r.e !== T.e) return r.e > T.e ^ c < 0 ? 1 : -1;
  e = h.length, t = i.length;
  for (R = 0, a = e < t ? e : t; R < a; ++R) if (h[R] !== i[R]) return h[R] > i[R] ^ c < 0 ? 1 : -1;
  return e === t ? 0 : e > t ^ c < 0 ? 1 : -1;
};
WR.cosine = WR.cos = function () {
  var T,
    R,
    a = this,
    e = a.constructor;
  if (!a.d) return new e(NaN);
  if (!a.d[0]) return new e(1);
  return T = e.precision, R = e.rounding, e.precision = T + Math.max(a.e, a.sd()) + s9, e.rounding = 1, a = B40(e, lJT(e, a)), e.precision = T, e.rounding = R, Q0(Zo == 2 || Zo == 3 ? a.neg() : a, T, R, !0);
};
WR.cubeRoot = WR.cbrt = function () {
  var T,
    R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A = this,
    l = A.constructor;
  if (!A.isFinite() || A.isZero()) return new l(A);
  if (g9 = !1, r = A.s * Ka(A.s * A, 0.3333333333333333), !r || Math.abs(r) == 1 / 0) {
    if (a = We(A.d), T = A.e, r = (T - a.length + 1) % 3) a += r == 1 || r == -2 ? "0" : "00";
    if (r = Ka(a, 0.3333333333333333), T = nt((T + 1) / 3) - (T % 3 == (T < 0 ? -1 : 2)), r == 1 / 0) a = "5e" + T;else a = r.toExponential(), a = a.slice(0, a.indexOf("e") + 1) + T;
    e = new l(a), e.s = A.s;
  } else e = new l(r.toString());
  h = (T = l.precision) + 3;
  for (;;) if (i = e, c = i.times(i).times(i), s = c.plus(A), e = c3(s.plus(A).times(i), s.plus(c), h + 2, 1), We(i.d).slice(0, h) === (a = We(e.d)).slice(0, h)) if (a = a.slice(h - 3, h + 1), a == "9999" || !t && a == "4999") {
    if (!t) {
      if (Q0(i, T + 1, 0), i.times(i).times(i).eq(A)) {
        e = i;
        break;
      }
    }
    h += 4, t = 1;
  } else {
    if (!+a || !+a.slice(1) && a.charAt(0) == "5") Q0(e, T + 1, 1), R = !e.times(e).times(e).eq(A);
    break;
  }
  return g9 = !0, Q0(e, T, l.rounding, R);
};
WR.decimalPlaces = WR.dp = function () {
  var T,
    R = this.d,
    a = NaN;
  if (R) {
    if (T = R.length - 1, a = (T - nt(this.e / s9)) * s9, T = R[T], T) for (; T % 10 == 0; T /= 10) a--;
    if (a < 0) a = 0;
  }
  return a;
};
WR.dividedBy = WR.div = function (T) {
  return c3(this, new this.constructor(T));
};
WR.dividedToIntegerBy = WR.divToInt = function (T) {
  var R = this,
    a = R.constructor;
  return Q0(c3(R, new a(T), 0, 1, 1), a.precision, a.rounding);
};
WR.equals = WR.eq = function (T) {
  return this.cmp(T) === 0;
};
WR.floor = function () {
  return Q0(new this.constructor(this), this.e + 1, 3);
};
WR.greaterThan = WR.gt = function (T) {
  return this.cmp(T) > 0;
};
WR.greaterThanOrEqualTo = WR.gte = function (T) {
  var R = this.cmp(T);
  return R == 1 || R === 0;
};
WR.hyperbolicCosine = WR.cosh = function () {
  var T,
    R,
    a,
    e,
    t,
    r = this,
    h = r.constructor,
    i = new h(1);
  if (!r.isFinite()) return new h(r.s ? 1 / 0 : NaN);
  if (r.isZero()) return i;
  if (a = h.precision, e = h.rounding, h.precision = a + Math.max(r.e, r.sd()) + 4, h.rounding = 1, t = r.d.length, t < 32) T = Math.ceil(t / 3), R = (1 / QH(4, T)).toString();else T = 16, R = "2.3283064365386962890625e-10";
  r = Tx(h, 1, r.times(R), new h(1), !0);
  var c,
    s = T,
    A = new h(8);
  for (; s--;) c = r.times(r), r = i.minus(c.times(A.minus(c.times(A))));
  return Q0(r, h.precision = a, h.rounding = e, !0);
};
WR.hyperbolicSine = WR.sinh = function () {
  var T,
    R,
    a,
    e,
    t = this,
    r = t.constructor;
  if (!t.isFinite() || t.isZero()) return new r(t);
  if (R = r.precision, a = r.rounding, r.precision = R + Math.max(t.e, t.sd()) + 4, r.rounding = 1, e = t.d.length, e < 3) t = Tx(r, 2, t, t, !0);else {
    T = 1.4 * Math.sqrt(e), T = T > 16 ? 16 : T | 0, t = t.times(1 / QH(5, T)), t = Tx(r, 2, t, t, !0);
    var h,
      i = new r(5),
      c = new r(16),
      s = new r(20);
    for (; T--;) h = t.times(t), t = t.times(i.plus(h.times(c.times(h).plus(s))));
  }
  return r.precision = R, r.rounding = a, Q0(t, R, a, !0);
};
WR.hyperbolicTangent = WR.tanh = function () {
  var T,
    R,
    a = this,
    e = a.constructor;
  if (!a.isFinite()) return new e(a.s);
  if (a.isZero()) return new e(a);
  return T = e.precision, R = e.rounding, e.precision = T + 7, e.rounding = 1, c3(a.sinh(), a.cosh(), e.precision = T, e.rounding = R);
};
WR.inverseCosine = WR.acos = function () {
  var T = this,
    R = T.constructor,
    a = T.abs().cmp(1),
    e = R.precision,
    t = R.rounding;
  if (a !== -1) return a === 0 ? T.isNeg() ? Cs(R, e, t) : new R(0) : new R(NaN);
  if (T.isZero()) return Cs(R, e + 4, t).times(0.5);
  return R.precision = e + 6, R.rounding = 1, T = new R(1).minus(T).div(T.plus(1)).sqrt().atan(), R.precision = e, R.rounding = t, T.times(2);
};
WR.inverseHyperbolicCosine = WR.acosh = function () {
  var T,
    R,
    a = this,
    e = a.constructor;
  if (a.lte(1)) return new e(a.eq(1) ? 0 : NaN);
  if (!a.isFinite()) return new e(a);
  return T = e.precision, R = e.rounding, e.precision = T + Math.max(Math.abs(a.e), a.sd()) + 4, e.rounding = 1, g9 = !1, a = a.times(a).minus(1).sqrt().plus(a), g9 = !0, e.precision = T, e.rounding = R, a.ln();
};
WR.inverseHyperbolicSine = WR.asinh = function () {
  var T,
    R,
    a = this,
    e = a.constructor;
  if (!a.isFinite() || a.isZero()) return new e(a);
  return T = e.precision, R = e.rounding, e.precision = T + 2 * Math.max(Math.abs(a.e), a.sd()) + 6, e.rounding = 1, g9 = !1, a = a.times(a).plus(1).sqrt().plus(a), g9 = !0, e.precision = T, e.rounding = R, a.ln();
};
WR.inverseHyperbolicTangent = WR.atanh = function () {
  var T,
    R,
    a,
    e,
    t = this,
    r = t.constructor;
  if (!t.isFinite()) return new r(NaN);
  if (t.e >= 0) return new r(t.abs().eq(1) ? t.s / 0 : t.isZero() ? t : NaN);
  if (T = r.precision, R = r.rounding, e = t.sd(), Math.max(e, T) < 2 * -t.e - 1) return Q0(new r(t), T, R, !0);
  return r.precision = a = e - t.e, t = c3(t.plus(1), new r(1).minus(t), a + T, 1), r.precision = T + 4, r.rounding = 1, t = t.ln(), r.precision = T, r.rounding = R, t.times(0.5);
};
WR.inverseSine = WR.asin = function () {
  var T,
    R,
    a,
    e,
    t = this,
    r = t.constructor;
  if (t.isZero()) return new r(t);
  if (R = t.abs().cmp(1), a = r.precision, e = r.rounding, R !== -1) {
    if (R === 0) return T = Cs(r, a + 4, e).times(0.5), T.s = t.s, T;
    return new r(NaN);
  }
  return r.precision = a + 6, r.rounding = 1, t = t.div(new r(1).minus(t.times(t)).sqrt().plus(1)).atan(), r.precision = a, r.rounding = e, t.times(2);
};
WR.inverseTangent = WR.atan = function () {
  var T,
    R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s = this,
    A = s.constructor,
    l = A.precision,
    o = A.rounding;
  if (!s.isFinite()) {
    if (!s.s) return new A(NaN);
    if (l + 4 <= pQ) return h = Cs(A, l + 4, o).times(0.5), h.s = s.s, h;
  } else if (s.isZero()) return new A(s);else if (s.abs().eq(1) && l + 4 <= pQ) return h = Cs(A, l + 4, o).times(0.25), h.s = s.s, h;
  A.precision = i = l + 10, A.rounding = 1, a = Math.min(28, i / s9 + 2 | 0);
  for (T = a; T; --T) s = s.div(s.times(s).plus(1).sqrt().plus(1));
  g9 = !1, R = Math.ceil(i / s9), e = 1, c = s.times(s), h = new A(s), t = s;
  for (; T !== -1;) if (t = t.times(c), r = h.minus(t.div(e += 2)), t = t.times(c), h = r.plus(t.div(e += 2)), h.d[R] !== void 0) for (T = R; h.d[T] === r.d[T] && T--;);
  if (a) h = h.times(2 << a - 1);
  return g9 = !0, Q0(h, A.precision = l, A.rounding = o, !0);
};
WR.isFinite = function () {
  return !!this.d;
};
WR.isInteger = WR.isInt = function () {
  return !!this.d && nt(this.e / s9) > this.d.length - 2;
};
WR.isNaN = function () {
  return !this.s;
};
WR.isNegative = WR.isNeg = function () {
  return this.s < 0;
};
WR.isPositive = WR.isPos = function () {
  return this.s > 0;
};
WR.isZero = function () {
  return !!this.d && this.d[0] === 0;
};
WR.lessThan = WR.lt = function (T) {
  return this.cmp(T) < 0;
};
WR.lessThanOrEqualTo = WR.lte = function (T) {
  return this.cmp(T) < 1;
};
WR.logarithm = WR.log = function (T) {
  var R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s = this,
    A = s.constructor,
    l = A.precision,
    o = A.rounding,
    n = 5;
  if (T == null) T = new A(10), R = !0;else {
    if (T = new A(T), a = T.d, T.s < 0 || !a || !a[0] || T.eq(1)) return new A(NaN);
    R = T.eq(10);
  }
  if (a = s.d, s.s < 0 || !a || !a[0] || s.eq(1)) return new A(a && !a[0] ? -1 / 0 : s.s != 1 ? NaN : a ? 0 : 1 / 0);
  if (R) if (a.length > 1) r = !0;else {
    for (t = a[0]; t % 10 === 0;) t /= 10;
    r = t !== 1;
  }
  if (g9 = !1, i = l + n, h = hA(s, i), e = R ? nB(A, i + 10) : hA(T, i), c = c3(h, e, i, 1), IS(c.d, t = l, o)) do if (i += 10, h = hA(s, i), e = R ? nB(A, i + 10) : hA(T, i), c = c3(h, e, i, 1), !r) {
    if (+We(c.d).slice(t + 1, t + 15) + 1 == 100000000000000) c = Q0(c, l + 1, 0);
    break;
  } while (IS(c.d, t += 10, o));
  return g9 = !0, Q0(c, l, o);
};
WR.minus = WR.sub = function (T) {
  var R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A,
    l,
    o,
    n = this,
    p = n.constructor;
  if (T = new p(T), !n.d || !T.d) {
    if (!n.s || !T.s) T = new p(NaN);else if (n.d) T.s = -T.s;else T = new p(T.d || n.s !== T.s ? n : NaN);
    return T;
  }
  if (n.s != T.s) return T.s = -T.s, n.plus(T);
  if (s = n.d, o = T.d, i = p.precision, c = p.rounding, !s[0] || !o[0]) {
    if (o[0]) T.s = -T.s;else if (s[0]) T = new p(n);else return new p(c === 3 ? -0 : 0);
    return g9 ? Q0(T, i, c) : T;
  }
  if (a = nt(T.e / s9), A = nt(n.e / s9), s = s.slice(), r = A - a, r) {
    if (l = r < 0, l) R = s, r = -r, h = o.length;else R = o, a = A, h = s.length;
    if (e = Math.max(Math.ceil(i / s9), h) + 2, r > e) r = e, R.length = 1;
    R.reverse();
    for (e = r; e--;) R.push(0);
    R.reverse();
  } else {
    if (e = s.length, h = o.length, l = e < h, l) h = e;
    for (e = 0; e < h; e++) if (s[e] != o[e]) {
      l = s[e] < o[e];
      break;
    }
    r = 0;
  }
  if (l) R = s, s = o, o = R, T.s = -T.s;
  h = s.length;
  for (e = o.length - h; e > 0; --e) s[h++] = 0;
  for (e = o.length; e > r;) {
    if (s[--e] < o[e]) {
      for (t = e; t && s[--t] === 0;) s[t] = bc - 1;
      --s[t], s[e] += bc;
    }
    s[e] -= o[e];
  }
  for (; s[--h] === 0;) s.pop();
  for (; s[0] === 0; s.shift()) --a;
  if (!s[0]) return new p(c === 3 ? -0 : 0);
  return T.d = s, T.e = YH(s, a), g9 ? Q0(T, i, c) : T;
};
WR.modulo = WR.mod = function (T) {
  var R,
    a = this,
    e = a.constructor;
  if (T = new e(T), !a.d || !T.s || T.d && !T.d[0]) return new e(NaN);
  if (!T.d || a.d && !a.d[0]) return Q0(new e(a), e.precision, e.rounding);
  if (g9 = !1, e.modulo == 9) R = c3(a, T.abs(), 0, 3, 1), R.s *= T.s;else R = c3(a, T, 0, e.modulo, 1);
  return R = R.times(T), g9 = !0, a.minus(R);
};
WR.naturalExponential = WR.exp = function () {
  return _Q(this);
};
WR.naturalLogarithm = WR.ln = function () {
  return hA(this);
};
WR.negated = WR.neg = function () {
  var T = new this.constructor(this);
  return T.s = -T.s, Q0(T);
};
WR.plus = WR.add = function (T) {
  var R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A,
    l = this,
    o = l.constructor;
  if (T = new o(T), !l.d || !T.d) {
    if (!l.s || !T.s) T = new o(NaN);else if (!l.d) T = new o(T.d || l.s === T.s ? l : NaN);
    return T;
  }
  if (l.s != T.s) return T.s = -T.s, l.minus(T);
  if (s = l.d, A = T.d, i = o.precision, c = o.rounding, !s[0] || !A[0]) {
    if (!A[0]) T = new o(l);
    return g9 ? Q0(T, i, c) : T;
  }
  if (r = nt(l.e / s9), e = nt(T.e / s9), s = s.slice(), t = r - e, t) {
    if (t < 0) a = s, t = -t, h = A.length;else a = A, e = r, h = s.length;
    if (r = Math.ceil(i / s9), h = r > h ? r + 1 : h + 1, t > h) t = h, a.length = 1;
    a.reverse();
    for (; t--;) a.push(0);
    a.reverse();
  }
  if (h = s.length, t = A.length, h - t < 0) t = h, a = A, A = s, s = a;
  for (R = 0; t;) R = (s[--t] = s[t] + A[t] + R) / bc | 0, s[t] %= bc;
  if (R) s.unshift(R), ++e;
  for (h = s.length; s[--h] == 0;) s.pop();
  return T.d = s, T.e = YH(s, e), g9 ? Q0(T, i, c) : T;
};
WR.precision = WR.sd = function (T) {
  var R,
    a = this;
  if (T !== void 0 && T !== !!T && T !== 1 && T !== 0) throw Error(DA + T);
  if (a.d) {
    if (R = cJT(a.d), T && a.e + 1 > R) R = a.e + 1;
  } else R = NaN;
  return R;
};
WR.round = function () {
  var T = this,
    R = T.constructor;
  return Q0(new R(T), T.e + 1, R.rounding);
};
WR.sine = WR.sin = function () {
  var T,
    R,
    a = this,
    e = a.constructor;
  if (!a.isFinite()) return new e(NaN);
  if (a.isZero()) return new e(a);
  return T = e.precision, R = e.rounding, e.precision = T + Math.max(a.e, a.sd()) + s9, e.rounding = 1, a = U40(e, lJT(e, a)), e.precision = T, e.rounding = R, Q0(Zo > 2 ? a.neg() : a, T, R, !0);
};
WR.squareRoot = WR.sqrt = function () {
  var T,
    R,
    a,
    e,
    t,
    r,
    h = this,
    i = h.d,
    c = h.e,
    s = h.s,
    A = h.constructor;
  if (s !== 1 || !i || !i[0]) return new A(!s || s < 0 && (!i || i[0]) ? NaN : i ? h : 1 / 0);
  if (g9 = !1, s = Math.sqrt(+h), s == 0 || s == 1 / 0) {
    if (R = We(i), (R.length + c) % 2 == 0) R += "0";
    if (s = Math.sqrt(R), c = nt((c + 1) / 2) - (c < 0 || c % 2), s == 1 / 0) R = "5e" + c;else R = s.toExponential(), R = R.slice(0, R.indexOf("e") + 1) + c;
    e = new A(R);
  } else e = new A(s.toString());
  a = (c = A.precision) + 3;
  for (;;) if (r = e, e = r.plus(c3(h, r, a + 2, 1)).times(0.5), We(r.d).slice(0, a) === (R = We(e.d)).slice(0, a)) if (R = R.slice(a - 3, a + 1), R == "9999" || !t && R == "4999") {
    if (!t) {
      if (Q0(r, c + 1, 0), r.times(r).eq(h)) {
        e = r;
        break;
      }
    }
    a += 4, t = 1;
  } else {
    if (!+R || !+R.slice(1) && R.charAt(0) == "5") Q0(e, c + 1, 1), T = !e.times(e).eq(h);
    break;
  }
  return g9 = !0, Q0(e, c, A.rounding, T);
};
WR.tangent = WR.tan = function () {
  var T,
    R,
    a = this,
    e = a.constructor;
  if (!a.isFinite()) return new e(NaN);
  if (a.isZero()) return new e(a);
  return T = e.precision, R = e.rounding, e.precision = T + 10, e.rounding = 1, a = a.sin(), a.s = 1, a = c3(a, new e(1).minus(a.times(a)).sqrt(), T + 10, 0), e.precision = T, e.rounding = R, Q0(Zo == 2 || Zo == 4 ? a.neg() : a, T, R, !0);
};
WR.times = WR.mul = function (T) {
  var R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A = this,
    l = A.constructor,
    o = A.d,
    n = (T = new l(T)).d;
  if (T.s *= A.s, !o || !o[0] || !n || !n[0]) return new l(!T.s || o && !o[0] && !n || n && !n[0] && !o ? NaN : !o || !n ? T.s / 0 : T.s * 0);
  if (a = nt(A.e / s9) + nt(T.e / s9), c = o.length, s = n.length, c < s) r = o, o = n, n = r, h = c, c = s, s = h;
  r = [], h = c + s;
  for (e = h; e--;) r.push(0);
  for (e = s; --e >= 0;) {
    R = 0;
    for (t = c + e; t > e;) i = r[t] + n[e] * o[t - e - 1] + R, r[t--] = i % bc | 0, R = i / bc | 0;
    r[t] = (r[t] + R) % bc | 0;
  }
  for (; !r[--h];) r.pop();
  if (R) ++a;else r.shift();
  return T.d = r, T.e = YH(r, a), g9 ? Q0(T, l.precision, l.rounding) : T;
};
WR.toBinary = function (T, R) {
  return krT(this, 2, T, R);
};
WR.toDecimalPlaces = WR.toDP = function (T, R) {
  var a = this,
    e = a.constructor;
  if (a = new e(a), T === void 0) return a;
  if (wr(T, 0, up), R === void 0) R = e.rounding;else wr(R, 0, 8);
  return Q0(a, T + a.e + 1, R);
};
WR.toExponential = function (T, R) {
  var a,
    e = this,
    t = e.constructor;
  if (T === void 0) a = zs(e, !0);else {
    if (wr(T, 0, up), R === void 0) R = t.rounding;else wr(R, 0, 8);
    e = Q0(new t(e), T + 1, R), a = zs(e, !0, T + 1);
  }
  return e.isNeg() && !e.isZero() ? "-" + a : a;
};
WR.toFixed = function (T, R) {
  var a,
    e,
    t = this,
    r = t.constructor;
  if (T === void 0) a = zs(t);else {
    if (wr(T, 0, up), R === void 0) R = r.rounding;else wr(R, 0, 8);
    e = Q0(new r(t), T + t.e + 1, R), a = zs(e, !1, T + e.e + 1);
  }
  return t.isNeg() && !t.isZero() ? "-" + a : a;
};
WR.toFraction = function (T) {
  var R,
    a,
    e,
    t,
    r,
    h,
    i,
    c,
    s,
    A,
    l,
    o,
    n = this,
    p = n.d,
    _ = n.constructor;
  if (!p) return new _(n);
  if (s = a = new _(1), e = c = new _(0), R = new _(e), r = R.e = cJT(p) - n.e - 1, h = r % s9, R.d[0] = Ka(10, h < 0 ? s9 + h : h), T == null) T = r > 0 ? R : s;else {
    if (i = new _(T), !i.isInt() || i.lt(s)) throw Error(DA + i);
    T = i.gt(R) ? r > 0 ? R : s : i;
  }
  g9 = !1, i = new _(We(p)), A = _.precision, _.precision = r = p.length * s9 * 2;
  for (;;) {
    if (l = c3(i, R, 0, 1, 1), t = a.plus(l.times(e)), t.cmp(T) == 1) break;
    a = e, e = t, t = s, s = c.plus(l.times(t)), c = t, t = R, R = i.minus(l.times(t)), i = t;
  }
  return t = c3(T.minus(a), e, 0, 1, 1), c = c.plus(t.times(s)), a = a.plus(t.times(e)), c.s = s.s = n.s, o = c3(s, e, r, 1).minus(n).abs().cmp(c3(c, a, r, 1).minus(n).abs()) < 1 ? [s, e] : [c, a], _.precision = A, g9 = !0, o;
};
WR.toHexadecimal = WR.toHex = function (T, R) {
  return krT(this, 16, T, R);
};
WR.toNearest = function (T, R) {
  var a = this,
    e = a.constructor;
  if (a = new e(a), T == null) {
    if (!a.d) return a;
    T = new e(1), R = e.rounding;
  } else {
    if (T = new e(T), R === void 0) R = e.rounding;else wr(R, 0, 8);
    if (!a.d) return T.s ? a : T;
    if (!T.d) {
      if (T.s) T.s = a.s;
      return T;
    }
  }
  if (T.d[0]) g9 = !1, a = c3(a, T, 0, R, 1).times(T), g9 = !0, Q0(a);else T.s = a.s, a = T;
  return a;
};
WR.toNumber = function () {
  return +this;
};
WR.toOctal = function (T, R) {
  return krT(this, 8, T, R);
};
WR.toPower = WR.pow = function (T) {
  var R,
    a,
    e,
    t,
    r,
    h,
    i = this,
    c = i.constructor,
    s = +(T = new c(T));
  if (!i.d || !T.d || !i.d[0] || !T.d[0]) return new c(Ka(+i, s));
  if (i = new c(i), i.eq(1)) return i;
  if (e = c.precision, r = c.rounding, T.eq(1)) return Q0(i, e, r);
  if (R = nt(T.e / s9), R >= T.d.length - 1 && (a = s < 0 ? -s : s) <= D40) return t = sJT(c, i, a, e), T.s < 0 ? new c(1).div(t) : Q0(t, e, r);
  if (h = i.s, h < 0) {
    if (R < T.d.length - 1) return new c(NaN);
    if ((T.d[R] & 1) == 0) h = 1;
    if (i.e == 0 && i.d[0] == 1 && i.d.length == 1) return i.s = h, i;
  }
  if (a = Ka(+i, s), R = a == 0 || !isFinite(a) ? nt(s * (Math.log("0." + We(i.d)) / Math.LN10 + i.e + 1)) : new c(a + "").e, R > c.maxE + 1 || R < c.minE - 1) return new c(R > 0 ? h / 0 : 0);
  if (g9 = !1, c.rounding = i.s = 1, a = Math.min(12, (R + "").length), t = _Q(T.times(hA(i, e + a)), e), t.d) {
    if (t = Q0(t, e + 5, 1), IS(t.d, e, r)) {
      if (R = e + 10, t = Q0(_Q(T.times(hA(i, R + a)), R), R + 5, 1), +We(t.d).slice(e + 1, e + 15) + 1 == 100000000000000) t = Q0(t, e + 1, 0);
    }
  }
  return t.s = h, g9 = !0, c.rounding = r, Q0(t, e, r);
};
WR.toPrecision = function (T, R) {
  var a,
    e = this,
    t = e.constructor;
  if (T === void 0) a = zs(e, e.e <= t.toExpNeg || e.e >= t.toExpPos);else {
    if (wr(T, 1, up), R === void 0) R = t.rounding;else wr(R, 0, 8);
    e = Q0(new t(e), T, R), a = zs(e, T <= e.e || e.e <= t.toExpNeg, T);
  }
  return e.isNeg() && !e.isZero() ? "-" + a : a;
};
WR.toSignificantDigits = WR.toSD = function (T, R) {
  var a = this,
    e = a.constructor;
  if (T === void 0) T = e.precision, R = e.rounding;else if (wr(T, 1, up), R === void 0) R = e.rounding;else wr(R, 0, 8);
  return Q0(new e(a), T, R);
};
WR.toString = function () {
  var T = this,
    R = T.constructor,
    a = zs(T, T.e <= R.toExpNeg || T.e >= R.toExpPos);
  return T.isNeg() && !T.isZero() ? "-" + a : a;
};
WR.truncated = WR.trunc = function () {
  return Q0(new this.constructor(this), this.e + 1, 1);
};
WR.valueOf = WR.toJSON = function () {
  var T = this,
    R = T.constructor,
    a = zs(T, T.e <= R.toExpNeg || T.e >= R.toExpPos);
  return T.isNeg() ? "-" + a : a;
};
c3 = function () {
  function T(e, t, r) {
    var h,
      i = 0,
      c = e.length;
    for (e = e.slice(); c--;) h = e[c] * t + i, e[c] = h % r | 0, i = h / r | 0;
    if (i) e.unshift(i);
    return e;
  }
  function R(e, t, r, h) {
    var i, c;
    if (r != h) c = r > h ? 1 : -1;else for (i = c = 0; i < r; i++) if (e[i] != t[i]) {
      c = e[i] > t[i] ? 1 : -1;
      break;
    }
    return c;
  }
  function a(e, t, r, h) {
    var i = 0;
    for (; r--;) e[r] -= i, i = e[r] < t[r] ? 1 : 0, e[r] = i * h + e[r] - t[r];
    for (; !e[0] && e.length > 1;) e.shift();
  }
  return function (e, t, r, h, i, c) {
    var s,
      A,
      l,
      o,
      n,
      p,
      _,
      m,
      b,
      y,
      u,
      P,
      k,
      x,
      f,
      v,
      g,
      I,
      S,
      O,
      j = e.constructor,
      d = e.s == t.s ? 1 : -1,
      C = e.d,
      L = t.d;
    if (!C || !C[0] || !L || !L[0]) return new j(!e.s || !t.s || (C ? L && C[0] == L[0] : !L) ? NaN : C && C[0] == 0 || !L ? d * 0 : d / 0);
    if (c) n = 1, A = e.e - t.e;else c = bc, n = s9, A = nt(e.e / n) - nt(t.e / n);
    S = L.length, g = C.length, b = new j(d), y = b.d = [];
    for (l = 0; L[l] == (C[l] || 0); l++);
    if (L[l] > (C[l] || 0)) A--;
    if (r == null) x = r = j.precision, h = j.rounding;else if (i) x = r + (e.e - t.e) + 1;else x = r;
    if (x < 0) y.push(1), p = !0;else {
      if (x = x / n + 2 | 0, l = 0, S == 1) {
        o = 0, L = L[0], x++;
        for (; (l < g || o) && x--; l++) f = o * c + (C[l] || 0), y[l] = f / L | 0, o = f % L | 0;
        p = o || l < g;
      } else {
        if (o = c / (L[0] + 1) | 0, o > 1) L = T(L, o, c), C = T(C, o, c), S = L.length, g = C.length;
        v = S, u = C.slice(0, S), P = u.length;
        for (; P < S;) u[P++] = 0;
        if (O = L.slice(), O.unshift(0), I = L[0], L[1] >= c / 2) ++I;
        do {
          if (o = 0, s = R(L, u, S, P), s < 0) {
            if (k = u[0], S != P) k = k * c + (u[1] || 0);
            if (o = k / I | 0, o > 1) {
              if (o >= c) o = c - 1;
              if (_ = T(L, o, c), m = _.length, P = u.length, s = R(_, u, m, P), s == 1) o--, a(_, S < m ? O : L, m, c);
            } else {
              if (o == 0) s = o = 1;
              _ = L.slice();
            }
            if (m = _.length, m < P) _.unshift(0);
            if (a(u, _, P, c), s == -1) {
              if (P = u.length, s = R(L, u, S, P), s < 1) o++, a(u, S < P ? O : L, P, c);
            }
            P = u.length;
          } else if (s === 0) o++, u = [0];
          if (y[l++] = o, s && u[0]) u[P++] = C[v] || 0;else u = [C[v]], P = 1;
        } while ((v++ < g || u[0] !== void 0) && x--);
        p = u[0] !== void 0;
      }
      if (!y[0]) y.shift();
    }
    if (n == 1) b.e = A, eJT = p;else {
      for (l = 1, o = y[0]; o >= 10; o /= 10) l++;
      b.e = l + A * n - 1, Q0(b, i ? r + b.e + 1 : r, h, p);
    }
    return b;
  };
}();
WR[Symbol.for("nodejs.util.inspect.custom")] = WR.toString;
WR[Symbol.toStringTag] = "Decimal";
ZH = WR.constructor = AJT(AQ);
sB = new ZH(sB);
oB = new ZH(oB);
Ks();
nm();
Ix();
Ci();
nm();
Ix();
F8();
Ci();
Bx();
O0();
jR();
HL0 = {
  builtin: {
    label: "Built-in",
    pathHint: ""
  },
  "mcp-workspace": {
    label: "MCP Workspace",
    pathHint: ".amp/settings.json"
  },
  "mcp-global": {
    label: "MCP Global",
    pathHint: "~/.config/amp/settings.json"
  },
  "mcp-flag": {
    label: "MCP (--mcp-config)",
    pathHint: ""
  },
  "mcp-other": {
    label: "MCP",
    pathHint: ""
  },
  toolbox: {
    label: "Toolbox",
    pathHint: ""
  },
  plugin: {
    label: "Plugin",
    pathHint: ".amp/plugins/"
  },
  other: {
    label: "Other",
    pathHint: ""
  }
};
um();
s0();
FL0 = {
  ...He,
  async chmod(T, R) {
    await bJT.promises.chmod(I8(T).fsPath, R);
    return;
  }
};
jR();
oa();
jR();
TM0 = c0(M9T(), 1);
O0();
jR();
O0();
jR();
O0();
P0();
mM0 = /<[^>]+>/g, uM0 = /<ENCRYPTED>[\s\S]*?<\/ENCRYPTED>/g, yM0 = /<ID>[\s\S]*?<\/ID>/g, PJT = /^#+\s+(.+)$/, kJT = /^\*\*(.+?)(?:\*\*|$)$/;
rR();
EU();
O0();
jR();
rR();
L8();
Za();
mm();
T8T();
O0();
ap();
VWT();
P0();
s0();
jR();
Jt();
O0();
O0();
O0();
jR();
a5T();
F8();
bO();
O0();
op();
jR();
L8();
O0();
op();
jR();
rR();
jR();
rR();
rR();
Ci();
jR();
$c();
s0();
WJT = {
  name: "terminal",
  label: "Terminal",
  source: {
    type: "builtin"
  },
  buildBaseTheme: T => T.rgbColors ? Gt.withRgb(T.rgbColors) : Gt.default(),
  buildAppTheme: (T, R) => Xa.fromBaseTheme(R, T.background)
}, UIT = {
  background: LT.rgb(11, 13, 11),
  foreground: LT.rgb(246, 255, 245),
  mutedForeground: LT.rgb(156, 156, 156),
  border: LT.rgb(135, 139, 134),
  selection: LT.rgb(135, 139, 134, 0.35),
  primary: LT.rgb(27, 135, 243),
  secondary: LT.rgb(24, 144, 154),
  accent: LT.rgb(234, 123, 188),
  success: LT.rgb(43, 161, 43),
  warning: LT.rgb(255, 183, 27),
  info: LT.rgb(66, 161, 255),
  destructive: LT.rgb(189, 43, 43),
  copyHighlight: LT.rgb(238, 170, 43),
  tableBorder: LT.rgb(135, 139, 134, 0.2),
  cursor: LT.rgb(246, 255, 245),
  isLight: !1,
  syntaxHighlight: {
    keyword: LT.rgb(255, 122, 198),
    string: LT.rgb(241, 250, 137),
    number: LT.rgb(191, 149, 249),
    comment: LT.rgb(98, 109, 167),
    function: LT.rgb(117, 219, 240),
    variable: LT.rgb(246, 255, 245),
    type: LT.rgb(82, 250, 124),
    operator: LT.rgb(246, 255, 245)
  }
}, HIT = {
  background: LT.rgb(250, 250, 248),
  foreground: LT.rgb(11, 13, 11),
  mutedForeground: LT.rgb(89, 89, 89),
  border: LT.rgb(135, 139, 134),
  selection: LT.rgb(135, 139, 134, 0.2),
  primary: LT.rgb(11, 115, 218),
  secondary: LT.rgb(27, 118, 126),
  accent: LT.rgb(189, 40, 127),
  success: LT.rgb(42, 111, 42),
  warning: LT.rgb(158, 110, 5),
  info: LT.rgb(0, 128, 255),
  destructive: LT.rgb(212, 68, 68),
  copyHighlight: LT.rgb(189, 128, 15),
  tableBorder: LT.rgb(135, 139, 134, 0.2),
  cursor: LT.rgb(11, 13, 11),
  isLight: !0,
  syntaxHighlight: {
    keyword: LT.rgb(195, 34, 125),
    string: LT.rgb(141, 152, 27),
    number: LT.rgb(92, 41, 163),
    comment: LT.rgb(123, 128, 157),
    function: LT.rgb(20, 156, 184),
    variable: LT.rgb(11, 13, 11),
    type: LT.rgb(36, 143, 62),
    operator: LT.rgb(11, 13, 11)
  }
}, WIT = {
  background: LT.rgb(30, 30, 46),
  foreground: LT.rgb(205, 214, 244),
  mutedForeground: LT.rgb(166, 173, 200),
  border: LT.rgb(108, 112, 134),
  selection: LT.rgb(88, 91, 112, 0.6),
  primary: LT.rgb(137, 180, 250),
  secondary: LT.rgb(116, 199, 236),
  accent: LT.rgb(245, 194, 231),
  success: LT.rgb(166, 227, 161),
  warning: LT.rgb(249, 226, 175),
  info: LT.rgb(137, 180, 250),
  destructive: LT.rgb(243, 139, 168),
  copyHighlight: LT.rgb(250, 179, 135),
  tableBorder: LT.rgb(108, 112, 134, 0.4),
  cursor: LT.rgb(205, 214, 244),
  isLight: !1,
  syntaxHighlight: {
    keyword: LT.rgb(203, 166, 247),
    string: LT.rgb(166, 227, 161),
    number: LT.rgb(250, 179, 135),
    comment: LT.rgb(127, 132, 156),
    function: LT.rgb(137, 180, 250),
    variable: LT.rgb(205, 214, 244),
    type: LT.rgb(249, 226, 175),
    operator: LT.rgb(148, 226, 213)
  }
}, qIT = {
  background: LT.rgb(0, 43, 54),
  foreground: LT.rgb(147, 161, 161),
  mutedForeground: LT.rgb(101, 123, 131),
  border: LT.rgb(88, 110, 117),
  selection: LT.rgb(7, 54, 66, 0.6),
  primary: LT.rgb(38, 139, 210),
  secondary: LT.rgb(42, 161, 152),
  accent: LT.rgb(181, 137, 0),
  success: LT.rgb(133, 153, 0),
  warning: LT.rgb(203, 75, 22),
  info: LT.rgb(38, 139, 210),
  destructive: LT.rgb(220, 50, 47),
  copyHighlight: LT.rgb(108, 113, 196),
  tableBorder: LT.rgb(88, 110, 117, 0.4),
  cursor: LT.rgb(147, 161, 161),
  isLight: !1,
  syntaxHighlight: {
    keyword: LT.rgb(133, 153, 0),
    string: LT.rgb(42, 161, 152),
    number: LT.rgb(211, 54, 130),
    comment: LT.rgb(88, 110, 117),
    function: LT.rgb(38, 139, 210),
    variable: LT.rgb(181, 137, 0),
    type: LT.rgb(203, 75, 22),
    operator: LT.rgb(147, 161, 161)
  }
}, zIT = {
  background: LT.rgb(253, 246, 227),
  foreground: LT.rgb(101, 123, 131),
  mutedForeground: LT.rgb(147, 161, 161),
  border: LT.rgb(147, 161, 161),
  selection: LT.rgb(238, 232, 213, 0.7),
  primary: LT.rgb(38, 139, 210),
  secondary: LT.rgb(42, 161, 152),
  accent: LT.rgb(181, 137, 0),
  success: LT.rgb(133, 153, 0),
  warning: LT.rgb(203, 75, 22),
  info: LT.rgb(38, 139, 210),
  destructive: LT.rgb(220, 50, 47),
  copyHighlight: LT.rgb(108, 113, 196),
  tableBorder: LT.rgb(147, 161, 161, 0.3),
  cursor: LT.rgb(101, 123, 131),
  isLight: !0,
  syntaxHighlight: {
    keyword: LT.rgb(133, 153, 0),
    string: LT.rgb(42, 161, 152),
    number: LT.rgb(211, 54, 130),
    comment: LT.rgb(147, 161, 161),
    function: LT.rgb(38, 139, 210),
    variable: LT.rgb(181, 137, 0),
    type: LT.rgb(203, 75, 22),
    operator: LT.rgb(101, 123, 131)
  }
}, FIT = {
  background: LT.rgb(29, 32, 33),
  foreground: LT.rgb(235, 219, 178),
  mutedForeground: LT.rgb(168, 153, 132),
  border: LT.rgb(102, 92, 84),
  selection: LT.rgb(60, 56, 54, 0.6),
  primary: LT.rgb(250, 189, 47),
  secondary: LT.rgb(131, 165, 152),
  accent: LT.rgb(211, 134, 155),
  success: LT.rgb(184, 187, 38),
  warning: LT.rgb(254, 128, 25),
  info: LT.rgb(131, 165, 152),
  destructive: LT.rgb(251, 73, 52),
  copyHighlight: LT.rgb(215, 153, 33),
  tableBorder: LT.rgb(102, 92, 84, 0.4),
  cursor: LT.rgb(235, 219, 178),
  isLight: !1,
  syntaxHighlight: {
    keyword: LT.rgb(251, 73, 52),
    string: LT.rgb(184, 187, 38),
    number: LT.rgb(211, 134, 155),
    comment: LT.rgb(146, 131, 116),
    function: LT.rgb(250, 189, 47),
    variable: LT.rgb(235, 219, 178),
    type: LT.rgb(142, 192, 124),
    operator: LT.rgb(254, 128, 25)
  }
}, GIT = {
  background: LT.rgb(46, 52, 64),
  foreground: LT.rgb(216, 222, 233),
  mutedForeground: LT.rgb(163, 171, 184),
  border: LT.rgb(76, 86, 106),
  selection: LT.rgb(59, 66, 82, 0.8),
  primary: LT.rgb(136, 192, 208),
  secondary: LT.rgb(129, 161, 193),
  accent: LT.rgb(180, 142, 173),
  success: LT.rgb(163, 190, 140),
  warning: LT.rgb(235, 203, 139),
  info: LT.rgb(94, 129, 172),
  destructive: LT.rgb(191, 97, 106),
  copyHighlight: LT.rgb(208, 135, 112),
  tableBorder: LT.rgb(76, 86, 106, 0.4),
  cursor: LT.rgb(216, 222, 233),
  isLight: !1,
  syntaxHighlight: {
    keyword: LT.rgb(129, 161, 193),
    string: LT.rgb(163, 190, 140),
    number: LT.rgb(180, 142, 173),
    comment: LT.rgb(97, 110, 136),
    function: LT.rgb(136, 192, 208),
    variable: LT.rgb(216, 222, 233),
    type: LT.rgb(143, 188, 187),
    operator: LT.rgb(129, 161, 193)
  }
}, DD0 = {
  name: "dark",
  label: "Dark",
  source: {
    type: "builtin"
  },
  background: "dark",
  buildBaseTheme: () => Pp(UIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, UIT)
  })
}, wD0 = {
  name: "light",
  label: "Light",
  source: {
    type: "builtin"
  },
  background: "light",
  buildBaseTheme: () => Pp(HIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, HIT)
  })
}, BD0 = {
  name: "catppuccin-mocha",
  label: "Catppuccin Mocha",
  source: {
    type: "builtin"
  },
  background: "dark",
  buildBaseTheme: () => Pp(WIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, WIT)
  })
}, ND0 = {
  name: "solarized-dark",
  label: "Solarized Dark",
  source: {
    type: "builtin"
  },
  background: "dark",
  buildBaseTheme: () => Pp(qIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, qIT)
  })
}, UD0 = {
  name: "solarized-light",
  label: "Solarized Light",
  source: {
    type: "builtin"
  },
  background: "light",
  buildBaseTheme: () => Pp(zIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, zIT)
  })
}, HD0 = {
  name: "gruvbox-dark-hard",
  label: "Gruvbox Dark Hard",
  source: {
    type: "builtin"
  },
  background: "dark",
  buildBaseTheme: () => Pp(FIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, FIT)
  })
}, WD0 = {
  name: "nord",
  label: "Nord",
  source: {
    type: "builtin"
  },
  background: "dark",
  buildBaseTheme: () => Pp(GIT),
  buildAppTheme: (T, R) => new Xa({
    base: R,
    app: yp(R.colorScheme, GIT)
  })
}, qJT = [WJT, DD0, wD0, BD0, ND0, UD0, HD0, WD0], drT = new Map();
rR(); /*!
      * Copyright (c) Squirrel Chat et al., All rights reserved.
      * SPDX-License-Identifier: BSD-3-Clause
      *
      * Redistribution and use in source and binary forms, with or without
      * modification, are permitted provided that the following conditions are met:
      *
      * 1. Redistributions of source code must retain the above copyright notice, this
      *    list of conditions and the following disclaimer.
      * 2. Redistributions in binary form must reproduce the above copyright notice,
      *    this list of conditions and the following disclaimer in the
      *    documentation and/or other materials provided with the distribution.
      * 3. Neither the name of the copyright holder nor the names of its contributors
      *    may be used to endorse or promote products derived from this software without
      *    specific prior written permission.
      *
      * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
      * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
      * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
      * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
      * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
      * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
      * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
      * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
      * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
      * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
      */

/*!
* Copyright (c) Squirrel Chat et al., All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
* 1. Redistributions of source code must retain the above copyright notice, this
*    list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright notice,
*    this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
* 3. Neither the name of the copyright holder nor the names of its contributors
*    may be used to endorse or promote products derived from this software without
*    specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
* FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
* DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
* SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
* CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
* OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
* OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/ /*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */
QD0 = /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;
/*!
* Copyright (c) Squirrel Chat et al., All rights reserved.
* SPDX-License-Identifier: BSD-3-Clause
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*
* 1. Redistributions of source code must retain the above copyright notice, this
*    list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright notice,
*    this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
* 3. Neither the name of the copyright holder nor the names of its contributors
*    may be used to endorse or promote products derived from this software without
*    specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
* ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
* FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
* DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
* SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
* CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
* OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
* OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
ZD0 = /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/, JD0 = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/, T70 = /^[+-]?0[0-9_]/, R70 = /^[0-9a-f]{2,8}$/i, XIT = {
  b: "\b",
  t: "\t",
  n: `
`,
  f: "\f",
  r: "\r",
  e: "\x1B",
  '"': '"',
  "\\": "\\"
}; /*!
   * Copyright (c) Squirrel Chat et al., All rights reserved.
   * SPDX-License-Identifier: BSD-3-Clause
   *
   * Redistribution and use in source and binary forms, with or without
   * modification, are permitted provided that the following conditions are met:
   *
   * 1. Redistributions of source code must retain the above copyright notice, this
   *    list of conditions and the following disclaimer.
   * 2. Redistributions in binary form must reproduce the above copyright notice,
   *    this list of conditions and the following disclaimer in the
   *    documentation and/or other materials provided with the distribution.
   * 3. Neither the name of the copyright holder nor the names of its contributors
   *    may be used to endorse or promote products derived from this software without
   *    specific prior written permission.
   *
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   */ /*!
      * Copyright (c) Squirrel Chat et al., All rights reserved.
      * SPDX-License-Identifier: BSD-3-Clause
      *
      * Redistribution and use in source and binary forms, with or without
      * modification, are permitted provided that the following conditions are met:
      *
      * 1. Redistributions of source code must retain the above copyright notice, this
      *    list of conditions and the following disclaimer.
      * 2. Redistributions in binary form must reproduce the above copyright notice,
      *    this list of conditions and the following disclaimer in the
      *    documentation and/or other materials provided with the distribution.
      * 3. Neither the name of the copyright holder nor the names of its contributors
      *    may be used to endorse or promote products derived from this software without
      *    specific prior written permission.
      *
      * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
      * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
      * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
      * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
      * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
      * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
      * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
      * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
      * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
      * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
      */
t70 = /^[a-zA-Z0-9-_]+[ \t]*$/; /*!
                                * Copyright (c) Squirrel Chat et al., All rights reserved.
                                * SPDX-License-Identifier: BSD-3-Clause
                                *
                                * Redistribution and use in source and binary forms, with or without
                                * modification, are permitted provided that the following conditions are met:
                                *
                                * 1. Redistributions of source code must retain the above copyright notice, this
                                *    list of conditions and the following disclaimer.
                                * 2. Redistributions in binary form must reproduce the above copyright notice,
                                *    this list of conditions and the following disclaimer in the
                                *    documentation and/or other materials provided with the distribution.
                                * 3. Neither the name of the copyright holder nor the names of its contributors
                                *    may be used to endorse or promote products derived from this software without
                                *    specific prior written permission.
                                *
                                * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
                                * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
                                * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
                                * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
                                * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
                                * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
                                * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
                                * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
                                * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
                                * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                                */ /*!
                                   * Copyright (c) Squirrel Chat et al., All rights reserved.
                                   * SPDX-License-Identifier: BSD-3-Clause
                                   *
                                   * Redistribution and use in source and binary forms, with or without
                                   * modification, are permitted provided that the following conditions are met:
                                   *
                                   * 1. Redistributions of source code must retain the above copyright notice, this
                                   *    list of conditions and the following disclaimer.
                                   * 2. Redistributions in binary form must reproduce the above copyright notice,
                                   *    this list of conditions and the following disclaimer in the
                                   *    documentation and/or other materials provided with the distribution.
                                   * 3. Neither the name of the copyright holder nor the names of its contributors
                                   *    may be used to endorse or promote products derived from this software without
                                   *    specific prior written permission.
                                   *
                                   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
                                   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
                                   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
                                   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
                                   * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
                                   * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
                                   * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
                                   * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
                                   * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
                                   * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                                   */ /*!
                                      * Copyright (c) Squirrel Chat et al., All rights reserved.
                                      * SPDX-License-Identifier: BSD-3-Clause
                                      *
                                      * Redistribution and use in source and binary forms, with or without
                                      * modification, are permitted provided that the following conditions are met:
                                      *
                                      * 1. Redistributions of source code must retain the above copyright notice, this
                                      *    list of conditions and the following disclaimer.
                                      * 2. Redistributions in binary form must reproduce the above copyright notice,
                                      *    this list of conditions and the following disclaimer in the
                                      *    documentation and/or other materials provided with the distribution.
                                      * 3. Neither the name of the copyright holder nor the names of its contributors
                                      *    may be used to endorse or promote products derived from this software without
                                      *    specific prior written permission.
                                      *
                                      * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
                                      * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
                                      * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
                                      * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
                                      * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
                                      * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
                                      * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
                                      * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
                                      * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
                                      * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                                      */

rR();
oa();
zS();
FA();
de();
F8();
PU();
dm();
jR();
v70 = new Map([[0, 65533], [128, 8364], [130, 8218], [131, 402], [132, 8222], [133, 8230], [134, 8224], [135, 8225], [136, 710], [137, 8240], [138, 352], [139, 8249], [140, 338], [142, 381], [145, 8216], [146, 8217], [147, 8220], [148, 8221], [149, 8226], [150, 8211], [151, 8212], [152, 732], [153, 8482], [154, 353], [155, 8250], [156, 339], [158, 382], [159, 376]]), j70 = (XF = String.fromCodePoint) !== null && XF !== void 0 ? XF : T => {
  let R = "";
  if (T > 65535) T -= 65536, R += String.fromCharCode(T >>> 10 & 1023 | 55296), T = 56320 | T & 1023;
  return R += String.fromCharCode(T), R;
};
O70 = JJT("QR08ALkAAgH6AYsDNQR2BO0EPgXZBQEGLAbdBxMISQrvCmQLfQurDKQNLw4fD4YPpA+6D/IPAAAAAAAAAAAAAAAAKhBMEY8TmxUWF2EYLBkxGuAa3RsJHDscWR8YIC8jSCSIJcMl6ie3Ku8rEC0CLjoupS7kLgAIRU1hYmNmZ2xtbm9wcnN0dVQAWgBeAGUAaQBzAHcAfgCBAIQAhwCSAJoAoACsALMAbABpAGcAO4DGAMZAUAA7gCYAJkBjAHUAdABlADuAwQDBQHIiZXZlAAJhAAFpeW0AcgByAGMAO4DCAMJAEGRyAADgNdgE3XIAYQB2AGUAO4DAAMBA8CFoYZFj4SFjcgBhZAAAoFMqAAFncIsAjgBvAG4ABGFmAADgNdg43fAlbHlGdW5jdGlvbgCgYSBpAG4AZwA7gMUAxUAAAWNzpACoAHIAAOA12Jzc6SFnbgCgVCJpAGwAZABlADuAwwDDQG0AbAA7gMQAxEAABGFjZWZvcnN1xQDYANoA7QDxAPYA+QD8AAABY3LJAM8AayNzbGFzaAAAoBYidgHTANUAAKDnKmUAZAAAoAYjeQARZIABY3J0AOAA5QDrAGEidXNlAACgNSLuI291bGxpcwCgLCFhAJJjcgAA4DXYBd1wAGYAAOA12Dnd5SF2ZdhiYwDyAOoAbSJwZXEAAKBOIgAHSE9hY2RlZmhpbG9yc3UXARoBHwE6AVIBVQFiAWQBZgGCAakB6QHtAfIBYwB5ACdkUABZADuAqQCpQIABY3B5ACUBKAE1AfUhdGUGYWmg0iJ0KGFsRGlmZmVyZW50aWFsRAAAoEUhbCJleXMAAKAtIQACYWVpb0EBRAFKAU0B8iFvbgxhZABpAGwAO4DHAMdAcgBjAAhhbiJpbnQAAKAwIm8AdAAKYQABZG5ZAV0BaSJsbGEAuGB0I2VyRG90ALdg8gA5AWkAp2NyImNsZQAAAkRNUFRwAXQBeQF9AW8AdAAAoJkiaSJudXMAAKCWIuwhdXMAoJUiaSJtZXMAAKCXIm8AAAFjc4cBlAFrKndpc2VDb250b3VySW50ZWdyYWwAAKAyImUjQ3VybHkAAAFEUZwBpAFvJXVibGVRdW90ZQAAoB0gdSJvdGUAAKAZIAACbG5wdbABtgHNAdgBbwBuAGWgNyIAoHQqgAFnaXQAvAHBAcUB8iJ1ZW50AKBhIm4AdAAAoC8i7yV1ckludGVncmFsAKAuIgABZnLRAdMBAKACIe8iZHVjdACgECJuLnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbAAAoDMi7yFzcwCgLypjAHIAAOA12J7ccABDoNMiYQBwAACgTSKABURKU1phY2VmaW9zAAsCEgIVAhgCGwIsAjQCOQI9AnMCfwNvoEUh9CJyYWhkAKARKWMAeQACZGMAeQAFZGMAeQAPZIABZ3JzACECJQIoAuchZXIAoCEgcgAAoKEhaAB2AACg5CoAAWF5MAIzAvIhb24OYRRkbAB0oAciYQCUY3IAAOA12AfdAAFhZkECawIAAWNtRQJnAvIjaXRpY2FsAAJBREdUUAJUAl8CYwJjInV0ZQC0YG8AdAFZAloC2WJiJGxlQWN1dGUA3WJyImF2ZQBgYGkibGRlANxi7yFuZACgxCJmJWVyZW50aWFsRAAAoEYhcAR9AgAAAAAAAIECjgIAABoDZgAA4DXYO91EoagAhQKJAm8AdAAAoNwgcSJ1YWwAAKBQIuIhbGUAA0NETFJVVpkCqAK1Au8C/wIRA28AbgB0AG8AdQByAEkAbgB0AGUAZwByAGEA7ADEAW8AdAKvAgAAAACwAqhgbiNBcnJvdwAAoNMhAAFlb7kC0AJmAHQAgAFBUlQAwQLGAs0CciJyb3cAAKDQIekkZ2h0QXJyb3cAoNQhZQDlACsCbgBnAAABTFLWAugC5SFmdAABQVLcAuECciJyb3cAAKD4J+kkZ2h0QXJyb3cAoPon6SRnaHRBcnJvdwCg+SdpImdodAAAAUFU9gL7AnIicm93AACg0iFlAGUAAKCoInAAQQIGAwAAAAALA3Iicm93AACg0SFvJHduQXJyb3cAAKDVIWUlcnRpY2FsQmFyAACgJSJuAAADQUJMUlRhJAM2AzoDWgNxA3oDciJyb3cAAKGTIUJVLAMwA2EAcgAAoBMpcCNBcnJvdwAAoPUhciJldmUAEWPlIWZ00gJDAwAASwMAAFIDaSVnaHRWZWN0b3IAAKBQKWUkZVZlY3RvcgAAoF4p5SJjdG9yQqC9IWEAcgAAoFYpaSJnaHQA1AFiAwAAaQNlJGVWZWN0b3IAAKBfKeUiY3RvckKgwSFhAHIAAKBXKWUAZQBBoKQiciJyb3cAAKCnIXIAcgBvAPcAtAIAAWN0gwOHA3IA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YwAAoN8i4SFycnCgtiEAoD0pgKIqImJjZG9zACsVMBU6FT4VQRVyImNhcAAAoEgqAAFhdTQVNxVwAACgRipwAACgSipvAHQAAKCNInIAAKBFKgDgKiIA/gACYWxydksVURVuFXMVcgByAG2gtyEAoDwpeQCAAWV2dwBYFWUVaRVxAHACXxUAAAAAYxVyAGUA4wAXFXUA4wAZFWUAZQAAoM4iZSJkZ2UAAKDPImUAbgA7gKQApEBlI2Fycm93AAABbHJ7FX8V5SFmdACgtiFpImdodAAAoLchZQDkAG0VAAFjaYsVkRVvAG4AaQBuAPQAkwFuAHQAAKAxImwiY3R5AACgLSOACUFIYWJjZGVmaGlqbG9yc3R1d3oAuBW7Fb8V1RXgFegV+RUKFhUWHxZUFlcWZRbFFtsW7xb7FgUXChdyAPIAtAJhAHIAAKBlKQACZ2xyc8YVyhXOFdAV5yFlcgCgICDlIXRoAKA4IfIA9QxoAHagECAAoKMiawHZFd4VYSJyb3cAAKAPKWEA4wBfAgABYXnkFecV8iFvbg9hNGQAoUYhYW/tFfQVAAFnciEC8RVyAACgyiF0InNlcQAAoHcqgAFnbG0A/xUCFgUWO4CwALBAdABhALRjcCJ0eXYAAKCxKQABaXIOFhIW8yFodACgfykA4DXYId1hAHIAAAFschsWHRYAoMMhAKDCIYACYWVnc3YAKBauAjYWOhY+Fm0AAKHEIm9zLhY0Fm4AZABzoMQi9SFpdACgZiZhIm1tYQDdY2kAbgAAoPIiAKH3AGlvQxZRFmQAZQAAgfcAO29KFksW90BuI3RpbWVzAACgxyJuAPgAUBZjAHkAUmRjAG8CXhYAAAAAYhZyAG4AAKAeI28AcAAAoA0jgAJscHR1dwBuFnEWdRaSFp4W7CFhciRgZgAA4DXYVd0AotkCZW1wc30WhBaJFo0WcQBkoFAibwB0AACgUSJpIm51cwAAoDgi7CF1cwCgFCLxInVhcmUAoKEiYgBsAGUAYgBhAHIAdwBlAGQAZwDlANcAbgCAAWFkaAClFqoWtBZyAHIAbwD3APUMbwB3AG4AYQByAHIAbwB3APMA8xVhI3Jwb29uAAABbHK8FsAWZQBmAPQAHBZpAGcAaAD0AB4WYgHJFs8WawBhAHIAbwD3AJILbwLUFgAAAADYFnIAbgAAoB8jbwBwAACgDCOAAWNvdADhFukW7BYAAXJ55RboFgDgNdi53FVkbAAAoPYp8iFvaxFhAAFkcvMW9xZvAHQAAKDxImkA5qC/JVsSAAFhaP8WAhdyAPIANQNhAPIA1wvhIm5nbGUAoKYpAAFjaQ4XEBd5AF9k5yJyYXJyAKD/JwAJRGFjZGVmZ2xtbm9wcXJzdHV4MRc4F0YXWxcyBF4XaRd5F40XrBe0F78X2RcVGCEYLRg1GEAYAAFEbzUXgRZvAPQA+BUAAWNzPBdCF3UAdABlADuA6QDpQPQhZXIAoG4qAAJhaW95TRdQF1YXWhfyIW9uG2FyAGOgViI7gOoA6kDsIW9uAKBVIk1kbwB0ABdhAAFEcmIXZhdvAHQAAKBSIgDgNdgi3XKhmipuF3QXYQB2AGUAO4DoAOhAZKCWKm8AdAAAoJgqgKGZKmlscwCAF4UXhxfuInRlcnMAoOcjAKATIWSglSpvAHQAAKCXKoABYXBzAJMXlheiF2MAcgATYXQAeQBzogUinxcAAAAAoRdlAHQAAKAFInAAMaADIDMBqRerFwCgBCAAoAUgAAFnc7AXsRdLYXAAAKACIAABZ3C4F7sXbwBuABlhZgAA4DXYVt2AAWFscwDFF8sXzxdyAHOg1SJsAACg4yl1AHMAAKBxKmkAAKG1A2x21RfYF28AbgC1Y/VjAAJjc3V24BfoF/0XEBgAAWlv5BdWF3IAYwAAoFYiaQLuFwAAAADwF+0ADQThIW50AAFnbPUX+Rd0AHIAAKCWKuUhc3MAoJUqgAFhZWkAAxgGGAoYbABzAD1gcwB0AACgXyJ2AESgYSJEAACgeCrwImFyc2wAoOUpAAFEYRkYHRhvAHQAAKBTInIAcgAAoHEpgAFjZGkAJxgqGO0XcgAAoC8hbwD0AIwCAAFhaDEYMhi3YzuA8ADwQAABbXI5GD0YbAA7gOsA60BvAACgrCCAAWNpcABGGEgYSxhsACFgcwD0ACwEAAFlb08YVxhjAHQAYQB0AGkAbwDuABoEbgBlAG4AdABpAGEAbADlADME4Ql1GAAAgRgAAIMYiBgAAAAAoRilGAAAqhgAALsYvhjRGAAA1xgnGWwAbABpAG4AZwBkAG8AdABzAGUA8QBlF3kARGRtImFsZQAAoEAmgAFpbHIAjRiRGJ0Y7CFpZwCgA/tpApcYAAAAAJoYZwAAoAD7aQBnAACgBPsA4DXYI93sIWlnAKAB++whaWcA4GYAagCAAWFsdACvGLIYthh0AACgbSZpAGcAAKAC+24AcwAAoLElbwBmAJJh8AHCGAAAxhhmAADgNdhX3QABYWvJGMwYbADsAGsEdqDUIgCg2SphI3J0aW50AACgDSoAAWFv2hgiGQABY3PeGB8ZsQPnGP0YBRkSGRUZAAAdGbID7xjyGPQY9xj5GAAA+xg7gL0AvUAAoFMhO4C8ALxAAKBVIQCgWSEAoFshswEBGQAAAxkAoFQhAKBWIbQCCxkOGQAAAAAQGTuAvgC+QACgVyEAoFwhNQAAoFghtgEZGQAAGxkAoFohAKBdITgAAKBeIWwAAKBEIHcAbgAAoCIjYwByAADgNdi73IAIRWFiY2RlZmdpamxub3JzdHYARhlKGVoZXhlmGWkZkhmWGZkZnRmgGa0ZxhnLGc8Z4BkjGmygZyIAoIwqgAFjbXAAUBlTGVgZ9SF0ZfVhbQBhAOSgswM6FgCghipyImV2ZQAfYQABaXliGWUZcgBjAB1hM2RvAHQAIWGAoWUibHFzAMYEcBl6GfGhZSLOBAAAdhlsAGEAbgD0AN8EgKF+KmNkbACBGYQZjBljAACgqSpvAHQAb6CAKmyggioAoIQqZeDbIgD+cwAAoJQqcgAA4DXYJN3noGsirATtIWVsAKA3IWMAeQBTZIChdyJFYWoApxmpGasZAKCSKgCgpSoAoKQqAAJFYWVztBm2Gb0ZwhkAoGkicABwoIoq8iFveACgiipxoIgq8aCIKrUZaQBtAACg5yJwAGYAAOA12FjdYQB2AOUAYwIAAWNp0xnWGXIAAKAKIW0AAKFzImVs3BneGQCgjioAoJAqAIM+ADtjZGxxco0E6xn0GfgZ/BkBGgABY2nvGfEZAKCnKnIAAKB6Km8AdAAAoNci0CFhcgCglSl1ImVzdAAAoHwqgAJhZGVscwAKGvQZFhrVBCAa8AEPGgAAFBpwAHIAbwD4AFkZcgAAoHgpcQAAAWxxxAQbGmwAZQBzAPMASRlpAO0A5AQAAWVuJxouGnIjdG5lcXEAAOBpIgD+xQAsGgAFQWFiY2Vma29zeUAaQxpmGmoabRqDGocalhrCGtMacgDyAMwCAAJpbG1yShpOGlAaVBpyAHMA8ABxD2YAvWBpAGwA9AASBQABZHJYGlsaYwB5AEpkAKGUIWN3YBpkGmkAcgAAoEgpAKCtIWEAcgAAoA8h6SFyYyVhgAFhbHIAcxp7Gn8a8iF0c3WgZSZpAHQAAKBlJuwhaXAAoCYg4yFvbgCguSJyAADgNdgl3XMAAAFld4wakRphInJvdwAAoCUpYSJyb3cAAKAmKYACYW1vcHIAnxqjGqcauhq+GnIAcgAAoP8h9CFodACgOyJrAAABbHKsGrMaZSRmdGFycm93AACgqSHpJGdodGFycm93AKCqIWYAAOA12Fnd4iFhcgCgFSCAAWNsdADIGswa0BpyAADgNdi93GEAcwDoAGka8iFvaydhAAFicNca2xr1IWxsAKBDIOghZW4AoBAg4Qr2GgAA/RoAAAgbExsaGwAAIRs7GwAAAAA+G2IbmRuVG6sbAACyG80b0htjAHUAdABlADuA7QDtQAChYyBpeQEbBhtyAGMAO4DuAO5AOGQAAWN4CxsNG3kANWRjAGwAO4ChAKFAAAFmcssCFhsA4DXYJt1yAGEAdgBlADuA7ADsQIChSCFpbm8AJxsyGzYbAAFpbisbLxtuAHQAAKAMKnQAAKAtIuYhaW4AoNwpdABhAACgKSHsIWlnM2GAAWFvcABDG1sbXhuAAWNndABJG0sbWRtyACthgAFlbHAAcQVRG1UbaQBuAOUAyAVhAHIA9AByBWgAMWFmAACgtyJlAGQAtWEAoggiY2ZvdGkbbRt1G3kb4SFyZQCgBSFpAG4AdKAeImkAZQAAoN0pZABvAPQAWxsAoisiY2VscIEbhRuPG5QbYQBsAACguiIAAWdyiRuNG2UAcgDzACMQ4wCCG2EicmhrAACgFyryIW9kAKA8KgACY2dwdJ8boRukG6gbeQBRZG8AbgAvYWYAAOA12FrdYQC5Y3UAZQBzAHQAO4C/AL9AAAFjabUbuRtyAADgNdi+3G4AAKIIIkVkc3bCG8QbyBvQAwCg+SJvAHQAAKD1Inag9CIAoPMiaaBiIOwhZGUpYesB1hsAANkbYwB5AFZkbAA7gO8A70AAA2NmbW9zdeYb7hvyG/Ub+hsFHAABaXnqG+0bcgBjADVhOWRyAADgNdgn3eEhdGg3YnAAZgAA4DXYW93jAf8bAAADHHIAAOA12L/c8iFjeVhk6yFjeVRkAARhY2ZnaGpvcxUcGhwiHCYcKhwtHDAcNRzwIXBhdqC6A/BjAAFleR4cIRzkIWls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ZmdobG1vcHJzdHV3CiwNLBEsHSwnLDEsQCxLLFIsYix6LIQsjyzLLOgs7Sz/LAotcgDyAAkDYQByAACgYykAAWNyFSwbLHUAdABlADuA+gD6QPIACQ1yAOMBIywAACUseQBeZHYAZQBtYQABaXkrLDAscgBjADuA+wD7QENkgAFhYmgANyw6LD0scgDyANEO7CFhY3FhYQDyAOAOAAFpckQsSCzzIWh0AKB+KQDgNdgy3XIAYQB2AGUAO4D5APlAYQFWLF8scgAAAWxyWixcLACgvyEAoL4hbABrAACggCUAAWN0Zix2LG8CbCwAAAAAcyxyAG4AZaAcI3IAAKAcI28AcAAAoA8jcgBpAACg+CUAAWFsfiyBLGMAcgBrYTuAqACoQAABZ3CILIssbwBuAHNhZgAA4DXYZt0AA2FkaGxzdZksniynLLgsuyzFLHIAcgBvAPcACQ1vAHcAbgBhAHIAcgBvAPcA2A5hI3Jwb29uAAABbHKvLLMsZQBmAPQAWyxpAGcAaAD0AF0sdQDzAKYOaQAAocUDaGzBLMIs0mNvAG4AxWPwI2Fycm93cwCgyCGAAWNpdADRLOEs5CxvAtcsAAAAAN4scgBuAGWgHSNyAACgHSNvAHAAAKAOI24AZwBvYXIAaQAAoPklYwByAADgNdjK3IABZGlyAPMs9yz6LG8AdAAAoPAi7CFkZWlhaQBmoLUlAKC0JQABYW0DLQYtcgDyAMosbAA7gPwA/EDhIm5nbGUAoKcpgAdBQkRhY2RlZmxub3Byc3oAJy0qLTAtNC2bLZ0toS2/LcMtxy3TLdgt3C3gLfwtcgDyABADYQByAHag6CoAoOkqYQBzAOgA/gIAAW5yOC08LechcnQAoJwpgANla25wcnN0AJkpSC1NLVQtXi1iLYItYQBwAHAA4QAaHG8AdABoAGkAbgDnAKEXgAFoaXIAoSmzJFotbwBwAPQAdCVooJUh7wD4JgABaXVmLWotZwBtAOEAuygAAWJwbi14LXMjZXRuZXEAceCKIgD+AODLKgD+cyNldG5lcQBx4IsiAP4A4MwqAP4AAWhyhi2KLWUAdADhABIraSNhbmdsZQAAAWxyki2WLeUhZnQAoLIiaSJnaHQAAKCzInkAMmThIXNoAKCiIoABZWxyAKcttC24LWKiKCKuLQAAAACyLWEAcgAAoLsicQAAoFoi7CFpcACg7iIAAWJ0vC1eD2EA8gBfD3IAAOA12DPddAByAOkAlS1zAHUAAAFicM0t0C0A4IIi0iAA4IMi0iBwAGYAAOA12GfdcgBvAPAAWQt0AHIA6QCaLQABY3XkLegtcgAA4DXYy9wAAWJw7C30LW4AAAFFZXUt8S0A4IoiAP5uAAABRWV/LfktAOCLIgD+6SJnemFnAKCaKYADY2Vmb3BycwANLhAuJS4pLiMuLi40LukhcmN1YQABZGkULiEuAAFiZxguHC5hAHIAAKBfKmUAcaAnIgCgWSLlIXJwAKAYIXIAAOA12DTdcABmAADgNdho3WWgQCJhAHQA6ABqD2MAcgAA4DXYzNzjCuQRUC4AAFQuAABYLmIuAAAAAGMubS5wLnQuAAAAAIguki4AAJouJxIqEnQAcgDpAB0ScgAA4DXYNd0AAUFhWy5eLnIA8gDnAnIA8gCTB75jAAFBYWYuaS5yAPIA4AJyAPIAjAdhAPAAeh5pAHMAAKD7IoABZHB0APgReS6DLgABZmx9LoAuAOA12GnddQDzAP8RaQBtAOUABBIAAUFhiy6OLnIA8gDuAnIA8gCaBwABY3GVLgoScgAA4DXYzdwAAXB0nS6hLmwAdQDzACUScgDpACASAARhY2VmaW9zdbEuvC7ELsguzC7PLtQu2S5jAAABdXm2LrsudABlADuA/QD9QE9kAAFpecAuwy5yAGMAd2FLZG4AO4ClAKVAcgAA4DXYNt1jAHkAV2RwAGYAAOA12GrdYwByAADgNdjO3AABY23dLt8ueQBOZGwAO4D/AP9AAAVhY2RlZmhpb3N38y73Lv8uAi8MLxAvEy8YLx0vIi9jInV0ZQB6YQABYXn7Lv4u8iFvbn5hN2RvAHQAfGEAAWV0Bi8KL3QAcgDmAB8QYQC2Y3IAAOA12DfdYwB5ADZk5yJyYXJyAKDdIXAAZgAA4DXYa91jAHIAAOA12M/cAAFqbiYvKC8AoA0gagAAoAwg"), d70 = JJT("AAJhZ2xxBwARABMAFQBtAg0AAAAAAA8AcAAmYG8AcwAnYHQAPmB0ADxg9SFvdCJg");
(function (T) {
  T[T.VALUE_LENGTH = 49152] = "VALUE_LENGTH", T[T.FLAG13 = 8192] = "FLAG13", T[T.BRANCH_LENGTH = 8064] = "BRANCH_LENGTH", T[T.JUMP_TABLE = 127] = "JUMP_TABLE";
})(jt || (jt = {}));
(function (T) {
  T[T.NUM = 35] = "NUM", T[T.SEMI = 59] = "SEMI", T[T.EQUALS = 61] = "EQUALS", T[T.ZERO = 48] = "ZERO", T[T.NINE = 57] = "NINE", T[T.LOWER_A = 97] = "LOWER_A", T[T.LOWER_F = 102] = "LOWER_F", T[T.LOWER_X = 120] = "LOWER_X", T[T.LOWER_Z = 122] = "LOWER_Z", T[T.UPPER_A = 65] = "UPPER_A", T[T.UPPER_F = 70] = "UPPER_F", T[T.UPPER_Z = 90] = "UPPER_Z";
})(F3 || (F3 = {}));
(function (T) {
  T[T.EntityStart = 0] = "EntityStart", T[T.NumericStart = 1] = "NumericStart", T[T.NumericDecimal = 2] = "NumericDecimal", T[T.NumericHex = 3] = "NumericHex", T[T.NamedEntity = 4] = "NamedEntity";
})(ne || (ne = {}));
(function (T) {
  T[T.Legacy = 0] = "Legacy", T[T.Strict = 1] = "Strict", T[T.Attribute = 2] = "Attribute";
})(Go || (Go = {}));
D70 = RTR(O70), w70 = RTR(d70);
(function (T) {
  T[T.XML = 0] = "XML", T[T.HTML = 1] = "HTML";
})(ZIT || (ZIT = {}));
(function (T) {
  T[T.UTF8 = 0] = "UTF8", T[T.ASCII = 1] = "ASCII", T[T.Extensive = 2] = "Extensive", T[T.Attribute = 3] = "Attribute", T[T.Text = 4] = "Text";
})(JIT || (JIT = {}));
U70 = /^\p{White_Space}*$/u, q70 = /^\p{White_Space}*true\p{White_Space}*$/iu, z70 = /^\p{White_Space}*false\p{White_Space}*$/iu, F70 = /^\p{White_Space}*yes\p{White_Space}*$/iu, MrT = {
  trimValues: !1,
  processEntities: !1,
  htmlEntities: !1,
  parseTagValue: !1,
  parseAttributeValue: !1,
  alwaysCreateTextNode: !1,
  ignoreAttributes: !1,
  ignorePiTags: !0,
  ignoreDeclaration: !0,
  attributeNamePrefix: "@",
  transformTagName: T => T.toLowerCase(),
  transformAttributeName: T => T.toLowerCase()
}, xn = {
  unrecognizedFeedFormat: "Unrecognized feed format",
  invalidFeedFormat: "Invalid feed format",
  invalidOpmlFormat: "Invalid OPML format",
  invalidInputOpml: "Invalid input OPML",
  invalidInputAtom: "Invalid input Atom",
  invalidInputRss: "Invalid input RSS"
}, hW = {
  admin: ["http://webns.net/mvcb/", "https://webns.net/mvcb/", "http://webns.net/mvcb", "https://webns.net/mvcb"],
  atom: ["http://www.w3.org/2005/Atom", "https://www.w3.org/2005/Atom", "http://www.w3.org/2005/Atom/", "https://www.w3.org/2005/Atom/", "http://purl.org/atom/ns#", "https://purl.org/atom/ns#"],
  app: ["http://www.w3.org/2007/app", "https://www.w3.org/2007/app", "http://www.w3.org/2007/app/", "https://www.w3.org/2007/app/"],
  dc: ["http://purl.org/dc/elements/1.1/", "https://purl.org/dc/elements/1.1/", "http://purl.org/dc/elements/1.1", "https://purl.org/dc/elements/1.1", "http://dublincore.org/documents/dcmi-namespace/", "https://dublincore.org/documents/dcmi-namespace/", "http://dublincore.org/documents/dcmi-namespace", "https://dublincore.org/documents/dcmi-namespace", "http://purl.org/dc/elements/1.0/", "https://purl.org/dc/elements/1.0/", "http://purl.org/dc/elements/1.0", "https://purl.org/dc/elements/1.0"],
  sy: ["http://purl.org/rss/1.0/modules/syndication/", "https://purl.org/rss/1.0/modules/syndication/", "http://purl.org/rss/1.0/modules/syndication", "https://purl.org/rss/1.0/modules/syndication"],
  content: ["http://purl.org/rss/1.0/modules/content/", "https://purl.org/rss/1.0/modules/content/", "http://purl.org/rss/1.0/modules/content", "https://purl.org/rss/1.0/modules/content"],
  creativeCommons: ["http://backend.userland.com/creativeCommonsRssModule", "https://backend.userland.com/creativeCommonsRssModule", "http://backend.userland.com/creativeCommonsRssModule/", "https://backend.userland.com/creativeCommonsRssModule/", "http://cyber.law.harvard.edu/rss/creativeCommonsRssModule.html", "https://cyber.law.harvard.edu/rss/creativeCommonsRssModule.html", "http://cyber.law.harvard.edu/rss/creativeCommonsRssModule", "https://cyber.law.harvard.edu/rss/creativeCommonsRssModule"],
  slash: ["http://purl.org/rss/1.0/modules/slash/", "https://purl.org/rss/1.0/modules/slash/", "http://purl.org/rss/1.0/modules/slash", "https://purl.org/rss/1.0/modules/slash"],
  itunes: ["http://www.itunes.com/dtds/podcast-1.0.dtd", "https://www.itunes.com/dtds/podcast-1.0.dtd"],
  podcast: ["https://podcastindex.org/namespace/1.0", "http://podcastindex.org/namespace/1.0", "https://podcastindex.org/namespace/1.0/", "http://podcastindex.org/namespace/1.0/", "https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md"],
  psc: ["http://podlove.org/simple-chapters", "https://podlove.org/simple-chapters", "http://podlove.org/simple-chapters/", "https://podlove.org/simple-chapters/"],
  media: ["http://search.yahoo.com/mrss/", "https://search.yahoo.com/mrss/", "http://search.yahoo.com/mrss", "https://search.yahoo.com/mrss", "http://video.search.yahoo.com/mrss", "http://video.search.yahoo.com/mrss/", "https://video.search.yahoo.com/mrss", "https://video.search.yahoo.com/mrss/", "http://www.rssboard.org/media-rss", "http://www.rssboard.org/media-rss/", "https://www.rssboard.org/media-rss", "https://www.rssboard.org/media-rss/", "http://search.yahoo.com/searchmonkey/media/", "https://search.yahoo.com/searchmonkey/media/", "http://search.yahoo.com/searchmonkey/media", "https://search.yahoo.com/searchmonkey/media", "http://tools.search.yahoo.com/mrss/", "https://tools.search.yahoo.com/mrss/", "http://tools.search.yahoo.com/mrss", "https://tools.search.yahoo.com/mrss"],
  georss: ["http://www.georss.org/georss", "http://www.georss.org/georss/", "https://www.georss.org/georss", "https://www.georss.org/georss/"],
  geo: ["http://www.w3.org/2003/01/geo/wgs84_pos#", "https://www.w3.org/2003/01/geo/wgs84_pos#"],
  thr: ["http://purl.org/syndication/thread/1.0", "https://purl.org/syndication/thread/1.0", "http://purl.org/syndication/thread/1.0/", "https://purl.org/syndication/thread/1.0/", "http://purl.org/rss/1.0/modules/threading/", "https://purl.org/rss/1.0/modules/threading/", "http://purl.org/rss/1.0/modules/threading", "https://purl.org/rss/1.0/modules/threading"],
  dcterms: ["http://purl.org/dc/terms/", "https://purl.org/dc/terms/", "http://purl.org/dc/terms", "https://purl.org/dc/terms", "http://dublincore.org/documents/dcmi-terms/", "https://dublincore.org/documents/dcmi-terms/", "http://dublincore.org/documents/dcmi-terms", "https://dublincore.org/documents/dcmi-terms", "http://dublincore.org/specifications/dublin-core/dcmi-terms/", "https://dublincore.org/specifications/dublin-core/dcmi-terms/", "http://dublincore.org/specifications/dublin-core/dcmi-terms", "https://dublincore.org/specifications/dublin-core/dcmi-terms"],
  wfw: ["http://wellformedweb.org/CommentAPI/", "https://wellformedweb.org/CommentAPI/", "http://wellformedweb.org/CommentAPI", "https://wellformedweb.org/CommentAPI"],
  source: ["http://source.scripting.com/", "https://source.scripting.com/", "http://source.scripting.com", "https://source.scripting.com"],
  feedpress: ["https://feed.press/xmlns", "http://feed.press/xmlns", "https://feed.press/xmlns/", "http://feed.press/xmlns/", "https://feedpress.com/xmlns", "http://feedpress.com/xmlns", "https://feedpress.com/xmlns/", "http://feedpress.com/xmlns/", "http://feedpress.it/xmlns", "https://feedpress.it/xmlns", "http://feedpress.it/xmlns/", "https://feedpress.it/xmlns/"],
  yt: ["http://www.youtube.com/xml/schemas/2015", "https://www.youtube.com/xml/schemas/2015", "http://www.youtube.com/xml/schemas/2015/", "https://www.youtube.com/xml/schemas/2015/"],
  googleplay: ["https://www.google.com/schemas/play-podcasts/1.0/", "http://www.google.com/schemas/play-podcasts/1.0/", "https://www.google.com/schemas/play-podcasts/1.0", "http://www.google.com/schemas/play-podcasts/1.0", "https://www.google.com/schemas/play-podcasts/1.0/play-podcasts.xsd", "http://www.google.com/schemas/play-podcasts/1.0/play-podcasts.xsd"],
  spotify: ["http://www.spotify.com/ns/rss", "https://www.spotify.com/ns/rss", "http://www.spotify.com/ns/rss/", "https://www.spotify.com/ns/rss/"],
  rdf: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#", "https://www.w3.org/1999/02/22-rdf-syntax-ns#"],
  rawvoice: ["http://www.rawvoice.com/rawvoiceRssModule/", "https://www.rawvoice.com/rawvoiceRssModule/", "http://www.rawvoice.com/rawvoiceRssModule", "https://www.rawvoice.com/rawvoiceRssModule", "https://blubrry.com/developer/rawvoice-rss", "http://blubrry.com/developer/rawvoice-rss", "https://blubrry.com/developer/rawvoice-rss/", "http://blubrry.com/developer/rawvoice-rss/"],
  cc: ["http://creativecommons.org/ns#", "https://creativecommons.org/ns#", "http://web.resource.org/cc/", "https://web.resource.org/cc/", "http://web.resource.org/cc", "https://web.resource.org/cc"],
  opensearch: ["http://a9.com/-/spec/opensearch/1.1/", "https://a9.com/-/spec/opensearch/1.1/", "http://a9.com/-/spec/opensearch/1.0/", "https://a9.com/-/spec/opensearch/1.0/", "http://a9.com/-/spec/opensearchrss/1.0/", "https://a9.com/-/spec/opensearchrss/1.0/"],
  arxiv: ["http://arxiv.org/schemas/atom", "https://arxiv.org/schemas/atom", "http://arxiv.org/schemas/atom/", "https://arxiv.org/schemas/atom/"],
  pingback: ["http://madskills.com/public/xml/rss/module/pingback/", "https://madskills.com/public/xml/rss/module/pingback/", "http://madskills.com/public/xml/rss/module/pingback", "https://madskills.com/public/xml/rss/module/pingback"],
  trackback: ["http://madskills.com/public/xml/rss/module/trackback/", "https://madskills.com/public/xml/rss/module/trackback/", "http://madskills.com/public/xml/rss/module/trackback", "https://madskills.com/public/xml/rss/module/trackback"]
}, DrT = Object.entries(hW).reduce((T, [R, a]) => {
  for (let e of a) {
    let t = e.toLowerCase();
    T[t] = R.toLowerCase();
  }
  return T;
}, {}), X70 = "[:A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][" + V70 + "]*", Y70 = new RegExp("^" + X70 + "$");
Z70 = {
  allowBooleanAttributes: !1,
  unpairedTags: []
};
ew0 = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
if (typeof Symbol !== "function") _B = "@@xmlMetadata";else _B = Symbol("XML Node Metadata");
ow0 = /^[-+]?0x[a-fA-F0-9]+$/, nw0 = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/, lw0 = {
  hex: !0,
  leadingZeros: !0,
  decimalPoint: ".",
  eNotation: !0
};
pw0 = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
xw0 = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
YF = Hl.getMetaDataSymbol();
Mw0 = ["feed.author.name", "feed.author.uri", "feed.author.url", "feed.author.email", "feed.category", "feed.contributor.name", "feed.contributor.uri", "feed.contributor.url", "feed.contributor.email", "feed.generator", "feed.icon", "feed.id", "feed.link", "feed.logo", "feed.rights", "feed.subtitle", "feed.tagline", "feed.title", "feed.updated", "feed.modified", "feed.entry.author.name", "feed.entry.author.uri", "feed.entry.author.url", "feed.entry.author.email", "feed.entry.category", "feed.entry.content", "feed.entry.contributor.name", "feed.entry.contributor.uri", "feed.entry.contributor.url", "feed.entry.contributor.email", "feed.entry.id", "feed.entry.link", "feed.entry.published", "feed.entry.issued", "feed.entry.created", "feed.entry.rights", "feed.entry.source.author.name", "feed.entry.source.author.uri", "feed.entry.source.author.url", "feed.entry.source.author.email", "feed.entry.source.category", "feed.entry.source.contributor.name", "feed.entry.source.contributor.uri", "feed.entry.source.contributor.url", "feed.entry.source.contributor.email", "feed.entry.source.generator", "feed.entry.source.icon", "feed.entry.source.id", "feed.entry.source.link", "feed.entry.source.logo", "feed.entry.source.rights", "feed.entry.source.subtitle", "feed.entry.source.title,", "feed.entry.source.updated", "feed.entry.source.modified", "feed.entry.summary", "feed.entry.title", "feed.entry.updated", "feed.entry.modified"], Dw0 = new cW({
  ...MrT,
  stopNodes: Mw0
}), Vw0 = /^\p{White_Space}*(explicit|yes)\p{White_Space}*$/iu, zB0 = ["rdf:rdf.channel.title", "rdf:rdf.channel.link", "rdf:rdf.channel.description", "rdf:rdf.image.title", "rdf:rdf.image.link", "rdf:rdf.image.url", "rdf:rdf.item.title", "rdf:rdf.item.link", "rdf:rdf.item.description", "rdf:rdf.textinput.title", "rdf:rdf.textinput.description", "rdf:rdf.textinput.name", "rdf:rdf.textinput.link"], FB0 = new cW({
  ...MrT,
  stopNodes: zB0
}), R60 = ["rss.channel.title", "rss.channel.link", "rss.channel.description", "rss.channel.language", "rss.channel.copyright", "rss.channel.managingeditor", "rss.channel.webmaster", "rss.channel.pubdate", "rss.channel.lastbuilddate", "rss.channel.author", "rss.channel.category", "rss.channel.generator", "rss.channel.docs", "rss.channel.cloud", "rss.channel.ttl", "rss.channel.image.description", "rss.channel.image.height", "rss.channel.image.link", "rss.channel.image.title", "rss.channel.image.url", "rss.channel.image.width", "rss.channel.rating", "rss.channel.textinput.title", "rss.channel.textinput.description", "rss.channel.textinput.name", "rss.channel.textinput.link", "rss.channel.skiphours.hour", "rss.channel.skipdays.day", "rss.channel.item.title", "rss.channel.item.link", "rss.channel.item.description", "rss.channel.item.author.name", "rss.channel.item.category", "rss.channel.item.comments", "rss.channel.item.enclosure", "rss.channel.item.guid", "rss.channel.item.pubdate", "rss.channel.item.source"], a60 = new cW({
  ...MrT,
  stopNodes: R60
});
Lh();
gUT();
Ci();
jR();
Mh();
O0();
uO();
P0();
s0();
jR();
F8();
O0();
hN0 = OM, iN0 = ["unable to connect", "failed to connect", "connection refused", "econnrefused", "enotfound", "fetch failed", "networkerror"];
rR();
jR();
rR();
Qm = kN0(_N0), KrT = [{
  extension: "png",
  osascriptClass: "\xABclass PNGf\xBB",
  mimeType: "image/png"
}, {
  extension: "jpg",
  osascriptClass: "\xABclass JPEG\xBB",
  mimeType: "image/jpeg"
}, {
  extension: "gif",
  osascriptClass: "\xABclass GIFf\xBB",
  mimeType: "image/gif"
}, {
  extension: "webp",
  mimeType: "image/webp"
}];
O0();
rR();
oa();
$c();
op();
lm();
s0();
oa();
gx();
de();
ue = ["\u2588", "\u2587", "\u2586", "\u2585", "\u2584", "\u2583", "\u2582", "\u2581"], JF = ["\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589", "\u2588"], aU0 = [[1, 8], [2, 16], [4, 32], [64, 128]];
nm();
rR();
oa();
Ix();
de();
F8();
Ke();
PU();
$c();
Lh();
Ei();
Mh();
Bx();
O0();
VN();
qS();
jR();
rR();
Lh();
Mh();
Am();
rR();
rR();
gc();
dm();
$c();
Lh();
O0();
s0();
qS();
MRR = c0(QA(), 1), CU0 = [{
  id: "cli-open",
  label: "cli: open in pager"
}, {
  id: "cloudflare-logs",
  label: "cloudflare: open logs"
}, {
  id: "cloudflare-data-studio",
  label: "cloudflare: open data studio"
}];
rR();
ahT = {
  workspace: {
    label: "Workspace",
    pathHint: ".amp/settings.json",
    description: "workspace config"
  },
  global: {
    label: "Global",
    pathHint: "~/.config/amp/settings.json",
    description: "global config"
  },
  flag: {
    label: "Flag",
    pathHint: "CLI flags",
    description: "flag config"
  },
  default: {
    label: "Default",
    pathHint: "built-in defaults",
    description: "default config"
  },
  external: {
    label: "External",
    pathHint: "extensions / external",
    description: "external source"
  },
  skill: {
    label: "Skills",
    pathHint: ".agents/skills/",
    description: "skill source"
  },
  other: {
    label: "Other",
    pathHint: "",
    description: "other source"
  }
}, WRR = ["workspace", "global", "flag", "default", "external", "skill", "other"];
oa();
rR();
kgT = Math.ceil(rH0 / t0R);
L8();
e9T();
O0();
Lm();
P0();
rR();
Ci();
jR();
dm();
cp();
sH0 = [{
  description: "Move cursor up/down",
  methods: [{
    keys: ["\u2191"]
  }, {
    keys: ["\u2193"]
  }]
}, {
  description: "Move cursor left/right",
  methods: [{
    keys: ["\u2190"]
  }, {
    keys: ["\u2192"]
  }, {
    input: "B",
    keys: ["Ctrl"]
  }, {
    input: "F",
    keys: ["Ctrl"]
  }]
}, {
  description: "Insert newline",
  methods: [{
    keys: ["Shift", "Enter"]
  }, {
    keys: ["Alt", "Enter"]
  }, {
    input: "J",
    keys: ["Ctrl"]
  }],
  submitOnEnterOnly: !0
}, {
  description: "Insert newline",
  methods: [{
    keys: ["Enter"]
  }, {
    keys: ["Shift", "Enter"]
  }, {
    keys: ["Alt", "Enter"]
  }, {
    input: "J",
    keys: ["Ctrl"]
  }],
  submitOnEnterOnly: !1
}, {
  description: "Submit message",
  methods: [{
    keys: ["Enter"]
  }],
  submitOnEnterOnly: !0
}, {
  description: "Submit message",
  methods: [{
    keys: ["Ctrl/Cmd", "Enter"]
  }],
  submitOnEnterOnly: !1
}, {
  description: "Clear input",
  methods: [{
    keys: ["Escape"]
  }]
}, {
  description: "Edit prompt in $EDITOR",
  methods: [{
    input: "G",
    keys: ["Ctrl"]
  }]
}, {
  description: "Navigate history (previous/next)",
  methods: [{
    input: "P",
    keys: ["Ctrl"]
  }, {
    input: "N",
    keys: ["Ctrl"]
  }]
}, {
  description: "Jump to start of line",
  methods: [{
    keys: ["Cmd", "\u2190"]
  }, {
    input: "A",
    keys: ["Ctrl"]
  }]
}, {
  description: "Jump to end of line",
  methods: [{
    keys: ["Cmd", "\u2192"]
  }, {
    input: "E",
    keys: ["Ctrl"]
  }]
}, {
  description: "Jump to previous word",
  methods: [{
    keys: ["Alt", "\u2190"]
  }, {
    keys: ["Ctrl", "\u2190"]
  }, {
    input: "B",
    keys: ["Alt"]
  }]
}, {
  description: "Jump to next word",
  methods: [{
    keys: ["Alt", "\u2192"]
  }, {
    keys: ["Ctrl", "\u2192"]
  }, {
    input: "F",
    keys: ["Alt"]
  }]
}, {
  description: "Delete character backward",
  methods: [{
    keys: ["Backspace"]
  }, {
    input: "H",
    keys: ["Ctrl"]
  }]
}, {
  description: "Delete word backward",
  methods: [{
    keys: ["Alt", "Backspace"]
  }, {
    input: "W",
    keys: ["Ctrl"]
  }]
}, {
  description: "Delete character forward",
  methods: [{
    keys: ["Delete"]
  }, {
    input: "D",
    keys: ["Ctrl"]
  }]
}, {
  description: "Delete word forward",
  methods: [{
    input: "D",
    keys: ["Alt"]
  }]
}, {
  description: "Delete to start of line",
  methods: [{
    keys: ["Cmd", "Backspace"]
  }, {
    input: "U",
    keys: ["Ctrl"]
  }]
}, {
  description: "Delete to end of line",
  methods: [{
    input: "K",
    keys: ["Ctrl"]
  }]
}, {
  description: "Yank (paste deleted text)",
  methods: [{
    input: "Y",
    keys: ["Ctrl"]
  }]
}, {
  description: "Paste image from clipboard",
  methods: [{
    input: "V",
    keys: ["Ctrl"]
  }]
}, {
  description: "Switch agent mode",
  methods: [{
    input: "S",
    keys: ["Ctrl"]
  }, {
    input: "S",
    keys: ["Alt"]
  }]
}, {
  description: "Toggle deep reasoning effort",
  methods: [{
    input: "D",
    keys: ["Alt"]
  }]
}, {
  description: "Open command palette",
  methods: [{
    input: "O",
    keys: ["Ctrl"]
  }]
}, {
  description: "Mention files",
  methods: [{
    keys: ["@"]
  }]
}, {
  description: "Mention threads",
  methods: [{
    keys: ["@@"]
  }]
}, {
  description: "Show prompt history",
  methods: [{
    input: "R",
    keys: ["Ctrl"]
  }]
}, {
  description: "Toggle inline shortcuts help",
  methods: [{
    keys: ["?"]
  }]
}, {
  description: "Toggle thinking/dense view",
  methods: [{
    input: "T",
    keys: ["Alt"]
  }]
}], oH0 = [{
  description: "Page scroll",
  methods: [{
    keys: ["Pg Up"]
  }, {
    keys: ["Pg Down"]
  }]
}, {
  description: "Half-page scroll",
  methods: [{
    input: "K",
    keys: ["Alt"]
  }, {
    input: "J",
    keys: ["Alt"]
  }]
}, {
  description: "Mouse wheel scroll",
  methods: [{
    keys: ["Mouse Wheel"]
  }]
}, {
  description: "Jump to first message",
  methods: [{
    keys: ["Home"]
  }]
}, {
  description: "Jump to bottom of screen",
  methods: [{
    keys: ["End"]
  }]
}, {
  description: "Navigate to previous messages",
  methods: [{
    keys: ["Tab"]
  }, {
    keys: ["Shift", "Tab"]
  }]
}];
rR();
$x();
K0T();
Ks();
oa();
rR();
NQ = qT("fs"), dH0 = qT("zlib"), EH0 = nUR(), CH0 = lUR(), uW = qT("util"), yW = qT("events").EventEmitter, H0R = qT("stream").Transform, thT = qT("stream").PassThrough, LH0 = qT("stream").Writable, MH0 = DH0;
uW.inherits(fn, yW);
uW.inherits(td, H0R);
uW.inherits(Zm, yW);
uW.inherits(kW, thT);
if (typeof Buffer.allocUnsafe === "function") In = function (T) {
  return Buffer.allocUnsafe(T);
};else In = function (T) {
  return new Buffer(T);
};
rR();
O0();
oa();
P0();
oa();
L8();
oa();
rR();
Lm();
lm();
O0();
P0();
NW0 = rN;
lm();
rR();
oa();
L8();
dm();
$c();
P0();
s0();
vJ0 = c0(AUR(), 1);
nq0 = /^(<)?(-->|-.->|==>|---|-\.-|===)(?:\|([^|]*)\|)?/, lq0 = [{
  regex: /^([\w-]+)\(\(\((.+?)\)\)\)/,
  shape: "doublecircle"
}, {
  regex: /^([\w-]+)\(\[(.+?)\]\)/,
  shape: "stadium"
}, {
  regex: /^([\w-]+)\(\((.+?)\)\)/,
  shape: "circle"
}, {
  regex: /^([\w-]+)\[\[(.+?)\]\]/,
  shape: "subroutine"
}, {
  regex: /^([\w-]+)\[\((.+?)\)\]/,
  shape: "cylinder"
}, {
  regex: /^([\w-]+)\[\/(.+?)\\\]/,
  shape: "trapezoid"
}, {
  regex: /^([\w-]+)\[\\(.+?)\/\]/,
  shape: "trapezoid-alt"
}, {
  regex: /^([\w-]+)>(.+?)\]/,
  shape: "asymmetric"
}, {
  regex: /^([\w-]+)\{\{(.+?)\}\}/,
  shape: "hexagon"
}, {
  regex: /^([\w-]+)\[(.+?)\]/,
  shape: "rectangle"
}, {
  regex: /^([\w-]+)\((.+?)\)/,
  shape: "rounded"
}, {
  regex: /^([\w-]+)\{(.+?)\}/,
  shape: "diamond"
}], Aq0 = /^([\w-]+)/, pq0 = /^:::([\w][\w-]*)/;
G3 = {
  x: 1,
  y: 0
}, w8 = {
  x: 1,
  y: 2
}, K3 = {
  x: 0,
  y: 1
}, Z8 = {
  x: 2,
  y: 1
}, wA = {
  x: 2,
  y: 0
}, sn = {
  x: 0,
  y: 0
}, Rm = {
  x: 2,
  y: 2
}, BA = {
  x: 0,
  y: 2
}, x9R = {
  x: 1,
  y: 1
};
uq0 = {
  name: "",
  styles: {}
};
Pq0 = {
  "\u2500": {
    "\u2502": "\u253C",
    "\u250C": "\u252C",
    "\u2510": "\u252C",
    "\u2514": "\u2534",
    "\u2518": "\u2534",
    "\u251C": "\u253C",
    "\u2524": "\u253C",
    "\u252C": "\u252C",
    "\u2534": "\u2534"
  },
  "\u2502": {
    "\u2500": "\u253C",
    "\u250C": "\u251C",
    "\u2510": "\u2524",
    "\u2514": "\u251C",
    "\u2518": "\u2524",
    "\u251C": "\u251C",
    "\u2524": "\u2524",
    "\u252C": "\u253C",
    "\u2534": "\u253C"
  },
  "\u250C": {
    "\u2500": "\u252C",
    "\u2502": "\u251C",
    "\u2510": "\u252C",
    "\u2514": "\u251C",
    "\u2518": "\u253C",
    "\u251C": "\u251C",
    "\u2524": "\u253C",
    "\u252C": "\u252C",
    "\u2534": "\u253C"
  },
  "\u2510": {
    "\u2500": "\u252C",
    "\u2502": "\u2524",
    "\u250C": "\u252C",
    "\u2514": "\u253C",
    "\u2518": "\u2524",
    "\u251C": "\u253C",
    "\u2524": "\u2524",
    "\u252C": "\u252C",
    "\u2534": "\u253C"
  },
  "\u2514": {
    "\u2500": "\u2534",
    "\u2502": "\u251C",
    "\u250C": "\u251C",
    "\u2510": "\u253C",
    "\u2518": "\u2534",
    "\u251C": "\u251C",
    "\u2524": "\u253C",
    "\u252C": "\u253C",
    "\u2534": "\u2534"
  },
  "\u2518": {
    "\u2500": "\u2534",
    "\u2502": "\u2524",
    "\u250C": "\u253C",
    "\u2510": "\u2524",
    "\u2514": "\u2534",
    "\u251C": "\u253C",
    "\u2524": "\u2524",
    "\u252C": "\u253C",
    "\u2534": "\u2534"
  },
  "\u251C": {
    "\u2500": "\u253C",
    "\u2502": "\u251C",
    "\u250C": "\u251C",
    "\u2510": "\u253C",
    "\u2514": "\u251C",
    "\u2518": "\u253C",
    "\u2524": "\u253C",
    "\u252C": "\u253C",
    "\u2534": "\u253C"
  },
  "\u2524": {
    "\u2500": "\u253C",
    "\u2502": "\u2524",
    "\u250C": "\u253C",
    "\u2510": "\u2524",
    "\u2514": "\u253C",
    "\u2518": "\u2524",
    "\u251C": "\u253C",
    "\u252C": "\u253C",
    "\u2534": "\u253C"
  },
  "\u252C": {
    "\u2500": "\u252C",
    "\u2502": "\u253C",
    "\u250C": "\u252C",
    "\u2510": "\u252C",
    "\u2514": "\u253C",
    "\u2518": "\u253C",
    "\u251C": "\u253C",
    "\u2524": "\u253C",
    "\u2534": "\u253C"
  },
  "\u2534": {
    "\u2500": "\u2534",
    "\u2502": "\u253C",
    "\u250C": "\u253C",
    "\u2510": "\u253C",
    "\u2514": "\u2534",
    "\u2518": "\u2534",
    "\u251C": "\u253C",
    "\u2524": "\u253C",
    "\u252C": "\u253C"
  }
};
Eq0 = [{
  x: 1,
  y: 0
}, {
  x: -1,
  y: 0
}, {
  x: 0,
  y: 1
}, {
  x: 0,
  y: -1
}];
oa();
L8();
L8();
O0();
Lm();
lm();
L8();
lm();
O0();
O0();
q50 = {
  open: "\u25CB",
  in_progress: "\u25D0",
  completed: "\u25CF",
  canceled: "\u2205"
}, XgT = {
  open: null,
  in_progress: 3,
  completed: 141,
  canceled: null
};
O0();
P0();
L8();
$c();
O0();
s0();
O0();
jR();
rR();
O0();
Ei();
dm();
Ez0 = AA.join(cA, "logs", "headless.log"), c2 = AA.join(stT, "device-id.json"), t$T = `cli-tui-${I5T(16).toString("hex")}`;
if (process.env.AMP_PWD) try {
  process.chdir(process.env.AMP_PWD), delete process.env.AMP_PWD;
} catch (T) {
  Be.write(`Failed to change directory to ${process.env.AMP_PWD}: ${T}
`);
}
i$T = [{
  name: "notifications",
  long: "notifications",
  type: "flag",
  description: T => `${T ? "Enable" : "Disable"} sound notifications (enabled by default when not in execute mode)`
}, {
  name: "color",
  long: "color",
  type: "flag",
  description: T => `${T ? "Enable" : "Disable"} color output (enabled by default if stdout and stderr are sent to a TTY)`
}, {
  name: "settingsFile",
  long: "settings-file",
  type: "option",
  default: process.env.AMP_SETTINGS_FILE ?? dA,
  description: `Custom settings file path (overrides the default location ${dA})`
}, {
  name: "logLevel",
  long: "log-level",
  type: "option",
  description: `Set log level (${Object.keys(J).join(", ")})`
}, {
  name: "logFile",
  long: "log-file",
  type: "option",
  description: `Set log file location (overrides the default location ${aKT})`
}, {
  name: "format",
  long: "format",
  type: "option",
  description: "output using the standard or new-ui. Options: `ui`, `new-ui`",
  choices: ["ui", "jsonl", "new-ui"],
  hidden: !0,
  deprecated: !0
}, {
  name: "dangerouslyAllowAll",
  long: "dangerously-allow-all",
  type: "switch",
  default: !1,
  description: "Disable all command confirmation prompts (agent will execute all commands without asking)"
}, {
  name: "jetbrains",
  long: "jetbrains",
  type: "flag",
  default: ji(),
  description: T => T ? "Enable JetBrains integration. When enabled, Amp automatically includes your open JetBrains file and text selection with every message." : "Disable JetBrains integration"
}, {
  name: "ide",
  long: "ide",
  type: "flag",
  default: !0,
  description: T => T ? "Enable IDE connection (default). When enabled, Amp automatically includes your open IDE's file and text selection with every message." : "Disable IDE connection"
}, {
  name: "interactive",
  long: "interactive",
  type: "flag",
  description: T => T ? "Enable interactive mode. This will enable the interactive UI." : "Disable interactive mode. This will disable the interactive UI.",
  hidden: !0,
  deprecated: !0
}, {
  name: "mcpConfig",
  long: "mcp-config",
  type: "option",
  description: "JSON configuration or file path for MCP servers to merge with existing settings"
}, {
  name: "mode",
  long: "mode",
  short: "m",
  type: "option",
  default: Ab.SMART.key,
  description: `Set the agent mode (${Kl({}, !1).map(T => T.mode).join(", ")}) \u2014 controls the model, system prompt, and tool selection`,
  choices: Kl().map(T => T.mode).concat("large", "deep", "internal")
}, {
  name: "takeMeBack",
  long: "take-me-back",
  type: "switch",
  description: "Disable v2 thread mode and use the legacy worker runtime",
  hidden: !0
}, {
  name: "headless",
  long: "headless",
  type: "optional-option",
  description: "Run headless DTW harness (no TUI). Optionally provide a thread ID to connect as executor.",
  hidden: !0
}, {
  name: "threadActors",
  long: "thread-actors",
  type: "switch",
  description: "Connect to the thread-actors counter service. Optionally provide a thread ID.",
  hidden: !0
}, {
  name: "apiKey",
  long: "api-key",
  type: "option",
  description: "API key for internal DTW commands (overrides AMP_API_KEY)",
  hidden: !0
}, {
  name: "sp",
  long: "sp",
  type: "option",
  description: "Custom system prompt text or file path",
  hidden: !0
}, {
  name: "systemPrompt",
  long: "system-prompt",
  type: "option",
  description: "Custom system prompt text",
  hidden: !0
}], e3R = [{
  name: "toggle-skills-count",
  entryPoint: T40
}];
jB = zR.file(v5T.homedir()), tZ = process.env.XDG_CONFIG_HOME ? zR.file(process.env.XDG_CONFIG_HOME) : MR.joinPath(jB, ".config");
LXR().startActiveSpan("main", async T => {
  process.on("exit", () => T.end()), await aF0().catch(Jl);
});
process.on("uncaughtException", T => {
  let R = T instanceof Error ? T.message : String(T),
    a = T instanceof Error ? T.stack : Error().stack,
    e = T instanceof Error ? T.name : "Unknown";
  J.error("[CLEANUP] Uncaught exception detected, cleaning up terminal...", {
    error: T,
    name: e,
    message: R,
    stack: a
  }), WP(), xb().then(() => process.exit(1));
});
process.on("unhandledRejection", T => {
  let R = T instanceof Error ? T.stack : Error().stack,
    a = T instanceof Error ? T.message : String(T),
    e = T instanceof Error ? T.name : "Unknown";
  J.error("[CLEANUP] Unhandled rejection detected, cleaning up terminal...", {
    reason: T,
    name: e,
    message: a,
    stack: R
  }), WP(), xb().then(() => process.exit(1));
});
// End of D3R Wrapper: s3R
;
var kF0 = EW(() => {
  var PF0 = LhT();
  globalThis.__AMP_KEYRING_ENTRY_CLASS__ = PF0.Entry;
  s3R().then(() => c3R).catch(T => {
    console.error(T), process.exit(1);
  });
});
export default kF0();