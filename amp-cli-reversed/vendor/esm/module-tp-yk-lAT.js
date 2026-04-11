// Module: module-tp-yk-lAT
// Original: lAT
// Type: ESM (PT wrapper)
// Exports: AK, NL, bwT, gy, pK
// Category: util

// Module: lAT (ESM)
() => {
  (Tp(),
    yk(),
    DlT(),
    Ii(),
    En(),
    Q7T(),
    _fR(),
    n8T(),
    swT(),
    _wT(),
    cwT(),
    pwT(),
    DlT(),
    Mi(),
    s8T(),
    yk(),
    (pK = _a),
    (NL = new WeakMap()),
    (AK = new WeakSet()),
    (bwT = function () {
      return this.baseURL !== "https://api.anthropic.com";
    }),
    (_a.Anthropic = pK),
    (_a.HUMAN_PROMPT = bfR),
    (_a.AI_PROMPT = mfR),
    (_a.DEFAULT_TIMEOUT = 600000),
    (_a.AnthropicError = f9),
    (_a.APIError = pr),
    (_a.APIConnectionError = F$),
    (_a.APIConnectionTimeoutError = h8T),
    (_a.APIUserAbortError = pi),
    (_a.NotFoundError = GG),
    (_a.ConflictError = KG),
    (_a.RateLimitError = XG),
    (_a.BadRequestError = qG),
    (_a.AuthenticationError = zG),
    (_a.InternalServerError = YG),
    (_a.PermissionDeniedError = FG),
    (_a.UnprocessableEntityError = VG),
    (_a.toFile = YxR),
    (gy = class extends _a {
      constructor() {
        super(...arguments);
        ((this.completions = new oK(this)),
          (this.messages = new i7(this)),
          (this.models = new lK(this)),
          (this.beta = new L_(this)));
      }
    }),
    (gy.Completions = oK),
    (gy.Messages = i7),
    (gy.Models = lK),
    (gy.Beta = L_));
};
