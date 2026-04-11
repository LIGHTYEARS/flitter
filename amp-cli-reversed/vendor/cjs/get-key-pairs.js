// Module: get-key-pairs
// Original: C$T
// Type: CJS (RT wrapper)
// Exports: getKeyPairs, parseKeyPairsIntoRecord, parsePairKeyValue, serializeKeyPairs
// Category: util

// Module: C$T (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.parseKeyPairsIntoRecord=T.parsePairKeyValue=T.getKeyPairs=T.serializeKeyPairs=void 0;
var R=n0(),a=E$T();
function e(i){return i.reduce((c,s)=>{let A=`${c}${c!==""?a.BAGGAGE_ITEMS_SEPARATOR:""}${s}`;return A.length>a.BAGGAGE_MAX_TOTAL_LENGTH?c:A},"")}T.serializeKeyPairs=e;function t(i){return i.getAllEntries().map(([c,s])=>{let A=`${encodeURIComponent(c)}=${encodeURIComponent(s.value)}`;if(s.metadata!==void 0)A+=a.BAGGAGE_PROPERTIES_SEPARATOR+s.metadata.toString();return A})}T.getKeyPairs=t;function r(i){let c=i.split(a.BAGGAGE_PROPERTIES_SEPARATOR);if(c.length<=0)return;let s=c.shift();if(!s)return;let A=s.indexOf(a.BAGGAGE_KEY_PAIR_SEPARATOR);if(A<=0)return;let l=decodeURIComponent(s.substring(0,A).trim()),o=decodeURIComponent(s.substring(A+1).trim()),n;if(c.length>0)n=(0,R.baggageEntryMetadataFromString)(c.join(a.BAGGAGE_PROPERTIES_SEPARATOR));return{key:l,value:o,metadata:n}}T.parsePairKeyValue=r;function h(i){let c={};if(typeof i==="string"&&i.length>0)i.split(a.BAGGAGE_ITEMS_SEPARATOR).forEach((s)=>{let A=r(s);if(A!==void 0&&A.value.length>0)c[A.key]=A.value});return c}T.parseKeyPairsIntoRecord=h}