class IaT {
  platform;
  constructor(T) {
    this.platform = T;
  }
  whitespaceWithEscapes = qR.default.alt(qR.default.string(" "), qR.default.string("\t"), qR.default.string(`
`), qR.default.string("\r"), qR.default.string("\\").then(qR.default.whitespace)).many().tie();
  escapeSequences = qR.default.string("\\").then(qR.default.oneOf('\\|&<>();"'));
  unquotedEscapeSequences = qR.default.string("\\").then(qR.default.oneOf('\\|&<>(); "[]'));
  doubleQuotedString = ruT(qR.default.string('"'), qR.default.alt(this.escapeSequences, qR.default.noneOf('"')).many().tie()).desc("double-quoted string");
  singleQuotedString = ruT(qR.default.string("'"), qR.default.alt(qR.default.string("\\").then(qR.default.any), qR.default.noneOf("'\\")).many().tie()).desc("single-quoted string");
  braceExpansion = qR.default.lazy(() => {
    let T = qR.default.lazy(() => qR.default.alt(qR.default.string("{").then(T).skip(qR.default.string("}")).map(R => `{${R}}`), qR.default.noneOf("}")).many().tie());
    return qR.default.string("{").then(T).skip(qR.default.string("}")).map(R => `{${R}}`);
  }).desc("brace expansion");
  unquotedString = qR.default.lazy(() => {
    if (this.platform === "win32") return qR.default.alt(qR.default.regexp(/[a-zA-Z]:[\\/]\S+/), qR.default.regexp(/\\\\\S+\\\S*/), qR.default.alt(this.unquotedEscapeSequences, qR.default.regexp(/[a-zA-Z0-9_\-:/.*~@=\\^,[\]#!]/), qR.default.regexp(/\$(?![A-Za-z_{(])/), qR.default.regexp(/\([a-zA-Z0-9_-]*\)/)).atLeast(1).tie()).desc("unquoted string");else return qR.default.alt(this.unquotedEscapeSequences, qR.default.regexp(/[a-zA-Z0-9_\-:/.*~@=+^,[\]#!]/), qR.default.regexp(/\$(?![A-Za-z_{(])/), qR.default.regexp(/\([a-zA-Z0-9_-]*\)/)).atLeast(1).tie().desc("unquoted string");
  });
  commandSubstitution = qR.default.lazy(() => qR.default.string("$(").then(this.expression).skip(qR.default.string(")")).map(T => ({
    type: "invocations",
    trees: T
  })));
  word = qR.default.lazy(() => {
    return qR.default.alt(this.doubleQuotedString, this.singleQuotedString, this.braceExpansion, this.unquotedString, this.commandSubstitution, this.envVariable).sepBy1(qR.default.string("")).map(T => {
      let [R, ...a] = T;
      if (R === void 0) throw Error("Expect non-empty array of parts in argument: " + JSON.stringify(T));else if (a.length === 0) return R;else if (T.every(e => typeof e === "string")) return T.join("");else return {
        type: "concatenation",
        values: T
      };
    });
  }).node("word");
  envVariable = qR.default.regexp(/\$([A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})/).map(T => xs).desc("environment variable");
  envVarAssignment = qR.default.seqMap(qR.default.regexp(/[A-Za-z_][A-Za-z0-9_]*/), qR.default.string("="), qR.default.alt(this.doubleQuotedString, this.singleQuotedString, this.unquotedString).or(qR.default.succeed("")), (T, R, a) => ({
    name: T,
    value: a
  })).desc("environment variable assignment");
  heredoc = qR.default.regex(/<<-?'?(\w+)'?/).chain(T => AWR(T)).desc("heredoc");
  operator = qR.default.alt(qR.default.regex(/&{1,2}/).desc("background|conjunction"), qR.default.regex(/\|{1,2}/).desc("pipe|disjunction"), qR.default.string(";").desc("semicolon")).map(T => {
    return;
  });
  redirect = qR.default.lazy(() => {
    let T = qR.default.alt(qR.default.string(">>"), qR.default.string(">")),
      R = qR.default.alt(qR.default.string("&>>"), qR.default.string("&>")),
      a = qR.default.string("<"),
      e = qR.default.regexp(/\d+>(&\d+|\S+)/);
    return qR.default.alt(qR.default.seq(qR.default.alt(T, R), qR.default.optWhitespace, this.word), qR.default.seq(T, qR.default.optWhitespace, this.word, qR.default.whitespace, qR.default.string("&>"), qR.default.optWhitespace, this.word), qR.default.seq(a, qR.default.optWhitespace, this.word), qR.default.seq(qR.default.digit, a, qR.default.optWhitespace, this.word), e, this.heredoc).map(t => {
      return;
    }).desc("redirect");
  });
  args = pWR(qR.default.notFollowedBy(qR.default.alt(this.operator, this.redirect)).then(this.word), this.whitespaceWithEscapes, qR.default.alt(this.operator, this.redirect));
  invocationWithoutArgs = qR.default.lazy(() => qR.default.seqMap(this.envVarAssignment.skip(this.whitespaceWithEscapes).many(), this.word, (T, R) => ({
    program: R,
    arguments: [],
    ...(T.length > 0 && {
      envVars: T
    })
  })));
  invocationWithArgs = qR.default.lazy(() => qR.default.seqMap(this.envVarAssignment.skip(this.whitespaceWithEscapes).many(), this.word.skip(this.whitespaceWithEscapes), this.args, (T, R, a) => ({
    program: R,
    arguments: a,
    ...(T.length > 0 && {
      envVars: T
    })
  })));
  invocation = qR.default.lazy(() => {
    let T = qR.default.alt(this.invocationWithArgs, this.invocationWithoutArgs);
    return qR.default.alt(T.skip(this.redirect.trim(lWR).many()), T);
  });
  bareExpression = qR.default.lazy(() => {
    let T = qR.default.sepBy1(this.invocation, this.operator.trim(this.whitespaceWithEscapes));
    return qR.default.alt(T.skip(qR.default.string("&").trim(this.whitespaceWithEscapes)), T);
  });
  subshellExpression = qR.default.lazy(() => qR.default.string("(").then(this.expression).skip(qR.default.string(")")));
  expression = qR.default.lazy(() => qR.default.alt(this.bareExpression, this.subshellExpression));
  parseShellCommand(T) {
    return this.expression.tryParse(T);
  }
}