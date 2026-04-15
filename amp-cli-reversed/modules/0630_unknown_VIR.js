function VIR(T) {
  let R = T.match(/\bfilename=("(.*?)"|([^()<>@,;:\\"/[\]?={}\s\t]+))($|;\s)/i);
  if (!R) return;
  let a = R[2] || R[3] || "",
    e = a.slice(a.lastIndexOf("\\") + 1);
  return e = e.replace(/%22/g, '"'), e = e.replace(/&#(\d{4});/g, (t, r) => {
    return String.fromCharCode(r);
  }), e;
}