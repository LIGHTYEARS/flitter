function i_0() {
  return async (T, R) => {
    return Qi.write(`
`), Qi.write(oR.yellow.bold(`OAuth Authorization Required
`)), Qi.write(oR.dim("\u2500".repeat(60) + `
`)), Qi.write(`
`), Qi.write(`Open this URL in your browser to authorize:

`), Qi.write(oR.blue.bold(T) + `

`), Qi.write(oR.dim(`After authorizing, you will be redirected to a localhost URL.
`)), Qi.write(oR.dim(`The redirect will fail - this is expected in headless mode.
`)), Qi.write(oR.dim(`Copy the full URL from your browser address bar and paste it below.
`)), Qi.write(`
`), await c_0("Paste the callback URL or authorization code: ");
  };
}