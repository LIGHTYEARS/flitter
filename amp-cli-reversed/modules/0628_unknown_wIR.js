function wIR(T, R = Ub) {
  var a = `${yK()}${yK()}`.replace(/\./g, "").slice(-28).padStart(32, "-"),
    e = [],
    t = `--${a}\r
Content-Disposition: form-data; name="`;
  return T.forEach((r, h) => typeof r == "string" ? e.push(t + n5(h) + `"\r
\r
${r.replace(/\r(?!\n)|(?<!\r)\n/g, `\r
`)}\r
`) : e.push(t + n5(h) + `"; filename="${n5(r.name, 1)}"\r
Content-Type: ${r.type || "application/octet-stream"}\r
\r
`, r, `\r
`)), e.push(`--${a}--`), new R(e, {
    type: "multipart/form-data; boundary=" + a
  });
}