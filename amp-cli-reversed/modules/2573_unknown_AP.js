function AP(T, R) {
  let {
      decimalPlaces: a,
      roundingMode: e
    } = $L0(T, R),
    t = T % 1 === 0 && !R.alwaysShowCents ? T.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      roundingMode: e
    }) : T.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: a,
      maximumFractionDigits: a,
      roundingMode: e
    });
  return R.includeCurrencyCode ? `${t} USD` : t;
}