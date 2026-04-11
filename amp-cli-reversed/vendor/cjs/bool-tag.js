// Module: bool-tag
// Original: EDT
// Type: CJS (RT wrapper)
// Exports: boolTag
// Category: util

// Module: EDT (CJS)
(T)=>{var R=Qa(),a={identify:(e)=>typeof e==="boolean",default:!0,tag:"tag:yaml.org,2002:bool",test:/^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,resolve:(e)=>new R.Scalar(e[0]==="t"||e[0]==="T"),stringify({source:e,value:t},r){if(e&&a.test.test(e)){let h=e[0]==="t"||e[0]==="T";
if(t===h)return e}return t?r.options.trueStr:r.options.falseStr}};
T.boolTag=a}