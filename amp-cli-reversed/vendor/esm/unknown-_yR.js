// Module: unknown-_yR
// Original: _yR
// Type: ESM (PT wrapper)
// Exports: BE, FE, GE, Gg, HE, KE, Kg, NE, Na, UE, VE, VMT, Vg, WE, Xg, Y_, qE, wE, zE
// Category: unknown

// Module: _yR (ESM)
() => {
  ((Na = class extends Error {
    constructor(R, a) {
      super(R);
      ((this.errorUri = a), (this.name = this.constructor.name));
    }
    toResponseObject() {
      let R = { error: this.errorCode, error_description: this.message };
      if (this.errorUri) R.error_uri = this.errorUri;
      return R;
    }
    get errorCode() {
      return this.constructor.errorCode;
    }
  }),
    (wE = class extends Na {}),
    (wE.errorCode = "invalid_request"),
    (Gg = class extends Na {}),
    (Gg.errorCode = "invalid_client"),
    (Kg = class extends Na {}),
    (Kg.errorCode = "invalid_grant"),
    (Vg = class extends Na {}),
    (Vg.errorCode = "unauthorized_client"),
    (BE = class extends Na {}),
    (BE.errorCode = "unsupported_grant_type"),
    (NE = class extends Na {}),
    (NE.errorCode = "invalid_scope"),
    (UE = class extends Na {}),
    (UE.errorCode = "access_denied"),
    (Y_ = class extends Na {}),
    (Y_.errorCode = "server_error"),
    (HE = class extends Na {}),
    (HE.errorCode = "temporarily_unavailable"),
    (WE = class extends Na {}),
    (WE.errorCode = "unsupported_response_type"),
    (qE = class extends Na {}),
    (qE.errorCode = "unsupported_token_type"),
    (zE = class extends Na {}),
    (zE.errorCode = "invalid_token"),
    (FE = class extends Na {}),
    (FE.errorCode = "method_not_allowed"),
    (GE = class extends Na {}),
    (GE.errorCode = "too_many_requests"),
    (Xg = class extends Na {}),
    (Xg.errorCode = "invalid_client_metadata"),
    (KE = class extends Na {}),
    (KE.errorCode = "insufficient_scope"),
    (VE = class extends Na {}),
    (VE.errorCode = "invalid_target"),
    (VMT = {
      [wE.errorCode]: wE,
      [Gg.errorCode]: Gg,
      [Kg.errorCode]: Kg,
      [Vg.errorCode]: Vg,
      [BE.errorCode]: BE,
      [NE.errorCode]: NE,
      [UE.errorCode]: UE,
      [Y_.errorCode]: Y_,
      [HE.errorCode]: HE,
      [WE.errorCode]: WE,
      [qE.errorCode]: qE,
      [zE.errorCode]: zE,
      [FE.errorCode]: FE,
      [GE.errorCode]: GE,
      [Xg.errorCode]: Xg,
      [KE.errorCode]: KE,
      [VE.errorCode]: VE,
    }));
};
