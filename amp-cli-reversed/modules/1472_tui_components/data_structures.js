Sk0 = [{
  sequence: "\x1B[?1049h\x1B[H\x1B]66;w=1; \x1B\\\x1B[6n\x1B[?1049l",
  description: "Query Kitty explicit width support"
}, {
  sequence: "\x1B]10;?\x07",
  description: "Query terminal foreground color (OSC 10)"
}, {
  sequence: "\x1B]11;?\x07",
  description: "Query terminal background color (OSC 11)"
}, {
  sequence: "\x1B]12;?\x07",
  description: "Query terminal cursor color (OSC 12)"
}, {
  sequence: "\x1B]4;0;?\x07",
  description: "Query terminal color 0 (OSC 4)"
}, {
  sequence: "\x1B]4;1;?\x07",
  description: "Query terminal color 1 (OSC 4)"
}, {
  sequence: "\x1B]4;2;?\x07",
  description: "Query terminal color 2 (OSC 4)"
}, {
  sequence: "\x1B]4;3;?\x07",
  description: "Query terminal color 3 (OSC 4)"
}, {
  sequence: "\x1B]4;4;?\x07",
  description: "Query terminal color 4 (OSC 4)"
}, {
  sequence: "\x1B]4;5;?\x07",
  description: "Query terminal color 5 (OSC 4)"
}, {
  sequence: "\x1B]4;6;?\x07",
  description: "Query terminal color 6 (OSC 4)"
}, {
  sequence: "\x1B]4;7;?\x07",
  description: "Query terminal color 7 (OSC 4)"
}, {
  sequence: "\x1B[?2026$p",
  description: "Query synchronized output support"
}, {
  sequence: "\x1B[?2027$p",
  description: "Query emoji width mode support"
}, {
  sequence: "\x1B[?1016$p",
  description: "Query pixel mouse mode support"
}, {
  sequence: "\x1B[?2031$p",
  description: "Query color palette change notifications support (mode 2031)"
}, {
  sequence: "\x1B[?u",
  description: "Query Kitty keyboard protocol support"
}, {
  sequence: "\x1B[>0q",
  description: "Query terminal version (XTVERSION)"
}, {
  sequence: "\x1BP+q4d73\x1B\\",
  description: "Query OSC 52 clipboard support (XTGETTCAP Ms)"
}, {
  sequence: FP("\x1B_Gi=1,a=q\x1B\\"),
  description: "Query Kitty graphics protocol support",
  shouldSend: () => !ji() && process.env.TERM_PROGRAM !== "Apple_Terminal"
}, {
  sequence: "\x1B[c",
  description: "Device Attributes (DA1)",
  isFinal: !0
}];
ix0 = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Backspace", "Delete", "Insert", "Tab", "Enter", "Shift", "Control", "Alt", "Meta", "CapsLock", "NumLock", "ScrollLock", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19", "F20", "F21", "F22", "F23", "F24", "Escape", "PrintScreen", "Pause", "ContextMenu", "MediaPlayPause", "MediaStop", "MediaTrackNext", "MediaTrackPrevious", "AudioVolumeDown", "AudioVolumeMute", "AudioVolumeUp", "BrowserBack", "BrowserFavorites", "BrowserForward", "BrowserHome", "BrowserRefresh", "BrowserSearch", "BrowserStop", "Clear", "Copy", "Cut", "Paste", "Undo", "Redo", "Find", "Help", "Menu", "Select", "Execute", "Sleep", "WakeUp"]);
_x0 = new Set(["thread_status"]);
Af0 = new Set([65534, 65535, 131070, 131071, 196606, 196607, 262142, 262143, 327678, 327679, 393214, 393215, 458750, 458751, 524286, 524287, 589822, 589823, 655358, 655359, 720894, 720895, 786430, 786431, 851966, 851967, 917502, 917503, 983038, 983039, 1048574, 1048575, 1114110, 1114111]);
LYT = new Set([sT.CAPTION, sT.COL, sT.COLGROUP, sT.TBODY, sT.TD, sT.TFOOT, sT.TH, sT.THEAD, sT.TR]);
NQ0 = new Set([pR.AREA, pR.BASE, pR.BASEFONT, pR.BGSOUND, pR.BR, pR.COL, pR.EMBED, pR.FRAME, pR.HR, pR.IMG, pR.INPUT, pR.KEYGEN, pR.LINK, pR.META, pR.PARAM, pR.SOURCE, pR.TRACK, pR.WBR]);
SF = ["history", "path", "basename", "stem", "extname", "dirname"];
KS0 = ["autolink", "destinationLiteral", "destinationRaw", "reference", "titleQuote", "titleApostrophe"];
ly = [773, 781, 782, 784, 786, 829, 830, 831, 838, 842, 843, 844, 848, 849, 850, 855, 859, 867, 868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 1155, 1156, 1157, 1158, 1159, 1426, 1427, 1428, 1429, 1431, 1432, 1433, 1436, 1437, 1438, 1439, 1440, 1441, 1448, 1449, 1451, 1452, 1455, 1476, 1552, 1553, 1554, 1555, 1556, 1557, 1558, 1559, 1623, 1624, 1625, 1626, 1627, 1629, 1630, 1750, 1751, 1752, 1753, 1754, 1755, 1756, 1759, 1760, 1761, 1762, 1764, 1767, 1768, 1771, 1772, 1840, 1842, 1843, 1845, 1846, 1850, 1853, 1855, 1856, 1857, 1859, 1861, 1863, 1865, 1866, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2035, 2070, 2071, 2072, 2073, 2075, 2076, 2077, 2078, 2079, 2080, 2081, 2082, 2083, 2085, 2086, 2087, 2089, 2090, 2091, 2092, 2093, 2385, 2387, 2388, 3970, 3971, 3974, 3975, 4957, 4958, 4959, 6109, 6458, 6679, 6773, 6774, 6775, 6776, 6777, 6778, 6779, 6780, 7019, 7021, 7022, 7023, 7024, 7025, 7026, 7027, 7376, 7377, 7378, 7386, 7387, 7392, 7616, 7617, 7619, 7620, 7621, 7622, 7623, 7624, 7625, 7627, 7628, 7633, 7634, 7635, 7636, 7637, 7638, 7639, 7640, 7641, 7642, 7643, 7644, 7645, 7646, 7647, 7648, 7649, 7650, 7651, 7652, 7653, 7654, 7678, 8400, 8401, 8404, 8405, 8406, 8407, 8411, 8412, 8417, 8423, 8425, 8432, 11503, 11504, 11505, 11744, 11745, 11746, 11747, 11748, 11749, 11750, 11751, 11752, 11753, 11754, 11755, 11756, 11757, 11758, 11759, 11760, 11761, 11762, 11763, 11764, 11765, 11766, 11767, 11768, 11769, 11770, 11771, 11772, 11773, 11774, 11775, 42607, 42620, 42621, 42736, 42737, 43232, 43233, 43234, 43235, 43236, 43237, 43238, 43239, 43240, 43241, 43242, 43243, 43244, 43245, 43246, 43247, 43248, 43249, 43696, 43698, 43699, 43703, 43704, 43710, 43711, 43713, 65056, 65057, 65058, 65059, 65060, 65061, 65062];
Xd0 = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico", ".svg"]);
uIT = [" ", "\u223C", "\u2248", "\u224B", "\u2248", "\u223C"];
aD0 = new Set(["working", "streaming", "tool_use", "running_tools", "awaiting_approval"]);
cw0 = {
  preserveOrder: !1,
  attributeNamePrefix: "@_",
  attributesGroupName: !1,
  textNodeName: "#text",
  ignoreAttributes: !0,
  removeNSPrefix: !1,
  allowBooleanAttributes: !1,
  parseTagValue: !0,
  parseAttributeValue: !1,
  trimValues: !0,
  cdataPropName: !1,
  numberParseOptions: {
    hex: !0,
    leadingZeros: !0,
    eNotation: !0
  },
  tagValueProcessor: function (T, R) {
    return R;
  },
  attributeValueProcessor: function (T, R) {
    return R;
  },
  stopNodes: [],
  alwaysCreateTextNode: !1,
  isArray: () => !1,
  commentPropName: !1,
  unpairedTags: [],
  processEntities: !0,
  htmlEntities: !1,
  ignoreDeclaration: !1,
  ignorePiTags: !1,
  transformTagName: !1,
  transformAttributeName: !1,
  updateTag: function (T, R, a) {
    return T;
  },
  captureMetaData: !1
};
QrT = [LT.index(2), LT.index(5), LT.index(6), LT.index(3), LT.index(4), LT.index(1), {
  type: "index",
  value: 10
}, {
  type: "index",
  value: 14
}];
yq0 = new Set(["\u2500", "\u2502", "\u250C", "\u2510", "\u2514", "\u2518", "\u251C", "\u2524", "\u252C", "\u2534", "\u253C", "\u2574", "\u2575", "\u2576", "\u2577"]);
xq0 = {
  "\u25B2": "\u25BC",
  "\u25BC": "\u25B2",
  "\u25E4": "\u25E3",
  "\u25E3": "\u25E4",
  "\u25E5": "\u25E2",
  "\u25E2": "\u25E5",
  "^": "v",
  v: "^",
  "\u250C": "\u2514",
  "\u2514": "\u250C",
  "\u2510": "\u2518",
  "\u2518": "\u2510",
  "\u252C": "\u2534",
  "\u2534": "\u252C",
  "\u2575": "\u2577",
  "\u2577": "\u2575"
};
ZgT = [{
  left: {
    keys: "Ctrl+O",
    description: "command palette"
  },
  right: {
    keys: "Ctrl+R",
    description: "prompt history"
  }
}, {
  left: {
    keys: "$ or $$",
    description: "shell commands"
  },
  right: {
    keys: "Ctrl+V",
    description: "paste images"
  }
}, {
  left: {
    keys: "Shift+Enter",
    description: "newline"
  },
  right: {
    keys: "Ctrl+S",
    description: "switch modes"
  }
}, {
  left: {
    keys: "Alt+D",
    description: "toggle deep reasoning"
  },
  right: {
    keys: "Alt+T",
    description: "toggle thinking/dense view"
  }
}, {
  left: {
    keys: "Ctrl+G",
    description: "edit in $EDITOR"
  },
  right: {
    keys: "Tab/Shift+Tab",
    description: "navigate messages"
  }
}, {
  left: {
    keys: "@ / @@",
    description: "mention files/threads"
  },
  right: {
    keys: "?",
    description: "toggle this help"
  }
}];