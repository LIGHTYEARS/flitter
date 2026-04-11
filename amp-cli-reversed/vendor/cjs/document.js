// Module: document
// Original: NN
// Type: CJS (RT wrapper)
// Exports: Document
// Category: util

// Module: NN (CJS)
(T)=>{var R=CN(),a=q9T(),e=x8(),t=Pm(),r=ym(),h=NDT(),i=FPR(),c=H9T(),s=jDT(),A=LN(),l=vDT();
class o{constructor(p,_,m){this.commentBefore=null,this.comment=null,this.errors=[],this.warnings=[],Object.defineProperty(this,e.NODE_TYPE,{value:e.DOC});
let b=null;
if(typeof _==="function"||Array.isArray(_))b=_;
else if(m===void 0&&_)m=_,_=void 0;
let y=Object.assign({intAsBigInt:!1,keepSourceTokens:!1,logLevel:"warn",prettyErrors:!0,strict:!0,stringKeys:!1,uniqueKeys:!0,version:"1.2"},m);
this.options=y;
let{version:u}=y;
if(m?._directives){if(this.directives=m._directives.atDocument(),this.directives.yaml.explicit)u=this.directives.yaml.version}else this.directives=new l.Directives({version:u});
this.setSchema(u,m),this.contents=p===void 0?null:this.createNode(p,b,m)}clone(){let p=Object.create(o.prototype,{[e.NODE_TYPE]:{value:e.DOC}});
if(p.commentBefore=this.commentBefore,p.comment=this.comment,p.errors=this.errors.slice(),p.warnings=this.warnings.slice(),p.options=Object.assign({},this.options),this.directives)p.directives=this.directives.clone();
if(p.schema=this.schema.clone(),p.contents=e.isNode(this.contents)?this.contents.clone(p.schema):this.contents,this.range)p.range=this.range.slice();
return p}add(p){if(n(this.contents))this.contents.add(p)}addIn(p,_){if(n(this.contents))this.contents.addIn(p,_)}createAlias(p,_){if(!p.anchor){let m=c.anchorNames(this);
p.anchor=!_||m.has(_)?c.findNewAnchor(_||"a",m):_}return new R.Alias(p.anchor)}createNode(p,_,m){let b=void 0;
if(typeof _==="function")p=_.call({"":p},"",p),b=_;
else if(Array.isArray(_)){let j=(C)=>typeof C==="number"||C instanceof String||C instanceof Number,d=_.filter(j).map(String);
if(d.length>0)_=_.concat(d);
b=_}else if(m===void 0&&_)m=_,_=void 0;
let{aliasDuplicateObjects:y,anchorPrefix:u,flow:P,keepUndefined:k,onTagObj:x,tag:f}=m??{},{onAnchor:v,setAnchors:g,sourceObjects:I}=c.createNodeAnchors(this,u||"a"),S={aliasDuplicateObjects:y??!0,keepUndefined:k??!1,onAnchor:v,onTagObj:x,replacer:b,schema:this.schema,sourceObjects:I},O=A.createNode(p,f,S);
if(P&&e.isCollection(O))O.flow=!0;
return g(),O}createPair(p,_,m={}){let b=this.createNode(p,null,m),y=this.createNode(_,null,m);
return new t.Pair(b,y)}delete(p){return n(this.contents)?this.contents.delete(p):!1}deleteIn(p){if(a.isEmptyPath(p)){if(this.contents==null)return!1;
return this.contents=null,!0}return n(this.contents)?this.contents.deleteIn(p):!1}get(p,_){return e.isCollection(this.contents)?this.contents.get(p,_):void 0}getIn(p,_){if(a.isEmptyPath(p))return!_&&e.isScalar(this.contents)?this.contents.value:this.contents;
return e.isCollection(this.contents)?this.contents.getIn(p,_):void 0}has(p){return e.isCollection(this.contents)?this.contents.has(p):!1}hasIn(p){if(a.isEmptyPath(p))return this.contents!==void 0;
return e.isCollection(this.contents)?this.contents.hasIn(p):!1}set(p,_){if(this.contents==null)this.contents=a.collectionFromPath(this.schema,[p],_);
else if(n(this.contents))this.contents.set(p,_)}setIn(p,_){if(a.isEmptyPath(p))this.contents=_;
else if(this.contents==null)this.contents=a.collectionFromPath(this.schema,Array.from(p),_);
else if(n(this.contents))this.contents.setIn(p,_)}setSchema(p,_={}){if(typeof p==="number")p=String(p);
let m;
switch(p){case"1.1":if(this.directives)this.directives.yaml.version="1.1";
else this.directives=new l.Directives({version:"1.1"});
m={resolveKnownTags:!1,schema:"yaml-1.1"};
break;
case"1.2":case"next":if(this.directives)this.directives.yaml.version=p;
else this.directives=new l.Directives({version:p});
m={resolveKnownTags:!0,schema:"core"};
break;
case null:if(this.directives)delete this.directives;
m=null;
break;
default:{let b=JSON.stringify(p);
throw Error(`Expected '1.1', '1.2' or null as first argument, but found: ${b}`)}}if(_.schema instanceof Object)this.schema=_.schema;else if(m)this.schema=new h.Schema(Object.assign(m,_));else throw Error("With a null YAML version, the { schema: Schema } option is required")}toJS({json:p,jsonArg:_,mapAsMap:m,maxAliasCount:b,onAnchor:y,reviver:u}={}){let P={anchors:new Map,doc:this,keep:!p,mapAsMap:m===!0,mapKeyWarned:!1,maxAliasCount:typeof b==="number"?b:100},k=r.toJS(this.contents,_??"",P);if(typeof y==="function")for(let{count:x,res:f}of P.anchors.values())y(f,x);return typeof u==="function"?s.applyReviver(u,{"":k},"",k):k}toJSON(p,_){return this.toJS({json:!0,jsonArg:p,mapAsMap:!1,onAnchor:_})}toString(p={}){if(this.errors.length>0)throw Error("Document with errors cannot be stringified");if("indent"in p&&(!Number.isInteger(p.indent)||Number(p.indent)<=0)){let _=JSON.stringify(p.indent);throw Error(`"indent" option must be a positive integer, not ${_}`)}return i.stringifyDocument(this,p)}}function n(p){if(e.isCollection(p))return!0;throw Error("Expected a YAML collection as document contents")}T.Document=o}