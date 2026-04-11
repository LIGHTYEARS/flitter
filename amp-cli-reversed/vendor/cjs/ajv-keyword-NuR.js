// Module: ajv-keyword-NuR
// Original: NuR
// Type: CJS (RT wrapper)
// Exports: default
// Category: util

// Module: nuR (CJS)
(T,R)=>{var a=R.exports=function(r,h,i){if(typeof h=="function")i=h,h={};
i=h.cb||i;
var c=typeof i=="function"?i:i.pre||function(){},s=i.post||function(){};
e(h,c,s,r,"",r)};
a.keywords={additionalItems:!0,items:!0,contains:!0,additionalProperties:!0,propertyNames:!0,not:!0,if:!0,then:!0,else:!0},a.arrayKeywords={items:!0,allOf:!0,anyOf:!0,oneOf:!0},a.propsKeywords={$defs:!0,definitions:!0,properties:!0,patternProperties:!0,dependencies:!0},a.skipKeywords={default:!0,enum:!0,const:!0,required:!0,maximum:!0,minimum:!0,exclusiveMaximum:!0,exclusiveMinimum:!0,multipleOf:!0,maxLength:!0,minLength:!0,pattern:!0,format:!0,maxItems:!0,minItems:!0,uniqueItems:!0,maxProperties:!0,minProperties:!0};
function e(r,h,i,c,s,A,l,o,n,p){if(c&&typeof c=="object"&&!Array.isArray(c)){h(c,s,A,l,o,n,p);
for(var _ in c){var m=c[_];
if(Array.isArray(m)){if(_ in a.arrayKeywords)for(var b=0;
b<m.length;
b++)e(r,h,i,m[b],s+"/"+_+"/"+b,A,s,_,c,b)}else if(_ in a.propsKeywords){if(m&&typeof m=="object")for(var y in m)e(r,h,i,m[y],s+"/"+_+"/"+t(y),A,s,_,c,y)}else if(_ in a.keywords||r.allKeys&&!(_ in a.skipKeywords))e(r,h,i,m,s+"/"+_,A,s,_,c)}i(c,s,A,l,o,n,p)}}function t(r){return r.replace(/~/g,"~0").replace(/\//g,"~1")}}