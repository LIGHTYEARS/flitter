// Module: setup-2
// Original: yhR
// Type: CJS (RT wrapper)
// Exports: setup
// Category: util

// Module: yhR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.setup=e;
var R=jn();
class a{constructor(t,r,h){this.listener=r,this.hasReturnedResult=!1,this.endpoints=[];
let i;
if(t.authority==="")i="/"+t.path;
else i=t.path;
this.endpoints=[{addresses:[{path:i}]}]}updateResolution(){if(!this.hasReturnedResult)this.hasReturnedResult=!0,process.nextTick(this.listener.onSuccessfulResolution,this.endpoints,null,null,null,{})}destroy(){this.hasReturnedResult=!1}static getDefaultAuthority(t){return"localhost"}}function e(){(0,R.registerResolver)("unix",a)}}