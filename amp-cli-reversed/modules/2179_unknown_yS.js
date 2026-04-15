class yS {
  toolRunning;
  toolSuccess;
  toolError;
  toolCancelled;
  toolName;
  userMessage;
  assistantMessage;
  systemMessage;
  codeBlock;
  inlineCode;
  syntaxHighlight;
  fileReference;
  processing;
  waiting;
  completed;
  cancelled;
  recommendation;
  suggestion;
  command;
  filename;
  keybind;
  button;
  link;
  shellMode;
  shellModeHidden;
  handoffMode;
  handoffModeDim;
  queueMode;
  diffAdded;
  diffRemoved;
  diffChanged;
  diffContext;
  ideConnected;
  ideDisconnected;
  ideWarning;
  scrollbarThumb;
  scrollbarTrack;
  tableBorder;
  selectionBackground;
  selectionForeground;
  selectedMessage;
  smartModeColor;
  rushModeColor;
  threadGraphNode;
  threadGraphNodeSelected;
  threadGraphConnector;
  constructor({
    toolRunning: T,
    toolSuccess: R,
    toolError: a,
    toolCancelled: e,
    toolName: t,
    userMessage: r,
    assistantMessage: h,
    systemMessage: i,
    codeBlock: c,
    inlineCode: s,
    syntaxHighlight: A,
    fileReference: l,
    processing: o,
    waiting: n,
    completed: p,
    cancelled: _,
    suggestion: m,
    command: b,
    filename: y,
    keybind: u,
    button: P,
    link: k,
    shellMode: x,
    shellModeHidden: f,
    handoffMode: v,
    handoffModeDim: g,
    queueMode: I,
    diffAdded: S,
    diffRemoved: O,
    diffChanged: j,
    diffContext: d,
    ideConnected: C,
    ideDisconnected: L,
    ideWarning: w,
    scrollbarThumb: D,
    scrollbarTrack: B,
    tableBorder: M,
    selectionBackground: V,
    selectionForeground: Q,
    selectedMessage: W,
    recommendation: eT,
    smartModeColor: iT,
    rushModeColor: aT,
    threadGraphNode: oT,
    threadGraphNodeSelected: TT,
    threadGraphConnector: tT
  }) {
    this.toolRunning = T, this.toolSuccess = R, this.toolError = a, this.toolCancelled = e, this.toolName = t, this.userMessage = r, this.assistantMessage = h, this.systemMessage = i, this.codeBlock = c, this.inlineCode = s, this.syntaxHighlight = A, this.fileReference = l, this.processing = o, this.waiting = n, this.completed = p, this.cancelled = _, this.suggestion = m, this.command = b, this.filename = y, this.keybind = u, this.button = P, this.link = k, this.shellMode = x, this.shellModeHidden = f, this.handoffMode = v, this.handoffModeDim = g, this.queueMode = I, this.diffAdded = S, this.diffRemoved = O, this.diffChanged = j, this.diffContext = d, this.ideConnected = C, this.ideDisconnected = L, this.ideWarning = w, this.scrollbarThumb = D, this.scrollbarTrack = B, this.tableBorder = M, this.selectionBackground = V, this.selectionForeground = Q, this.selectedMessage = W, this.recommendation = eT, this.smartModeColor = iT, this.rushModeColor = aT, this.threadGraphNode = oT, this.threadGraphNodeSelected = TT, this.threadGraphConnector = tT;
  }
  static default(T = "dark") {
    let R = T === "light",
      a = R ? LT.rgb(0, 140, 70) : LT.rgb(0, 255, 136),
      e = R ? LT.rgb(180, 100, 0) : LT.rgb(255, 215, 0);
    return new yS({
      toolRunning: LT.blue,
      toolSuccess: LT.green,
      toolError: LT.red,
      toolCancelled: LT.yellow,
      toolName: LT.default(),
      userMessage: LT.cyan,
      assistantMessage: LT.default(),
      systemMessage: LT.index(8),
      codeBlock: LT.default(),
      inlineCode: LT.yellow,
      syntaxHighlight: {
        keyword: LT.blue,
        string: LT.green,
        number: LT.yellow,
        comment: LT.index(8),
        function: LT.cyan,
        variable: LT.default(),
        type: LT.magenta,
        operator: LT.default()
      },
      fileReference: LT.cyan,
      processing: LT.blue,
      waiting: LT.yellow,
      completed: LT.green,
      cancelled: LT.index(8),
      recommendation: LT.blue,
      suggestion: LT.magenta,
      command: LT.yellow,
      filename: LT.cyan,
      keybind: LT.blue,
      button: LT.cyan,
      link: LT.blue,
      shellMode: LT.blue,
      shellModeHidden: LT.index(8),
      handoffMode: LT.magenta,
      handoffModeDim: LT.rgb(128, 0, 128),
      queueMode: LT.rgb(160, 160, 160),
      diffAdded: LT.green,
      diffRemoved: LT.red,
      diffChanged: LT.yellow,
      diffContext: LT.index(8),
      ideConnected: LT.green,
      ideDisconnected: LT.red,
      ideWarning: LT.yellow,
      scrollbarThumb: LT.default(),
      scrollbarTrack: LT.index(8),
      tableBorder: LT.index(8),
      selectionBackground: LT.yellow,
      selectionForeground: LT.black,
      selectedMessage: LT.green,
      smartModeColor: a,
      rushModeColor: e,
      threadGraphNode: LT.blue,
      threadGraphNodeSelected: LT.yellow,
      threadGraphConnector: LT.default()
    });
  }
}