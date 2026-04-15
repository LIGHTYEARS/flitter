function xxT(T) {
  if (T === 9) return mtT;
  if (Bm0(String.fromCodePoint(T)) || T >= 8203 && T <= 8205 || T === 8206 || T === 8207 || T === 8288 || T === 65279 || T >= 65024 && T <= 65039 || T >= 917760 && T <= 917999 || T >= 127995 && T <= 127999) return 0;
  if (Um0(T)) {
    if (ji() && (T >= 9728 && T <= 10175 || T === 8986 || T === 8987 || T === 9203 || T >= 9193 && T <= 9196 || T === 9200)) return 1;
    if (wm0(T)) return 1;
    return 2;
  }
  if (Hm0(T)) return 2;
  return 1;
}