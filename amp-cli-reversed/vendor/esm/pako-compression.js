// Module: pako-compression
// Original: rbR
// Type: ESM (PT wrapper)
// Exports: $cT, $sT, A, AcT, Ak, AsT, B$, BsT, CcT, DD, DcT, EcT, F2, FsT, Ga, GsT, HsT, I4T, IP, IcT, IsT, K4T, Ky, LcT, Lj, McT, N$, ND, NsT, PcT, SsT, UsT, V2, V4T, WsT, X4T, Xn, Xy, Y4T, _cT, _k, _s, _sT, bcT, bsT, c9T, e, fP, fcT, gP, gcT, gsT, jsT, kcT, l9T, lLT, lc, lcT, lsT, mcT, msT, nLT, ns, nsT, o9T, p4T, pcT, pk, psT, q4T, qsT, r, rLT, s, t, tn, usT, vsT, w4T, wD, wcT, xA, xcT, ycT, ysT, zsT
// Category: npm-pkg

// Module: rbR (ESM)
()=>{/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */kP=hO+1+D2,c9T=2*kP+1,DD=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),B$=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),p4T=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),o9T=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),_s=Array((kP+2)*2),yu(_s),fP=Array(xP*2),yu(fP),Ak=Array(e_R),yu(Ak),pk=Array(R_R-T_R+1),yu(pk),wD=Array(D2),yu(wD),Lj=Array(xP),yu(Lj),lcT=o_R,AcT=f4T,pcT=l_R,_cT=A_R,bcT=n_R,mcT={_tr_init:lcT,_tr_stored_block:AcT,_tr_flush_block:pcT,_tr_tally:_cT,_tr_align:bcT},_k=p_R,I4T=new Uint32Array(__R()),Ga=b_R,xA={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},Xn={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8},{_tr_init:g4T,_tr_stored_block:BD,_tr_flush_block:$4T,_tr_tally:an,_tr_align:v4T}=mcT,{Z_NO_FLUSH:en,Z_PARTIAL_FLUSH:j4T,Z_FULL_FLUSH:S4T,Z_FINISH:uh,Z_BLOCK:B2,Z_OK:Ae,Z_STREAM_END:N2,Z_STREAM_ERROR:nc,Z_DATA_ERROR:O4T,Z_BUF_ERROR:PL,Z_DEFAULT_COMPRESSION:d4T,Z_FILTERED:E4T,Z_HUFFMAN_ONLY:Hg,Z_RLE:C4T,Z_FIXED:L4T,Z_DEFAULT_STRATEGY:M4T,Z_UNKNOWN:D4T,Z_DEFLATED:iO}=Xn,ND=k_R+1+P_R,w4T=2*ND+1,lc=Vl+h8+1,tn=j_R,Ky=[new Gc(0,0,0,0,N4T),new Gc(4,4,8,4,YW),new Gc(4,5,16,8,YW),new Gc(4,6,32,32,YW),new Gc(4,4,16,16,Pu),new Gc(8,16,32,32,Pu),new Gc(8,16,128,128,Pu),new Gc(8,32,128,256,Pu),new Gc(32,128,258,1024,Pu),new Gc(32,258,258,4096,Pu)],ycT=C_R,PcT=W4T,kcT=H4T,xcT=U4T,fcT=E_R,IcT=L_R,gcT=M_R,$cT=D_R,IP={deflateInit:ycT,deflateInit2:PcT,deflateReset:kcT,deflateResetKeep:xcT,deflateSetHeader:fcT,deflate:IcT,deflateEnd:gcT,deflateSetDictionary:$cT,deflateInfo:w_R},N$={assign:N_R,flattenChunks:U_R};
try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(T){q4T=!1}Vy=new Uint8Array(256);
for(let T=0;
T<256;
T++)Vy[T]=T>=252?6:T>=248?5:T>=240?4:T>=224?3:T>=192?2:1;
Vy[254]=Vy[254]=1,Xy={string2buf:H_R,buf2string:q_R,utf8border:z_R},l9T=GpR,F2=Object.prototype.toString,{Z_NO_FLUSH:vcT,Z_SYNC_FLUSH:jcT,Z_FULL_FLUSH:ScT,Z_FINISH:OcT,Z_OK:U$,Z_STREAM_END:dcT,Z_DEFAULT_COMPRESSION:z4T,Z_DEFAULT_STRATEGY:F4T,Z_DEFLATED:G4T}=Xn,Ng.prototype.push=function(T,R){let a=this.strm,e=this.options.chunkSize,t,r;
if(this.ended)return!1;
if(R===~~R)r=R;
else r=R===!0?OcT:vcT;
if(typeof T==="string")a.input=Xy.string2buf(T);
else if(F2.call(T)==="[object ArrayBuffer]")a.input=new Uint8Array(T);
else a.input=T;
a.next_in=0,a.avail_in=a.input.length;
for(;
;
){if(a.avail_out===0)a.output=new Uint8Array(e),a.next_out=0,a.avail_out=e;
if((r===jcT||r===ScT)&&a.avail_out<=6){this.onData(a.output.subarray(0,a.next_out)),a.avail_out=0;
continue}if(t=IP.deflate(a,r),t===dcT){if(a.next_out>0)this.onData(a.output.subarray(0,a.next_out));
return t=IP.deflateEnd(this.strm),this.onEnd(t),this.ended=!0,t===U$}if(a.avail_out===0){this.onData(a.output);
continue}if(r>0&&a.next_out>0){this.onData(a.output.subarray(0,a.next_out)),a.avail_out=0;
continue}if(a.avail_in===0)break}return!0},Ng.prototype.onData=function(T){this.chunks.push(T)},Ng.prototype.onEnd=function(T){if(T===U$)this.result=N$.flattenChunks(this.chunks);
this.chunks=[],this.err=T,this.msg=this.strm.msg},EcT=Ng,CcT=h9T,LcT=KpR,McT=VpR,DcT=Xn,wcT={Deflate:EcT,deflate:CcT,deflateRaw:LcT,gzip:McT,constants:DcT},K4T=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),V4T=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),X4T=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),Y4T=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]),gP=K_R,{Z_FINISH:G2,Z_BLOCK:J4T,Z_TREES:qg,Z_OK:fA,Z_STREAM_END:TLT,Z_NEED_DICT:RLT,Z_STREAM_ERROR:jh,Z_DATA_ERROR:A9T,Z_MEM_ERROR:p9T,Z_BUF_ERROR:aLT,Z_DEFLATED:K2}=Xn,rLT=Q_R,nsT=iLT,lsT=cLT,AsT=hLT,psT=Z_R,_sT=sLT,bsT=TbR,msT=RbR,usT=abR,ysT=ebR,ns={inflateReset:nsT,inflateReset2:lsT,inflateResetKeep:AsT,inflateInit:psT,inflateInit2:_sT,inflate:bsT,inflateEnd:msT,inflateGetHeader:usT,inflateSetDictionary:ysT,inflateInfo:tbR},nLT=YpR,V2=Object.prototype.toString,{Z_NO_FLUSH:PsT,Z_FINISH:ksT,Z_OK:Yy,Z_STREAM_END:IE,Z_NEED_DICT:gE,Z_STREAM_ERROR:xsT,Z_DATA_ERROR:eq,Z_MEM_ERROR:fsT}=Xn,Ug.prototype.push=function(T,R){let a=this.strm,e=this.options.chunkSize,t=this.options.dictionary,r,h,i;
if(this.ended)return!1;
if(R===~~R)h=R;
else h=R===!0?ksT:PsT;
if(V2.call(T)==="[object ArrayBuffer]")a.input=new Uint8Array(T);
else a.input=T;
a.next_in=0,a.avail_in=a.input.length;
for(;
;
){if(a.avail_out===0)a.output=new Uint8Array(e),a.next_out=0,a.avail_out=e;
if(r=ns.inflate(a,h),r===gE&&t){if(r=ns.inflateSetDictionary(a,t),r===Yy)r=ns.inflate(a,h);
else if(r===eq)r=gE}while(a.avail_in>0&&r===IE&&a.state.wrap>0&&T[a.next_in]!==0)ns.inflateReset(a),r=ns.inflate(a,h);
switch(r){case xsT:case eq:case gE:case fsT:return this.onEnd(r),this.ended=!0,!1}if(i=a.avail_out,a.next_out){if(a.avail_out===0||r===IE)if(this.options.to==="string"){let c=Xy.utf8border(a.output,a.next_out),s=a.next_out-c,A=Xy.buf2string(a.output,c);
if(a.next_out=s,a.avail_out=e-s,s)a.output.set(a.output.subarray(c,c+s),0);
this.onData(A)}else this.onData(a.output.length===a.next_out?a.output:a.output.subarray(0,a.next_out))}if(r===Yy&&i===0)continue;
if(r===IE)return r=ns.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,!0;
if(a.avail_in===0)break}return!0},Ug.prototype.onData=function(T){this.chunks.push(T)},Ug.prototype.onEnd=function(T){if(T===Yy)if(this.options.to==="string")this.result=this.chunks.join("");
else this.result=N$.flattenChunks(this.chunks);
this.chunks=[],this.err=T,this.msg=this.strm.msg},IsT=Ug,gsT=M2,$sT=QpR,vsT=M2,jsT=Xn,SsT={Inflate:IsT,inflate:gsT,inflateRaw:$sT,ungzip:vsT,constants:jsT},{Deflate:OsT,deflate:dsT,deflateRaw:EsT,gzip:CsT}=wcT,{Inflate:LsT,inflate:MsT,inflateRaw:DsT,ungzip:wsT}=SsT,BsT=OsT,NsT=dsT,UsT=EsT,HsT=CsT,WsT=LsT,qsT=MsT,zsT=DsT,FsT=wsT,GsT=Xn,lLT={Deflate:BsT,deflate:NsT,deflateRaw:UsT,gzip:HsT,Inflate:WsT,inflate:qsT,inflateRaw:zsT,ungzip:FsT,constants:GsT}}