// Module: app-state-management
// Original: segment1[1580500:1602407]
// Type: Scope-hoisted
// Exports: HxT, fXT, pP0, _P0, U4, bP0, mP0, uP0, yP0, IXT, WxT, EA, PP0, kP0, xP0, gXT, fP0, vtT, $XT, vXT
// Category: state

nc: git status unavailable: $ {
  Z.unavailableReason
}
`),W=Z.unavailableReason;continue}if(W=null,y&&Z.head&&Z.head!==y)p.writeStderrLine([`
live - sync: thread HEAD changed from $ {
  Ji(y)
}
`,`
to $ {
  Ji(Z.head)
}
.
`,"Consider restarting after checking out the new commit locally."].join(" "));y=Z.head??y;try{let X=await hP0({repoRoot:h,previousStatus:b,nextStatus:Z,readRemoteFile:(hT)=>PP0(j,hT),progressReporter:_??void 0});n.clearTransientStatus(),B=null,V=0,Q=!1,b=Z;let rT=gP0(X);if(M=rT,rT&&!_)p.writeStdoutLine(rT)}catch(X){if(IP0(X)){let rT=fF(X),hT=jtT(X);if(d=Z,V=hT?V+1:0,!hT)n.clearTransientStatus();if(!hT&&rT!==B)p.writeStderrLine(rT),B=rT;if(hT)n.setTransientStatus(SP0(V)),B=rT;if(hT&&!Q&&V>=Ky0){Q=!0;try{n.clearTransientStatus(),await YP0({transport:j,threadId:T.threadId,threadService:T.threadService})}catch(pT){p.writeStderrLine(["live-sync: couldn't request an executor reconnect automatically:",CM(pT)].join(" "))}}await XP0(Gy0);continue}throw n.clearTransientStatus(),X}}},U={onConnectionChange:(Z)=>{if(q(),D===null&&Z.state==="disconnected"){D=Z.state;return}if(Z.state===D)return;if(D=Z.state,Z.state==="connected")j.resumeFromVersion(Hy0),F()},onArtifacts:(Z)=>{if(w)return;let X=nP0(Z);if(X.error){if(X.error!==eT)p.writeStderrLine(`
live - sync: failed to parse git status artifact: $ {
  X.error
}
`),eT=X.error;return}if(!X.status)return;if(eT=null,d=X.status,X.status.available)iT?.(X.status),iT=null;F()},onError:(Z)=>{q(),p.writeStderrLine(`
live - sync: transport error: $ {
  Z.message
}
`)},onExecutorError:(Z)=>{q(),p.writeStderrLine(`
live - sync: executor error: $ {
  Z.message
}
`)},onExecutorStatus:(Z)=>{if(Z.status==="running")F()}};j.setObserverCallbacks(U);try{let Z=await U4(j.ensureConnected({maxAttempts:1,waitForConnectedTimeoutMs:Vy0,onRetryableConnectError:(pT)=>{let mT=fF(pT);if(mT!==B)p.writeStderrLine(mT),B=mT}}),lT);if(Z===ny)return"stopped";if(Z===oy)return"archived";if(Z===yg)return"paused";if(!Z){let pT=fF(new z8("Timed out waiting to reconnect to DTW"));if(pT!==B)p.writeStderrLine(pT),B=pT}let X=await U4(_P0({initialAvailableStatus:aT,timeoutMs:T.initialGitStatusTimeoutMs??Wy0}),lT);if(X===ny)return"stopped";if(X===oy)return"archived";if(X===yg)return"paused";let rT=X;if(y=rT.head??y,v){let pT=await Bw(h),mT=!1;if(!R&&pT.length>0&&r)mT=!0,await rP0({repoRoot:h,promptForYesNo:(bT)=>p.runWithPromptBuffer(()=>r(Uw(bT,c))),stdout:c}),pT=await Bw(h);if(mT&&RA(c))p.writeStdoutLine("");let yT=pT.length===0,uT=pP0(a,yT,R);if(rT.head&&A&&rT.head!==A&&(!R||uT==="always"))A=await bP0({checkoutMode:uT,localWorktreeIsClean:yT,promptForYesNo:(bT)=>p.runWithPromptBuffer(()=>e(Uw(bT,c))),repoRoot:h,remoteHead:rT.head,localHead:A,stdout:c,stderr:i,threadId:T.threadId})}if(R){if(w=!0,d=rT,L=!0,F(),!C)throw new GR("Expected thread snapshot apply to start processing.",1);let pT=await U4(C,lT);if(pT===ny)return"stopped";if(pT===oy)return"archived";if(pT===yg)return"paused";if(!M)p.writeStdoutLine("Thread snapshot already matches your local checkout.");return"applied"}if(L=!0,F(),C){let pT=await U4(C,lT);if(pT===ny)return"stopped";if(pT===oy)return"archived";if(pT===yg)return"paused"}if(u)return"archived";if(P)return"stopped";if(!g){if(RA(c))p.writeStdoutLine("");p.writeStdoutLine(kXT),g=!0}let hT=await Promise.race([...lT,TT]);if(hT===ny)return"stopped";if(hT===oy)return"archived";return"paused"}finally{if(q(),oT=null,l)p.writeStdoutLine("live-sync: debug: shutting down subscriptions and transport");if(L=!1,tT.dispose(),j.setObserverCallbacks(null),(await j.disconnectAndWait()).status==="timeout")J.info("Live sync timed out waiting for DTW close acknowledgement",{threadId:T.threadId});j.dispose()}};try{while(!0){let j=await O();if(j==="applied")return;if(j==="archived"){S("Stopping live sync because this thread was archived.");return}if(j==="stopped"){S("Stopping live sync.");return}J.info("Live sync session paused",{threadId:T.threadId,repoRoot:h,reason:"max_duration"});let d=new AbortController;x.then(()=>d.abort()),f.then(()=>d.abort());let C=await p.runWithPromptBuffer(()=>t(Qy0,d.signal));if(u){S("Stopping live sync because this thread was archived.");return}if(P||!C){S("Stopping live sync.");return}if(J.info("Live sync session resumed",{threadId:T.threadId,repoRoot:h}),RA(c))p.writeStdoutLine("");v=!1}}finally{k.dispose(),m.dispose(),n.dispose()}}function HxT(T){return JSON.stringify(T)}function fXT(T){let R=new Set,a=[];for(let e of T){if(R.has(e))continue;R.add(e),a.push(e)}return a}function pP0(T,R,a=!1){if(a)return T==="always"?"always":"never";if(T==="prompt"&&R)return"always";return T}async function _P0(T){let R=null;try{return await Promise.race([T.initialAvailableStatus,new Promise((a,e)=>{R=setTimeout(()=>{e(new GR("Timed out waiting for thread git status. Open the thread or ensure its executor is running, then try again.",1))},T.timeoutMs)})])}finally{if(R)clearTimeout(R)}}async function U4(T,R){return T.catch(()=>{}),await Promise.race([T,...R])}async function bP0(T){if(T.checkoutMode==="never")return Hy(T.stderr,[`
Staying on $ {
  Ji(T.localHead)
}
.
`,`
Live sync will keep mirroring changed files, but untouched files may differ from $ {
  Ji(T.remoteHead)
}
.
`].join(" ")),T.localHead;let R=T.checkoutMode==="always";if(!R&&T.checkoutMode==="prompt"&&T.localWorktreeIsClean)R=!0,Hy(T.stdout,`
Switching to $ {
  Ji(T.remoteHead)
}
automatically because your checkout is clean.
`);if(!R)R=await T.promptForYesNo([`
Thread $ {
  T.threadId
}
is on $ {
  Ji(T.remoteHead)
}
`,`
but local HEAD is $ {
  Ji(T.localHead)
}
.
`,`
Switch to $ {
  Ji(T.remoteHead)
}
before live sync starts ? $ {
  $tT
}
`].join(" "));if(!R)return Hy(T.stderr,[`
Staying on $ {
  Ji(T.localHead)
}
.
`,"Live sync will keep mirroring changed files, but untouched files may differ from the thread commit."].join(" ")),T.localHead;if(!await WxT(T.repoRoot,T.remoteHead)){if(Hy(T.stdout,`
Fetching $ {
  Ji(T.remoteHead)
}
so your checkout can match the thread...`),await EA(T.repoRoot,["fetch","--all","--quiet"]),!await WxT(T.repoRoot,T.remoteHead))throw new GR(`
Commit $ {
  T.remoteHead
}
is not available in this checkout after fetch.
`,1)}return Hy(T.stdout,`
Switching to $ {
  Ji(T.remoteHead)
}
...`),await EA(T.repoRoot,["checkout","--detach",T.remoteHead]),await IXT(T.repoRoot)}async function mP0(T){return(await EA(T,["rev-parse","--show-toplevel"])).stdout.trim()}async function uP0(T){return yh.join(T,".amp","live-sync.pid")}function yP0(T){return["Another amp live-sync is already running for this checkout.","",...[T.runningThreadTitle,T.runningThreadId,`
PID $ {
  T.runningPID
}
`].filter((R)=>Boolean(R))].join(`
`)}async function IXT(T){return(await EA(T,["rev-parse","HEAD"])).stdout.trim()}async function WxT(T,R){try{return await EA(T,["cat-file","-e",`
$ {
  R
} ^
{
  commit
}
`]),!0}catch{return!1}}async function EA(T,R){try{return{stdout:(await Uy0("git",R,{cwd:T,env:Ne.env})).stdout}}catch(a){let e=a instanceof Error?a.message:String(a);throw new GR(`
git $ {
  R.join(" ")
}
failed: $ {
  e
}
`,1)}}async function PP0(T,R){return await T.readFile(kP0(R))}function kP0(T){let R=yh.posix.normalize(` / $ {
  T
}
`);return d0(zR.file(R))}async function xP0(T){try{let R=await T.readRemoteFile(T.relativePath);return{outcome:await gXT({repoRoot:T.repoRoot,relativePath:T.relativePath,content:R})}}catch(R){let a=vXT(R);if(a!=="NOT_FOUND"&&a!=="IS_DIRECTORY")throw R;return{outcome:await $XT(vtT(T.repoRoot,T.relativePath))?"deleted":"unchanged"}}}async function gXT(T){let R=vtT(T.repoRoot,T.relativePath);await fP0(R,T.repoRoot);try{let a=await ly0(R);if(Buffer.compare(a,Buffer.from(T.content))===0)return"unchanged"}catch(a){if(!StT(a)&&!qxT(a))throw a;if(qxT(a))await ftT(R,{recursive:!0,force:!0})}return await Ay0(R,T.content),"written"}async function fP0(T,R){let a=yh.relative(R,yh.dirname(T));if(a.length===0)return;let e=R;for(let t of a.split(yh.sep)){e=yh.join(e,t);try{if(!(await tXT(e)).isDirectory())await ftT(e,{recursive:!0,force:!0})}catch(r){if(!StT(r))throw r}}await ny0(yh.dirname(T),{recursive:!0})}function vtT(T,R){let a=yh.posix.normalize(R);if(a.length===0||a==="."||a.startsWith("../")||yh.isAbsolute(R))throw new GR(`
Refusing to sync path outside repository: $ {
  R
}
`,1);let e=yh.resolve(T,...a.split("/")),t=yh.relative(T,e);if(t.startsWith("..")||yh.isAbsolute(t))throw new GR(`
Refusing to sync path outside repository: $ {
  R
}
`,1);return e}async function $XT(T){try{await tXT(T)}catch(R){if(StT(R))return!1;throw R}return await ftT(T,{recursive:!0,force:!0}),!0}function vXT(T){if(!(T instanceof Error))return null;return T.message.match(TP0)?.[1]??null}function jtT(T){return vXT(T)==="EXECUTOR_NOT_CONNECTED"}function IP0(T){return T instanceof z8||jtT(T)}function fF(T){if(T instanceof z8)return"live-sync: waiting to reconnect to DTW...";if(jtT(T))return"live-sync: waiting for the executor filesystem to come online...";return`
live - sync: waiting to sync: $ {
  CM(T)
}
`}function StT(T){return jXT(T,"ENOENT")}function qxT(T){return jXT(T,"EISDIR")}function jXT(T,R){return T instanceof Error&&"code"in T&&T.code===R}function gP0(T){let R=[];if(T.syncedPaths.length>0)R.push(`
updated $ {
  zxT(T.syncedPaths, "filename")
}
`);if(T.removedPaths.length>0)R.push(`
removed $ {
  zxT(T.removedPaths, "filename")
}
`);return R.length>0?R.join(", "):null}function $P0(T,R){switch(T){case"syncing":return`
Syncing...$ {
  R
}
`;case"removing":return`
Removing...$ {
  R
}
`;case"updating":return`
Updating...$ {
  R
}
`}}function vP0(T,R){switch(T){case"removed":return`
Removed $ {
  R
}
`;case"updated":return`
Updated $ {
  R
}
`}}function jP0(T){return{onPathStart:({action:R,path:a})=>{T.outputSurface.setTransientStatus($P0(R,a))},onPathComplete:({outcome:R,path:a})=>{if(R==="unchanged"){T.outputSurface.clearTransientStatus();return}T.lineWriter.writeStdoutLine(vP0(R,a))}}}function zxT(T,R="count"){let a=fXT(T);if(a.length===1){if(R==="filename")return a[0];return`
1 $ {
  o9(1, "file")
}
`}let e=a.slice(0,NxT).join(", "),t=a.length-NxT;if(R==="count")return`
$ {
  a.length
}
$ {
  o9(a.length, "file")
}
`;if(t>0)return`
$ {
  e
}, +$ {
  t
}
$ {
  o9(t, "file")
}
`;return e}function SP0(T){if(T>=Yy0)return"Connecting... Waiting for the executor filesystem";return"Connecting..."}function Ji(T){return T?T.slice(0,7):"unknown"}function OP0(T){let R=RA(T.stdout),a=!1,e=null,t=null,r=null;if(RA(T.stdout)){for(let A of dP0({threadId:T.threadId,threadTitle:T.threadTitle,repoRoot:T.repoRoot,output:T.stdout}))GP(T.stdout,A);GP(T.stdout,"")}let h=(A,l)=>{let o=A==="stdout"?T.stdout:T.stderr,n=MP0(l);if(n.trim().length>0){let p={threadId:T.threadId,repoRoot:T.repoRoot,stream:A,liveSyncMessage:n};if(A==="stderr")J.warn("Live sync output",p);else J.info("Live sync output",p)}s(),GP(o,Nw(n,o))},i=()=>{if(r!==null)clearInterval(r),r=null;t=null},c=()=>{if(!R||!e)return;t??=new xa;let A=LP0(`
$ {
  t.toBraille()
}
$ {
  e
}
`,T.stdout),l=Nw(A,T.stdout);T.stdout.write(`\
r\ x1B[2 K$ {
      l
    }
    `),a=!0},s=()=>{if(!R)return;if(i(),e=null,!a)return;T.stdout.write("\r\x1B[2K"),a=!1};return{writeLine:(A,l)=>{h(A,l)},setTransientStatus:(A)=>{if(!R)return;if(e=A,c(),r!==null)return;r=setInterval(()=>{t?.step(),c()},T.transientSpinnerIntervalMs??Xy0)},clearTransientStatus:s,onPromptStart:()=>{s()},onPromptEnd:()=>{},dispose:()=>{s()}}}function dP0(T){let R=T.threadTitle&&T.threadTitle.trim().length>0?T.threadTitle.trim():T.threadId;if(!OH(T.output))return[`
    Live sync: $ {
      R
    }
    `,`
    $ {
      T.repoRoot
    }
    `,`($ {
      T.threadId
    })`];let a=[`
    $ {
      oR.hex("#26d0cc").bold("Live sync")
    }
    $ {
      oR.whiteBright(R)
    }
    `,oR.dim(T.threadId),oR.dim(T.repoRoot)];return SXT({output:T.output,textLines:a})}function EP0(T){let R=OH(T.output)?[T.runningThreadTitle?oR.whiteBright(T.runningThreadTitle):null,oR.dim(T.runningThreadId),oR.dim(`
    PID $ {
      T.runningPID
    }
    `)].filter((a)=>a!==null):[T.runningThreadTitle,T.runningThreadId,`
    PID $ {
      T.runningPID
    }
    `].filter((a)=>Boolean(a));return["Another amp live-sync is already running for this checkout.","",...SXT({output:T.output,textLines:R}),"",`
    Kill the running live - sync process and
    continue ? $ {
      $tT
    }
    `].join(`
    `)}function SXT(T){let R=FP0(T.output);if(R.length===0)return T.textLines;let a=Math.max(R.length,T.textLines.length),e=Math.floor((a-R.length)/2),t=Math.floor((a-T.textLines.length)/2),r=[];for(let h=0;h<a;h+=1){let i=h>=e&&h<e+R.length?R[h-e]:" ".repeat(d_),c=h>=t&&h<t+T.textLines.length?T.textLines[h-t]:"";r.push(`
    $ {
      i
    }
    $ {
      c
    }
    `)}return r}function RA(T){return"isTTY"in T&&T.isTTY===!0}function OH(T){return RA(T)&&OXT(T)>=8}function OXT(T){if("getColorDepth"in T&&typeof T.getColorDepth==="function")return T.getColorDepth();return 1}function CP0(T){if("columns"in T&&typeof T.columns==="number"&&T.columns>0)return T.columns;return null}function LP0(T,R){let a=CP0(R);if(!a)return T;let e=Math.max(1,a-1);if(T.length<=e)return T;let t=T.match(/^(\S+ (?:Updating|Removing|Syncing)\.\.\. )(.*)$/u);if(!t)return`
    $ {
      T.slice(0, Math.max(0, e - 1))
    }
    \u2026`;let[,r,h]=t;if(!r||!h||r.length+1>=e)return`
    $ {
      T.slice(0, Math.max(0, e - 1))
    }
    \u2026`;let i=e-r.length-1;return`
    $ {
      r
    }
    \u2026$ {
      h.slice(-i)
    }
    `}function MP0(T){let R=T.trimStart(),a=R.toLowerCase().startsWith("live-sync:")?R.slice(10).trimStart():T;return dXT(a)}function Nw(T,R){let a=dXT(T),e=FxT(a)?UP0(a,R):a;if(!OH(R))return e;if(a===kXT)return DP0(a);if(BP0(a))return oR.yellow(a);if(NP0(a))return oR.redBright(a);if(FxT(a))return oR.greenBright(e);if(HP0(a))return wP0(a);if(WP0(a))return oR.dim(a);if(qP0(a))return oR.cyanBright(a);return a}function DP0(T){let[R,a]=T.split("Ctrl-C");if(!R||a===void 0)return oR.whiteBright(T);return`
    $ {
      oR.whiteBright(R)
    }
    $ {
      oR.blueBright("Ctrl-C")
    }
    $ {
      oR.whiteBright(a)
    }
    `}function wP0(T){let R=T;return R=R.replaceAll("[y/n]",` [$ {
        oR.blueBright("y")
      }
      /${oR.blueBright("n")}]`),R=R.replaceAll("[y/N]",`[${oR.blueBright("y")}/${oR.blueBright.bold("N")}]`),R=R.replaceAll("[Y/n]",`[${oR.blueBright.bold("Y")}/${oR.blueBright("n")}]`),R=R.replaceAll("(y)es",`${oR.blueBright("y")}es`),R=R.replaceAll("(n)o",`${oR.blueBright("n")}o`),R=R.replaceAll("Ctrl-C",oR.blueBright("Ctrl-C")),R=R.replaceAll("Enter",oR.blueBright("Enter")),R}function dXT(T){if(T.length===0)return T;if(T.startsWith("Live sync"))return T;return`${T[0].toUpperCase()}${T.slice(1)}`}function BP0(T){let R=T.toLowerCase();return R.startsWith("git status unavailable")||R.includes("head changed")||R.startsWith("staying on ")}function NP0(T){let R=T.toLowerCase();return R.startsWith("transport error:")||R.startsWith("executor error:")||R.startsWith("couldn't request an executor reconnect automatically:")}function FxT(T){let R=T.toLowerCase();return R.startsWith("updated ")||R.startsWith("removed ")}function UP0(T,R){if(!RA(R)||T.startsWith("\u2713 "))return T;return`\u2713 ${T}`}function HP0(T){let R=T.toLowerCase();return R.includes("(y)es")||R.includes("(n)o")||R.includes("[y/n]")||R.includes("press enter")}function WP0(T){let R=T.toLowerCase();return R.startsWith("waiting to reconnect")||R.startsWith("waiting for the executor filesystem")||R.startsWith("stopping live sync")}function qP0(T){let R=zP0(T.toLowerCase());return R.startsWith("connecting...")||R.startsWith("clearing local changes")||R.startsWith("fetching ")||R.startsWith("switching to ")||R.startsWith("updating...")||R.startsWith("removing...")||R.startsWith("syncing...")}function zP0(T){return T.replace(/ ^ ( ? : [-\\ | /] |[\u2800-\u28ff] )/u, "")
      }

      function Uw(T, R) {
        return Nw(T, R)
      }

      function Hy(T, R) {
        GP(T, Nw(R, T))
      }

      function FP0(T) {
        if (!OH(T)) return [];
        let R = new Zx(d_, nl),
          a = new Xk(Zy0),
          e = new SH(d_, nl, d_, nl, d_, nl, 0, "smart", "intensity", {
            r: 14,
            g: 130,
            b: 129
          }, {
            r: 88,
            g: 245,
            b: 227
          }, LT.default(), a);
        e.layout(o0.tight(d_, nl)), e.paint(R, 0, 0);
        let t = R.getBuffer().getCells(),
          r = 0;
        for (let c = 0; c < nl; c += 1)
          if (t[c].some((s) => s.char !== " ")) {
            r = c;
            break
          }
        let h = nl - 1;
        for (let c = nl - 1; c >= 0; c -= 1)
          if (t[c].some((s) => s.char !== " ")) {
            h = c;
            break
          }
        if (h < r) return [];
        let i = [];
        for (let c = r; c <= h; c += 1) {
          let s = "";
          for (let A = 0; A < d_; A += 1) {
            let l = t[c][A];
            s += `${GP0(l.style.fg,T)}${l.char}${Jy0}`
          }
          i.push(s)
        }
        return i
      }

      function GP0(T, R) {
        if (!T || T.type !== "rgb") return "";
        let {
          r: a,
          g: e,
          b: t
        } = T.value;
        if (OXT(R) >= 24) return `\x1B[38;
2;
${a};
${e};
${t}m`;
        return `\x1B[38;
5;
${PtT(a,e,t)}m`
      }

      function GP(T, R) {
        T.write(`${R}
`)
      }

      function CM(T) {
        return T instanceof Error ? T.message : String(T)
      }

      function KP0() {
        return VP0() === "debug"
      }

      function VP0() {
        for (let R = 0; R < Ne.argv.length; R += 1) {
          let a = Ne.argv[R];
          if (!a) continue;
          if (a.startsWith("--log-level=")) {
            let t = a.slice(12).trim().toLowerCase();
            return t.length > 0 ? t : null
          }
          if (a !== "--log-level") continue;
          let e = Ne.argv[R + 1]?.trim().toLowerCase();
          if (!e || e.startsWith("--")) return null;
          return e
        }
        let T = Ne.env.AMP_LOG_LEVEL?.trim().toLowerCase();
        return T && T.length > 0 ? T : null
      }

      function XP0(T) {
        return new Promise((R) => {
          setTimeout(R, T)
        })
      }
      async function YP0(T) {
        let R = await Tk0({
          threadId: T.threadId,
          threadService: T.threadService
        });
        T.transport.requestExecutorSpawn(void 0, R)
      }
      async function QP0(T) {
        try {
          let R = await kH(T.threadId, T.threadService),
            a = R.title?.trim();
          return {
            title: a && a.length > 0 ? a : null,
            archived: R.archived === !0
          }
        } catch {
          return {
            title: null,
            archived: null
          }
        }
      }
      async function ZP0(T) {
        return (await kH(T.threadId, T.threadService)).archived === !0
      }
      async function JP0(T, R) {
        if (!Ne.stdin.isTTY || !Ne.stdout.isTTY) throw new GR("live-sync needs an interactive terminal to resume after the 4h pause. Rerun the command to continue.", 1);
        let a = py0({
            input: Ne.stdin,
            output: Ne.stdout
          }),
          e = Uw(T, Ne.stdout);
        return await new Promise((t) => {
          let r = !1,
            h = (c) => {
              if (r) return;
              if (r = !0, R) R.removeEventListener("abort", i);
              a.close(), t(c)
            },
            i = () => {
              h(!1)
            };
          if (R?.aborted) {
            h(!1);
            return
          }
          if (R) R.addEventListener("abort", i, {
            once: !0
          });
          a.on("SIGINT", () => {
            h(!1)
          }), a.question(e, () => {
            h(!0)
          })
        })
      }
      async function Tk0(T) {
        let R = (await kH(T.threadId, T.threadService)).env?.initial?.trees?.[0]?.repository?.url?.trim();
        if (!R) throw new GR("This thread does not expose a repository URL, so live-sync cannot request an executor reconnect automatically.", 1);
        return {
          repositoryURL: R
        }
      }

      function Rk0() {
        throw new GR("Interactive checkout prompt is not available in this context.", 1)
      }

      function ak0() {
        let T = null,
          R = () => {
            T?.()
          },
          a = new Promise((e) => {
            T = e
          });
        return Ne.once("SIGINT", R), Ne.once("SIGTERM", R), {
          promise: a,
          dispose: () => {
            Ne.removeListener("SIGINT", R), Ne.removeListener("SIGTERM", R)
          }
        }
      }

      function CXT(T, R) {
        let a = T.trim();
        if (!a) throw Error("No code entered. Please paste the code from the browser and try again.");
        if (a.startsWith("sgamp_user_") || a.startsWith("sgamp_user_auth-bypass_")) throw Error("That looks like an API key, not the login code. Paste the code from the browser page.");
        if (!/^[A-Za-z0-9+/=]+$/.test(a) || a.length % 4 !== 0) throw Error("That code looks incomplete. Copy the full code from the browser and try again.");
        let e;
        try {
          let t = Buffer.from(a, "base64").toString("utf8");
          J.info("Decoded terminal auth code", {
            decodedLength: t.length
          }), e = JSON.parse(t)
        } catch (t) {
          throw J.error("Failed to parse decoded JSON", {
            error: t
          }), Error("Failed to parse the code. Copy the full code from the browser page and try again.")
        }
        if (!e.token || e.token.length !== R.length) throw Error("That code looks incomplete. Copy the full code from the browser and try again.");
        if (e.token !== R) throw Error("That code does not match this login attempt. Copy the latest code from the browser.");
        return {
          accessToken: e.accessToken ?? e.key
        }
      }
      async function Hw(T = Lr, R, a = !0) {
        let e = `${T.endsWith("/")?T.slice(0,-1):T}/auth/cli-login?authToken=${encodeURIComponent(R)}`;
        if (a) KP = await tk0(35789), J.info("Generated callback port", {
          port: KP
        }), e = `${e}&callbackPort=${encodeURIComponent(KP)}`;
        return e
      }
      async function tk0(T, R = 10) {
        J.info("Finding available port", {
          startPort: T
        });
        for (let a = 0; a < R; a++) {
          let e = T + a;
          try {
            return await new Promise((t, r) => {
              let h = EXT();
              h.once("error", (i) => {
                if (i.code === "EADDRINUSE") r(Error(`Port ${e} is in use`));
                else r(i)
              }), h.once("listening", () => {
                h.close(() => t())
              }), h.listen(e, "127.0.0.1")
            }), J.info("Found available port", {
              port: e
            }), e
          } catch (t) {
            J.info("Port in use", {
              port: e,
              nextPort: e + 1
            })
          }
        }
        throw Error(`Could not find an available port after ${R} attempts`)
      }
      async function rk0(T = Lr, R, a, e) {
        try {
          let t = LXT(R, e.signal),
            r = ik0(R, e.signal),
            h = await Promise.race([t, r]);
          J.info("Received api key", {
            source: h.source
          }), await a.set("apiKey", h.accessToken, T), J.info("Access token stored successfully")
        } finally {
          e.abort(Error("close after finalizing login"))
        }
      }
      async function hk0(T = Lr, R, a, e) {
        try {
          let t = await LXT(R, e.signal);
          J.info("Received api key", {
            source: t.source
          }), await a.set("apiKey", t.accessToken, T), J.info("Access token stored successfully")
        } finally {
          e.abort(Error("close after finalizing login"))
        }
      }
      async function LXT(T, R, a = 300000) {
          if (J.info("Starting local HTTP server to receive API key from browser"), !KP) throw Error("No port selected. Call generateLoginLink first.");
          let e = KP;
          return J.info("Callback server listening on port", {
              port: KP
            }), new Promise((t, r) => {
                let h = !1,
                  i = EXT((A, l) => {
                      if (l.setHeader("Access-Control-Allow-Origin", "ampcode.com"), l.setHeader("Access-Control-Allow-Methods", "GET"), A.url?.startsWith("/auth/callback")) {
                        let o = new URL(A.url, `http://127.0.0.1:${e}`),
                          n = o.searchParams.get("accessToken") ?? o.searchParams.get("apiKey");
                        if (o.searchParams.get("authToken") !== T) {
                          r(Error("Invalid authentication token"));
                          return
                        }
                        if (n) {
                          if (J.info("Received API key from server", {
                              accessToken: n.substring(0, 8)
                            }), l.writeHead(200, {
                              "Content-Type": "text/html"
                            }), l.end(`
						<!DOCTYPE html>
						<html>
							<head>
								<title>Amp CLI Login Success</title>
								<style>
									:root {
										--background: #fafaf8;

										--foreground: #0b0d0b;

										--muted: #6b7280;

										--accent: currentColor;

										--accent-bg: rgba(128, 128, 128, 0.1);

									}
									@media (prefers-color-scheme: dark) {
										:root {
											--background: #0b0d0b;

											--foreground: #f6fff5;

											--muted: #9ca3af;

											--accent: currentColor;

											--accent-bg: rgba(200, 200, 200, 0.1);

										}
									}
									* { margin: 0;
 padding: 0;
 box-sizing: border-box;
 }
									body {
										font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

										min-height: 100vh;

										display: flex;

										align-items: center;

										justify-content: center;

										background-color: var(--background);

										color: var(--foreground);

									