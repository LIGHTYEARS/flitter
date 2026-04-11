// Module: create-resolver
// Original: jn
// Type: CJS (RT wrapper)
// Exports: createResolver, getDefaultAuthority, mapUriDefaultScheme, registerDefaultScheme, registerResolver
// Category: util

// Module: jn (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.registerResolver=t,T.registerDefaultScheme=r,T.createResolver=h,T.getDefaultAuthority=i,T.mapUriDefaultScheme=c;
var R=dh(),a={},e=null;
function t(s,A){a[s]=A}function r(s){e=s}function h(s,A,l){if(s.scheme!==void 0&&s.scheme in a)return new a[s.scheme](s,A,l);
else throw Error(`No resolver could be created for target ${(0,R.uriToString)(s)}`)}function i(s){if(s.scheme!==void 0&&s.scheme in a)return a[s.scheme].getDefaultAuthority(s);else throw Error(`Invalid target ${(0,R.uriToString)(s)}`)}function c(s){if(s.scheme===void 0||!(s.scheme in a))if(e!==null)return{scheme:e,authority:void 0,path:(0,R.uriToString)(s)};else return null;return s}}