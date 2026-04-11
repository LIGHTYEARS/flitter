// Module: null-tag
// Original: F9T
// Type: CJS (RT wrapper)
// Exports: nullTag
// Category: util

// Module: F9T (CJS)
(T)=>{var R=Qa(),a={identify:(e)=>e==null,createNode:()=>new R.Scalar(null),default:!0,tag:"tag:yaml.org,2002:null",test:/^(?:~|[Nn]ull|NULL)?$/,resolve:()=>new R.Scalar(null),stringify:({source:e},t)=>typeof e==="string"&&a.test.test(e)?e:t.options.nullStr};
T.nullTag=a}