// Module: module-homedir-m0T
// Original: m0T
// Type: ESM (PT wrapper)
// Exports: InR, L$, fnR, gnR, iiT, lL
// Category: util

// Module: m0T (ESM)
()=>{if(bo=xnR.homedir(),{env:Vn}=process,L$=Vn.XDG_DATA_HOME||(bo?bE.join(bo,".local","share"):void 0),lL=Vn.XDG_CONFIG_HOME||(bo?bE.join(bo,".config"):void 0),fnR=Vn.XDG_STATE_HOME||(bo?bE.join(bo,".local","state"):void 0),InR=Vn.XDG_CACHE_HOME||(bo?bE.join(bo,".cache"):void 0),gnR=Vn.XDG_RUNTIME_DIR||void 0,iiT=(Vn.XDG_DATA_DIRS||"/usr/local/share/:/usr/share/").split(":"),L$)iiT.unshift(L$);
if(ciT=(Vn.XDG_CONFIG_DIRS||"/etc/xdg").split(":"),lL)ciT.unshift(lL)}