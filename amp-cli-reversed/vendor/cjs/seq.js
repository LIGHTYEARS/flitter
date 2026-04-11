// Module: seq
// Original: lO
// Type: CJS (RT wrapper)
// Exports: seq
// Category: util

// Module: lO (CJS)
(T)=>{var R=x8(),a=xm(),e={collection:"seq",default:!0,nodeClass:a.YAMLSeq,tag:"tag:yaml.org,2002:seq",resolve(t,r){if(!R.isSeq(t))r("Expected a sequence for this tag");
return t},createNode:(t,r,h)=>a.YAMLSeq.from(t,r,h)};
T.seq=e}