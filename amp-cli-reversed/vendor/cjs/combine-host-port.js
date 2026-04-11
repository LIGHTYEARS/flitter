// Module: combine-host-port
// Original: dh
// Type: CJS (RT wrapper)
// Exports: combineHostPort, parseUri, splitHostPort, uriToString
// Category: util

// Module: dh (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.parseUri=a,T.splitHostPort=t,T.combineHostPort=r,T.uriToString=h;
var R=/^(?:([A-Za-z0-9+.-]+):)?(?:\/\/([^/]*)\/)?(.+)$/;
function a(i){let c=R.exec(i);
if(c===null)return null;
return{scheme:c[1],authority:c[2],path:c[3]}}var e=/^\d+$/;
function t(i){if(i.startsWith("[")){let c=i.indexOf("]");
if(c===-1)return null;
let s=i.substring(1,c);
if(s.indexOf(":")===-1)return null;
if(i.length>c+1)if(i[c+1]===":"){let A=i.substring(c+2);
if(e.test(A))return{host:s,port:+A};
else return null}else return null;
else return{host:s}}else{let c=i.split(":");
if(c.length===2)if(e.test(c[1]))return{host:c[0],port:+c[1]};
else return null;
else return{host:i}}}function r(i){if(i.port===void 0)return i.host;
else if(i.host.includes(":"))return`[${i.host}]:${i.port}`;else return`${i.host}:${i.port}`}function h(i){let c="";if(i.scheme!==void 0)c+=i.scheme+":";if(i.authority!==void 0)c+="//"+i.authority+"/";return c+=i.path,c}}