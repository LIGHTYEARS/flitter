// Module: deadline-to-string
// Original: qB
// Type: CJS (RT wrapper)
// Exports: deadlineToString, formatDateDifference, getDeadlineTimeoutString, getRelativeTimeout, minDeadline
// Category: util

// Module: qB (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.minDeadline=R,T.getDeadlineTimeoutString=e,T.getRelativeTimeout=r,T.deadlineToString=h,T.formatDateDifference=i;
function R(...c){let s=1/0;
for(let A of c){let l=A instanceof Date?A.getTime():A;
if(l<s)s=l}return s}var a=[["m",1],["S",1000],["M",60000],["H",3600000]];
function e(c){let s=new Date().getTime();
if(c instanceof Date)c=c.getTime();
let A=Math.max(c-s,0);
for(let[l,o]of a){let n=A/o;
if(n<1e8)return String(Math.ceil(n))+l}throw Error("Deadline is too far in the future")}var t=2147483647;
function r(c){let s=c instanceof Date?c.getTime():c,A=new Date().getTime(),l=s-A;
if(l<0)return 0;
else if(l>t)return 1/0;
else return l}function h(c){if(c instanceof Date)return c.toISOString();
else{let s=new Date(c);
if(Number.isNaN(s.getTime()))return""+c;
else return s.toISOString()}}function i(c,s){return((s.getTime()-c.getTime())/1000).toFixed(3)+"s"}}