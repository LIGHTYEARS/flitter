// Module: create-child-channel-control-helper
// Original: lx
// Type: CJS (RT wrapper)
// Exports: createChildChannelControlHelper, createLoadBalancer, getDefaultConfig, isLoadBalancerNameRegistered, parseLoadBalancingConfig, registerDefaultLoadBalancerType, registerLoadBalancerType, selectLbConfigFromList
// Category: util

// Module: lx (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.createChildChannelControlHelper=e,T.registerLoadBalancerType=h,T.registerDefaultLoadBalancerType=i,T.createLoadBalancer=c,T.isLoadBalancerNameRegistered=s,T.parseLoadBalancingConfig=A,T.getDefaultConfig=l,T.selectLbConfigFromList=o;
var R=j3(),a=c8();
function e(n,p){var _,m,b,y,u,P,k,x,f,v;
return{createSubchannel:(m=(_=p.createSubchannel)===null||_===void 0?void 0:_.bind(p))!==null&&m!==void 0?m:n.createSubchannel.bind(n),updateState:(y=(b=p.updateState)===null||b===void 0?void 0:b.bind(p))!==null&&y!==void 0?y:n.updateState.bind(n),requestReresolution:(P=(u=p.requestReresolution)===null||u===void 0?void 0:u.bind(p))!==null&&P!==void 0?P:n.requestReresolution.bind(n),addChannelzChild:(x=(k=p.addChannelzChild)===null||k===void 0?void 0:k.bind(p))!==null&&x!==void 0?x:n.addChannelzChild.bind(n),removeChannelzChild:(v=(f=p.removeChannelzChild)===null||f===void 0?void 0:f.bind(p))!==null&&v!==void 0?v:n.removeChannelzChild.bind(n)}}var t={},r=null;
function h(n,p,_){t[n]={LoadBalancer:p,LoadBalancingConfig:_}}function i(n){r=n}function c(n,p){let _=n.getLoadBalancerName();
if(_ in t)return new t[_].LoadBalancer(p);
else return null}function s(n){return n in t}function A(n){let p=Object.keys(n);
if(p.length!==1)throw Error("Provided load balancing config has multiple conflicting entries");
let _=p[0];
if(_ in t)try{return t[_].LoadBalancingConfig.createFromJson(n[_])}catch(m){throw Error(`${_}: ${m.message}`)}else throw Error(`Unrecognized load balancing config name ${_}`)}function l(){if(!r)throw Error("No default load balancer type registered");return new t[r].LoadBalancingConfig}function o(n,p=!1){for(let _ of n)try{return A(_)}catch(m){(0,R.log)(a.LogVerbosity.DEBUG,"Config parsing failed with error",m.message);continue}if(p)if(r)return new t[r].LoadBalancingConfig;else return null;else return null}}