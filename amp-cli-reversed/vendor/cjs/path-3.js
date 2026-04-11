// Module: path-3
// Original: j$T
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: util

// Module: j$T (CJS)
(T,R)=>{var a=qT("path"),e=qT("module"),t=CB()("require-in-the-middle"),r=v$T();
R.exports=A,R.exports.Hook=A;
var h,i;
if(e.isBuiltin)i=e.isBuiltin;
else if(e.builtinModules)i=(o)=>{if(o.startsWith("node:"))return!0;
if(h===void 0)h=new Set(e.builtinModules);
return h.has(o)};
else throw Error("'require-in-the-middle' requires Node.js >=v9.3.0 or >=v8.10.0");
var c=/([/\\]index)?(\.js)?$/;
class s{constructor(){this._localCache=new Map,this._kRitmExports=Symbol("RitmExports")}has(o,n){if(this._localCache.has(o))return!0;
else if(!n){let p=qT.cache[o];
return!!(p&&(this._kRitmExports in p))}else return!1}get(o,n){let p=this._localCache.get(o);
if(p!==void 0)return p;
else if(!n){let _=qT.cache[o];
return _&&_[this._kRitmExports]}}set(o,n,p){if(p)this._localCache.set(o,n);
else if(o in qT.cache)qT.cache[o][this._kRitmExports]=n;
else t('non-core module is unexpectedly not in require.cache: "%s"',o),this._localCache.set(o,n)}}function A(o,n,p){if(this instanceof A===!1)return new A(o,n,p);
if(typeof o==="function")p=o,o=null,n=null;
else if(typeof n==="function")p=n,n=null;
if(typeof e._resolveFilename!=="function"){console.error("Error: Expected Module._resolveFilename to be a function (was: %s) - aborting!",typeof e._resolveFilename),console.error("Please report this error as an issue related to Node.js %s at https://github.com/nodejs/require-in-the-middle/issues",process.version);
return}this._cache=new s,this._unhooked=!1,this._origRequire=e.prototype.require;
let _=this,m=new Set,b=n?n.internals===!0:!1,y=Array.isArray(o);
if(t("registering require hook"),this._require=e.prototype.require=function(P){if(_._unhooked===!0)return t("ignoring require call - module is soft-unhooked"),_._origRequire.apply(this,arguments);
return u.call(this,arguments,!1)},typeof process.getBuiltinModule==="function")this._origGetBuiltinModule=process.getBuiltinModule,this._getBuiltinModule=process.getBuiltinModule=function(P){if(_._unhooked===!0)return t("ignoring process.getBuiltinModule call - module is soft-unhooked"),_._origGetBuiltinModule.apply(this,arguments);
return u.call(this,arguments,!0)};
function u(P,k){let x=P[0],f=i(x),v;
if(f){if(v=x,x.startsWith("node:")){let d=x.slice(5);
if(i(d))v=d}}else if(k)return t("call to process.getBuiltinModule with unknown built-in id"),_._origGetBuiltinModule.apply(this,P);
else try{v=e._resolveFilename(x,this)}catch(d){return t('Module._resolveFilename("%s") threw %j, calling original Module.require',x,d.message),_._origRequire.apply(this,P)}let g,I;
if(t("processing %s module require('%s'): %s",f===!0?"core":"non-core",x,v),_._cache.has(v,f)===!0)return t("returning already patched cached module: %s",v),_._cache.get(v,f);
let S=m.has(v);
if(S===!1)m.add(v);
let O=k?_._origGetBuiltinModule.apply(this,P):_._origRequire.apply(this,P);
if(S===!0)return t("module is in the process of being patched already - ignoring: %s",v),O;
if(m.delete(v),f===!0){if(y===!0&&o.includes(v)===!1)return t("ignoring core module not on whitelist: %s",v),O;
g=v}else if(y===!0&&o.includes(v)){let d=a.parse(v);
g=d.name,I=d.dir}else{let d=r(v);
if(d===void 0)return t("could not parse filename: %s",v),O;
g=d.name,I=d.basedir;
let C=l(d);
t("resolved filename to module: %s (id: %s, resolved: %s, basedir: %s)",g,x,C,I);
let L=!1;
if(y){if(!x.startsWith(".")&&o.includes(x))g=x,L=!0;
if(!o.includes(g)&&!o.includes(C))return O;
if(o.includes(C)&&C!==g)g=C,L=!0}if(!L){let w;
try{w=qT.resolve(g,{paths:[I]})}catch(D){return t("could not resolve module: %s",g),_._cache.set(v,O,f),O}if(w!==v)if(b===!0)g=g+a.sep+a.relative(I,v),t("preparing to process require of internal file: %s",g);
else return t("ignoring require of non-main module file: %s",w),_._cache.set(v,O,f),O}}_._cache.set(v,O,f),t("calling require hook: %s",g);
let j=p(O,g,I);
return _._cache.set(v,j,f),t("returning module: %s",g),j}}A.prototype.unhook=function(){if(this._unhooked=!0,this._require===e.prototype.require)e.prototype.require=this._origRequire,t("require unhook successful");
else t("require unhook unsuccessful");
if(process.getBuiltinModule!==void 0)if(this._getBuiltinModule===process.getBuiltinModule)process.getBuiltinModule=this._origGetBuiltinModule,t("process.getBuiltinModule unhook successful");
else t("process.getBuiltinModule unhook unsuccessful")};
function l(o){let n=a.sep!=="/"?o.path.split(a.sep).join("/"):o.path;
return a.posix.join(o.name,n).replace(c,"")}}