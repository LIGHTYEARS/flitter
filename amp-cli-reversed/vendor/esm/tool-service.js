// Module: tool-service
// Original: um
// Type: ESM (PT wrapper)
// Exports: $E, FLT, GLT, IN, KLT, OoT, cs, g9T
// Category: util

// Module: um (ESM)
() => {
  (jR(),
    rR(),
    zS(),
    de(),
    vc(),
    _bR(),
    m9T(),
    e9T(),
    Br(),
    P0(),
    (OoT = c0(n0(), 1)),
    (g9T = c0(KA(), 1)),
    (FLT = { dispose() {} }),
    (IN = /^[-a-zA-Z0-9_]{1,64}$/),
    ($E = OoT.metrics.getMeter("tool_service")),
    (cs = $E.createCounter("tool_service.invocation_count", {
      description: "Number of tool invocations",
    })),
    (GLT = $E.createHistogram("tool_service.invocation_latency", {
      description: "Latency of tool invocations",
      unit: "ms",
    })),
    (KLT = $E.createCounter("tool_service.skill.invocation_count", {
      description: "Skill tool invocations by skill name",
    })));
};
