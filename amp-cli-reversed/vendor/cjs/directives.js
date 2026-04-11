// Module: directives
// Original: vDT
// Type: CJS (RT wrapper)
// Exports: Directives
// Category: util

// Module: vDT (CJS)
(T)=>{var R=x8(),a=EN(),e={"!":"%21",",":"%2C","[":"%5B","]":"%5D","{":"%7B","}":"%7D"},t=(h)=>h.replace(/[!,[\]{}]/g,(i)=>e[i]);
class r{constructor(h,i){this.docStart=null,this.docEnd=!1,this.yaml=Object.assign({},r.defaultYaml,h),this.tags=Object.assign({},r.defaultTags,i)}clone(){let h=new r(this.yaml,this.tags);
return h.docStart=this.docStart,h}atDocument(){let h=new r(this.yaml,this.tags);
switch(this.yaml.version){case"1.1":this.atNextDocument=!0;
break;
case"1.2":this.atNextDocument=!1,this.yaml={explicit:r.defaultYaml.explicit,version:"1.2"},this.tags=Object.assign({},r.defaultTags);
break}return h}add(h,i){if(this.atNextDocument)this.yaml={explicit:r.defaultYaml.explicit,version:"1.1"},this.tags=Object.assign({},r.defaultTags),this.atNextDocument=!1;
let c=h.trim().split(/[ \t]+/),s=c.shift();
switch(s){case"%TAG":{if(c.length!==2){if(i(0,"%TAG directive should contain exactly two parts"),c.length<2)return!1}let[A,l]=c;
return this.tags[A]=l,!0}case"%YAML":{if(this.yaml.explicit=!0,c.length!==1)return i(0,"%YAML directive should contain exactly one part"),!1;
let[A]=c;
if(A==="1.1"||A==="1.2")return this.yaml.version=A,!0;
else{let l=/^\d+\.\d+$/.test(A);
return i(6,`Unsupported YAML version ${A}`,l),!1}}default:return i(0,`Unknown directive ${s}`,!0),!1}}tagName(h,i){if(h==="!")return"!";if(h[0]!=="!")return i(`Not a valid tag: ${h}`),null;if(h[1]==="<"){let l=h.slice(2,-1);if(l==="!"||l==="!!")return i(`Verbatim tags aren't resolved, so ${h} is invalid.`),null;if(h[h.length-1]!==">")i("Verbatim tags must end with a >");return l}let[,c,s]=h.match(/^(.*!)([^!]*)$/s);if(!s)i(`The ${h} tag has no suffix`);let A=this.tags[c];if(A)try{return A+decodeURIComponent(s)}catch(l){return i(String(l)),null}if(c==="!")return h;return i(`Could not resolve tag: ${h}`),null}tagString(h){for(let[i,c]of Object.entries(this.tags))if(h.startsWith(c))return i+t(h.substring(c.length));return h[0]==="!"?h:`!<${h}>`}toString(h){let i=this.yaml.explicit?[`%YAML ${this.yaml.version||"1.2"}`]:[],c=Object.entries(this.tags),s;if(h&&c.length>0&&R.isNode(h.contents)){let A={};a.visit(h.contents,(l,o)=>{if(R.isNode(o)&&o.tag)A[o.tag]=!0}),s=Object.keys(A)}else s=[];for(let[A,l]of c){if(A==="!!"&&l==="tag:yaml.org,2002:")continue;if(!h||s.some((o)=>o.startsWith(l)))i.push(`%TAG ${A} ${l}`)}return i.join(`
`)}}r.defaultYaml={explicit:!1,version:"1.2"},r.defaultTags={"!!":"tag:yaml.org,2002:"},T.Directives=r}