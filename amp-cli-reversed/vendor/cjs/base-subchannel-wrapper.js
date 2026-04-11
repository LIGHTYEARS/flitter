// Module: base-subchannel-wrapper
// Original: UZ
// Type: CJS (RT wrapper)
// Exports: BaseSubchannelWrapper
// Category: util

// Module: uZ (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.ExactPredicate=T.PatternPredicate=void 0;
var R=/[\^$\\.+?()[\]{}|]/g;
class a{_matchAll;
_regexp;
constructor(t){if(t==="*")this._matchAll=!0,this._regexp=/.*/;
else this._matchAll=!1,this._regexp=new RegExp(a.escapePattern(t))}match(t){if(this._matchAll)return!0;
return this._regexp.test(t)}static escapePattern(t){return`^${t.replace(R,"\\$&").replace("*",".*")}$`}static hasWildcard(t){return t.includes("*")}}T.PatternPredicate=a;class e{_matchAll;_pattern;constructor(t){this._matchAll=t===void 0,this._pattern=t}match(t){if(this._matchAll)return!0;if(t===this._pattern)return!0;return!1}}T.ExactPredicate=e}