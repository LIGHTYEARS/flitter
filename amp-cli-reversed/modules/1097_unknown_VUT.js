function jk(T) {
  return TypeError("Cannot " + T + " a stream using a released reader");
}
function QV(T) {
  T._closedPromise = zt((R, a) => {
    T._closedPromise_resolve = R, T._closedPromise_reject = a;
  });
}
function FUT(T, R) {
  QV(T), O3T(T, R);
}
function O3T(T, R) {
  T._closedPromise_reject !== void 0 && (vk(T._closedPromise), T._closedPromise_reject(R), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0);
}
function GUT(T) {
  T._closedPromise_resolve !== void 0 && (T._closedPromise_resolve(void 0), T._closedPromise_resolve = void 0, T._closedPromise_reject = void 0);
}
function hn(T, R) {
  if (T !== void 0 && typeof (a = T) != "object" && typeof a != "function") throw TypeError(`${R} is not an object.`);
  var a;
}
function Mc(T, R) {
  if (typeof T != "function") throw TypeError(`${R} is not a function.`);
}
function KUT(T, R) {
  if (!function (a) {
    return typeof a == "object" && a !== null || typeof a == "function";
  }(T)) throw TypeError(`${R} is not an object.`);
}
function mn(T, R, a) {
  if (T === void 0) throw TypeError(`Parameter ${R} is required in '${a}'.`);
}
function ZV(T, R, a) {
  if (T === void 0) throw TypeError(`${R} is required in '${a}'.`);
}
function d3T(T) {
  return Number(T);
}
function ObT(T) {
  return T === 0 ? 0 : T;
}
function VUT(T, R) {
  let a = Number.MAX_SAFE_INTEGER,
    e = Number(T);
  if (e = ObT(e), !iX(e)) throw TypeError(`${R} is not a finite number`);
  if (e = function (t) {
    return ObT(SHT(t));
  }(e), e < 0 || e > a) throw TypeError(`${R} is outside the accepted range of 0 to ${a}, inclusive`);
  return iX(e) && e !== 0 ? e : 0;
}