// Module: rpc-protocol-layer
// Original: segment1[1141570:1316794]
// Type: Scope-hoisted
// Exports: QuT, _VR, bVR, ZuT, JuT, TyT, vVR, jVR, SVR, OVR, dVR, EVR, hFT, CVR, HVR, WVR, qVR, KVR, VVR, YVR
// Category: cli

CARD ",{offset:6}))return{ext:"
vcf ",mime:"
text / vcard "};if(this.checkString("
VCALENDAR ",{offset:6}))return{ext:"
ics ",mime:"
text / calendar "}}if(this.checkString("
FUJIFILMCCD - RAW "))return{ext:"
raf ",mime:"
image / x - fujifilm - raf "};if(this.checkString("
Extended Module: "))return{ext:"
xm ",mime:"
audio / x - xm "};if(this.checkString("
Creative Voice File "))return{ext:"
voc ",mime:"
audio / x - voc "};if(this.check([4,0,0,0])&&this.buffer.length>=16){let R=new DataView(this.buffer.buffer).getUint32(12,!0);if(R>12&&this.buffer.length>=R+16)try{let a=new TextDecoder().decode(this.buffer.subarray(16,R+16));if(JSON.parse(a).files)return{ext:"
asar ",mime:"
application / x - asar "}}catch{}}if(this.check([6,14,43,52,2,5,1,1,13,1,2,1,1,2]))return{ext:"
mxf ",mime:"
application / mxf "};if(this.checkString("
SCRM ",{offset:44}))return{ext:"
s3m ",mime:"
audio / x - s3m "};if(this.check([71])&&this.check([71],{offset:188}))return{ext:"
mts ",mime:"
video / mp2t "};if(this.check([71],{offset:4})&&this.check([71],{offset:196}))return{ext:"
mts ",mime:"
video / mp2t "};if(this.check([66,79,79,75,77,79,66,73],{offset:60}))return{ext:"
mobi ",mime:"
application / x - mobipocket - ebook "};if(this.check([68,73,67,77],{offset:128}))return{ext:"
dcm ",mime:"
application / dicom "};if(this.check([76,0,0,0,1,20,2,0,0,0,0,0,192,0,0,0,0,0,0,70]))return{ext:"
lnk ",mime:"
application / x.ms.shortcut "};if(this.check([98,111,111,107,0,0,0,0,109,97,114,107,0,0,0,0]))return{ext:"
alias ",mime:"
application / x.apple.alias "};if(this.checkString("
Kaydara FBX Binary\ x00 "))return{ext:"
fbx ",mime:"
application / x.autodesk.fbx "};if(this.check([76,80],{offset:34})&&(this.check([0,0,1],{offset:8})||this.check([1,0,2],{offset:8})||this.check([2,0,2],{offset:8})))return{ext:"
eot ",mime:"
application / vnd.ms - fontobject "};if(this.check([6,6,237,245,216,29,70,229,189,49,239,231,254,116,183,29]))return{ext:"
indd ",mime:"
application / x - indesign "};if(await T.peekBuffer(this.buffer,{length:Math.min(512,T.fileInfo.size),mayBeLess:!0}),this.checkString("
ustar ",{offset:257})&&(this.checkString("\
x00 ",{offset:262})||this.checkString("
",{offset:262}))||this.check([0,0,0,0,0,0],{offset:257})&&sVR(this.buffer))return{ext:"
tar ",mime:"
application / x - tar "};if(this.check([255,254])){if(this.checkString(" < ? xml ",{offset:2,encoding:"
utf - 16 le "}))return{ext:"
xml ",mime:"
application / xml "};if(this.check([255,14],{offset:2})&&this.checkString("
SketchUp Model ",{offset:4,encoding:"
utf - 16 le "}))return{ext:"
skp ",mime:"
application / vnd.sketchup.skp "};if(this.checkString(`Windows Registry Editor Version 5.00\r
`,{offset:2,encoding:"utf-16le"}))return{ext:"reg",mime:"application/x-ms-regedit"};return}if(this.checkString("-----BEGIN PGP MESSAGE-----"))return{ext:"pgp",mime:"application/pgp-encrypted"}};detectImprecise=async(T)=>{if(this.buffer=new Uint8Array(lM),await T.peekBuffer(this.buffer,{length:Math.min(8,T.fileInfo.size),mayBeLess:!0}),this.check([0,0,1,186])||this.check([0,0,1,179]))return{ext:"mpg",mime:"video/mpeg"};if(this.check([0,1,0,0,0]))return{ext:"ttf",mime:"font/ttf"};if(this.check([0,0,1,0]))return{ext:"ico",mime:"image/x-icon"};if(this.check([0,0,2,0]))return{ext:"cur",mime:"image/x-icon"};if(await T.peekBuffer(this.buffer,{length:Math.min(2+this.options.mpegOffsetTolerance,T.fileInfo.size),mayBeLess:!0}),this.buffer.length>=2+this.options.mpegOffsetTolerance)for(let R=0;R<=this.options.mpegOffsetTolerance;++R){let a=this.scanMpeg(R);if(a)return a}};async readTiffTag(T){let R=await this.tokenizer.readToken(T?zI:Pa);switch(this.tokenizer.ignore(10),R){case 50341:return{ext:"arw",mime:"image/x-sony-arw"};case 50706:return{ext:"dng",mime:"image/x-adobe-dng"};default:}}async readTiffIFD(T){let R=await this.tokenizer.readToken(T?zI:Pa);for(let a=0;a<R;++a){let e=await this.readTiffTag(T);if(e)return e}}async readTiffHeader(T){let R=(T?zI:Pa).get(this.buffer,2),a=(T?ZKR:Ie).get(this.buffer,4);if(R===42){if(a>=6){if(this.checkString("CR",{offset:8}))return{ext:"cr2",mime:"image/x-canon-cr2"};if(a>=8){let e=(T?zI:Pa).get(this.buffer,8),t=(T?zI:Pa).get(this.buffer,10);if(e===28&&t===254||e===31&&t===11)return{ext:"nef",mime:"image/x-nikon-nef"}}}return await this.tokenizer.ignore(a),await this.readTiffIFD(T)??{ext:"tif",mime:"image/tiff"}}if(R===43)return{ext:"tif",mime:"image/tiff"}}scanMpeg(T){if(this.check([255,224],{offset:T,mask:[255,224]})){if(this.check([16],{offset:T+1,mask:[22]})){if(this.check([8],{offset:T+1,mask:[8]}))return{ext:"aac",mime:"audio/aac"};return{ext:"aac",mime:"audio/aac"}}if(this.check([2],{offset:T+1,mask:[6]}))return{ext:"mp3",mime:"audio/mpeg"};if(this.check([4],{offset:T+1,mask:[6]}))return{ext:"mp2",mime:"audio/mpeg"};if(this.check([6],{offset:T+1,mask:[6]}))return{ext:"mp1",mime:"audio/mpeg"}}}}async function QuT(T,R){return new rFT(R).fromFile(T,R)}function _VR(T){let R=[],a=T.threadEnvironment.platform;if(a?.os){let t=a.osVersion?`
$ {
  a.os
}($ {
  a.osVersion
})`:a.os;R.push(`
Operating system: $ {
  t
}
`)}if(T.dir)R.push(`
Working directory: $ {
  T.dir.fsPath
}
`);let e=T.threadEnvironment.trees?.[0];if(e?.repository?.url)R.push(`
Repository: $ {
  e.repository.url
}
`);if(R.length===0)return"";return`
# Environment

$ {
  R.join(`
`)
}
`}function bVR(T){let R=dKR(T).toLowerCase().slice(1);if(!R)return"text";if(R==="csv")return"csv";if(R==="tsv")return"tsv";return R}function ZuT(T,R,a){let e=R.length>1e5?R.slice(0,1e5)+`

[Truncated] `:R,t=bVR(T);return`
$ {
  a
}: $ {
  T
}\
`\`\`${t}
${e}
\`\`\``
}

function JuT(T) {
  return T.startsWith("image/") || uVR.has(T) || yVR.has(T) || T === "application/pdf"
}

function TyT(T) {
  return T = T.replace(/^(\s*)style\s+\S+/gim, "$1%% removed style"), T = T.replace(/^(\s*)classDef\s+/gim, "$1%% removed classDef "), T = T.replaceAll("<br/>", " "), T
}

function vVR(T, R) {
  switch (T.type) {
    case "response.output_text.delta":
      R.onTextDelta(T.delta);
      break;
    case "response.reasoning_summary_text.delta":
      R.onReasoningDelta(T.delta);
      break;
    case "response.reasoning_summary_text.done":
      R.onReasoningDelta(`

`);
      break;
    case "response.output_item.added":
      if (T.item.type === "function_call") R.onToolCallAdded(T.output_index, {
        id: T.item.call_id,
        name: T.item.name,
        arguments: T.item.arguments
      });
      break;
    case "response.function_call_arguments.delta":
      R.onToolCallArgumentsDelta(T.output_index, T.delta);
      break;
    case "response.completed":
      if (T.response.usage) R.onUsage(T.response.usage);
      break
  }
}

function jVR(T, R) {
  if (R) return {
    model: T.name,
    maxInputTokens: T.contextWindow - T.maxOutputTokens,
    inputTokens: R.input_tokens,
    outputTokens: R.output_tokens,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: R.input_tokens_details?.cached_tokens ?? null,
    totalInputTokens: R.input_tokens
  };
  return {
    model: T.name,
    maxInputTokens: T.contextWindow - T.maxOutputTokens,
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: null,
    totalInputTokens: 0
  }
}

function SVR(T) {
  if (T.status === "error") {
    let R = T.error;
    return `Error: ${R?.message||JSON.stringify(R)||"Unknown error"}`
  }
  if (T.status === "done") {
    if (typeof T.result === "string") return T.result;
    if (typeof T.result === "object" && T.result?.content) return T.result.content;
    let R = JSON.stringify(T.result);
    return R === void 0 ? "" : R
  }
  return `Tool execution status: ${T.status}`
}

function OVR(T, R) {
  let a = R?.imageBlocks?.flatMap((e) => {
    if (e.source.type === "base64") {
      let t = XA({
        source: {
          type: "base64",
          data: e.source.data ?? ""
        }
      });
      if (t) return [{
        type: "input_text",
        text: `Image omitted: ${t}`
      }]
    }
    return [{
      type: "input_image",
      detail: "auto",
      image_url: e.source.type === "base64" ? `data:${e.source.mediaType};
base64,${e.source.data}` : e.source.url
    }]
  }) ?? [];
  return {
    input: [{
      type: "message",
      role: "user",
      content: [{
        type: "input_text",
        text: T
      }, ...a]
    }],
    reasoningEffort: R?.reasoningEffort ?? "medium"
  }
}

function dVR(T) {
  return T["internal.oracleReasoningEffort"] ?? "high"
}

function EVR(T, R) {
  let a = T.task;
  if (T.context) a = `Context: ${T.context}

Task: ${T.task}`;
  if (R) a += `

Relevant files:

${R}`;
  if (T.parentThreadID) a += `

Parent thread: ${T.parentThreadID}
You can use the read_thread tool with this ID to read the full conversation that invoked you if you need more context.`;
  return a
}

function hFT(T, R) {
  return `You are the Oracle - an expert AI advisor with advanced reasoning capabilities.

Your role is to provide high-quality technical guidance, code reviews, architectural advice, and strategic planning for software engineering tasks.

You are a subagent inside an AI coding system, called when the main agent needs a smarter, more capable model. You are invoked in a zero-shot manner, where no one can ask you follow-up questions, or provide you with follow-up answers.

Key responsibilities:
- Analyze code and architecture patterns
- Provide specific, actionable technical recommendations
- Plan implementations and refactoring strategies
- Answer deep technical questions with clear reasoning
- Suggest best practices and improvements
- Identify potential issues and propose solutions

## Environment
Working directory: ${T??"unknown"}
Workspace root: ${R??"unknown"}

Operating principles (simplicity-first):
- Default to the simplest viable solution that meets the stated requirements and constraints.
- Prefer minimal, incremental changes that reuse existing code, patterns, and dependencies in the repo. Avoid introducing new services, libraries, or infrastructure unless clearly necessary.
- Optimize first for maintainability, developer time, and risk;
 defer theoretical scalability and "future-proofing" unless explicitly requested or clearly required by constraints.
- Apply YAGNI and KISS;
 avoid premature optimization.
- Provide one primary recommendation. Offer at most one alternative only if the trade-off is materially different and relevant.
- Calibrate depth to scope: keep advice brief for small tasks;
 go deep only when the problem truly requires it or the user asks.
- Include a rough effort/scope signal (e.g., S <1h, M 1\u20133h, L 1\u20132d, XL >2d) when proposing changes.
- Stop when the solution is "good enough." Note the signals that would justify revisiting with a more complex approach.

Tool usage:
- Use attached files and provided context first. Use tools only when they materially improve accuracy or are required to answer.
- Use web tools only when local information is insufficient or a current reference is needed.
- When calling local file tools, construct paths from the exact working directory or workspace root above.
- Never invent placeholder roots like /workspace, /repo, or /project.
- If you only know a repo-relative path, join it to the workspace root above before calling local file tools.
- If the working directory or workspace root is unknown, use file-search tools first instead of guessing absolute paths.

Response format (keep it concise and action-oriented):
1) TL;
DR: 1\u20133 sentences with the recommended simple approach.
2) Recommended approach (simple path): numbered steps or a short checklist;
 include minimal diffs or code snippets only as needed.
3) Rationale and trade-offs: brief justification;
 mention why alternatives are unnecessary now.
4) Risks and guardrails: key caveats and how to mitigate them.
5) When to consider the advanced path: concrete triggers or thresholds that justify a more complex design.
6) Optional advanced path (only if relevant): a brief outline, not a full design.

Guidelines:
- Use your reasoning to provide thoughtful, well-structured, and pragmatic advice.
- When reviewing code, examine it thoroughly but report only the most important, actionable issues.
- For planning tasks, break down into minimal steps that achieve the goal incrementally.
- Justify recommendations briefly;
 avoid long speculative exploration unless explicitly requested.
- Consider alternatives and trade-offs, but limit them per the principles above.
- Be thorough but concise\u2014focus on the highest-leverage insights.

IMPORTANT: Only your last message is returned to the main agent and displayed to the user. Your last message should be comprehensive yet focused, with a clear, simple recommendation that helps the user act immediately.`
}

function CVR(T, R) {
  switch (T.status) {
    case "in-progress":
      return {
        status: "in-progress", progress: T.turns.map((a) => ({
          message: a.message,
          reasoning: a.reasoning,
          isThinking: a.isThinking,
          tool_uses: [...a.activeTools.values()]
        }))
      };
    case "done":
      return {
        status: "done", result: T.message, progress: T.turns.map((a) => ({
          message: a.message,
          reasoning: a.reasoning,
          isThinking: !1,
          tool_uses: [...a.activeTools.values()]
        })), "~debug": {
          ...T["~debug"],
          reasoningEffort: R
        }
      };
    case "error":
      return {
        status: "error", error: {
          message: T.message
        }
      };
    case "cancelled":
      return {
        status: "cancelled"
      }
  }
}
async function HVR(T, R, a, e, t, r, h) {
    let i = performance.now(),
      c = [{
          role: "user",
          parts: [{
            text: Sa`
						Here is the mentioned thread content:

						<mentionedThread>
						${T}
						</mentionedThread>
					`
          }]
        }, {
          role: "user",
          parts: [{
                text: UVR.replace("{
                  GOAL
                }
                ",R)}]}],s=await gO(nU,c,[],e,t,r,{responseMimeType:"
                application / json ",responseJsonSchema:K.toJSONSchema(RyT)},void 0,h),A=RyT.parse(WVR(s.message.text??"
                ")),l=performance.now()-i;return J.debug("
                Thread mention extraction completed ",{currentThreadId:e.id,mentionedThreadId:a,originalLength:T.length,extractedLength:A.relevantContent.length,compressionRatio:(A.relevantContent.length/T.length).toFixed(2),durationMs:Math.round(l)}),A.relevantContent}function WVR(T){try{return JSON.parse(T)}catch(R){let a=T.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);if(a)try{return JSON.parse(a[1]??"
                ")}catch(r){}let e=T.indexOf(" {
                  "),t=T.lastIndexOf("
                }
                ");if(e!==-1&&t!==-1&&t>e){let r=T.substring(e,t+1);try{return JSON.parse(r)}catch(h){}}throw J.error("
                Failed to parse JSON from thread extraction result ",{error:R,text:T}),R}}async function qVR({markdown:T,goal:R,mentionedThreadID:a,currentThread:e,config:t,signal:r,activatedSkills:h,serviceAuthToken:i}){return await HVR(T,R,a,e,t,r,i)}async function KVR(T,R,a){try{let e=await fi(`/api/threads/${T}.md?truncate_tool_results=1`,{signal:R},a);if(!e.ok)throw Error(`Thread ${T} not found (server returned ${e.status})`);return await e.text()}catch(e){if(e instanceof Error&&e.name==="
                MissingApiKeyError ")throw Error(`Thread ${T} not found locally and cannot fetch from server: API key not configured`);throw e}}async function VVR(T,R,a){let e=Date.now();try{let t=await a.exclusiveSyncReadWriter(T);t.update((h)=>{if(h.v++,h.relationships??=[],!h.relationships.some((i)=>i.threadID===R&&i.type==="
                mention "&&i.role==="
                child "))h.relationships.push({threadID:R,type:"
                mention ",role:"
                child ",createdAt:e})}),await t.asyncDispose();let r=await a.exclusiveSyncReadWriter(R);r.update((h)=>{if(h.v++,h.relationships??=[],!h.relationships.some((i)=>i.threadID===T&&i.type==="
                mention "&&i.role==="
                parent "))h.relationships.push({threadID:T,type:"
                mention ",role:"
                parent ",createdAt:e})}),await r.asyncDispose()}catch(t){J.warn("
                Failed to create mention relationship ",{currentThreadID:T,mentionedThreadID:R,error:t})}}function YVR(T){return T.length>ayT?T.slice(0,ayT)+`

                [Content truncated at 256 KB
                  for context window
                ] `:T}function RXR(T){return{runInference:async(R,a,e,t,r,h,i)=>{let c=await eLR(e,t,a,r,Xt(R),h,i,void 0,void 0,T),s=c.message,A=[],l=s.choices[0];if(l?.message?.tool_calls){for(let n of l.message.tool_calls)if(n.id){let p=n;A.push({id:n.id,name:p.function?.name??"",input:p.function?.arguments?JSON.parse(p.function.arguments):void 0})}}let o;if(s.usage){let n=s.usage,p=n.prompt_tokens_details?.cached_tokens??n.cached_tokens??0;o={model:Xt(R),maxInputTokens:0,inputTokens:0,outputTokens:n.completion_tokens,cacheReadInputTokens:p,cacheCreationInputTokens:n.prompt_tokens-p,totalInputTokens:n.prompt_tokens,timestamp:new Date().toISOString()}}return{result:c,toolUses:A,debugUsage:o}},extractMessage:(R)=>{return R.message.choices[0]?.message?.content||void 0},updateConversation:(R,a,e)=>{let t=a.message.choices[0];if(t?.message){let r=t.message,h={role:"assistant",content:r.content||"",reasoning_content:r.reasoning_content?.length?r.reasoning_content:void 0,tool_calls:r.tool_calls};R.push(h)}for(let{id:r,result:h}of e){let i={role:"tool",content:aXR(h),tool_call_id:r};R.push(i)}}}}function aXR(T){if(T.status==="error"){let R=T.error;return JSON.stringify(R)}if(T.status==="done"){if(typeof T.result==="string")return T.result;let R=JSON.stringify(T.result);return R===void 0?"":R}return`
                Tool execution status: $ {
                  T.status
                }
                `}function eXR(T,R,a,e){let t=[{role:"user",content:T}];return new wi().run(Fx,{systemPrompt:a,model:R,spec:qe["task-subagent"]},{toolService:e.toolService,env:e,conversation:t})}function tXR(T,R,a,e){let t=[{role:"user",content:T}];return new wi().run(RXR(),{systemPrompt:a,model:R,spec:qe["task-subagent"]},{toolService:e.toolService,env:e,conversation:t})}function rXR(T){let{model:R,agentMode:a}=pn(T.config.settings,T.thread);if(a==="deep")return{model:n8.CLAUDE_OPUS_4_6.name,provider:P9.ANTHROPIC};let{provider:e}=RO(R);return{model:R,provider:e}}function hXR(T,R,a){let{model:e,provider:t}=rXR(a);return J.debug("Task subagent starting:",{model:e,provider:t,description:R.substring(0,100)+(R.length>100?"...":"")}),Q9(()=>nXR(a)).pipe(L9((r)=>{if(t===P9.FIREWORKS)return tXR(T,e,r,a);return eXR(T,e,r,a)}),JR(iXR))}function iXR(T){switch(T.status){case"in-progress":return{status:"in-progress",progress:T.turns.map((R)=>({message:R.message,tool_uses:[...R.activeTools.values()]}))};case"done":return{status:"done",result:T.message,progress:T.turns.map((R)=>({message:R.message,tool_uses:[...R.activeTools.values()]})),"~debug":T["~debug"]};case"error":return{status:"error",error:{message:T.message},progress:T.turns?.map((R)=>({message:R.message,tool_uses:[...R.activeTools.values()]})),"~debug":T["~debug"]};case"cancelled":return{status:"cancelled",progress:T.turns.map((R)=>({message:R.message,tool_uses:[...R.activeTools.values()]})),reason:oXR(T.turns),"~debug":T["~debug"]}}}function tyT(T,R){let a=T.split(`
                `);if(a.length<=R)return T;return a.slice(0,R).join(`
                `)+`
                ...($ {
                    a.length - R
                  }
                  more lines)`}function ryT(T,R){let{input:a,result:e}=T,t=[];if(!a||typeof a!=="object")t.push(T.tool_name);else switch(T.tool_name){case"edit_file":case"create_file":if(a.path)t.push(`
                $ {
                  T.tool_name
                }($ {
                  a.path
                })`);else t.push(T.tool_name);break;case"Read":if(a.path)t.push(`
                Read($ {
                  a.path
                })`);else t.push("Read");break;case"Grep":if(a.pattern){let r=a.path?` in $ {
                  a.path
                }
                `:"";t.push(`
                Grep("${
                  a.pattern
                }
                "${r})`)}else t.push("
                Grep ");break;case"
                Bash ":if(a.cmd){let r=String(a.cmd).length>eyT?String(a.cmd).substring(0,eyT-3)+"...":a.cmd;t.push(`Bash("
                $ {
                  r
                }
                ")`)}else t.push("
                Bash ");break;case"
                glob ":if(a.filePattern)t.push(`glob("
                $ {
                  a.filePattern
                }
                ")`);else t.push("
                glob ");break;default:t.push(T.tool_name)}if(R&&e&&T.status==="
                done ")switch(T.tool_name){case"
                edit_file ":case"
                create_file ":{let r=typeof e==="
                string "?e:typeof e.diff==="
                string "?e.diff:null;if(r)t.push(`
                Diff: $ {
                  tyT(r, cXR)
                }
                `);break}case"Bash":{if(e.output){let r=e.exitCode!==void 0?`(exit $ {
                  e.exitCode
                })`:"";t.push(`
                $ {
                  r
                }
                Output: $ {
                  tyT(String(e.output), sXR)
                }
                `)}break}}return t.join("")}function oXR(T){if(T.length===0)return"Task was cancelled before any work was done.";let R=[],a=[];for(let t of T)for(let[,r]of t.activeTools)if(r.status==="done")R.push(r);else if(r.status==="in-progress"||r.status==="queued")a.push(r);let e=["Task was cancelled."];if(R.length>0){e.push(`

                # # Completed work: `);for(let t of R)e.push(`
                # # # $ {
                  ryT(t, !0)
                }
                `)}if(a.length>0){let t=a.map((r)=>ryT(r,!1)).join(", ");e.push(`

                # # In progress when cancelled: $ {
                  t
                }
                `)}return e.join("")}async function nXR(T){let{model:R,agentMode:a}=pn(T.config.settings,T.thread),e=Xt(R),t=R.indexOf("/"),r=t!==-1?R.slice(0,t):"anthropic",{systemPrompt:h}=await LO({configService:T.configService,getThreadEnvironment:T.getThreadEnvironment,skillService:T.skillService,toolService:T.toolService,filesystem:T.filesystem,threadService:T.threadService},T.thread,{enableTaskList:!1,enableTask:!1,enableOracle:!1,enableDiagnostics:!0,enableChart:!1},{model:e,provider:r,agentMode:a});return h.map((i)=>i.text).join(`

                `)}function mXR(T,R,a,e){return new AR((t)=>{let r=new wi,h=bz.model?Xt(bz.model):void 0;if(!h){t.error(Error("Walkthrough subagent has no model defined"));return}let i={systemPrompt:xXR,model:h,spec:bz},c=[{role:"user",content:R?`
                Context: $ {
                  R
                }

                Topic: $ {
                  T
                }
                `:`
                Topic: $ {
                  T
                }
                `}],s=r.run(Fx,i,{conversation:c,toolService:a,env:e,followUps:[(A)=>A.push({role:"user",content:fXR}),(A)=>A.push({role:"user",content:IXR})]}).subscribe({next:(A)=>t.next(A),error:(A)=>t.error(A),complete:()=>t.complete()});return()=>{s.unsubscribe()}})}function yXR(T){try{let R=i3(T,"walkthroughPlan");if(R){let r=PXR(R);if(r)return{diagram:r}}let a=T.match(/`
                ``
                json\ s * ([\s\ S] * ? )``
                `/i);if(a?.[1]){let r=mz(a[1]);if(r){let h=JSON.parse(r);if(h.diagram?.code&&h.diagram?.nodes)return h}}let e=T.match(/`
                ``\
                s * (\{
                    [\s\ S] * ? )``
                  `/i);if(e?.[1]){let r=mz(e[1]);if(r){let h=JSON.parse(r);if(h.diagram?.code&&h.diagram?.nodes)return h}}let t=T.indexOf('"diagram"');if(t!==-1){let r=t;while(r>0&&T[r]!=="{
")r--;if(T[r]==="{
"){let h=mz(T.substring(r));if(h){let i=JSON.parse(h);if(i.diagram?.code&&i.diagram?.nodes)return i}}}return null}catch(R){return J.error("Failed to parse walkthrough plan:",R),null}}function PXR(T){let R=i3(T,"code");if(!R)return null;let a={},e=Lk(T,"node");for(let t of e){let r=i3(t,"id"),h=i3(t,"title"),i=i3(t,"description");if(!r||!h||!i)continue;let c={title:h,description:i},s=i3(t,"links");if(s){let A=Lk(s,"link"),l=[];for(let o of A){let n=i3(o,"label"),p=i3(o,"url");if(n&&p)l.push({label:n,url:p})}if(l.length>0)c.links=l}a[r]=c}if(Object.keys(a).length===0)return null;return{code:R.trim(),nodes:a}}function mz(T){let R=0,a=!1,e=!1,t=-1;for(let r=0;r<T.length;r++){let h=T[r];if(e){e=!1;continue}if(h==="\\"&&a){e=!0;continue}if(h==='"'&&!e){a=!a;continue}if(a)continue;if(h==="{"){if(t===-1)t=r;R++}else if(h==="}"){if(R--,R===0&&t!==-1)return T.substring(t,r+1)}}return null}function cFT(T){let R=$mR(T),a=dXR(R,T);return{toolService:R,dispose:()=>{a.dispose(),R.dispose()}}}function dXR(T,R){let a=[],e,t,r,h,i,c,s;a.push(T.registerTool(ZVR)),a.push(T.registerTool(NVR)),a.push(T.registerTool(WX)),a.push(T.registerTool(eFR)),a.push(T.registerTool(TXR)),a.push(T.registerTool(GVR)),a.push(T.registerTool(iGR)),a.push(T.registerTool(wzT)),a.push(T.registerTool(gVR)),a.push(T.registerTool(rFR)),a.push(T.registerTool(mK)),a.push(T.registerTool(F2R)),a.push(T.registerTool(bXR)),a.push(T.registerTool(OXR)),a.push(T.registerTool(pXR)),a.push(T.registerTool(DVR)),a.push(T.registerTool(DWT)),a.push(T.registerTool(IKR)),a.push(T.registerTool(kVR)),a.push(T.registerTool(TzR)),a.push(T.registerTool(nKR)),a.push(T.registerTool(_KR)),a.push(T.registerTool(YGR)),a.push(T.registerTool(JGR)),a.push(T.registerTool(rKR)),a.push(T.registerTool(cKR)),a.push(T.registerTool(aKR)),a.push(T.registerTool(EGR)),a.push(T.registerTool(gGR)),a.push(T.registerTool(SGR)),a.push(T.registerTool(xGR)),a.push(T.registerTool(MGR)),a.push(T.registerTool(bGR)),a.push(T.registerTool(nGR)),a.push(T.registerTool(OzT)),a.push(T.registerTool(I2R)),a.push(T.registerTool(kXR)),a.push(T.registerTool($XR));let A=R.configService.config.pipe(JR(({settings:l})=>({"experimental.autoSnapshot":l["experimental.autoSnapshot"],"experimental.tools":l["experimental.tools"],"experimental.cerebrasFinder":l["experimental.cerebrasFinder"]})),E9((l,o)=>l["experimental.autoSnapshot"]===o["experimental.autoSnapshot"]&&l["experimental.cerebrasFinder"]===o["experimental.cerebrasFinder"]&&JSON.stringify(l["experimental.tools"])===JSON.stringify(o["experimental.tools"]))).subscribe((l)=>{if(e?.dispose(),e=T.registerTool(OWT),l["experimental.autoSnapshot"]){if(i?.dispose(),i=void 0,!c)c=T.registerTool(J2R)}else if(c?.dispose(),c=void 0,!i)i=T.registerTool(tGR);if(t?.dispose(),l["experimental.cerebrasFinder"])t=T.registerTool(W2R);else t=T.registerTool(qzT);Promise.resolve().then(()=>(vBR(),TqT)).then(({painterToolReg:n})=>{if(!r)r=T.registerTool(n)});let o=l["experimental.tools"]??[];if(J.debug("repl tool registration check",{experimentalTools:o}),Promise.resolve().then(()=>(WBR(),hqT)).then(({replToolReg:n})=>{let p=n.spec.name,_=o.includes(p),m=n.fn!==null;if(J.debug("repl tool dynamic import resolved",{toolName:p,isEnabled:_,hasFn:m,hasExistingDisposable:!!h}),_){if(!h)J.debug("registering repl tool",{toolName:p,hasFn:m}),h=T.registerTool(n),J.debug("repl tool registered",{toolName:p,disposableIsNoop:h===void 0})}else{if(h)J.debug("unregistering repl tool",{toolName:p});h?.dispose(),h=void 0}}),!s)Promise.resolve().then(()=>(FBR(),cqT)).then(({handoffToolReg:n})=>{s=T.registerTool(n)})});return{dispose(){A.unsubscribe(),e?.dispose(),t?.dispose(),r?.dispose(),s?.dispose(),c?.dispose(),i?.dispose(),h?.dispose();for(let l of a)l.dispose()}}}function LXR(){return EXR.trace.getTracer(CXR)}async function DXR(T,R){let a=[AM.join(T,"secrets.json"),AM.join(T,"history.jsonl"),AM.join(R,"settings.json")];await Promise.all(a.map((e)=>wXR(e)))}async function wXR(T){try{let R=await hyT.stat(T);if((R.mode&63)!==0)await hyT.chmod(T,MXR),J.info("Fixed insecure file permissions",{file:AM.basename(T),oldMode:`
                  0o $ {
                    (R.mode & 511).toString(8)
                  }
                  `,newMode:"0o600"})}catch(R){if(R.code==="ENOENT")return;J.warn("Failed to check/fix file permissions",{file:T,error:R instanceof Error?R.message:String(R)})}}function UXR(T="idle"){try{if(T==="idle")uz("afplay /System/Library/Sounds/Submarine.aiff");else if(T==="idle-review")uz("afplay /System/Library/Sounds/Glass.aiff");else if(T==="requires-user-input")uz("afplay /System/Library/Sounds/Ping.aiff")}catch(R){J.error(`
                  Failed to play notification sound($ {
                    T
                  }): `,R)}}function HXR(){try{let T=NXR(process.cwd())||process.cwd();BXR("say",[`
                  Amp is done in $ {
                    T
                  }
                  `])}catch(T){J.error("Failed to play voice completion notification:",T)}}function qXR(T){let R=0,a=async(i)=>{let c=Date.now();if(c-R<2000)return;if(R=c,e===!1)return;let s=!1;try{s=T.windowFocused?await T.windowFocused():!1}catch(A){J.debug("Could not determine window focus state:",A)}if(s&&!WXR)return;await T.playNotificationSound(i)},e=!0,t=T.configService.config.subscribe((i)=>{e=i.settings["notifications.enabled"]??!0}),r=new Map,h=(T.threadViewStates$?.()??ct.statuses).subscribe(async(i)=>{let c=!1,s=!1;for(let[A,l]of Object.entries(i)){if(!l||l.state!=="active"){r.delete(A);continue}try{if(await T.threadService.getPrimitiveProperty(A,"mainThreadID")&&l.interactionState!=="user-tool-approval")continue}catch(y){J.debug("Failed to check thread for subagent status",{threadId:A,error:y})}let o=l.toolState?.running??(l.interactionState==="tool-running"?1:0),n=l.toolState?.blocked??(l.interactionState==="user-tool-approval"?1:0),p=l.interactionState==="user-message-reply"||l.interactionState==="user-message-initial",_=!!l.ephemeralError,m=l.inferenceState==="idle"&&o===0&&n===0&&(p||_),b=r.get(A)??{running:0,blocked:0,idle:!0};if(n>0){if(b.blocked===0||b.running>0&&o===0)c=!0}if(!b.idle&&m)s=!0;r.set(A,{running:o,blocked:n,idle:m})}if(c)await a("requires-user-input");else if(s)await a("idle")});return{unsubscribe(){h.unsubscribe(),t.unsubscribe(),r.clear()}}}function GXR(){let T=new Map;for(let[R,a]of Object.entries(D3)){for(let[e,t]of Object.entries(a))D3[e]={open:`\
                  x1B[$ {
                      t[0]
                    }
                    m`,close:`\
                    x1B[$ {
                        t[1]
                      }
                      m`},a[e]=D3[e],T.set(t[0],t[1]);Object.defineProperty(D3,R,{value:a,enumerable:!1})}return Object.defineProperty(D3,"codes",{value:T,enumerable:!1}),D3.color.close="\x1B[39m",D3.bgColor.close="\x1B[49m",D3.color.ansi=iyT(),D3.color.ansi256=cyT(),D3.color.ansi16m=syT(),D3.bgColor.ansi=iyT(10),D3.bgColor.ansi256=cyT(10),D3.bgColor.ansi16m=syT(10),Object.defineProperties(D3,{rgbToAnsi256:{value(R,a,e){if(R===a&&a===e){if(R<8)return 16;if(R>248)return 231;return Math.round((R-8)/247*24)+232}return 16+36*Math.round(R/255*5)+6*Math.round(a/255*5)+Math.round(e/255*5)},enumerable:!1},hexToRgb:{value(R){let a=/[a-f\d]{6}|[a-f\d]{3}/i.exec(R.toString(16));if(!a)return[0,0,0];let[e]=a;if(e.length===3)e=[...e].map((r)=>r+r).join("");let t=Number.parseInt(e,16);return[t>>16&255,t>>8&255,t&255]},enumerable:!1},hexToAnsi256:{value:(R)=>D3.rgbToAnsi256(...D3.hexToRgb(R)),enumerable:!1},ansi256ToAnsi:{value(R){if(R<8)return 30+R;if(R<16)return 90+(R-8);let a,e,t;if(R>=232)a=((R-232)*10+8)/255,e=a,t=a;else{R-=16;let i=R%36;a=Math.floor(R/36)/5,e=Math.floor(i/6)/5,t=i%6/5}let r=Math.max(a,e,t)*2;if(r===0)return 30;let h=30+(Math.round(t)<<2|Math.round(e)<<1|Math.round(a));if(r===2)h+=60;return h},enumerable:!1},rgbToAnsi:{value:(R,a,e)=>D3.ansi256ToAnsi(D3.rgbToAnsi256(R,a,e)),enumerable:!1},hexToAnsi:{value:(R)=>D3.ansi256ToAnsi(D3.hexToAnsi256(R)),enumerable:!1}}),D3}function Ti(T,R=globalThis.Deno?globalThis.Deno.args:UaT.argv){let a=T.startsWith("-")?"":T.length===1?"-":"--",e=R.indexOf(a+T),t=R.indexOf("--");return e!==-1&&(t===-1||e<t)}function XXR(){if("FORCE_COLOR"in ea){if(ea.FORCE_COLOR==="true")return 1;if(ea.FORCE_COLOR==="false")return 0;return ea.FORCE_COLOR.length===0?1:Math.min(Number.parseInt(ea.FORCE_COLOR,10),3)}}function YXR(T){if(T===0)return!1;return{level:T,hasBasic:!0,has256:T>=2,has16m:T>=3}}function QXR(T,{streamIsTTY:R,sniffFlags:a=!0}={}){let e=XXR();if(e!==void 0)nw=e;let t=a?nw:e;if(t===0)return 0;if(a){if(Ti("color=16m")||Ti("color=full")||Ti("color=truecolor"))return 3;if(Ti("color=256"))return 2}if("TF_BUILD"in ea&&"AGENT_NAME"in ea)return 1;if(T&&!R&&t===void 0)return 0;let r=t||0;if(ea.TERM==="dumb")return r;if(UaT.platform==="win32"){let h=VXR.release().split(".");if(Number(h[0])>=10&&Number(h[2])>=10586)return Number(h[2])>=14931?3:2;return 1}if("CI"in ea){if(["GITHUB_ACTIONS","GITEA_ACTIONS","CIRCLECI"].some((h)=>(h in ea)))return 3;if(["TRAVIS","APPVEYOR","GITLAB_CI","BUILDKITE","DRONE"].some((h)=>(h in ea))||ea.CI_NAME==="codeship")return 1;return r}if("TEAMCITY_VERSION"in ea)return/^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(ea.TEAMCITY_VERSION)?1:0;if(ea.COLORTERM==="truecolor")return 3;if(ea.TERM==="xterm-kitty")return 3;if("TERM_PROGRAM"in ea){let h=Number.parseInt((ea.TERM_PROGRAM_VERSION||"").split(".")[0],10);switch(ea.TERM_PROGRAM){case"iTerm.app":return h>=3?3:2;case"Apple_Terminal":return 2}}if(/-256(color)?$/i.test(ea.TERM))return 2;if(/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(ea.TERM))return 1;if("COLORTERM"in ea)return 1;return r}function nyT(T,R={}){let a=QXR(T,{streamIsTTY:T&&T.isTTY,...R});return YXR(a)}function T1R(T,R,a){let e=T.indexOf(R);if(e===-1)return T;let t=R.length,r=0,h="";do h+=T.slice(r,e)+R+a,r=e+t,e=T.indexOf(R,r);while(e!==-1);return h+=T.slice(r),h}function R1R(T,R,a,e){let t=0,r="";do{let h=T[e-1]==="\r";r+=T.slice(t,h?e-1:e)+R+(h?`\
                      r `:`
                      `)+a,t=e+1,e=T.indexOf(`
                      `,t)}while(e!==-1);return r+=T.slice(t),r}function zO(T){return e1R(T)}function n1R(T){return Math.ceil(T.length/o1R)}function l1R(T,R,a,e){let t=T.thread.messages.length>0?k8T(T.thread):[{role:"user",content:"x"}];while(t.length>0&&t.at(-1)?.role==="assistant")t=t.slice(0,-1);t=f8T(t);let r=kO(T.tools);return{client:R,model:a,headers:e,systemPrompt:T.systemPrompt,messages:t,tools:r,toolSpecs:T.tools}}async function Qu(T,R,a,e){try{return(await T.messages.countTokens({model:R,messages:e.messages??[{role:"user",content:"x"}],...e.tools&&e.tools.length>0?{tools:e.tools}:{},...e.system&&e.system.length>0?{system:e.system}:{},thinking:{type:"enabled",budget_tokens:1e4}},{headers:a})).input_tokens}catch(t){J.warn("countTokens failed, falling back to estimate",{error:t});let r=JSON.stringify(e.messages??[]),h=JSON.stringify(e.tools??[]),i=JSON.stringify(e.system??[]);return n1R(r+h+i)}}function p1R(T){return T.map((R)=>R.text).join(`

                      `)}function _1R(T,R){let a=[...P3T(T)];while(a.length>0){let e=a.at(-1);if(e&&typeof e==="object"&&"type"in e&&e.type==="message"&&"role"in e&&e.role==="assistant")a.pop();else break}return[{role:"system",content:R},...a]}function sFT(T){return T.map(k3T)}async function FI(T,R){return(await T.client.responses.inputTokens.count({model:T.model,input:R.input,...R.tools.length>0?{tools:R.tools}:{}})).input_tokens}function b1R(T,R,a){let e=p1R(T.systemPrompt),t;if(T.thread.messages.length>0)t=_1R(T.thread,e);else t=[{role:"system",content:e},{type:"message",role:"user",content:"x"}];let r=[{role:"system",content:e},{type:"message",role:"user",content:"x"}],h=sFT(T.tools);return{client:R,model:a,systemPromptContent:e,fullInput:t,systemOnlyInput:r,tools:h}}async function Ts(T,R){if(T.provider==="anthropic")return A1R.count(T.ctx,R);return m1R.count(T.ctx,R)}async function oFT(T,R,a){let{onProgress:e}=T,t=8,r=0,h=(F)=>{r++,e?.(F,r,8)};if(h("Initializing..."),T.mcpInitialized)await T.mcpInitialized,await new Promise((F)=>setTimeout(F,100));let i=await T.configService.getLatest(a),c=ve(R),s,A;if(T.agentModeOverride&&c===0)A=T.agentModeOverride,s=nk(A);else{let F=pn(i.settings,R);s=F.model,A=F.agentMode}J.debug("Context analyzer model selection",{agentModeOverride:T.agentModeOverride,humanMsgCount:c,threadAgentMode:R.agentMode,resolvedAgentMode:A,selectedModel:s});let{provider:l,model:o}=RO(s),n=l==="anthropic"&&x8T(A,o),p=$h(R),_=dn(s),m=_.displayName,b=l==="anthropic"?TU(o,{enableLargeContext:n}):_.contextWindow-_.maxOutputTokens;J.debug("Context analysis model spec",{modelName:o,provider:l,modelDisplayName:m,maxContextTokens:b,lastUsageModel:p?.model}),h("Building system prompt...");let{systemPrompt:y,tools:u}=await LO(T.buildSystemPromptDeps,R,{enableTaskList:!1,enableTask:!0,enableOracle:!0},{model:o,provider:l,agentMode:A},a),P=u.filter((F)=>F.source==="builtin"),k=u.filter((F)=>typeof F.source==="object"&&("mcp"in F.source)),x=u.filter((F)=>typeof F.source==="object"&&("toolbox"in F.source)),f=[...P,...k,...x];J.debug("Context analysis tools breakdown",{totalTools:f.length,builtinCount:P.length,mcpCount:k.length,toolboxCount:x.length});let v=(await _O({...T.buildSystemPromptDeps,configService:T.configService},R,a)).filter((F)=>F.type==="project"||F.type==="parent"||F.type==="user"||F.type==="mentioned"),g=[];for(let F of R.messages)if(F.role==="user"){for(let E of F.content)if(E.type==="tool_result"&&E.run?.status==="done"){let U=E.run.result;if(typeof U==="object"&&U!==null&&"discoveredGuidanceFiles"in U&&Array.isArray(U.discoveredGuidanceFiles)){for(let Z of U.discoveredGuidanceFiles)if(Z.content)g.push({uri:Z.uri,content:Z.content})}}if(F.discoveredGuidanceFiles){for(let E of F.discoveredGuidanceFiles)if(E.content)g.push({uri:E.uri,content:E.content})}}let I={thread:R,systemPrompt:y,tools:f},S=Js(T.workersServiceAuthToken),O;if(l==="openai"){let F={...S??{},...Xs(),...Vs(R),[yc]:"amp.context-analyze","x-amp-override-provider":"openai"},E=await uU({configService:T.configService},a,{defaultHeaders:F});O={provider:"openai",ctx:b1R(I,E,o)}}else{let F=await ep({configService:T.configService},a,S?{defaultHeaders:S}:void 0),E={...JN(i.settings,{id:R.id,agentMode:A},o,void 0,{enableLargeContext:n}),...S??{},[yc]:"amp.context-analyze","x-amp-override-provider":"anthropic"};O={provider:"anthropic",ctx:l1R(I,F,tp(o),E)}}h("Counting total tokens...");let j=await Ts(O,{kind:"full"});h("Counting messages...");let d=await Ts(O,{kind:"no_messages"});h("Counting tools...");let C=await Ts(O,{kind:"no_tools"});h("Counting system prompt...");let L=await Ts(O,{kind:"system_only"});h("Counting AGENTS.md files...");let w=[];if(v.length>0){let F=await Promise.all(v.map(async(E)=>{let U=await Ts(O,{kind:"text",text:E.content});return{uri:E.uri,tokens:U}}));w.push(...F)}let D=w.reduce((F,E)=>F+E.tokens,0),B=[],M=0;if(g.length>0){let F=await Promise.all(g.map(async(E)=>{let U=Z9T([{uri:E.uri,lineCount:E.content.split(`
                      `).length,content:E.content}]),Z=await Ts(O,{kind:"text",text:U});return{uri:E.uri,tokens:Z}}));B.push(...F),M=B.reduce((E,U)=>E+U.tokens,0)}let V=j-d,Q=Math.max(0,V-M),W=j-C,eT=Math.max(0,L-D),iT=W,aT=0,oT=[];if(k.length>0&&(P.length>0||x.length>0)){let F=await Ts(O,{kind:"tools_only",tools:[...P,...x]}),E=await Ts(O,{kind:"system_only"}),U=F-E;aT=W-U,iT=U}else if(k.length>0)aT=W,iT=0;if(h("Finalizing..."),k.length>0){let F=new Map;for(let U of k){let Z=U.source.mcp,X=F.get(Z)??[];X.push(U),F.set(Z,X)}let E=await Promise.all(Array.from(F.entries()).map(async([U,Z])=>{let X=await Ts(O,{kind:"tools_only",tools:Z}),rT=await Ts(O,{kind:"system_only"});return{server:U,tokens:X-rT}}));oT.push(...E)}let TT=[];TT.push({name:"System prompt",tokens:eT,percentage:eT/b*100});let tT=x.length>0?"Builtin + toolbox tools":"Builtin tools";TT.push({name:tT,tokens:iT,percentage:iT/b*100});let lT=[...w,...B],N=D+M;if(lT.length>0){let F=null,E=R.env?.initial?.trees?.find((X)=>X.uri!==void 0)?.uri??null;if(E)F=E;else{let X=await m0(T.configService.workspaceRoot,a);if(X)F=d0(X)}let U={workspaceFolders:F?[F]:null,isWindows:JS().os==="windows",homeDir:T.configService.homeDir?d0(T.configService.homeDir):void 0},Z=lT.map((X)=>({name:Mr(X.uri,U),tokens:X.tokens,percentage:X.tokens/b*100}));TT.push({name:"AGENTS.md files",tokens:N,percentage:N/b*100,children:Z})}if(k.length>0){let F=oT.map((E)=>({name:E.server,tokens:E.tokens,percentage:E.tokens/b*100}));TT.push({name:"MCP tools",tokens:aT,percentage:aT/b*100,children:F.length>1?F:void 0})}if(R.messages.length>0)TT.push({name:"Messages",tokens:Q,percentage:Q/b*100});let q=Math.max(0,b-j);return{model:o,modelDisplayName:m,maxContextTokens:b,sections:TT,totalTokens:j,freeSpace:q,toolCounts:{builtin:P.length,mcp:k.length,toolbox:x.length,total:f.length}}}function y1R(T){if(T.startsWith("http://")||T.startsWith("https://"))try{let R=new URL(T);return R.username="",R.password="",R.toString()}catch{}return T}function pFT(T){let R=["github.com","gitlab.com"];T=y1R(T);let a=null,e=null,t=T.match(/^([^@]+)@([^:/]+)[:/](.+)$/);if(t&&t[1]&&t[2]&&t[3]){let r=t[1],h=t[2],i=t[3],c=r==="git",s=h==="github.com"&&r.startsWith("org-");if(c||s)a=h,e=i}if(!a||!e){let r=T.match(/^https?:\/\/([^/]+)\/(.+)$/);if(r&&r[1]&&r[2])a=r[1],e=r[2]}if(!a||!e){let r=T.match(/^([^:]+):(.+)$/);if(r&&r[1]&&r[2])a=r[1],e=r[2]}if(a&&e&&R.includes(a)){let r=e.replace(/\.git$/,"").replace(/\/+$/,"").replace(/@[^/]+$/,"");return`
                      https: //${a}/${r}`.toLowerCase()}return T.replace(/\.git$/,"").replace(/\/+$/,"").replace(/@[^/]+$/,"").toLowerCase()}async function P1R(T){let R={displayName:MR.basename(T)};if(!Pj(T))return R;R.uri=d0(T);try{if(!await lFT.access(AFT.join(T.fsPath,".git")).then(()=>!0).catch(()=>!1))return R;let{stdout:a}=await yz("git remote get-url origin",{cwd:T.fsPath}).catch(()=>({stdout:""}));if(!a.trim())return R;let{stdout:e}=await yz("git symbolic-ref HEAD",{cwd:T.fsPath}).catch(()=>({stdout:""})),{stdout:t}=await yz("git rev-parse HEAD",{cwd:T.fsPath}).catch(()=>({stdout:""}));return{...R,repository:{type:"git",url:pFT(a.trim()),ref:e.trim()||void 0,sha:t.trim()??void 0}}}catch(a){return J.error("Error getting repository info:",a,{dir:T.fsPath}),R}}function k1R(){let T=sN(),R=JS(),a=JlR();return{os:R.os,osVersion:R.osVersion,cpuArchitecture:R.cpuArchitecture,webBrowser:R.webBrowser,client:T.name,clientVersion:T.version,clientType:T.type,installationID:a?.installationID,deviceFingerprint:a?.deviceFingerprint}}async function Hs(){return{trees:[await P1R(zR.file(process.cwd()))],platform:k1R()}}function FO(T){throw Error(`Unreachable case: ${T}`)}function Ly(T,R,a=""){if(T===null||T===void 0)return!0;if(typeof T==="number"){if(!Number.isFinite(T))return R==null||R(a),!1;return!0}if(typeof T==="boolean"||typeof T==="string")return!0;if(typeof T==="bigint")return!0;if(T instanceof Date)return!0;if(T instanceof Uint8Array||T instanceof Uint8ClampedArray||T instanceof Uint16Array||T instanceof Uint32Array||T instanceof BigUint64Array||T instanceof Int8Array||T instanceof Int16Array||T instanceof Int32Array||T instanceof BigInt64Array||T instanceof Float32Array||T instanceof Float64Array)return!0;if(T instanceof Map){for(let[e,t]of T.entries()){let r=a?`${a}.key(${String(e)})`:`key(${String(e)})`,h=a?`${a}.value(${String(e)})`:`value(${String(e)})`;if(!Ly(e,R,r)||!Ly(t,R,h))return!1}return!0}if(T instanceof Set){let e=0;for(let t of T.values()){let r=a?`${a}.set[${e}]`:`set[${e}]`;if(!Ly(t,R,r))return!1;e++}return!0}if(T instanceof RegExp)return!0;if(T instanceof Error)return!0;if(Array.isArray(T)){for(let e=0;e<T.length;e++){let t=a?`${a}[${e}]`:`[${e}]`;if(!Ly(T[e],R,t))return!1}return!0}if(typeof T==="object"){let e=Object.getPrototypeOf(T);if(e!==null&&e!==Object.prototype){let t=T.constructor;if(t&&typeof t.name==="string");}for(let t in T){let r=a?`${a}.${t}`:t;if(!Ly(T[t],R,r))return!1}return!0}return R==null||R(a),!1}function HaT(T,R,a,e=!1){let t,r,h,i,c,s;if(Sh.isActorError(T)&&T.public)t="statusCode"in T&&T.statusCode?T.statusCode:400,r=!0,h=T.group,i=T.code,c=p$(T),s=T.metadata,R.info({msg:"public error",group:h,code:i,message:c,...r4,...a});else if(e)if(Sh.isActorError(T))t=500,r=!1,h=T.group,i=T.code,c=p$(T),s=T.metadata,R.info({msg:"internal error",group:h,code:i,message:c,stack:T==null?void 0:T.stack,...r4,...a});else t=500,r=!1,h="rivetkit",i=XX,c=p$(T),R.info({msg:"internal error",group:h,code:i,message:c,stack:T==null?void 0:T.stack,...r4,...a});else t=500,r=!1,h="rivetkit",i=XX,c=x1R,s={},R.warn({msg:"internal error",error:p$(T),stack:T==null?void 0:T.stack,...r4,...a});return{__type:"ActorError",statusCode:t,public:r,group:h,code:i,message:c,metadata:s}}function _r(T){if(T instanceof Error)if(typeof process<"u"&&q1R())return`${T.name}: ${T.message}${T.stack?`
                      $ {
                        T.stack
                      }
                      `:""}`;
                      else return `${T.name}: ${T.message}`;
                      else if (typeof T === "string") return T;
                      else if (typeof T === "object" && T !== null) try {
                        return `${JSON.stringify(T)}`
                      } catch {
                        return "[cannot stringify error]"
                      } else return `Unknown error: ${p$(T)}`
                    }

                    function p$(T) {
                      if (T && typeof T === "object" && "message" in T && typeof T.message === "string") return T.message;
                      else return String(T)
                    }

                    function F1R() {
                      return async () => {}
                    }

                    function X1R(T) {
                      let R = "",
                        a = Object.entries(T);
                      for (let e = 0; e < a.length; e++) {
                        let [t, r] = a[e], h = !1, i;
                        if (r == null) h = !0, i = "";
                        else i = r.toString();
                        if (i.length > 512 && t !== "msg" && t !== "error") i = `${i.slice(0,512)}...`;
                        let c = i.indexOf(" ") > -1 || i.indexOf("=") > -1,
                          s = i.indexOf('"') > -1 || i.indexOf("\\") > -1;
                        if (i = i.replace(/\n/g, "\\n"), s) i = i.replace(/["\\]/g, "\\$&");
                        if (c || s) i = `"${i}"`;
                        if (i === "" && !h) i = '""';
                        if (Z1R.enableColor) {
                          let A = "\x1B[2m";
                          if (t === "level") {
                            let l = S_[i],
                              o = K1R[l];
                            if (o) A = o
                          } else if (t === "msg") A = "\x1B[32m";
                          else if (t === "trace") A = "\x1B[34m";
                          R += `\x1B[0m\x1B[1m${t}\x1B[0m\x1B[2m=\x1B[0m${A}${i}${V1R}`
                        } else R += `${t}=${i}`;
                        if (e !== a.length - 1) R += " "
                      }
                      return R
                    }

                    function Y1R(T) {
                      let R = T.getUTCFullYear(),
                        a = String(T.getUTCMonth() + 1).padStart(2, "0"),
                        e = String(T.getUTCDate()).padStart(2, "0"),
                        t = String(T.getUTCHours()).padStart(2, "0"),
                        r = String(T.getUTCMinutes()).padStart(2, "0"),
                        h = String(T.getUTCSeconds()).padStart(2, "0"),
                        i = String(T.getUTCMilliseconds()).padStart(3, "0");
                      return `${R}-${a}-${e}T${t}:${r}:${h}.${i}Z`
                    }

                    function Q1R(T) {
                      if (typeof T === "string" || typeof T === "number" || typeof T === "bigint" || typeof T === "boolean" || T === null || T === void 0) return T;
                      if (T instanceof Error) return String(T);
                      try {
                        return JSON.stringify(T)
                      } catch {
                        return "[cannot stringify]"
                      }
                    }

                    function J1R(T) {
                      if (T) return T;
                      if (ZX) return ZX;
                      let R = (U1R() || "warn").toString().toLowerCase(),
                        a = WaT.safeParse(R);
                      if (a.success) return a.data;
                      return "info"
                    }

                    function TYR() {
                      return H1R()
                    }

                    function Rs(T, R) {
                      let a = {};
                      if (YX() && R.time) {
                        let t = typeof R.time === "number" ? new Date(R.time) : new Date;
                        a.ts = Y1R(t)
                      }
                      if (a.level = T.toUpperCase(), R.target) a.target = R.target;
                      if (R.msg) a.msg = R.msg;
                      for (let [t, r] of Object.entries(R))
                        if (t !== "time" && t !== "level" && t !== "target" && t !== "msg" && t !== "pid" && t !== "hostname") a[t] = Q1R(r);
                      let e = X1R(a);
                      console.log(e)
                    }

                    function RYR(T) {
                      if (T) ZX = T;
                      QX = byT.pino({
                        level: J1R(T),
                        messageKey: "msg",
                        base: {},
                        formatters: {
                          level(R, a) {
                            return {
                              level: a
                            }
                          }
                        },
                        timestamp: YX() ? byT.stdTimeFunctions.epochTime : !1,
                        browser: {
                          write: {
                            fatal: Rs.bind(null, "fatal"),
                            error: Rs.bind(null, "error"),
                            warn: Rs.bind(null, "warn"),
                            info: Rs.bind(null, "info"),
                            debug: Rs.bind(null, "debug"),
                            trace: Rs.bind(null, "trace")
                          }
                        },
                        hooks: {
                          logMethod(R, a, e) {
                            var t;
                            let r = {
                                10: "trace",
                                20: "debug",
                                30: "info",
                                40: "warn",
                                50: "error",
                                60: "fatal"
                              } [e] || "info",
                              h = YX() ? Date.now() : void 0,
                              i = ((t = this.bindings) == null ? void 0 : t.call(this)) || {};
                            if (R.length >= 2) {
                              let [c, s] = R;
                              if (typeof c === "object" && c !== null) Rs(r, {
                                ...i,
                                ...c,
                                msg: s,
                                time: h
                              });
                              else Rs(r, {
                                ...i,
                                msg: String(c),
                                time: h
                              })
                            } else if (R.length === 1) {
                              let [c] = R;
                              if (typeof c === "object" && c !== null) Rs(r, {
                                ...i,
                                ...c,
                                time: h
                              });
                              else Rs(r, {
                                ...i,
                                msg: String(c),
                                time: h
                              })
                            }
                          }
                        }
                      }), JX.clear()
                    }

                    function aYR() {
                      if (!QX) RYR();
                      return QX
                    }

                    function Vx(T = "default") {
                      let R = JX.get(T);
                      if (R) return R;
                      let a = aYR(),
                        e = TYR() ? a.child({
                          target: T
                        }) : a;
                      return JX.set(T, e), e
                    }

                    function myT() {
                      return Vx("utils")
                    }

                    function eYR() {
                      if (Pz !== void 0) return Pz;
                      let T = `RivetKit/${
GU}
`,
                        R = typeof navigator < "u" ? navigator : void 0;
                      if (R == null ? void 0 : R.userAgent) T += ` ${
R.userAgent}
`;
                      return Pz = T, T
                    }

                    function sa(T) {
                      if (typeof Deno < "u") return Deno.env.get(T);
                      else if (typeof process < "u") return process.env[T]
                    }

                    function pM(T) {
                      let R, a, e = new Promise((t, r) => {
                        R = t, a = r
                      });
                      return e.catch(T), {
                        promise: e,
                        resolve: R,
                        reject: a
                      }
                    }

                    function KU(T) {
                      return T.buffer.slice(T.byteOffset, T.byteOffset + T.byteLength)
                    }

                    function qaT(T, R, a) {
                      let e = new URL(T),
                        t = R.split("?"),
                        r = t[0],
                        h = t[1] || "",
                        i = e.pathname.replace(/\/$/, ""),
                        c = r.startsWith("/") ? r : `/${
r}
`,
                        s = (i + c).replace(/\/\//g, "/"),
                        A = [];
                      if (h) A.push(h);
                      if (a) {
                        for (let [o, n] of Object.entries(a))
                          if (n !== void 0) A.push(`${
encodeURIComponent(o)}
=${
encodeURIComponent(n)}
`)
                      }
                      let l = A.length > 0 ? `?${
A.join("&")}
` : "";
                      return `${
e.protocol}
//${e.host}${s}${l}`
                    }

                    function g0() {
                      return Vx("actor-client")
                    }
                    async function gFT() {
                      if (h4 !== null) return h4;
                      return h4 = (async () => {
                        let T;
                        if (typeof WebSocket < "u") T = WebSocket;
                        else try {
                          T = (await Promise.resolve().then(() => (Q0T(), Y0T))).default, g0().debug("using websocket from npm")
                        } catch {
                          T = class {
                            constructor() {
                              throw Error('WebSocket support requires installing the "ws" peer dependency.')
                            }
                          }, g0().debug("using mock websocket")
                        }
                        return T
                      })(), h4
                    }

                    function ze(T, R = "") {
                      if (!T) {
                        let a = new $FT(R);
                        throw tYR.captureStackTrace?.(a, ze), a
                      }
                    }

                    function rYR(T) {
                      return T === BigInt.asIntN(64, T)
                    }

                    function hYR(T) {
                      return T === (T & 255)
                    }

                    function iYR(T) {
                      return T === (T & 65535)
                    }

                    function un(T) {
                      return T === T >>> 0
                    }

                    function cYR(T) {
                      return T === BigInt.asUintN(64, T)
                    }

                    function sYR(T) {
                      return Number.isSafeInteger(T) && T >= 0
                    }
                    class A0 {
                      constructor(T, R) {
                        if (this.offset = 0, T.length > R.maxBufferLength) throw new I0(0, jFT);
                        this.bytes = T, this.config = R, this.view = new DataView(T.buffer, T.byteOffset, T.length)
                      }
                    }

                    function Um(T, R) {
                      if (Hr) ze(un(R));
                      if (T.offset + R > T.bytes.length) throw new I0(T.offset, "missing bytes")
                    }

                    function Hm(T, R) {
                      if (Hr) ze(un(R));
                      let a = T.offset + R | 0;
                      if (a > T.bytes.length) lYR(T, a)
                    }

                    function lYR(T, R) {
                      if (R > T.config.maxBufferLength) throw new I0(0, jFT);
                      let a = T.bytes.buffer,
                        e;
                      if (AYR(a) && T.bytes.byteOffset + T.bytes.byteLength === a.byteLength && T.bytes.byteLength + R <= a.maxByteLength) {
                        let t = Math.min(R << 1, T.config.maxBufferLength, a.maxByteLength);
                        if (a instanceof ArrayBuffer) a.resize(t);
                        else a.grow(t);
                        e = new Uint8Array(a, T.bytes.byteOffset, t)
                      } else {
                        let t = Math.min(R << 1, T.config.maxBufferLength);
                        e = new Uint8Array(t), e.set(T.bytes)
                      }
                      T.bytes = e, T.view = new DataView(e.buffer)
                    }

                    function AYR(T) {
                      return "maxByteLength" in T
                    }

                    function q0(T) {
                      let R = s3(T);
                      if (R > 1) throw T.offset--, new I0(T.offset, "a bool must be equal to 0 or 1");
                      return R > 0
                    }

                    function z0(T, R) {
                      dR(T, R ? 1 : 0)
                    }

                    function jA(T) {
                      Um(T, 8);
                      let R = T.view.getBigInt64(T.offset, !0);
                      return T.offset += 8, R
                    }

                    function SA(T, R) {
                      if (Hr) ze(rYR(R), $i);
                      Hm(T, 8), T.view.setBigInt64(T.offset, R, !0), T.offset += 8
                    }

                    function s3(T) {
                      return Um(T, 1), T.bytes[T.offset++]
                    }

                    function dR(T, R) {
                      if (Hr) ze(hYR(R), $i);
                      Hm(T, 1), T.bytes[T.offset++] = R
                    }

                    function pw(T) {
                      Um(T, 2);
                      let R = T.view.getUint16(T.offset, !0);
                      return T.offset += 2, R
                    }

                    function _w(T, R) {
                      if (Hr) ze(iYR(R), $i);
                      Hm(T, 2), T.view.setUint16(T.offset, R, !0), T.offset += 2
                    }

                    function ge(T) {
                      Um(T, 4);
                      let R = T.view.getUint32(T.offset, !0);
                      return T.offset += 4, R
                    }

                    function $e(T, R) {
                      if (Hr) ze(un(R), $i);
                      Hm(T, 4), T.view.setUint32(T.offset, R, !0), T.offset += 4
                    }

                    function Ws(T) {
                      Um(T, 8);
                      let R = T.view.getBigUint64(T.offset, !0);
                      return T.offset += 8, R
                    }

                    function qs(T, R) {
                      if (Hr) ze(cYR(R), $i);
                      Hm(T, 8), T.view.setBigUint64(T.offset, R, !0), T.offset += 8
                    }

                    function UR(T) {
                      let R = s3(T);
                      if (R >= 128) {
                        R &= 127;
                        let a = 128,
                          e = 1,
                          t;
                        do t = s3(T), R += (t & 127) * a, a *= 128, e++; while (t >= 128 && e < 7);
                        let r = 0;
                        a = 1;
                        while (t >= 128 && e < uyT) t = s3(T), r += (t & 127) * a, a *= 128, e++;
                        if (t === 0 || e === uyT && t > 1) throw T.offset -= e, new I0(T.offset, zaT);
                        return BigInt(R) + (BigInt(r) << BigInt(49))
                      }
                      return BigInt(R)
                    }

                    function HR(T, R) {
                      let a = BigInt.asUintN(64, R);
                      if (Hr) ze(a === R, $i);
                      pYR(T, a)
                    }

                    function pYR(T, R) {
                      let a = Number(BigInt.asUintN(49, R)),
                        e = Number(R >> BigInt(49)),
                        t = 0;
                      while (a >= 128 || e > 0)
                        if (dR(T, 128 | a & 127), a = Math.floor(a / 128), t++, t === 7) a = e, e = 0;
                      dR(T, a)
                    }

                    function SFT(T) {
                      let R = s3(T);
                      if (R >= 128) {
                        R &= 127;
                        let a = 7,
                          e = 1,
                          t;
                        do t = s3(T), R += (t & 127) << a >>> 0, a += 7, e++; while (t >= 128 && e < yyT);
                        if (t === 0) throw T.offset -= e - 1, new I0(T.offset - e + 1, zaT);
                        if (e === yyT && t > 15) throw T.offset -= e - 1, new I0(T.offset, $i)
                      }
                      return R
                    }

                    function T1(T, R) {
                      if (Hr) ze(un(R), $i);
                      let a = R >>> 0;
                      while (a >= 128) dR(T, 128 | a & 127), a >>>= 7;
                      dR(T, a)
                    }

                    function M8(T) {
                      let R = s3(T);
                      if (R >= 128) {
                        R &= 127;
                        let a = 128,
                          e = 1,
                          t;
                        do t = s3(T), R += (t & 127) * a, a *= 128, e++; while (t >= 128 && e < Aw);
                        if (t === 0) throw T.offset -= e - 1, new I0(T.offset - e + 1, zaT);
                        if (e === Aw && t > 15) throw T.offset -= e - 1, new I0(T.offset, $i)
                      }
                      return R
                    }

                    function D8(T, R) {
                      if (Hr) ze(sYR(R), $i);
                      let a = 1,
                        e = R;
                      while (e >= 128 && a < Aw) dR(T, 128 | e & 127), e = Math.floor(e / 128), a++;
                      if (a === Aw) e &= 15;
                      dR(T, e)
                    }

                    function _YR(T) {
                      return OFT(T, SFT(T))
                    }

                    function bYR(T, R) {
                      T1(T, R.length), FaT(T, R)
                    }

                    function OFT(T, R) {
                      return dFT(T, R).slice()
                    }

                    function FaT(T, R) {
                      let a = R.length;
                      if (a > 0) Hm(T, a), T.bytes.set(R, T.offset), T.offset += a
                    }

                    function dFT(T, R) {
                      if (Hr) ze(un(R));
                      Um(T, R);
                      let a = T.offset;
                      return T.offset += R, T.bytes.subarray(a, a + R)
                    }

                    function E0(T) {
                      return _YR(T).buffer
                    }

                    function C0(T, R) {
                      bYR(T, new Uint8Array(R))
                    }

                    function VU(T, R) {
                      if (Hr) ze(un(R));
                      return OFT(T, R).buffer
                    }

                    function XU(T, R) {
                      FaT(T, new Uint8Array(R))
                    }

                    function KR(T) {
                      return mYR(T, SFT(T))
                    }

                    function YR(T, R) {
                      if (R.length < nYR) {
                        let a = PYR(R);
                        T1(T, a), Hm(T, a), yYR(T, R)
                      } else {
                        let a = xYR.encode(R);
                        T1(T, a.length), FaT(T, a)
                      }
                    }

                    function mYR(T, R) {
                      if (Hr) ze(un(R));
                      if (R < oYR) return uYR(T, R);
                      try {
                        return kYR.decode(dFT(T, R))
                      } catch (a) {
                        throw new I0(T.offset, vFT)
                      }
                    }

                    function uYR(T, R) {
                      Um(T, R);
                      let a = "",
                        e = T.bytes,
                        t = T.offset,
                        r = t + R;
                      while (t < r) {
                        let h = e[t++];
                        if (h > 127) {
                          let i = !0,
                            c = h;
                          if (t < r && h < 224) {
                            let s = e[t++];
                            h = (c & 31) << 6 | s & 63, i = h >> 7 === 0 || c >> 5 !== 6 || s >> 6 !== 2
                          } else if (t + 1 < r && h < 240) {
                            let s = e[t++],
                              A = e[t++];
                            h = (c & 15) << 12 | (s & 63) << 6 | A & 63, i = h >> 11 === 0 || h >> 11 === 27 || c >> 4 !== 14 || s >> 6 !== 2 || A >> 6 !== 2
                          } else if (t + 2 < r) {
                            let s = e[t++],
                              A = e[t++],
                              l = e[t++];
                            h = (c & 7) << 18 | (s & 63) << 12 | (A & 63) << 6 | l & 63, i = h >> 16 === 0 || h > 1114111 || c >> 3 !== 30 || s >> 6 !== 2 || A >> 6 !== 2 || l >> 6 !== 2
                          }
                          if (i) throw new I0(T.offset, vFT)
                        }
                        a += String.fromCodePoint(h)
                      }
                      return T.offset = t, a
                    }

                    function yYR(T, R) {
                      let {
                        bytes: a,
                        offset: e
                      } = T, t = 0;
                      while (t < R.length) {
                        let r = R.codePointAt(t++);
                        if (r < 128) a[e++] = r;
                        else {
                          if (r < 2048) a[e++] = 192 | r >> 6;
                          else {
                            if (r < 65536) a[e++] = 224 | r >> 12;
                            else a[e++] = 240 | r >> 18, a[e++] = 128 | r >> 12 & 63, t++;
                            a[e++] = 128 | r >> 6 & 63
                          }
                          a[e++] = 128 | r & 63
                        }
                      }
                      T.offset = e
                    }

                    function PYR(T) {
                      let R = T.length;
                      for (let a = 0; a < T.length; a++) {
                        let e = T.codePointAt(a);
                        if (e > 127) {
                          if (R++, e > 2047) {
                            if (R++, e > 65535) a++
                          }
                        }
                      }
                      return R
                    }

                    function Wr({
                      initialBufferLength: T = 1024,
                      maxBufferLength: R = 33554432
                    }) {
                      if (Hr) ze(un(T), $i), ze(un(R), $i), ze(T <= R, "initialBufferLength must be lower than or equal to maxBufferLength");
                      return {
                        initialBufferLength: T,
                        maxBufferLength: R
                      }
                    }

                    function pt(T) {
                      return new fYR(T)
                    }

                    function IYR(T) {
                      return {
                        state: E0(T)
                      }
                    }

                    function gYR(T, R) {
                      C0(T, R.state)
                    }

                    function $YR(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function vYR(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function jYR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function SYR(T, R) {
                      HR(T, R.id)
                    }

                    function OYR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function dYR(T, R) {
                      HR(T, R.id)
                    }

                    function EYR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function CYR(T, R) {
                      HR(T, R.id)
                    }

                    function LYR(T) {
                      return {
                        id: UR(T),
                        startMs: UR(T),
                        endMs: UR(T),
                        limit: UR(T)
                      }
                    }

                    function MYR(T, R) {
                      HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit)
                    }

                    function DYR(T) {
                      return {
                        id: UR(T),
                        limit: UR(T)
                      }
                    }

                    function wYR(T, R) {
                      HR(T, R.id), HR(T, R.limit)
                    }

                    function BYR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function NYR(T, R) {
                      HR(T, R.id)
                    }

                    function UYR(T) {
                      return q0(T) ? KR(T) : null
                    }

                    function HYR(T, R) {
                      if (z0(T, R !== null), R !== null) YR(T, R)
                    }

                    function WYR(T) {
                      return {
                        id: UR(T),
                        entryId: UYR(T)
                      }
                    }

                    function qYR(T, R) {
                      HR(T, R.id), HYR(T, R.entryId)
                    }

                    function zYR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function FYR(T, R) {
                      HR(T, R.id)
                    }

                    function GYR(T) {
                      return {
                        id: UR(T),
                        table: KR(T),
                        limit: UR(T),
                        offset: UR(T)
                      }
                    }

                    function KYR(T, R) {
                      HR(T, R.id), YR(T, R.table), HR(T, R.limit), HR(T, R.offset)
                    }

                    function VYR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "PatchStateRequest", val: IYR(T)
                          };
                        case 1:
                          return {
                            tag: "StateRequest", val: jYR(T)
                          };
                        case 2:
                          return {
                            tag: "ConnectionsRequest", val: OYR(T)
                          };
                        case 3:
                          return {
                            tag: "ActionRequest", val: $YR(T)
                          };
                        case 4:
                          return {
                            tag: "RpcsListRequest", val: EYR(T)
                          };
                        case 5:
                          return {
                            tag: "TraceQueryRequest", val: LYR(T)
                          };
                        case 6:
                          return {
                            tag: "QueueRequest", val: DYR(T)
                          };
                        case 7:
                          return {
                            tag: "WorkflowHistoryRequest", val: BYR(T)
                          };
                        case 8:
                          return {
                            tag: "WorkflowReplayRequest", val: WYR(T)
                          };
                        case 9:
                          return {
                            tag: "DatabaseSchemaRequest", val: zYR(T)
                          };
                        case 10:
                          return {
                            tag: "DatabaseTableRowsRequest", val: GYR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function XYR(T, R) {
                      switch (R.tag) {
                        case "PatchStateRequest": {
                          dR(T, 0), gYR(T, R.val);
                          break
                        }
                        case "StateRequest": {
                          dR(T, 1), SYR(T, R.val);
                          break
                        }
                        case "ConnectionsRequest": {
                          dR(T, 2), dYR(T, R.val);
                          break
                        }
                        case "ActionRequest": {
                          dR(T, 3), vYR(T, R.val);
                          break
                        }
                        case "RpcsListRequest": {
                          dR(T, 4), CYR(T, R.val);
                          break
                        }
                        case "TraceQueryRequest": {
                          dR(T, 5), MYR(T, R.val);
                          break
                        }
                        case "QueueRequest": {
                          dR(T, 6), wYR(T, R.val);
                          break
                        }
                        case "WorkflowHistoryRequest": {
                          dR(T, 7), NYR(T, R.val);
                          break
                        }
                        case "WorkflowReplayRequest": {
                          dR(T, 8), qYR(T, R.val);
                          break
                        }
                        case "DatabaseSchemaRequest": {
                          dR(T, 9), FYR(T, R.val);
                          break
                        }
                        case "DatabaseTableRowsRequest": {
                          dR(T, 10), KYR(T, R.val);
                          break
                        }
                      }
                    }

                    function YYR(T) {
                      return {
                        body: VYR(T)
                      }
                    }

                    function QYR(T, R) {
                      XYR(T, R.body)
                    }

                    function ZYR(T) {
                      let R = new A0(new Uint8Array(wk.initialBufferLength), wk);
                      return QYR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function JYR(T) {
                      let R = new A0(T, wk),
                        a = YYR(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function EFT(T) {
                      return E0(T)
                    }

                    function CFT(T, R) {
                      C0(T, R)
                    }

                    function PyT(T) {
                      return {
                        id: KR(T),
                        details: E0(T)
                      }
                    }

                    function TQR(T, R) {
                      YR(T, R.id), C0(T, R.details)
                    }

                    function LFT(T) {
                      return E0(T)
                    }

                    function MFT(T, R) {
                      C0(T, R)
                    }

                    function GaT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [PyT(T)];
                      for (let e = 1; e < R; e++) a[e] = PyT(T);
                      return a
                    }

                    function KaT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) TQR(T, R[a])
                    }

                    function DFT(T) {
                      return q0(T) ? EFT(T) : null
                    }

                    function wFT(T, R) {
                      if (z0(T, R !== null), R !== null) CFT(T, R)
                    }

                    function BFT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [KR(T)];
                      for (let e = 1; e < R; e++) a[e] = KR(T);
                      return a
                    }

                    function NFT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) YR(T, R[a])
                    }

                    function VaT(T) {
                      return q0(T) ? LFT(T) : null
                    }

                    function XaT(T, R) {
                      if (z0(T, R !== null), R !== null) MFT(T, R)
                    }

                    function RQR(T) {
                      return {
                        connections: GaT(T),
                        state: DFT(T),
                        isStateEnabled: q0(T),
                        rpcs: BFT(T),
                        isDatabaseEnabled: q0(T),
                        queueSize: UR(T),
                        workflowHistory: VaT(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function aQR(T, R) {
                      KaT(T, R.connections), wFT(T, R.state), z0(T, R.isStateEnabled), NFT(T, R.rpcs), z0(T, R.isDatabaseEnabled), HR(T, R.queueSize), XaT(T, R.workflowHistory), z0(T, R.isWorkflowEnabled)
                    }

                    function eQR(T) {
                      return {
                        rid: UR(T),
                        connections: GaT(T)
                      }
                    }

                    function tQR(T, R) {
                      HR(T, R.rid), KaT(T, R.connections)
                    }

                    function rQR(T) {
                      return {
                        rid: UR(T),
                        state: DFT(T),
                        isStateEnabled: q0(T)
                      }
                    }

                    function hQR(T, R) {
                      HR(T, R.rid), wFT(T, R.state), z0(T, R.isStateEnabled)
                    }

                    function iQR(T) {
                      return {
                        rid: UR(T),
                        output: E0(T)
                      }
                    }

                    function cQR(T, R) {
                      HR(T, R.rid), C0(T, R.output)
                    }

                    function sQR(T) {
                      return {
                        rid: UR(T),
                        payload: E0(T)
                      }
                    }

                    function oQR(T, R) {
                      HR(T, R.rid), C0(T, R.payload)
                    }

                    function kyT(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        createdAtMs: UR(T)
                      }
                    }

                    function nQR(T, R) {
                      HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs)
                    }

                    function lQR(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [kyT(T)];
                      for (let e = 1; e < R; e++) a[e] = kyT(T);
                      return a
                    }

                    function AQR(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) nQR(T, R[a])
                    }

                    function pQR(T) {
                      return {
                        size: UR(T),
                        maxSize: UR(T),
                        messages: lQR(T),
                        truncated: q0(T)
                      }
                    }

                    function _QR(T, R) {
                      HR(T, R.size), HR(T, R.maxSize), AQR(T, R.messages), z0(T, R.truncated)
                    }

                    function bQR(T) {
                      return {
                        rid: UR(T),
                        status: pQR(T)
                      }
                    }

                    function mQR(T, R) {
                      HR(T, R.rid), _QR(T, R.status)
                    }

                    function uQR(T) {
                      return {
                        rid: UR(T),
                        history: VaT(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function yQR(T, R) {
                      HR(T, R.rid), XaT(T, R.history), z0(T, R.isWorkflowEnabled)
                    }

                    function PQR(T) {
                      return {
                        rid: UR(T),
                        history: VaT(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function kQR(T, R) {
                      HR(T, R.rid), XaT(T, R.history), z0(T, R.isWorkflowEnabled)
                    }

                    function xQR(T) {
                      return {
                        rid: UR(T),
                        schema: E0(T)
                      }
                    }

                    function fQR(T, R) {
                      HR(T, R.rid), C0(T, R.schema)
                    }

                    function IQR(T) {
                      return {
                        rid: UR(T),
                        result: E0(T)
                      }
                    }

                    function gQR(T, R) {
                      HR(T, R.rid), C0(T, R.result)
                    }

                    function $QR(T) {
                      return {
                        state: EFT(T)
                      }
                    }

                    function vQR(T, R) {
                      CFT(T, R.state)
                    }

                    function jQR(T) {
                      return {
                        queueSize: UR(T)
                      }
                    }

                    function SQR(T, R) {
                      HR(T, R.queueSize)
                    }

                    function OQR(T) {
                      return {
                        history: LFT(T)
                      }
                    }

                    function dQR(T, R) {
                      MFT(T, R.history)
                    }

                    function EQR(T) {
                      return {
                        rid: UR(T),
                        rpcs: BFT(T)
                      }
                    }

                    function CQR(T, R) {
                      HR(T, R.rid), NFT(T, R.rpcs)
                    }

                    function LQR(T) {
                      return {
                        connections: GaT(T)
                      }
                    }

                    function MQR(T, R) {
                      KaT(T, R.connections)
                    }

                    function DQR(T) {
                      return {
                        message: KR(T)
                      }
                    }

                    function wQR(T, R) {
                      YR(T, R.message)
                    }

                    function BQR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "StateResponse", val: rQR(T)
                          };
                        case 1:
                          return {
                            tag: "ConnectionsResponse", val: eQR(T)
                          };
                        case 2:
                          return {
                            tag: "ActionResponse", val: iQR(T)
                          };
                        case 3:
                          return {
                            tag: "ConnectionsUpdated", val: LQR(T)
                          };
                        case 4:
                          return {
                            tag: "QueueUpdated", val: jQR(T)
                          };
                        case 5:
                          return {
                            tag: "StateUpdated", val: $QR(T)
                          };
                        case 6:
                          return {
                            tag: "WorkflowHistoryUpdated", val: OQR(T)
                          };
                        case 7:
                          return {
                            tag: "RpcsListResponse", val: EQR(T)
                          };
                        case 8:
                          return {
                            tag: "TraceQueryResponse", val: sQR(T)
                          };
                        case 9:
                          return {
                            tag: "QueueResponse", val: bQR(T)
                          };
                        case 10:
                          return {
                            tag: "WorkflowHistoryResponse", val: uQR(T)
                          };
                        case 11:
                          return {
                            tag: "WorkflowReplayResponse", val: PQR(T)
                          };
                        case 12:
                          return {
                            tag: "Error", val: DQR(T)
                          };
                        case 13:
                          return {
                            tag: "Init", val: RQR(T)
                          };
                        case 14:
                          return {
                            tag: "DatabaseSchemaResponse", val: xQR(T)
                          };
                        case 15:
                          return {
                            tag: "DatabaseTableRowsResponse", val: IQR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function NQR(T, R) {
                      switch (R.tag) {
                        case "StateResponse": {
                          dR(T, 0), hQR(T, R.val);
                          break
                        }
                        case "ConnectionsResponse": {
                          dR(T, 1), tQR(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 2), cQR(T, R.val);
                          break
                        }
                        case "ConnectionsUpdated": {
                          dR(T, 3), MQR(T, R.val);
                          break
                        }
                        case "QueueUpdated": {
                          dR(T, 4), SQR(T, R.val);
                          break
                        }
                        case "StateUpdated": {
                          dR(T, 5), vQR(T, R.val);
                          break
                        }
                        case "WorkflowHistoryUpdated": {
                          dR(T, 6), dQR(T, R.val);
                          break
                        }
                        case "RpcsListResponse": {
                          dR(T, 7), CQR(T, R.val);
                          break
                        }
                        case "TraceQueryResponse": {
                          dR(T, 8), oQR(T, R.val);
                          break
                        }
                        case "QueueResponse": {
                          dR(T, 9), mQR(T, R.val);
                          break
                        }
                        case "WorkflowHistoryResponse": {
                          dR(T, 10), yQR(T, R.val);
                          break
                        }
                        case "WorkflowReplayResponse": {
                          dR(T, 11), kQR(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 12), wQR(T, R.val);
                          break
                        }
                        case "Init": {
                          dR(T, 13), aQR(T, R.val);
                          break
                        }
                        case "DatabaseSchemaResponse": {
                          dR(T, 14), fQR(T, R.val);
                          break
                        }
                        case "DatabaseTableRowsResponse": {
                          dR(T, 15), gQR(T, R.val);
                          break
                        }
                      }
                    }

                    function UQR(T) {
                      return {
                        body: BQR(T)
                      }
                    }

                    function HQR(T, R) {
                      NQR(T, R.body)
                    }

                    function WQR(T) {
                      let R = new A0(new Uint8Array(wk.initialBufferLength), wk);
                      return HQR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function qQR(T) {
                      let R = new A0(T, wk),
                        a = UQR(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function zQR(T) {
                      return {
                        state: E0(T)
                      }
                    }

                    function FQR(T, R) {
                      C0(T, R.state)
                    }

                    function GQR(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function KQR(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function VQR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function XQR(T, R) {
                      HR(T, R.id)
                    }

                    function YQR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function QQR(T, R) {
                      HR(T, R.id)
                    }

                    function ZQR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function JQR(T, R) {
                      HR(T, R.id)
                    }

                    function TZR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function RZR(T, R) {
                      HR(T, R.id)
                    }

                    function aZR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function eZR(T, R) {
                      HR(T, R.id)
                    }

                    function tZR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "PatchStateRequest", val: zQR(T)
                          };
                        case 1:
                          return {
                            tag: "StateRequest", val: VQR(T)
                          };
                        case 2:
                          return {
                            tag: "ConnectionsRequest", val: YQR(T)
                          };
                        case 3:
                          return {
                            tag: "ActionRequest", val: GQR(T)
                          };
                        case 4:
                          return {
                            tag: "EventsRequest", val: ZQR(T)
                          };
                        case 5:
                          return {
                            tag: "ClearEventsRequest", val: TZR(T)
                          };
                        case 6:
                          return {
                            tag: "RpcsListRequest", val: aZR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function rZR(T, R) {
                      switch (R.tag) {
                        case "PatchStateRequest": {
                          dR(T, 0), FQR(T, R.val);
                          break
                        }
                        case "StateRequest": {
                          dR(T, 1), XQR(T, R.val);
                          break
                        }
                        case "ConnectionsRequest": {
                          dR(T, 2), QQR(T, R.val);
                          break
                        }
                        case "ActionRequest": {
                          dR(T, 3), KQR(T, R.val);
                          break
                        }
                        case "EventsRequest": {
                          dR(T, 4), JQR(T, R.val);
                          break
                        }
                        case "ClearEventsRequest": {
                          dR(T, 5), RZR(T, R.val);
                          break
                        }
                        case "RpcsListRequest": {
                          dR(T, 6), eZR(T, R.val);
                          break
                        }
                      }
                    }

                    function hZR(T) {
                      return {
                        body: tZR(T)
                      }
                    }

                    function iZR(T, R) {
                      rZR(T, R.body)
                    }

                    function cZR(T) {
                      let R = new A0(new Uint8Array(Bk.initialBufferLength), Bk);
                      return iZR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function sZR(T) {
                      let R = new A0(T, Bk),
                        a = hZR(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function UFT(T) {
                      return E0(T)
                    }

                    function HFT(T, R) {
                      C0(T, R)
                    }

                    function xyT(T) {
                      return {
                        id: KR(T),
                        details: E0(T)
                      }
                    }

                    function oZR(T, R) {
                      YR(T, R.id), C0(T, R.details)
                    }

                    function nZR(T) {
                      return {
                        name: KR(T),
                        args: E0(T),
                        connId: KR(T)
                      }
                    }

                    function lZR(T, R) {
                      YR(T, R.name), C0(T, R.args), YR(T, R.connId)
                    }

                    function AZR(T) {
                      return {
                        eventName: KR(T),
                        args: E0(T)
                      }
                    }

                    function pZR(T, R) {
                      YR(T, R.eventName), C0(T, R.args)
                    }

                    function _ZR(T) {
                      return {
                        eventName: KR(T),
                        connId: KR(T)
                      }
                    }

                    function bZR(T, R) {
                      YR(T, R.eventName), YR(T, R.connId)
                    }

                    function mZR(T) {
                      return {
                        eventName: KR(T),
                        connId: KR(T)
                      }
                    }

                    function uZR(T, R) {
                      YR(T, R.eventName), YR(T, R.connId)
                    }

                    function yZR(T) {
                      return {
                        eventName: KR(T),
                        args: E0(T),
                        connId: KR(T)
                      }
                    }

                    function PZR(T, R) {
                      YR(T, R.eventName), C0(T, R.args), YR(T, R.connId)
                    }

                    function kZR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "ActionEvent", val: nZR(T)
                          };
                        case 1:
                          return {
                            tag: "BroadcastEvent", val: AZR(T)
                          };
                        case 2:
                          return {
                            tag: "SubscribeEvent", val: _ZR(T)
                          };
                        case 3:
                          return {
                            tag: "UnSubscribeEvent", val: mZR(T)
                          };
                        case 4:
                          return {
                            tag: "FiredEvent", val: yZR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function xZR(T, R) {
                      switch (R.tag) {
                        case "ActionEvent": {
                          dR(T, 0), lZR(T, R.val);
                          break
                        }
                        case "BroadcastEvent": {
                          dR(T, 1), pZR(T, R.val);
                          break
                        }
                        case "SubscribeEvent": {
                          dR(T, 2), bZR(T, R.val);
                          break
                        }
                        case "UnSubscribeEvent": {
                          dR(T, 3), uZR(T, R.val);
                          break
                        }
                        case "FiredEvent": {
                          dR(T, 4), PZR(T, R.val);
                          break
                        }
                      }
                    }

                    function fyT(T) {
                      return {
                        id: KR(T),
                        timestamp: UR(T),
                        body: kZR(T)
                      }
                    }

                    function fZR(T, R) {
                      YR(T, R.id), HR(T, R.timestamp), xZR(T, R.body)
                    }

                    function YaT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [xyT(T)];
                      for (let e = 1; e < R; e++) a[e] = xyT(T);
                      return a
                    }

                    function QaT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) oZR(T, R[a])
                    }

                    function ZaT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [fyT(T)];
                      for (let e = 1; e < R; e++) a[e] = fyT(T);
                      return a
                    }

                    function JaT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) fZR(T, R[a])
                    }

                    function WFT(T) {
                      return q0(T) ? UFT(T) : null
                    }

                    function qFT(T, R) {
                      if (z0(T, R !== null), R !== null) HFT(T, R)
                    }

                    function zFT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [KR(T)];
                      for (let e = 1; e < R; e++) a[e] = KR(T);
                      return a
                    }

                    function FFT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) YR(T, R[a])
                    }

                    function IZR(T) {
                      return {
                        connections: YaT(T),
                        events: ZaT(T),
                        state: WFT(T),
                        isStateEnabled: q0(T),
                        rpcs: zFT(T),
                        isDatabaseEnabled: q0(T)
                      }
                    }

                    function gZR(T, R) {
                      QaT(T, R.connections), JaT(T, R.events), qFT(T, R.state), z0(T, R.isStateEnabled), FFT(T, R.rpcs), z0(T, R.isDatabaseEnabled)
                    }

                    function $ZR(T) {
                      return {
                        rid: UR(T),
                        connections: YaT(T)
                      }
                    }

                    function vZR(T, R) {
                      HR(T, R.rid), QaT(T, R.connections)
                    }

                    function jZR(T) {
                      return {
                        rid: UR(T),
                        state: WFT(T),
                        isStateEnabled: q0(T)
                      }
                    }

                    function SZR(T, R) {
                      HR(T, R.rid), qFT(T, R.state), z0(T, R.isStateEnabled)
                    }

                    function OZR(T) {
                      return {
                        rid: UR(T),
                        events: ZaT(T)
                      }
                    }

                    function dZR(T, R) {
                      HR(T, R.rid), JaT(T, R.events)
                    }

                    function EZR(T) {
                      return {
                        rid: UR(T),
                        output: E0(T)
                      }
                    }

                    function CZR(T, R) {
                      HR(T, R.rid), C0(T, R.output)
                    }

                    function LZR(T) {
                      return {
                        state: UFT(T)
                      }
                    }

                    function MZR(T, R) {
                      HFT(T, R.state)
                    }

                    function DZR(T) {
                      return {
                        events: ZaT(T)
                      }
                    }

                    function wZR(T, R) {
                      JaT(T, R.events)
                    }

                    function BZR(T) {
                      return {
                        rid: UR(T),
                        rpcs: zFT(T)
                      }
                    }

                    function NZR(T, R) {
                      HR(T, R.rid), FFT(T, R.rpcs)
                    }

                    function UZR(T) {
                      return {
                        connections: YaT(T)
                      }
                    }

                    function HZR(T, R) {
                      QaT(T, R.connections)
                    }

                    function WZR(T) {
                      return {
                        message: KR(T)
                      }
                    }

                    function qZR(T, R) {
                      YR(T, R.message)
                    }

                    function zZR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "StateResponse", val: jZR(T)
                          };
                        case 1:
                          return {
                            tag: "ConnectionsResponse", val: $ZR(T)
                          };
                        case 2:
                          return {
                            tag: "EventsResponse", val: OZR(T)
                          };
                        case 3:
                          return {
                            tag: "ActionResponse", val: EZR(T)
                          };
                        case 4:
                          return {
                            tag: "ConnectionsUpdated", val: UZR(T)
                          };
                        case 5:
                          return {
                            tag: "EventsUpdated", val: DZR(T)
                          };
                        case 6:
                          return {
                            tag: "StateUpdated", val: LZR(T)
                          };
                        case 7:
                          return {
                            tag: "RpcsListResponse", val: BZR(T)
                          };
                        case 8:
                          return {
                            tag: "Error", val: WZR(T)
                          };
                        case 9:
                          return {
                            tag: "Init", val: IZR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function FZR(T, R) {
                      switch (R.tag) {
                        case "StateResponse": {
                          dR(T, 0), SZR(T, R.val);
                          break
                        }
                        case "ConnectionsResponse": {
                          dR(T, 1), vZR(T, R.val);
                          break
                        }
                        case "EventsResponse": {
                          dR(T, 2), dZR(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 3), CZR(T, R.val);
                          break
                        }
                        case "ConnectionsUpdated": {
                          dR(T, 4), HZR(T, R.val);
                          break
                        }
                        case "EventsUpdated": {
                          dR(T, 5), wZR(T, R.val);
                          break
                        }
                        case "StateUpdated": {
                          dR(T, 6), MZR(T, R.val);
                          break
                        }
                        case "RpcsListResponse": {
                          dR(T, 7), NZR(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 8), qZR(T, R.val);
                          break
                        }
                        case "Init": {
                          dR(T, 9), gZR(T, R.val);
                          break
                        }
                      }
                    }

                    function GZR(T) {
                      return {
                        body: zZR(T)
                      }
                    }

                    function KZR(T, R) {
                      FZR(T, R.body)
                    }

                    function VZR(T) {
                      let R = new A0(new Uint8Array(Bk.initialBufferLength), Bk);
                      return KZR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function XZR(T) {
                      let R = new A0(T, Bk),
                        a = GZR(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function YZR(T) {
                      return {
                        state: E0(T)
                      }
                    }

                    function QZR(T, R) {
                      C0(T, R.state)
                    }

                    function ZZR(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function JZR(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function TJR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function RJR(T, R) {
                      HR(T, R.id)
                    }

                    function aJR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function eJR(T, R) {
                      HR(T, R.id)
                    }

                    function tJR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function rJR(T, R) {
                      HR(T, R.id)
                    }

                    function hJR(T) {
                      return {
                        id: UR(T),
                        startMs: UR(T),
                        endMs: UR(T),
                        limit: UR(T)
                      }
                    }

                    function iJR(T, R) {
                      HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit)
                    }

                    function cJR(T) {
                      return {
                        id: UR(T),
                        limit: UR(T)
                      }
                    }

                    function sJR(T, R) {
                      HR(T, R.id), HR(T, R.limit)
                    }

                    function oJR(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function nJR(T, R) {
                      HR(T, R.id)
                    }

                    function lJR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "PatchStateRequest", val: YZR(T)
                          };
                        case 1:
                          return {
                            tag: "StateRequest", val: TJR(T)
                          };
                        case 2:
                          return {
                            tag: "ConnectionsRequest", val: aJR(T)
                          };
                        case 3:
                          return {
                            tag: "ActionRequest", val: ZZR(T)
                          };
                        case 4:
                          return {
                            tag: "RpcsListRequest", val: tJR(T)
                          };
                        case 5:
                          return {
                            tag: "TraceQueryRequest", val: hJR(T)
                          };
                        case 6:
                          return {
                            tag: "QueueRequest", val: cJR(T)
                          };
                        case 7:
                          return {
                            tag: "WorkflowHistoryRequest", val: oJR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function AJR(T, R) {
                      switch (R.tag) {
                        case "PatchStateRequest": {
                          dR(T, 0), QZR(T, R.val);
                          break
                        }
                        case "StateRequest": {
                          dR(T, 1), RJR(T, R.val);
                          break
                        }
                        case "ConnectionsRequest": {
                          dR(T, 2), eJR(T, R.val);
                          break
                        }
                        case "ActionRequest": {
                          dR(T, 3), JZR(T, R.val);
                          break
                        }
                        case "RpcsListRequest": {
                          dR(T, 4), rJR(T, R.val);
                          break
                        }
                        case "TraceQueryRequest": {
                          dR(T, 5), iJR(T, R.val);
                          break
                        }
                        case "QueueRequest": {
                          dR(T, 6), sJR(T, R.val);
                          break
                        }
                        case "WorkflowHistoryRequest": {
                          dR(T, 7), nJR(T, R.val);
                          break
                        }
                      }
                    }

                    function pJR(T) {
                      return {
                        body: lJR(T)
                      }
                    }

                    function _JR(T, R) {
                      AJR(T, R.body)
                    }

                    function bJR(T) {
                      let R = new A0(new Uint8Array(Nk.initialBufferLength), Nk);
                      return _JR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function mJR(T) {
                      let R = new A0(T, Nk),
                        a = pJR(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function GFT(T) {
                      return E0(T)
                    }

                    function KFT(T, R) {
                      C0(T, R)
                    }

                    function IyT(T) {
                      return {
                        id: KR(T),
                        details: E0(T)
                      }
                    }

                    function uJR(T, R) {
                      YR(T, R.id), C0(T, R.details)
                    }

                    function VFT(T) {
                      return E0(T)
                    }

                    function XFT(T, R) {
                      C0(T, R)
                    }

                    function TeT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [IyT(T)];
                      for (let e = 1; e < R; e++) a[e] = IyT(T);
                      return a
                    }

                    function ReT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) uJR(T, R[a])
                    }

                    function YFT(T) {
                      return q0(T) ? GFT(T) : null
                    }

                    function QFT(T, R) {
                      if (z0(T, R !== null), R !== null) KFT(T, R)
                    }

                    function ZFT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [KR(T)];
                      for (let e = 1; e < R; e++) a[e] = KR(T);
                      return a
                    }

                    function JFT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) YR(T, R[a])
                    }

                    function T2T(T) {
                      return q0(T) ? VFT(T) : null
                    }

                    function R2T(T, R) {
                      if (z0(T, R !== null), R !== null) XFT(T, R)
                    }

                    function yJR(T) {
                      return {
                        connections: TeT(T),
                        state: YFT(T),
                        isStateEnabled: q0(T),
                        rpcs: ZFT(T),
                        isDatabaseEnabled: q0(T),
                        queueSize: UR(T),
                        workflowHistory: T2T(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function PJR(T, R) {
                      ReT(T, R.connections), QFT(T, R.state), z0(T, R.isStateEnabled), JFT(T, R.rpcs), z0(T, R.isDatabaseEnabled), HR(T, R.queueSize), R2T(T, R.workflowHistory), z0(T, R.isWorkflowEnabled)
                    }

                    function kJR(T) {
                      return {
                        rid: UR(T),
                        connections: TeT(T)
                      }
                    }

                    function xJR(T, R) {
                      HR(T, R.rid), ReT(T, R.connections)
                    }

                    function fJR(T) {
                      return {
                        rid: UR(T),
                        state: YFT(T),
                        isStateEnabled: q0(T)
                      }
                    }

                    function IJR(T, R) {
                      HR(T, R.rid), QFT(T, R.state), z0(T, R.isStateEnabled)
                    }

                    function gJR(T) {
                      return {
                        rid: UR(T),
                        output: E0(T)
                      }
                    }

                    function $JR(T, R) {
                      HR(T, R.rid), C0(T, R.output)
                    }

                    function vJR(T) {
                      return {
                        rid: UR(T),
                        payload: E0(T)
                      }
                    }

                    function jJR(T, R) {
                      HR(T, R.rid), C0(T, R.payload)
                    }

                    function gyT(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        createdAtMs: UR(T)
                      }
                    }

                    function SJR(T, R) {
                      HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs)
                    }

                    function OJR(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [gyT(T)];
                      for (let e = 1; e < R; e++) a[e] = gyT(T);
                      return a
                    }

                    function dJR(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) SJR(T, R[a])
                    }

                    function EJR(T) {
                      return {
                        size: UR(T),
                        maxSize: UR(T),
                        messages: OJR(T),
                        truncated: q0(T)
                      }
                    }

                    function CJR(T, R) {
                      HR(T, R.size), HR(T, R.maxSize), dJR(T, R.messages), z0(T, R.truncated)
                    }

                    function LJR(T) {
                      return {
                        rid: UR(T),
                        status: EJR(T)
                      }
                    }

                    function MJR(T, R) {
                      HR(T, R.rid), CJR(T, R.status)
                    }

                    function DJR(T) {
                      return {
                        rid: UR(T),
                        history: T2T(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function wJR(T, R) {
                      HR(T, R.rid), R2T(T, R.history), z0(T, R.isWorkflowEnabled)
                    }

                    function BJR(T) {
                      return {
                        state: GFT(T)
                      }
                    }

                    function NJR(T, R) {
                      KFT(T, R.state)
                    }

                    function UJR(T) {
                      return {
                        queueSize: UR(T)
                      }
                    }

                    function HJR(T, R) {
                      HR(T, R.queueSize)
                    }

                    function WJR(T) {
                      return {
                        history: VFT(T)
                      }
                    }

                    function qJR(T, R) {
                      XFT(T, R.history)
                    }

                    function zJR(T) {
                      return {
                        rid: UR(T),
                        rpcs: ZFT(T)
                      }
                    }

                    function FJR(T, R) {
                      HR(T, R.rid), JFT(T, R.rpcs)
                    }

                    function GJR(T) {
                      return {
                        connections: TeT(T)
                      }
                    }

                    function KJR(T, R) {
                      ReT(T, R.connections)
                    }

                    function VJR(T) {
                      return {
                        message: KR(T)
                      }
                    }

                    function XJR(T, R) {
                      YR(T, R.message)
                    }

                    function YJR(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "StateResponse", val: fJR(T)
                          };
                        case 1:
                          return {
                            tag: "ConnectionsResponse", val: kJR(T)
                          };
                        case 2:
                          return {
                            tag: "ActionResponse", val: gJR(T)
                          };
                        case 3:
                          return {
                            tag: "ConnectionsUpdated", val: GJR(T)
                          };
                        case 4:
                          return {
                            tag: "QueueUpdated", val: UJR(T)
                          };
                        case 5:
                          return {
                            tag: "StateUpdated", val: BJR(T)
                          };
                        case 6:
                          return {
                            tag: "WorkflowHistoryUpdated", val: WJR(T)
                          };
                        case 7:
                          return {
                            tag: "RpcsListResponse", val: zJR(T)
                          };
                        case 8:
                          return {
                            tag: "TraceQueryResponse", val: vJR(T)
                          };
                        case 9:
                          return {
                            tag: "QueueResponse", val: LJR(T)
                          };
                        case 10:
                          return {
                            tag: "WorkflowHistoryResponse", val: DJR(T)
                          };
                        case 11:
                          return {
                            tag: "Error", val: VJR(T)
                          };
                        case 12:
                          return {
                            tag: "Init", val: yJR(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function QJR(T, R) {
                      switch (R.tag) {
                        case "StateResponse": {
                          dR(T, 0), IJR(T, R.val);
                          break
                        }
                        case "ConnectionsResponse": {
                          dR(T, 1), xJR(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 2), $JR(T, R.val);
                          break
                        }
                        case "ConnectionsUpdated": {
                          dR(T, 3), KJR(T, R.val);
                          break
                        }
                        case "QueueUpdated": {
                          dR(T, 4), HJR(T, R.val);
                          break
                        }
                        case "StateUpdated": {
                          dR(T, 5), NJR(T, R.val);
                          break
                        }
                        case "WorkflowHistoryUpdated": {
                          dR(T, 6), qJR(T, R.val);
                          break
                        }
                        case "RpcsListResponse": {
                          dR(T, 7), FJR(T, R.val);
                          break
                        }
                        case "TraceQueryResponse": {
                          dR(T, 8), jJR(T, R.val);
                          break
                        }
                        case "QueueResponse": {
                          dR(T, 9), MJR(T, R.val);
                          break
                        }
                        case "WorkflowHistoryResponse": {
                          dR(T, 10), wJR(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 11), XJR(T, R.val);
                          break
                        }
                        case "Init": {
                          dR(T, 12), PJR(T, R.val);
                          break
                        }
                      }
                    }

                    function ZJR(T) {
                      return {
                        body: YJR(T)
                      }
                    }

                    function JJR(T, R) {
                      QJR(T, R.body)
                    }

                    function TT0(T) {
                      let R = new A0(new Uint8Array(Nk.initialBufferLength), Nk);
                      return JJR(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function RT0(T) {
                      let R = new A0(T, Nk),
                        a = ZJR(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function aT0(T) {
                      return {
                        state: E0(T)
                      }
                    }

                    function eT0(T, R) {
                      C0(T, R.state)
                    }

                    function tT0(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function rT0(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function hT0(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function iT0(T, R) {
                      HR(T, R.id)
                    }

                    function cT0(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function sT0(T, R) {
                      HR(T, R.id)
                    }

                    function oT0(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function nT0(T, R) {
                      HR(T, R.id)
                    }

                    function lT0(T) {
                      return {
                        id: UR(T),
                        startMs: UR(T),
                        endMs: UR(T),
                        limit: UR(T)
                      }
                    }

                    function AT0(T, R) {
                      HR(T, R.id), HR(T, R.startMs), HR(T, R.endMs), HR(T, R.limit)
                    }

                    function pT0(T) {
                      return {
                        id: UR(T),
                        limit: UR(T)
                      }
                    }

                    function _T0(T, R) {
                      HR(T, R.id), HR(T, R.limit)
                    }

                    function bT0(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function mT0(T, R) {
                      HR(T, R.id)
                    }

                    function uT0(T) {
                      return {
                        id: UR(T)
                      }
                    }

                    function yT0(T, R) {
                      HR(T, R.id)
                    }

                    function PT0(T) {
                      return {
                        id: UR(T),
                        table: KR(T),
                        limit: UR(T),
                        offset: UR(T)
                      }
                    }

                    function kT0(T, R) {
                      HR(T, R.id), YR(T, R.table), HR(T, R.limit), HR(T, R.offset)
                    }

                    function xT0(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "PatchStateRequest", val: aT0(T)
                          };
                        case 1:
                          return {
                            tag: "StateRequest", val: hT0(T)
                          };
                        case 2:
                          return {
                            tag: "ConnectionsRequest", val: cT0(T)
                          };
                        case 3:
                          return {
                            tag: "ActionRequest", val: tT0(T)
                          };
                        case 4:
                          return {
                            tag: "RpcsListRequest", val: oT0(T)
                          };
                        case 5:
                          return {
                            tag: "TraceQueryRequest", val: lT0(T)
                          };
                        case 6:
                          return {
                            tag: "QueueRequest", val: pT0(T)
                          };
                        case 7:
                          return {
                            tag: "WorkflowHistoryRequest", val: bT0(T)
                          };
                        case 8:
                          return {
                            tag: "DatabaseSchemaRequest", val: uT0(T)
                          };
                        case 9:
                          return {
                            tag: "DatabaseTableRowsRequest", val: PT0(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function fT0(T, R) {
                      switch (R.tag) {
                        case "PatchStateRequest": {
                          dR(T, 0), eT0(T, R.val);
                          break
                        }
                        case "StateRequest": {
                          dR(T, 1), iT0(T, R.val);
                          break
                        }
                        case "ConnectionsRequest": {
                          dR(T, 2), sT0(T, R.val);
                          break
                        }
                        case "ActionRequest": {
                          dR(T, 3), rT0(T, R.val);
                          break
                        }
                        case "RpcsListRequest": {
                          dR(T, 4), nT0(T, R.val);
                          break
                        }
                        case "TraceQueryRequest": {
                          dR(T, 5), AT0(T, R.val);
                          break
                        }
                        case "QueueRequest": {
                          dR(T, 6), _T0(T, R.val);
                          break
                        }
                        case "WorkflowHistoryRequest": {
                          dR(T, 7), mT0(T, R.val);
                          break
                        }
                        case "DatabaseSchemaRequest": {
                          dR(T, 8), yT0(T, R.val);
                          break
                        }
                        case "DatabaseTableRowsRequest": {
                          dR(T, 9), kT0(T, R.val);
                          break
                        }
                      }
                    }

                    function IT0(T) {
                      return {
                        body: xT0(T)
                      }
                    }

                    function gT0(T, R) {
                      fT0(T, R.body)
                    }

                    function $T0(T) {
                      let R = new A0(new Uint8Array(Uk.initialBufferLength), Uk);
                      return gT0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function vT0(T) {
                      let R = new A0(T, Uk),
                        a = IT0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function a2T(T) {
                      return E0(T)
                    }

                    function e2T(T, R) {
                      C0(T, R)
                    }

                    function $yT(T) {
                      return {
                        id: KR(T),
                        details: E0(T)
                      }
                    }

                    function jT0(T, R) {
                      YR(T, R.id), C0(T, R.details)
                    }

                    function t2T(T) {
                      return E0(T)
                    }

                    function r2T(T, R) {
                      C0(T, R)
                    }

                    function aeT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [$yT(T)];
                      for (let e = 1; e < R; e++) a[e] = $yT(T);
                      return a
                    }

                    function eeT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) jT0(T, R[a])
                    }

                    function h2T(T) {
                      return q0(T) ? a2T(T) : null
                    }

                    function i2T(T, R) {
                      if (z0(T, R !== null), R !== null) e2T(T, R)
                    }

                    function c2T(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [KR(T)];
                      for (let e = 1; e < R; e++) a[e] = KR(T);
                      return a
                    }

                    function s2T(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) YR(T, R[a])
                    }

                    function o2T(T) {
                      return q0(T) ? t2T(T) : null
                    }

                    function n2T(T, R) {
                      if (z0(T, R !== null), R !== null) r2T(T, R)
                    }

                    function ST0(T) {
                      return {
                        connections: aeT(T),
                        state: h2T(T),
                        isStateEnabled: q0(T),
                        rpcs: c2T(T),
                        isDatabaseEnabled: q0(T),
                        queueSize: UR(T),
                        workflowHistory: o2T(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function OT0(T, R) {
                      eeT(T, R.connections), i2T(T, R.state), z0(T, R.isStateEnabled), s2T(T, R.rpcs), z0(T, R.isDatabaseEnabled), HR(T, R.queueSize), n2T(T, R.workflowHistory), z0(T, R.isWorkflowEnabled)
                    }

                    function dT0(T) {
                      return {
                        rid: UR(T),
                        connections: aeT(T)
                      }
                    }

                    function ET0(T, R) {
                      HR(T, R.rid), eeT(T, R.connections)
                    }

                    function CT0(T) {
                      return {
                        rid: UR(T),
                        state: h2T(T),
                        isStateEnabled: q0(T)
                      }
                    }

                    function LT0(T, R) {
                      HR(T, R.rid), i2T(T, R.state), z0(T, R.isStateEnabled)
                    }

                    function MT0(T) {
                      return {
                        rid: UR(T),
                        output: E0(T)
                      }
                    }

                    function DT0(T, R) {
                      HR(T, R.rid), C0(T, R.output)
                    }

                    function wT0(T) {
                      return {
                        rid: UR(T),
                        payload: E0(T)
                      }
                    }

                    function BT0(T, R) {
                      HR(T, R.rid), C0(T, R.payload)
                    }

                    function vyT(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        createdAtMs: UR(T)
                      }
                    }

                    function NT0(T, R) {
                      HR(T, R.id), YR(T, R.name), HR(T, R.createdAtMs)
                    }

                    function UT0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [vyT(T)];
                      for (let e = 1; e < R; e++) a[e] = vyT(T);
                      return a
                    }

                    function HT0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) NT0(T, R[a])
                    }

                    function WT0(T) {
                      return {
                        size: UR(T),
                        maxSize: UR(T),
                        messages: UT0(T),
                        truncated: q0(T)
                      }
                    }

                    function qT0(T, R) {
                      HR(T, R.size), HR(T, R.maxSize), HT0(T, R.messages), z0(T, R.truncated)
                    }

                    function zT0(T) {
                      return {
                        rid: UR(T),
                        status: WT0(T)
                      }
                    }

                    function FT0(T, R) {
                      HR(T, R.rid), qT0(T, R.status)
                    }

                    function GT0(T) {
                      return {
                        rid: UR(T),
                        history: o2T(T),
                        isWorkflowEnabled: q0(T)
                      }
                    }

                    function KT0(T, R) {
                      HR(T, R.rid), n2T(T, R.history), z0(T, R.isWorkflowEnabled)
                    }

                    function VT0(T) {
                      return {
                        rid: UR(T),
                        schema: E0(T)
                      }
                    }

                    function XT0(T, R) {
                      HR(T, R.rid), C0(T, R.schema)
                    }

                    function YT0(T) {
                      return {
                        rid: UR(T),
                        result: E0(T)
                      }
                    }

                    function QT0(T, R) {
                      HR(T, R.rid), C0(T, R.result)
                    }

                    function ZT0(T) {
                      return {
                        state: a2T(T)
                      }
                    }

                    function JT0(T, R) {
                      e2T(T, R.state)
                    }

                    function TR0(T) {
                      return {
                        queueSize: UR(T)
                      }
                    }

                    function RR0(T, R) {
                      HR(T, R.queueSize)
                    }

                    function aR0(T) {
                      return {
                        history: t2T(T)
                      }
                    }

                    function eR0(T, R) {
                      r2T(T, R.history)
                    }

                    function tR0(T) {
                      return {
                        rid: UR(T),
                        rpcs: c2T(T)
                      }
                    }

                    function rR0(T, R) {
                      HR(T, R.rid), s2T(T, R.rpcs)
                    }

                    function hR0(T) {
                      return {
                        connections: aeT(T)
                      }
                    }

                    function iR0(T, R) {
                      eeT(T, R.connections)
                    }

                    function cR0(T) {
                      return {
                        message: KR(T)
                      }
                    }

                    function sR0(T, R) {
                      YR(T, R.message)
                    }

                    function oR0(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "StateResponse", val: CT0(T)
                          };
                        case 1:
                          return {
                            tag: "ConnectionsResponse", val: dT0(T)
                          };
                        case 2:
                          return {
                            tag: "ActionResponse", val: MT0(T)
                          };
                        case 3:
                          return {
                            tag: "ConnectionsUpdated", val: hR0(T)
                          };
                        case 4:
                          return {
                            tag: "QueueUpdated", val: TR0(T)
                          };
                        case 5:
                          return {
                            tag: "StateUpdated", val: ZT0(T)
                          };
                        case 6:
                          return {
                            tag: "WorkflowHistoryUpdated", val: aR0(T)
                          };
                        case 7:
                          return {
                            tag: "RpcsListResponse", val: tR0(T)
                          };
                        case 8:
                          return {
                            tag: "TraceQueryResponse", val: wT0(T)
                          };
                        case 9:
                          return {
                            tag: "QueueResponse", val: zT0(T)
                          };
                        case 10:
                          return {
                            tag: "WorkflowHistoryResponse", val: GT0(T)
                          };
                        case 11:
                          return {
                            tag: "Error", val: cR0(T)
                          };
                        case 12:
                          return {
                            tag: "Init", val: ST0(T)
                          };
                        case 13:
                          return {
                            tag: "DatabaseSchemaResponse", val: VT0(T)
                          };
                        case 14:
                          return {
                            tag: "DatabaseTableRowsResponse", val: YT0(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function nR0(T, R) {
                      switch (R.tag) {
                        case "StateResponse": {
                          dR(T, 0), LT0(T, R.val);
                          break
                        }
                        case "ConnectionsResponse": {
                          dR(T, 1), ET0(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 2), DT0(T, R.val);
                          break
                        }
                        case "ConnectionsUpdated": {
                          dR(T, 3), iR0(T, R.val);
                          break
                        }
                        case "QueueUpdated": {
                          dR(T, 4), RR0(T, R.val);
                          break
                        }
                        case "StateUpdated": {
                          dR(T, 5), JT0(T, R.val);
                          break
                        }
                        case "WorkflowHistoryUpdated": {
                          dR(T, 6), eR0(T, R.val);
                          break
                        }
                        case "RpcsListResponse": {
                          dR(T, 7), rR0(T, R.val);
                          break
                        }
                        case "TraceQueryResponse": {
                          dR(T, 8), BT0(T, R.val);
                          break
                        }
                        case "QueueResponse": {
                          dR(T, 9), FT0(T, R.val);
                          break
                        }
                        case "WorkflowHistoryResponse": {
                          dR(T, 10), KT0(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 11), sR0(T, R.val);
                          break
                        }
                        case "Init": {
                          dR(T, 12), OT0(T, R.val);
                          break
                        }
                        case "DatabaseSchemaResponse": {
                          dR(T, 13), XT0(T, R.val);
                          break
                        }
                        case "DatabaseTableRowsResponse": {
                          dR(T, 14), QT0(T, R.val);
                          break
                        }
                      }
                    }

                    function lR0(T) {
                      return {
                        body: oR0(T)
                      }
                    }

                    function AR0(T, R) {
                      nR0(T, R.body)
                    }

                    function pR0(T) {
                      let R = new A0(new Uint8Array(Uk.initialBufferLength), Uk);
                      return AR0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function _R0(T) {
                      let R = new A0(T, Uk),
                        a = lR0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function Xx(T, R) {
                      let a = new Uint8Array(T.length + R.length);
                      return a.set(T, 0), a.set(R, T.length), a
                    }

                    function Wi(T) {
                      let R = new Uint8Array(pA.KV.length + T.length);
                      return R.set(pA.KV, 0), R.set(T, pA.KV.length), R
                    }

                    function SyT(T) {
                      return T.slice(pA.KV.length)
                    }

                    function qi(T, R) {
                      if (T instanceof Uint8Array) return T;
                      if ((R ?? "text") === "binary") throw TypeError("Expected a Uint8Array when keyType is binary");
                      return m2T.encode(T)
                    }

                    function OyT(T, R) {
                      switch (R ?? "text") {
                        case "text":
                          return u2T.decode(T);
                        case "binary":
                          return T;
                        default:
                          throw TypeError("Invalid kv key type")
                      }
                    }

                    function wR0(T) {
                      if (typeof T === "string") return "text";
                      if (T instanceof Uint8Array) return "binary";
                      if (T instanceof ArrayBuffer) return "arrayBuffer";
                      throw TypeError("Invalid kv value")
                    }

                    function dyT(T, R) {
                      switch ((R == null ? void 0 : R.type) ?? wR0(T)) {
                        case "text":
                          if (typeof T !== "string") throw TypeError("Expected a string when type is text");
                          return m2T.encode(T);
                        case "arrayBuffer":
                          if (!(T instanceof ArrayBuffer)) throw TypeError("Expected an ArrayBuffer when type is arrayBuffer");
                          return new Uint8Array(T);
                        case "binary":
                          if (!(T instanceof Uint8Array)) throw TypeError("Expected a Uint8Array when type is binary");
                          return T;
                        default:
                          throw TypeError("Invalid kv value type")
                      }
                    }

                    function c4(T, R) {
                      switch ((R == null ? void 0 : R.type) ?? "text") {
                        case "text":
                          return u2T.decode(T);
                        case "arrayBuffer": {
                          let a = new Uint8Array(T.byteLength);
                          return a.set(T), a.buffer
                        }
                        case "binary":
                          return T;
                        default:
                          throw TypeError("Invalid kv value type")
                      }
                    }

                    function NR0() {
                      return Vx("actor-runtime")
                    }

                    function EyT(T) {
                      throw NR0().error({
                        msg: "unreachable",
                        value: `${T}`,
                        stack: Error().stack
                      }), new f1R(T)
                    }

                    function UR0(...T) {
                      let R = T.filter((r) => r !== void 0);
                      if (R.length === 0) return {
                        signal: void 0,
                        cleanup: () => {}
                      };
                      if (R.length === 1) return {
                        signal: R[0],
                        cleanup: () => {}
                      };
                      let a = new AbortController;
                      if (R.some((r) => r.aborted)) return a.abort(), {
                        signal: a.signal,
                        cleanup: () => {}
                      };
                      let e = () => {
                          for (let r of R) r.removeEventListener("abort", t)
                        },
                        t = () => {
                          a.abort(), e()
                        };
                      for (let r of R) r.addEventListener("abort", t, {
                        once: !0
                      });
                      return {
                        signal: a.signal,
                        cleanup: e
                      }
                    }

                    function WR0(T) {
                      return typeof T === "object" && T !== null && "~standard" in T
                    }

                    function qR0(T) {
                      if (y2T(T)) return !1;
                      return typeof T === "object" && T !== null && "message" in T && T.message !== void 0
                    }

                    function y2T(T) {
                      return typeof T === "object" && T !== null && "schema" in T && T.schema !== void 0
                    }

                    function P2T(T, R) {
                      if (!T) return !1;
                      return Object.prototype.hasOwnProperty.call(T, R)
                    }

                    function zR0(T) {
                      if (!T) return;
                      if (y2T(T)) return T.schema;
                      if (qR0(T)) return T.message;
                      if (typeof T === "object" && T !== null && "schema" in T && T.schema !== void 0) return T.schema;
                      if (typeof T === "object" && T !== null && "message" in T && T.message !== void 0) return T.message;
                      return T
                    }

                    function FR0(T) {
                      return typeof T === "object" && T !== null && "then" in T && typeof T.then === "function"
                    }

                    function k2T(T, R, a) {
                      let e = zR0(T == null ? void 0 : T[R]);
                      if (!e) return {
                        success: !0,
                        data: a
                      };
                      if (WR0(e)) {
                        let t = e["~standard"].validate(a);
                        if (FR0(t)) throw new v1R("async schema validation");
                        if (t.issues) return {
                          success: !1,
                          issues: [...t.issues]
                        };
                        return {
                          success: !0,
                          data: t.value
                        }
                      }
                      return {
                        success: !0,
                        data: a
                      }
                    }
                    class cS {
                      constructor(T) {
                        if (T) {
                          if ((T.keyMap || T._keyMap) && !T.useRecords) T.useRecords = !1, T.mapsAsObjects = !0;
                          if (T.useRecords === !1 && T.mapsAsObjects === void 0) T.mapsAsObjects = !0;
                          if (T.getStructures) T.getShared = T.getStructures;
                          if (T.getShared && !T.structures)(T.structures = []).uninitialized = !0;
                          if (T.keyMap) {
                            this.mapKey = new Map;
                            for (let [R, a] of Object.entries(T.keyMap)) this.mapKey.set(a, R)
                          }
                        }
                        Object.assign(this, T)
                      }
                      decodeKey(T) {
                        return this.keyMap ? this.mapKey.get(T) || T : T
                      }
                      encodeKey(T) {
                        return this.keyMap && this.keyMap.hasOwnProperty(T) ? this.keyMap[T] : T
                      }
                      encodeKeys(T) {
                        if (!this._keyMap) return T;
                        let R = new Map;
                        for (let [a, e] of Object.entries(T)) R.set(this._keyMap.hasOwnProperty(a) ? this._keyMap[a] : a, e);
                        return R
                      }
                      decodeKeys(T) {
                        if (!this._keyMap || T.constructor.name != "Map") return T;
                        if (!this._mapKey) {
                          this._mapKey = new Map;
                          for (let [a, e] of Object.entries(this._keyMap)) this._mapKey.set(e, a)
                        }
                        let R = {};
                        return T.forEach((a, e) => R[ii(this._mapKey.has(e) ? this._mapKey.get(e) : e)] = a), R
                      }
                      mapDecode(T, R) {
                        let a = this.decode(T);
                        if (this._keyMap) switch (a.constructor.name) {
                          case "Array":
                            return a.map((e) => this.decodeKeys(e))
                        }
                        return a
                      }
                      decode(T, R) {
                        if (L0) return v2T(() => {
                          return r1(), this ? this.decode(T, R) : cS.prototype.decode.call(DyT, T, R)
                        });
                        _A = R > -1 ? R : T.length, CR = 0, tS = 0, zb = 0, rS = null, eb = teT, Oa = null, L0 = T;
                        try {
                          St = T.dataView || (T.dataView = new DataView(T.buffer, T.byteOffset, T.byteLength))
                        } catch (a) {
                          if (L0 = null, T instanceof Uint8Array) throw a;
                          throw Error("Source must be a Uint8Array or Buffer but was a " + (T && typeof T == "object" ? T.constructor.name : typeof T))
                        }
                        if (this instanceof cS) {
                          if (R8 = this, Ir = this.sharedValues && (this.pack ? Array(this.maxPrivatePackedValues || 16).concat(this.sharedValues) : this.sharedValues), this.structures) return ia = this.structures, s4();
                          else if (!ia || ia.length > 0) ia = []
                        } else {
                          if (R8 = DyT, !ia || ia.length > 0) ia = [];
                          Ir = null
                        }
                        return s4()
                      }
                      decodeMultiple(T, R) {
                        let a, e = 0;
                        try {
                          let t = T.length;
                          iS = !0;
                          let r = this ? this.decode(T, t) : ieT.decode(T, t);
                          if (R) {
                            if (R(r) === !1) return;
                            while (CR < t)
                              if (e = CR, R(s4()) === !1) return
                          } else {
                            a = [r];
                            while (CR < t) e = CR, a.push(s4());
                            return a
                          }
                        } catch (t) {
                          throw t.lastPosition = e, t.values = a, t
                        } finally {
                          iS = !1, r1()
                        }
                      }
                    }

                    function s4() {
                      try {
                        let T = r8();
                        if (Oa) {
                          if (CR >= Oa.postBundlePosition) {
                            let R = Error("Unexpected bundle position");
                            throw R.incomplete = !0, R
                          }
                          CR = Oa.postBundlePosition, Oa = null
                        }
                        if (CR == _A) {
                          if (ia = null, L0 = null, hi) hi = null
                        } else if (CR > _A) {
                          let R = Error("Unexpected end of CBOR data");
                          throw R.incomplete = !0, R
                        } else if (!iS) throw Error("Data read, but end of buffer not reached");
                        return T
                      } catch (T) {
                        if (r1(), T instanceof RangeError || T.message.startsWith("Unexpected end of buffer")) T.incomplete = !0;
                        throw T
                      }
                    }

                    function r8() {
                      let T = L0[CR++],
                        R = T >> 5;
                      if (T = T & 31, T > 23) switch (T) {
                        case 24:
                          T = L0[CR++];
                          break;
                        case 25:
                          if (R == 7) return a00();
                          T = St.getUint16(CR), CR += 2;
                          break;
                        case 26:
                          if (R == 7) {
                            let a = St.getFloat32(CR);
                            if (R8.useFloat32 > 2) {
                              let e = heT[(L0[CR] & 127) << 1 | L0[CR + 1] >> 7];
                              return CR += 4, (e * a + (a > 0 ? 0.5 : -0.5) >> 0) / e
                            }
                            return CR += 4, a
                          }
                          if (T = St.getUint32(CR), CR += 4, R === 1) return -1 - T;
                          break;
                        case 27:
                          if (R == 7) {
                            let a = St.getFloat64(CR);
                            return CR += 8, a
                          }
                          if (R > 1) {
                            if (St.getUint32(CR) > 0) throw Error("JavaScript does not support arrays, maps, or strings with length over 4294967295");
                            T = St.getUint32(CR + 4)
                          } else if (R8.int64AsNumber) T = St.getUint32(CR) * 4294967296, T += St.getUint32(CR + 4);
                          else T = St.getBigUint64(CR);
                          CR += 8;
                          break;
                        case 31:
                          switch (R) {
                            case 2:
                            case 3:
                              throw Error("Indefinite length not supported for byte or text strings");
                            case 4:
                              let a = [],
                                e, t = 0;
                              while ((e = r8()) != Zu) {
                                if (t >= GI) throw Error(`Array length exceeds ${GI}`);
                                a[t++] = e
                              }
                              return R == 4 ? a : R == 3 ? a.join("") : Buffer.concat(a);
                            case 5:
                              let r;
                              if (R8.mapsAsObjects) {
                                let h = {},
                                  i = 0;
                                if (R8.keyMap)
                                  while ((r = r8()) != Zu) {
                                    if (i++ >= Io) throw Error(`Property count exceeds ${Io}`);
                                    h[ii(R8.decodeKey(r))] = r8()
                                  } else
                                    while ((r = r8()) != Zu) {
                                      if (i++ >= Io) throw Error(`Property count exceeds ${Io}`);
                                      h[ii(r)] = r8()
                                    }
                                return h
                              } else {
                                if (_$) R8.mapsAsObjects = !0, _$ = !1;
                                let h = new Map;
                                if (R8.keyMap) {
                                  let i = 0;
                                  while ((r = r8()) != Zu) {
                                    if (i++ >= Io) throw Error(`Map size exceeds ${Io}`);
                                    h.set(R8.decodeKey(r), r8())
                                  }
                                } else {
                                  let i = 0;
                                  while ((r = r8()) != Zu) {
                                    if (i++ >= Io) throw Error(`Map size exceeds ${Io}`);
                                    h.set(r, r8())
                                  }
                                }
                                return h
                              }
                            case 7:
                              return Zu;
                            default:
                              throw Error("Invalid major type for indefinite length " + R)
                          }
                        default:
                          throw Error("Unknown token " + T)
                      }
                      switch (R) {
                        case 0:
                          return T;
                        case 1:
                          return ~T;
                        case 2:
                          return R00(T);
                        case 3:
                          if (zb >= CR) return rS.slice(CR - hS, (CR += T) - hS);
                          if (zb == 0 && _A < 140 && T < 32) {
                            let t = T < 16 ? I2T(T) : T00(T);
                            if (t != null) return t
                          }
                          return f2T(T);
                        case 4:
                          if (T >= GI) throw Error(`Array length exceeds ${GI}`);
                          let a = Array(T);
                          for (let t = 0; t < T; t++) a[t] = r8();
                          return a;
                        case 5:
                          if (T >= Io) throw Error(`Map size exceeds ${GI}`);
                          if (R8.mapsAsObjects) {
                            let t = {};
                            if (R8.keyMap)
                              for (let r = 0; r < T; r++) t[ii(R8.decodeKey(r8()))] = r8();
                            else
                              for (let r = 0; r < T; r++) t[ii(r8())] = r8();
                            return t
                          } else {
                            if (_$) R8.mapsAsObjects = !0, _$ = !1;
                            let t = new Map;
                            if (R8.keyMap)
                              for (let r = 0; r < T; r++) t.set(R8.decodeKey(r8()), r8());
                            else
                              for (let r = 0; r < T; r++) t.set(r8(), r8());
                            return t
                          }
                        case 6:
                          if (T >= LyT) {
                            let t = ia[T & 8191];
                            if (t) {
                              if (!t.read) t.read = e1(t);
                              return t.read()
                            }
                            if (T < 65536) {
                              if (T == VR0) {
                                let r = hP(),
                                  h = r8(),
                                  i = r8();
                                t1(h, i);
                                let c = {};
                                if (R8.keyMap)
                                  for (let s = 2; s < r; s++) {
                                    let A = R8.decodeKey(i[s - 2]);
                                    c[ii(A)] = r8()
                                  } else
                                    for (let s = 2; s < r; s++) {
                                      let A = i[s - 2];
                                      c[ii(A)] = r8()
                                    }
                                return c
                              } else if (T == KR0) {
                                let r = hP(),
                                  h = r8();
                                for (let i = 2; i < r; i++) t1(h++, r8());
                                return r8()
                              } else if (T == LyT) return c00();
                              if (R8.getShared) {
                                if (reT(), t = ia[T & 8191], t) {
                                  if (!t.read) t.read = e1(t);
                                  return t.read()
                                }
                              }
                            }
                          }
                          let e = Ea[T];
                          if (e)
                            if (e.handlesRead) return e(r8);
                            else return e(r8());
                          else {
                            let t = r8();
                            for (let r = 0; r < a1.length; r++) {
                              let h = a1[r](T, t);
                              if (h !== void 0) return h
                            }
                            return new OA(t, T)
                          }
                        case 7:
                          switch (T) {
                            case 20:
                              return !1;
                            case 21:
                              return !0;
                            case 22:
                              return null;
                            case 23:
                              return;
                            case 31:
                            default:
                              let t = (Ir || O_())[T];
                              if (t !== void 0) return t;
                              throw Error("Unknown token " + T)
                          }
                        default:
                          if (isNaN(T)) {
                            let t = Error("Unexpected end of CBOR data");
                            throw t.incomplete = !0, t
                          }
                          throw Error("Unknown CBOR token " + T)
                      }
                    }

                    function e1(T) {
                      if (!T) throw Error("Structure is required in record definition");

                      function R() {
                        let a = L0[CR++];
                        if (a = a & 31, a > 23) switch (a) {
                          case 24:
                            a = L0[CR++];
                            break;
                          case 25:
                            a = St.getUint16(CR), CR += 2;
                            break;
                          case 26:
                            a = St.getUint32(CR), CR += 4;
                            break;
                          default:
                            throw Error("Expected array header, but got " + L0[CR - 1])
                        }
                        let e = this.compiledReader;
                        while (e) {
                          if (e.propertyCount === a) return e(r8);
                          e = e.next
                        }
                        if (this.slowReads++ >= x2T) {
                          let r = this.length == a ? this : this.slice(0, a);
                          if (e = R8.keyMap ? Function("r", "return {" + r.map((h) => R8.decodeKey(h)).map((h) => wyT.test(h) ? ii(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}") : Function("r", "return {" + r.map((h) => wyT.test(h) ? ii(h) + ":r()" : "[" + JSON.stringify(h) + "]:r()").join(",") + "}"), this.compiledReader) e.next = this.compiledReader;
                          return e.propertyCount = a, this.compiledReader = e, e(r8)
                        }
                        let t = {};
                        if (R8.keyMap)
                          for (let r = 0; r < a; r++) t[ii(R8.decodeKey(this[r]))] = r8();
                        else
                          for (let r = 0; r < a; r++) t[ii(this[r])] = r8();
                        return t
                      }
                      return T.slowReads = 0, R
                    }

                    function ii(T) {
                      if (typeof T === "string") return T === "__proto__" ? "__proto_" : T;
                      if (typeof T === "number" || typeof T === "boolean" || typeof T === "bigint") return T.toString();
                      if (T == null) return T + "";
                      throw Error("Invalid property name type " + typeof T)
                    }

                    function JR0(T) {
                      ZR0 = !0, f2T = R(1), XR0 = R(2), YR0 = R(3), QR0 = R(5);

                      function R(a) {
                        return function(e) {
                          let t = eb[tS++];
                          if (t == null) {
                            if (Oa) return Fb(e);
                            let h = T(CR, _A, e, L0);
                            if (typeof h == "string") t = h, eb = teT;
                            else if (eb = h, tS = 1, zb = 1, t = eb[0], t === void 0) throw Error("Unexpected end of buffer")
                          }
                          let r = t.length;
                          if (r <= e) return CR += e, t;
                          return rS = t, hS = CR, zb = CR + r, CR += e, t.slice(0, e)
                        }
                      }
                    }

                    function Fb(T) {
                      let R;
                      if (T < 16) {
                        if (R = I2T(T)) return R
                      }
                      if (T > 64 && R1) return R1.decode(L0.subarray(CR, CR += T));
                      let a = CR + T,
                        e = [];
                      R = "";
                      while (CR < a) {
                        let t = L0[CR++];
                        if ((t & 128) === 0) e.push(t);
                        else if ((t & 224) === 192) {
                          let r = L0[CR++] & 63,
                            h = (t & 31) << 6 | r;
                          if (h < 128) e.push(65533);
                          else e.push(h)
                        } else if ((t & 240) === 224) {
                          let r = L0[CR++] & 63,
                            h = L0[CR++] & 63,
                            i = (t & 31) << 12 | r << 6 | h;
                          if (i < 2048 || i >= 55296 && i <= 57343) e.push(65533);
                          else e.push(i)
                        } else if ((t & 248) === 240) {
                          let r = L0[CR++] & 63,
                            h = L0[CR++] & 63,
                            i = L0[CR++] & 63,
                            c = (t & 7) << 18 | r << 12 | h << 6 | i;
                          if (c < 65536 || c > 1114111) e.push(65533);
                          else if (c > 65535) c -= 65536, e.push(c >>> 10 & 1023 | 55296), c = 56320 | c & 1023, e.push(c);
                          else e.push(c)
                        } else e.push(65533);
                        if (e.length >= 4096) R += le.apply(String, e), e.length = 0
                      }
                      if (e.length > 0) R += le.apply(String, e);
                      return R
                    }

                    function T00(T) {
                      let R = CR,
                        a = Array(T);
                      for (let e = 0; e < T; e++) {
                        let t = L0[CR++];
                        if ((t & 128) > 0) {
                          CR = R;
                          return
                        }
                        a[e] = t
                      }
                      return le.apply(String, a)
                    }

                    function I2T(T) {
                      if (T < 4)
                        if (T < 2)
                          if (T === 0) return "";
                          else {
                            let R = L0[CR++];
                            if ((R & 128) > 1) {
                              CR -= 1;
                              return
                            }
                            return le(R)
                          }
                      else {
                        let R = L0[CR++],
                          a = L0[CR++];
                        if ((R & 128) > 0 || (a & 128) > 0) {
                          CR -= 2;
                          return
                        }
                        if (T < 3) return le(R, a);
                        let e = L0[CR++];
                        if ((e & 128) > 0) {
                          CR -= 3;
                          return
                        }
                        return le(R, a, e)
                      } else {
                        let R = L0[CR++],
                          a = L0[CR++],
                          e = L0[CR++],
                          t = L0[CR++];
                        if ((R & 128) > 0 || (a & 128) > 0 || (e & 128) > 0 || (t & 128) > 0) {
                          CR -= 4;
                          return
                        }
                        if (T < 6)
                          if (T === 4) return le(R, a, e, t);
                          else {
                            let r = L0[CR++];
                            if ((r & 128) > 0) {
                              CR -= 5;
                              return
                            }
                            return le(R, a, e, t, r)
                          }
                        else if (T < 8) {
                          let r = L0[CR++],
                            h = L0[CR++];
                          if ((r & 128) > 0 || (h & 128) > 0) {
                            CR -= 6;
                            return
                          }
                          if (T < 7) return le(R, a, e, t, r, h);
                          let i = L0[CR++];
                          if ((i & 128) > 0) {
                            CR -= 7;
                            return
                          }
                          return le(R, a, e, t, r, h, i)
                        } else {
                          let r = L0[CR++],
                            h = L0[CR++],
                            i = L0[CR++],
                            c = L0[CR++];
                          if ((r & 128) > 0 || (h & 128) > 0 || (i & 128) > 0 || (c & 128) > 0) {
                            CR -= 8;
                            return
                          }
                          if (T < 10)
                            if (T === 8) return le(R, a, e, t, r, h, i, c);
                            else {
                              let s = L0[CR++];
                              if ((s & 128) > 0) {
                                CR -= 9;
                                return
                              }
                              return le(R, a, e, t, r, h, i, c, s)
                            }
                          else if (T < 12) {
                            let s = L0[CR++],
                              A = L0[CR++];
                            if ((s & 128) > 0 || (A & 128) > 0) {
                              CR -= 10;
                              return
                            }
                            if (T < 11) return le(R, a, e, t, r, h, i, c, s, A);
                            let l = L0[CR++];
                            if ((l & 128) > 0) {
                              CR -= 11;
                              return
                            }
                            return le(R, a, e, t, r, h, i, c, s, A, l)
                          } else {
                            let s = L0[CR++],
                              A = L0[CR++],
                              l = L0[CR++],
                              o = L0[CR++];
                            if ((s & 128) > 0 || (A & 128) > 0 || (l & 128) > 0 || (o & 128) > 0) {
                              CR -= 12;
                              return
                            }
                            if (T < 14)
                              if (T === 12) return le(R, a, e, t, r, h, i, c, s, A, l, o);
                              else {
                                let n = L0[CR++];
                                if ((n & 128) > 0) {
                                  CR -= 13;
                                  return
                                }
                                return le(R, a, e, t, r, h, i, c, s, A, l, o, n)
                              }
                            else {
                              let n = L0[CR++],
                                p = L0[CR++];
                              if ((n & 128) > 0 || (p & 128) > 0) {
                                CR -= 14;
                                return
                              }
                              if (T < 15) return le(R, a, e, t, r, h, i, c, s, A, l, o, n, p);
                              let _ = L0[CR++];
                              if ((_ & 128) > 0) {
                                CR -= 15;
                                return
                              }
                              return le(R, a, e, t, r, h, i, c, s, A, l, o, n, p, _)
                            }
                          }
                        }
                      }
                    }

                    function R00(T) {
                      return R8.copyBuffers ? Uint8Array.prototype.slice.call(L0, CR, CR += T) : L0.subarray(CR, CR += T)
                    }

                    function a00() {
                      let T = L0[CR++],
                        R = L0[CR++],
                        a = (T & 127) >> 2;
                      if (a === 31) {
                        if (R || T & 3) return NaN;
                        return T & 128 ? -1 / 0 : 1 / 0
                      }
                      if (a === 0) {
                        let e = ((T & 3) << 8 | R) / 16777216;
                        return T & 128 ? -e : e
                      }
                      return o4[3] = T & 128 | (a >> 1) + 56, o4[2] = (T & 7) << 5 | R >> 3, o4[1] = R << 5, o4[0] = 0, g2T[0]
                    }
                    class OA {
                      constructor(T, R) {
                        this.value = T, this.tag = R
                      }
                    }

                    function Ju(T, R) {
                      if (typeof T === "string") return T + R;
                      if (T instanceof Array) return T.concat(R);
                      return Object.assign({}, T, R)
                    }

                    function O_() {
                      if (!Ir)
                        if (R8.getShared) reT();
                        else throw Error("No packed values available");
                      return Ir
                    }

                    function i00(T, R) {
                      let a = "get" + T.name.slice(0, -5),
                        e;
                      if (typeof T === "function") e = T.BYTES_PER_ELEMENT;
                      else T = null;
                      for (let t = 0; t < 2; t++) {
                        if (!t && e == 1) continue;
                        let r = e == 2 ? 1 : e == 4 ? 2 : e == 8 ? 3 : 0;
                        Ea[t ? R : R - 4] = e == 1 || t == r00 ? (h) => {
                          if (!T) throw Error("Could not find typed array for code " + R);
                          if (!R8.copyBuffers) {
                            if (e === 1 || e === 2 && !(h.byteOffset & 1) || e === 4 && !(h.byteOffset & 3) || e === 8 && !(h.byteOffset & 7)) return new T(h.buffer, h.byteOffset, h.byteLength >> r)
                          }
                          return new T(Uint8Array.prototype.slice.call(h, 0).buffer)
                        } : (h) => {
                          if (!T) throw Error("Could not find typed array for code " + R);
                          let i = new DataView(h.buffer, h.byteOffset, h.byteLength),
                            c = h.length >> r,
                            s = new T(c),
                            A = i[a];
                          for (let l = 0; l < c; l++) s[l] = A.call(i, l << r, t);
                          return s
                        }
                      }
                    }

                    function c00() {
                      let T = hP(),
                        R = CR + r8();
                      for (let e = 2; e < T; e++) {
                        let t = hP();
                        CR += t
                      }
                      let a = CR;
                      return CR = R, Oa = [Fb(hP()), Fb(hP())], Oa.position0 = 0, Oa.position1 = 0, Oa.postBundlePosition = CR, CR = a, r8()
                    }

                    function hP() {
                      let T = L0[CR++] & 31;
                      if (T > 23) switch (T) {
                        case 24:
                          T = L0[CR++];
                          break;
                        case 25:
                          T = St.getUint16(CR), CR += 2;
                          break;
                        case 26:
                          T = St.getUint32(CR), CR += 4;
                          break
                      }
                      return T
                    }

                    function reT() {
                      if (R8.getShared) {
                        let T = v2T(() => {
                            return L0 = null, R8.getShared()
                          }) || {},
                          R = T.structures || [];
                        if (R8.sharedVersion = T.version, Ir = R8.sharedValues = T.packedValues, ia === !0) R8.structures = ia = R;
                        else ia.splice.apply(ia, [0, R.length].concat(R))
                      }
                    }

                    function v2T(T) {
                      let R = _A,
                        a = CR,
                        e = tS,
                        t = hS,
                        r = zb,
                        h = rS,
                        i = eb,
                        c = hi,
                        s = Oa,
                        A = new Uint8Array(L0.slice(0, _A)),
                        l = ia,
                        o = R8,
                        n = iS,
                        p = T();
                      return _A = R, CR = a, tS = e, hS = t, zb = r, rS = h, eb = i, hi = c, Oa = s, L0 = A, iS = n, ia = l, R8 = o, St = new DataView(L0.buffer, L0.byteOffset, L0.byteLength), p
                    }

                    function r1() {
                      L0 = null, hi = null, ia = null
                    }

                    function WyT(T, R) {
                      if (T < 24) _R[aR++] = R | T;
                      else if (T < 256) _R[aR++] = R | 24, _R[aR++] = T;
                      else if (T < 65536) _R[aR++] = R | 25, _R[aR++] = T >> 8, _R[aR++] = T & 255;
                      else _R[aR++] = R | 26, b3.setUint32(aR, T), aR += 4
                    }
                    class ceT {
                      constructor(T, R, a) {
                        this.structures = T, this.packedValues = R, this.version = a
                      }
                    }

                    function ps(T) {
                      if (T < 24) _R[aR++] = 128 | T;
                      else if (T < 256) _R[aR++] = 152, _R[aR++] = T;
                      else if (T < 65536) _R[aR++] = 153, _R[aR++] = T >> 8, _R[aR++] = T & 255;
                      else _R[aR++] = 154, b3.setUint32(aR, T), aR += 4
                    }

                    function fz(T) {
                      if (T instanceof n00) return !0;
                      let R = T[Symbol.toStringTag];
                      return R === "Blob" || R === "File"
                    }

                    function bM(T, R) {
                      switch (typeof T) {
                        case "string":
                          if (T.length > 3) {
                            if (R.objectMap[T] > -1 || R.values.length >= R.maxValues) return;
                            let e = R.get(T);
                            if (e) {
                              if (++e.count == 2) R.values.push(T)
                            } else if (R.set(T, {
                                count: 1
                              }), R.samplingPackedValues) {
                              let t = R.samplingPackedValues.get(T);
                              if (t) t.count++;
                              else R.samplingPackedValues.set(T, {
                                count: 1
                              })
                            }
                          }
                          break;
                        case "object":
                          if (T)
                            if (T instanceof Array)
                              for (let e = 0, t = T.length; e < t; e++) bM(T[e], R);
                            else {
                              let e = !R.encoder.useRecords;
                              for (var a in T)
                                if (T.hasOwnProperty(a)) {
                                  if (e) bM(a, R);
                                  bM(T[a], R)
                                }
                            } break;
                        case "function":
                          console.log(T)
                      }
                    }

                    function as(T, R) {
                      if (!l00 && R > 1) T -= 4;
                      return {
                        tag: T,
                        encode: function(a, e) {
                          let t = a.byteLength,
                            r = a.byteOffset || 0,
                            h = a.buffer || a;
                          e(GO ? QU.from(h, r, t) : new Uint8Array(h, r, t))
                        }
                      }
                    }

                    function i1(T, R) {
                      let a = T.byteLength;
                      if (a < 24) _R[aR++] = 64 + a;
                      else if (a < 256) _R[aR++] = 88, _R[aR++] = a;
                      else if (a < 65536) _R[aR++] = 89, _R[aR++] = a >> 8, _R[aR++] = a & 255;
                      else _R[aR++] = 90, b3.setUint32(aR, a), aR += 4;
                      if (aR + a >= _R.length) R(aR + a);
                      _R.set(T.buffer ? T : new Uint8Array(T), aR), aR += a
                    }

                    function A00(T, R) {
                      let a, e = R.length * 2,
                        t = T.length - e;
                      R.sort((r, h) => r.offset > h.offset ? 1 : -1);
                      for (let r = 0; r < R.length; r++) {
                        let h = R[r];
                        h.id = r;
                        for (let i of h.references) T[i++] = r >> 8, T[i] = r & 255
                      }
                      while (a = R.pop()) {
                        let r = a.offset;
                        T.copyWithin(r + e, r, t), e -= 2;
                        let h = r + e;
                        T[h++] = 216, T[h++] = 28, t = r
                      }
                      return T
                    }

                    function qyT(T, R) {
                      b3.setUint32(qa.position + T, aR - qa.position - T + 1);
                      let a = qa;
                      qa = null, R(a[0]), R(a[1])
                    }

                    function b00(T) {
                      return E0(T)
                    }

                    function m00(T, R) {
                      C0(T, R)
                    }

                    function oeT(T) {
                      return E0(T)
                    }

                    function neT(T, R) {
                      C0(T, R)
                    }

                    function lp(T) {
                      return E0(T)
                    }

                    function Ap(T, R) {
                      C0(T, R)
                    }

                    function ZU(T) {
                      return ge(T)
                    }

                    function JU(T, R) {
                      $e(T, R)
                    }

                    function GyT(T) {
                      return {
                        key: ZU(T),
                        value: b00(T)
                      }
                    }

                    function u00(T, R) {
                      JU(T, R.key), m00(T, R.value)
                    }

                    function KO(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [GyT(T)];
                      for (let e = 1; e < R; e++) a[e] = GyT(T);
                      return a
                    }

                    function VO(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) u00(T, R[a])
                    }

                    function y00(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return "UNSET";
                        case 1:
                          return "OK";
                        case 2:
                          return "ERROR";
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function P00(T, R) {
                      switch (R) {
                        case "UNSET": {
                          dR(T, 0);
                          break
                        }
                        case "OK": {
                          dR(T, 1);
                          break
                        }
                        case "ERROR": {
                          dR(T, 2);
                          break
                        }
                      }
                    }

                    function TH(T) {
                      return q0(T) ? KR(T) : null
                    }

                    function RH(T, R) {
                      if (z0(T, R !== null), R !== null) YR(T, R)
                    }

                    function k00(T) {
                      return {
                        code: y00(T),
                        message: TH(T)
                      }
                    }

                    function x00(T, R) {
                      P00(T, R.code), RH(T, R.message)
                    }

                    function KyT(T) {
                      return {
                        traceId: oeT(T),
                        spanId: lp(T),
                        traceState: TH(T),
                        attributes: KO(T),
                        droppedAttributesCount: ge(T)
                      }
                    }

                    function f00(T, R) {
                      neT(T, R.traceId), Ap(T, R.spanId), RH(T, R.traceState), VO(T, R.attributes), $e(T, R.droppedAttributesCount)
                    }

                    function O2T(T) {
                      return q0(T) ? lp(T) : null
                    }

                    function d2T(T, R) {
                      if (z0(T, R !== null), R !== null) Ap(T, R)
                    }

                    function E2T(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [KyT(T)];
                      for (let e = 1; e < R; e++) a[e] = KyT(T);
                      return a
                    }

                    function C2T(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) f00(T, R[a])
                    }

                    function I00(T) {
                      return {
                        traceId: oeT(T),
                        spanId: lp(T),
                        parentSpanId: O2T(T),
                        name: ZU(T),
                        kind: ge(T),
                        traceState: TH(T),
                        flags: ge(T),
                        attributes: KO(T),
                        droppedAttributesCount: ge(T),
                        links: E2T(T),
                        droppedLinksCount: ge(T)
                      }
                    }

                    function g00(T, R) {
                      neT(T, R.traceId), Ap(T, R.spanId), d2T(T, R.parentSpanId), JU(T, R.name), $e(T, R.kind), RH(T, R.traceState), $e(T, R.flags), VO(T, R.attributes), $e(T, R.droppedAttributesCount), C2T(T, R.links), $e(T, R.droppedLinksCount)
                    }

                    function leT(T) {
                      return q0(T) ? k00(T) : null
                    }

                    function AeT(T, R) {
                      if (z0(T, R !== null), R !== null) x00(T, R)
                    }

                    function $00(T) {
                      return {
                        spanId: lp(T),
                        attributes: KO(T),
                        droppedAttributesCount: ge(T),
                        status: leT(T)
                      }
                    }

                    function v00(T, R) {
                      Ap(T, R.spanId), VO(T, R.attributes), $e(T, R.droppedAttributesCount), AeT(T, R.status)
                    }

                    function j00(T) {
                      return {
                        spanId: lp(T),
                        name: ZU(T),
                        attributes: KO(T),
                        droppedAttributesCount: ge(T)
                      }
                    }

                    function S00(T, R) {
                      Ap(T, R.spanId), JU(T, R.name), VO(T, R.attributes), $e(T, R.droppedAttributesCount)
                    }

                    function O00(T) {
                      return {
                        spanId: lp(T),
                        status: leT(T)
                      }
                    }

                    function d00(T, R) {
                      Ap(T, R.spanId), AeT(T, R.status)
                    }

                    function E00(T) {
                      return {
                        traceId: oeT(T),
                        spanId: lp(T),
                        parentSpanId: O2T(T),
                        name: ZU(T),
                        kind: ge(T),
                        startTimeUnixNs: Ws(T),
                        traceState: TH(T),
                        flags: ge(T),
                        attributes: KO(T),
                        droppedAttributesCount: ge(T),
                        links: E2T(T),
                        droppedLinksCount: ge(T),
                        status: leT(T)
                      }
                    }

                    function C00(T, R) {
                      neT(T, R.traceId), Ap(T, R.spanId), d2T(T, R.parentSpanId), JU(T, R.name), $e(T, R.kind), qs(T, R.startTimeUnixNs), RH(T, R.traceState), $e(T, R.flags), VO(T, R.attributes), $e(T, R.droppedAttributesCount), C2T(T, R.links), $e(T, R.droppedLinksCount), AeT(T, R.status)
                    }

                    function L00(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "SpanStart", val: I00(T)
                          };
                        case 1:
                          return {
                            tag: "SpanEvent", val: j00(T)
                          };
                        case 2:
                          return {
                            tag: "SpanUpdate", val: $00(T)
                          };
                        case 3:
                          return {
                            tag: "SpanEnd", val: O00(T)
                          };
                        case 4:
                          return {
                            tag: "SpanSnapshot", val: E00(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function M00(T, R) {
                      switch (R.tag) {
                        case "SpanStart": {
                          dR(T, 0), g00(T, R.val);
                          break
                        }
                        case "SpanEvent": {
                          dR(T, 1), S00(T, R.val);
                          break
                        }
                        case "SpanUpdate": {
                          dR(T, 2), v00(T, R.val);
                          break
                        }
                        case "SpanEnd": {
                          dR(T, 3), d00(T, R.val);
                          break
                        }
                        case "SpanSnapshot": {
                          dR(T, 4), C00(T, R.val);
                          break
                        }
                      }
                    }

                    function VyT(T) {
                      return {
                        timeOffsetNs: Ws(T),
                        body: L00(T)
                      }
                    }

                    function D00(T, R) {
                      qs(T, R.timeOffsetNs), M00(T, R.body)
                    }

                    function L2T(T) {
                      return {
                        prefix: ge(T),
                        bucketStartSec: Ws(T),
                        chunkId: ge(T),
                        recordIndex: ge(T)
                      }
                    }

                    function M2T(T, R) {
                      $e(T, R.prefix), qs(T, R.bucketStartSec), $e(T, R.chunkId), $e(T, R.recordIndex)
                    }

                    function w00(T) {
                      return q0(T) ? L2T(T) : null
                    }

                    function B00(T, R) {
                      if (z0(T, R !== null), R !== null) M2T(T, R)
                    }

                    function XyT(T) {
                      return {
                        spanId: lp(T),
                        startKey: L2T(T),
                        latestSnapshotKey: w00(T)
                      }
                    }

                    function N00(T, R) {
                      Ap(T, R.spanId), M2T(T, R.startKey), B00(T, R.latestSnapshotKey)
                    }

                    function U00(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [KR(T)];
                      for (let e = 1; e < R; e++) a[e] = KR(T);
                      return a
                    }

                    function H00(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) YR(T, R[a])
                    }

                    function W00(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [VyT(T)];
                      for (let e = 1; e < R; e++) a[e] = VyT(T);
                      return a
                    }

                    function q00(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) D00(T, R[a])
                    }

                    function z00(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [XyT(T)];
                      for (let e = 1; e < R; e++) a[e] = XyT(T);
                      return a
                    }

                    function F00(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) N00(T, R[a])
                    }

                    function s1(T) {
                      return {
                        baseUnixNs: Ws(T),
                        strings: U00(T),
                        records: W00(T),
                        activeSpans: z00(T)
                      }
                    }

                    function D2T(T, R) {
                      qs(T, R.baseUnixNs), H00(T, R.strings), q00(T, R.records), F00(T, R.activeSpans)
                    }

                    function YyT(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [s1(T)];
                      for (let e = 1; e < R; e++) a[e] = s1(T);
                      return a
                    }

                    function QyT(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) D2T(T, R[a])
                    }

                    function G00(T) {
                      return {
                        startTimeMs: Ws(T),
                        endTimeMs: Ws(T),
                        limit: ge(T),
                        clamped: q0(T),
                        baseChunks: YyT(T),
                        chunks: YyT(T)
                      }
                    }

                    function K00(T, R) {
                      qs(T, R.startTimeMs), qs(T, R.endTimeMs), $e(T, R.limit), z0(T, R.clamped), QyT(T, R.baseChunks), QyT(T, R.chunks)
                    }

                    function V00(T) {
                      let R = new A0(new Uint8Array(c1.initialBufferLength), c1);
                      return K00(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function X00(T) {
                      let R = new A0(T, c1),
                        a = G00(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function Y00(T) {
                      let R = new A0(new Uint8Array(o1.initialBufferLength), o1);
                      return D2T(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function Q00(T) {
                      let R = new A0(T, o1);
                      return s1(R)
                    }

                    function n1(T) {
                      return T instanceof Date || T instanceof Set || T instanceof Map || T instanceof WeakSet || T instanceof WeakMap || ArrayBuffer.isView(T)
                    }

                    function Z00(T) {
                      return T === null || typeof T !== "object" && typeof T !== "function" || T instanceof RegExp || T instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && T instanceof SharedArrayBuffer
                    }

                    function bw(T) {
                      return typeof T === "symbol"
                    }

                    function mw(T) {
                      return Object.prototype.toString.call(T) === "[object Object]"
                    }

                    function T90(T) {
                      return T !== null && typeof T === "object" && typeof T.next === "function"
                    }

                    function R90(T, R, a, e, t) {
                      let r = T?.next;
                      if (typeof r !== "function") return T;
                      if (R.name === "entries") T.next = function() {
                        let h = r.call(this);
                        if (h && h.done === !1) h.value[0] = t(h.value[0], R, h.value[0], e), h.value[1] = t(h.value[1], R, h.value[0], e);
                        return h
                      };
                      else if (R.name === "values") {
                        let h = a[peT].keys();
                        T.next = function() {
                          let i = r.call(this);
                          if (i && i.done === !1) i.value = t(i.value, R, h.next().value, e);
                          return i
                        }
                      } else T.next = function() {
                        let h = r.call(this);
                        if (h && h.done === !1) h.value = t(h.value, R, h.value, e);
                        return h
                      };
                      return T
                    }

                    function ZyT(T, R, a) {
                      if (T.isUnsubscribed) return !0;
                      if (R.ignoreSymbols && bw(a)) return !0;
                      if (R.ignoreUnderscores && typeof a === "string" && a.charAt(0) === "_") return !0;
                      let e = R.ignoreKeys;
                      if (e) return Array.isArray(e) ? e.includes(a) : e instanceof Set ? e.has(a) : !1;
                      return !1
                    }
                    class B2T {
                      constructor(T) {
                        this._equals = T, this._proxyCache = new WeakMap, this._pathCache = new WeakMap, this._allPathsCache = new WeakMap, this.isUnsubscribed = !1
                      }
                      _pathsEqual(T, R) {
                        if (!Array.isArray(T) || !Array.isArray(R)) return T === R;
                        return T.length === R.length && T.every((a, e) => a === R[e])
                      }
                      _getDescriptorCache() {
                        if (this._descriptorCache === void 0) this._descriptorCache = new WeakMap;
                        return this._descriptorCache
                      }
                      _getProperties(T) {
                        let R = this._getDescriptorCache(),
                          a = R.get(T);
                        if (a === void 0) a = {}, R.set(T, a);
                        return a
                      }
                      _getOwnPropertyDescriptor(T, R) {
                        if (this.isUnsubscribed) return Reflect.getOwnPropertyDescriptor(T, R);
                        let a = this._getProperties(T),
                          e = a[R];
                        if (e === void 0) e = Reflect.getOwnPropertyDescriptor(T, R), a[R] = e;
                        return e
                      }
                      getProxy(T, R, a, e) {
                        if (this.isUnsubscribed) return T;
                        let t = e === void 0 ? void 0 : T[e],
                          r = t ?? T;
                        this._pathCache.set(r, R);
                        let h = this._allPathsCache.get(r);
                        if (!h) h = [], this._allPathsCache.set(r, h);
                        if (!h.some((c) => this._pathsEqual(c, R))) h.push(R);
                        let i = this._proxyCache.get(r);
                        if (i === void 0) i = t === void 0 ? new Proxy(T, a) : T, this._proxyCache.set(r, i);
                        return i
                      }
                      getPath(T) {
                        return this.isUnsubscribed ? void 0 : this._pathCache.get(T)
                      }
                      getAllPaths(T) {
                        if (this.isUnsubscribed) return;
                        return this._allPathsCache.get(T)
                      }
                      isDetached(T, R) {
                        return !Object.is(T, Ot.get(R, this.getPath(T)))
                      }
                      defineProperty(T, R, a) {
                        if (!Reflect.defineProperty(T, R, a)) return !1;
                        if (!this.isUnsubscribed) this._getProperties(T)[R] = a;
                        return !0
                      }
                      setProperty(T, R, a, e, t) {
                        if (!this._equals(t, a) || !(R in T)) {
                          let r = !1,
                            h = T;
                          while (h) {
                            let i = Reflect.getOwnPropertyDescriptor(h, R);
                            if (i && "set" in i) {
                              r = !0;
                              break
                            }
                            h = Object.getPrototypeOf(h)
                          }
                          if (r) return Reflect.set(T, R, a, e);
                          return Reflect.set(T, R, a)
                        }
                        return !0
                      }
                      deleteProperty(T, R, a) {
                        if (Reflect.deleteProperty(T, R)) {
                          if (!this.isUnsubscribed) {
                            let e = this._getDescriptorCache().get(T);
                            if (e) delete e[R], this._pathCache.delete(a)
                          }
                          return !0
                        }
                        return !1
                      }
                      isSameDescriptor(T, R, a) {
                        let e = this._getOwnPropertyDescriptor(R, a);
                        return T !== void 0 && e !== void 0 && Object.is(T.value, e.value) && (T.writable || !1) === (e.writable || !1) && (T.enumerable || !1) === (e.enumerable || !1) && (T.configurable || !1) === (e.configurable || !1) && T.get === e.get && T.set === e.set
                      }
                      isGetInvariant(T, R) {
                        let a = this._getOwnPropertyDescriptor(T, R);
                        return a !== void 0 && a.configurable !== !0 && a.writable !== !0
                      }
                      unsubscribe() {
                        this._descriptorCache = null, this._pathCache = null, this._proxyCache = null, this._allPathsCache = null, this.isUnsubscribed = !0
                      }
                    }

                    function n4() {
                      return !0
                    }

                    function Ty(T, R) {
                      if (T === R) return !1;
                      return T.length !== R.length || T.some((a, e) => R[e] !== a)
                    }

                    function l4(T, R) {
                      if (T === R) return !1;
                      if (T.size !== R.size) return !0;
                      for (let a of T)
                        if (!R.has(a)) return !0;
                      return !1
                    }

                    function A4(T, R) {
                      if (T === R) return !1;
                      if (T.size !== R.size) return !0;
                      for (let [a, e] of T) {
                        let t = R.get(a);
                        if (t !== e || t === void 0 && !R.has(a)) return !0
                      }
                      return !1
                    }
                    class yn {
                      constructor(T, R, a, e) {
                        this._path = R, this._isChanged = !1, this._clonedCache = new Set, this._hasOnValidate = e, this._changes = e ? [] : null, this.clone = R === void 0 ? T : this._shallowClone(T)
                      }
                      static isHandledMethod(T) {
                        return N2T.has(T)
                      }
                      _shallowClone(T) {
                        let R = T;
                        if (mw(T)) R = {
                          ...T
                        };
                        else if (pv(T) || ArrayBuffer.isView(T)) R = [...T];
                        else if (T instanceof Date) R = new Date(T);
                        else if (T instanceof Set) R = new Set([...T].map((a) => this._shallowClone(a)));
                        else if (T instanceof Map) {
                          R = new Map;
                          for (let [a, e] of T.entries()) R.set(a, this._shallowClone(e))
                        }
                        return this._clonedCache.add(R), R
                      }
                      preferredThisArg(T, R, a, e) {
                        if (T) {
                          if (pv(e)) this._onIsChanged = U2T[R];
                          else if (e instanceof Set) this._onIsChanged = q2T[R];
                          else if (e instanceof Map) this._onIsChanged = z2T[R];
                          return e
                        }
                        return a
                      }
                      update(T, R, a) {
                        let e = Ot.after(T, this._path);
                        if (R !== "length") {
                          let t = this.clone;
                          if (Ot.walk(e, (r) => {
                              if (t?.[r]) {
                                if (!this._clonedCache.has(t[r])) t[r] = this._shallowClone(t[r]);
                                t = t[r]
                              }
                            }), this._hasOnValidate) this._changes.push({
                            path: e,
                            property: R,
                            previous: a
                          });
                          if (t?.[R]) t[R] = a
                        }
                        this._isChanged = !0
                      }
                      undo(T) {
                        let R;
                        for (let a = this._changes.length - 1; a !== -1; a--) R = this._changes[a], Ot.get(T, R.path)[R.property] = R.previous
                      }
                      isChanged(T, R) {
                        return this._onIsChanged === void 0 ? this._isChanged : this._onIsChanged(this.clone, T)
                      }
                      isPathApplicable(T) {
                        return Ot.isRootPath(this._path) || Ot.isSubPath(T, this._path)
                      }
                    }
                    class Bo {
                      constructor(T) {
                        this._stack = [], this._hasOnValidate = T
                      }
                      static isHandledType(T) {
                        return mw(T) || pv(T) || n1(T)
                      }
                      static isHandledMethod(T, R) {
                        if (mw(T)) return yn.isHandledMethod(R);
                        if (pv(T)) return l1.isHandledMethod(R);
                        if (T instanceof Set) return A1.isHandledMethod(R);
                        if (T instanceof Map) return p1.isHandledMethod(R);
                        return n1(T)
                      }
                      get isCloning() {
                        return this._stack.length > 0
                      }
                      start(T, R, a) {
                        let e = yn;
                        if (pv(T)) e = l1;
                        else if (T instanceof Date) e = F2T;
                        else if (T instanceof Set) e = A1;
                        else if (T instanceof Map) e = p1;
                        else if (T instanceof WeakSet) e = G2T;
                        else if (T instanceof WeakMap) e = K2T;
                        this._stack.push(new e(T, R, a, this._hasOnValidate))
                      }
                      update(T, R, a) {
                        this._stack.at(-1).update(T, R, a)
                      }
                      preferredThisArg(T, R, a) {
                        let {
                          name: e
                        } = T, t = Bo.isHandledMethod(a, e);
                        return this._stack.at(-1).preferredThisArg(t, e, R, a)
                      }
                      isChanged(T, R) {
                        return this._stack.at(-1).isChanged(T, R)
                      }
                      isPartOfClone(T) {
                        return this._stack.at(-1).isPathApplicable(T)
                      }
                      undo(T) {
                        if (this._previousClone !== void 0) this._previousClone.undo(T)
                      }
                      stop() {
                        return this._previousClone = this._stack.pop(), this._previousClone.clone
                      }
                    }

                    function _1(T, R) {
                      let {
                        endpoint: a,
                        path: e = ["endpoint"],
                        namespace: t,
                        token: r
                      } = R, h;
                      try {
                        h = new URL(a)
                      } catch {
                        T.addIssue({
                          code: "custom",
                          message: `invalid URL: ${a}`,
                          path: e
                        });
                        return
                      }
                      if (h.search) {
                        T.addIssue({
                          code: "custom",
                          message: "endpoint cannot contain a query string",
                          path: e
                        });
                        return
                      }
                      if (h.hash) {
                        T.addIssue({
                          code: "custom",
                          message: "endpoint cannot contain a fragment",
                          path: e
                        });
                        return
                      }
                      let i = h.username ? decodeURIComponent(h.username) : void 0,
                        c = h.password ? decodeURIComponent(h.password) : void 0;
                      if (c && !i) {
                        T.addIssue({
                          code: "custom",
                          message: "endpoint cannot have a token without a namespace",
                          path: e
                        });
                        return
                      }
                      if (i && t) T.addIssue({
                        code: "custom",
                        message: "cannot specify namespace both in endpoint URL and as a separate config option",
                        path: ["namespace"]
                      });
                      if (c && r) T.addIssue({
                        code: "custom",
                        message: "cannot specify token both in endpoint URL and as a separate config option",
                        path: ["token"]
                      });
                      return h.username = "", h.password = "", {
                        endpoint: h.toString(),
                        namespace: i,
                        token: c
                      }
                    }

                    function rPT(T) {
                      if (typeof Buffer < "u") return Buffer.from(T).toString("base64");
                      let R = "",
                        a = T.byteLength;
                      for (let e = 0; e < a; e++) R += String.fromCharCode(T[e]);
                      return btoa(R)
                    }

                    function S90(T) {
                      if (T === "json") return "application/json";
                      else if (T === "cbor" || T === "bare") return "application/octet-stream";
                      else FO(T)
                    }

                    function meT(T, R, a, e, t, r, h) {
                      if (T === "json") {
                        let i = r(R),
                          c = t.parse(i);
                        return Q2T(c)
                      } else if (T === "cbor") {
                        let i = r(R),
                          c = t.parse(i);
                        return Gb(c)
                      } else if (T === "bare") {
                        if (!a) throw Error("VersionedDataHandler is required for 'bare' encoding");
                        if (e === void 0) throw Error("version is required for 'bare' encoding");
                        let i = h(R);
                        return a.serializeWithEmbeddedVersion(i, e)
                      } else FO(T)
                    }

                    function b1(T, R, a, e, t, r) {
                      if (T === "json") {
                        let h;
                        if (typeof R === "string") h = hPT(R);
                        else {
                          let c = new TextDecoder("utf-8").decode(R);
                          h = hPT(c)
                        }
                        let i = e.parse(h);
                        return t(i)
                      } else if (T === "cbor") {
                        FyT.default(typeof R !== "string", "buffer cannot be string for cbor encoding");
                        let h = kb(R),
                          i = e.parse(h);
                        return t(i)
                      } else if (T === "bare") {
                        if (FyT.default(typeof R !== "string", "buffer cannot be string for bare encoding"), !a) throw Error("VersionedDataHandler is required for 'bare' encoding");
                        let h = a.deserializeWithEmbeddedVersion(R);
                        return r(h)
                      } else FO(T)
                    }

                    function X2T(T) {
                      let R = "",
                        a = T.byteLength;
                      for (let e = 0; e < a; e++) R += String.fromCharCode(T[e]);
                      return btoa(R)
                    }

                    function E90(T) {
                      let R = new Uint8Array(T);
                      return X2T(R)
                    }

                    function Y2T(T) {
                      if (typeof Buffer < "u") return new Uint8Array(Buffer.from(T, "base64"));
                      let R = atob(T),
                        a = R.length,
                        e = new Uint8Array(a);
                      for (let t = 0; t < a; t++) e[t] = R.charCodeAt(t);
                      return e
                    }

                    function C90(T) {
                      return Y2T(T).buffer
                    }

                    function Q2T(T) {
                      return JSON.stringify(T, (R, a) => {
                        if (typeof a === "bigint") return ["$BigInt", a.toString()];
                        else if (a instanceof ArrayBuffer) return ["$ArrayBuffer", E90(a)];
                        else if (a instanceof Uint8Array) return ["$Uint8Array", X2T(a)];
                        if (Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].startsWith("$")) return ["$" + a[0], a[1]];
                        return a
                      })
                    }

                    function hPT(T) {
                      return JSON.parse(T, (R, a) => {
                        if (Array.isArray(a) && a.length === 2 && typeof a[0] === "string" && a[0].startsWith("$")) {
                          if (a[0] === "$BigInt") return BigInt(a[1]);
                          else if (a[0] === "$ArrayBuffer") return C90(a[1]);
                          else if (a[0] === "$Uint8Array") return Y2T(a[1]);
                          if (a[0].startsWith("$$")) return [a[0].substring(1), a[1]];
                          throw Error(`Unknown JSON encoding type: ${a[0]}. This may indicate corrupted data or a version mismatch.`)
                        }
                        return a
                      })
                    }

                    function L90(T) {
                      return {
                        actorId: KR(T),
                        connectionId: KR(T),
                        connectionToken: KR(T)
                      }
                    }

                    function M90(T, R) {
                      YR(T, R.actorId), YR(T, R.connectionId), YR(T, R.connectionToken)
                    }

                    function Z2T(T) {
                      return q0(T) ? E0(T) : null
                    }

                    function J2T(T, R) {
                      if (z0(T, R !== null), R !== null) C0(T, R)
                    }

                    function D90(T) {
                      return q0(T) ? UR(T) : null
                    }

                    function w90(T, R) {
                      if (z0(T, R !== null), R !== null) HR(T, R)
                    }

                    function B90(T) {
                      return {
                        group: KR(T),
                        code: KR(T),
                        message: KR(T),
                        metadata: Z2T(T),
                        actionId: D90(T)
                      }
                    }

                    function N90(T, R) {
                      YR(T, R.group), YR(T, R.code), YR(T, R.message), J2T(T, R.metadata), w90(T, R.actionId)
                    }

                    function U90(T) {
                      return {
                        id: UR(T),
                        output: E0(T)
                      }
                    }

                    function H90(T, R) {
                      HR(T, R.id), C0(T, R.output)
                    }

                    function W90(T) {
                      return {
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function q90(T, R) {
                      YR(T, R.name), C0(T, R.args)
                    }

                    function z90(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "Init", val: L90(T)
                          };
                        case 1:
                          return {
                            tag: "Error", val: B90(T)
                          };
                        case 2:
                          return {
                            tag: "ActionResponse", val: U90(T)
                          };
                        case 3:
                          return {
                            tag: "Event", val: W90(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function F90(T, R) {
                      switch (R.tag) {
                        case "Init": {
                          dR(T, 0), M90(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 1), N90(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 2), H90(T, R.val);
                          break
                        }
                        case "Event": {
                          dR(T, 3), q90(T, R.val);
                          break
                        }
                      }
                    }

                    function G90(T) {
                      return {
                        body: z90(T)
                      }
                    }

                    function K90(T, R) {
                      F90(T, R.body)
                    }

                    function V90(T) {
                      let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
                      return K90(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function X90(T) {
                      let R = new A0(T, Se),
                        a = G90(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function Y90(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function Q90(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function Z90(T) {
                      return {
                        eventName: KR(T),
                        subscribe: q0(T)
                      }
                    }

                    function J90(T, R) {
                      YR(T, R.eventName), z0(T, R.subscribe)
                    }

                    function T80(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "ActionRequest", val: Y90(T)
                          };
                        case 1:
                          return {
                            tag: "SubscriptionRequest", val: Z90(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function R80(T, R) {
                      switch (R.tag) {
                        case "ActionRequest": {
                          dR(T, 0), Q90(T, R.val);
                          break
                        }
                        case "SubscriptionRequest": {
                          dR(T, 1), J90(T, R.val);
                          break
                        }
                      }
                    }

                    function a80(T) {
                      return {
                        body: T80(T)
                      }
                    }

                    function e80(T, R) {
                      R80(T, R.body)
                    }

                    function t80(T) {
                      let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
                      return e80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function r80(T) {
                      let R = new A0(T, Se),
                        a = a80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function h80(T) {
                      return {
                        args: E0(T)
                      }
                    }

                    function i80(T, R) {
                      C0(T, R.args)
                    }

                    function c80(T) {
                      let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
                      return i80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function s80(T) {
                      let R = new A0(T, Se),
                        a = h80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function o80(T) {
                      return {
                        output: E0(T)
                      }
                    }

                    function n80(T, R) {
                      C0(T, R.output)
                    }

                    function l80(T) {
                      let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
                      return n80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function A80(T) {
                      let R = new A0(T, Se),
                        a = o80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function p80(T) {
                      return {
                        group: KR(T),
                        code: KR(T),
                        message: KR(T),
                        metadata: Z2T(T)
                      }
                    }

                    function _80(T, R) {
                      YR(T, R.group), YR(T, R.code), YR(T, R.message), J2T(T, R.metadata)
                    }

                    function b80(T) {
                      let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
                      return _80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function m80(T) {
                      let R = new A0(T, Se),
                        a = p80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function u80(T) {
                      return {
                        actorId: KR(T)
                      }
                    }

                    function y80(T, R) {
                      YR(T, R.actorId)
                    }

                    function P80(T) {
                      let R = new A0(new Uint8Array(Se.initialBufferLength), Se);
                      return y80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function k80(T) {
                      let R = new A0(T, Se),
                        a = u80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function x80(T) {
                      return {
                        actorId: KR(T),
                        connectionId: KR(T)
                      }
                    }

                    function f80(T, R) {
                      YR(T, R.actorId), YR(T, R.connectionId)
                    }

                    function TGT(T) {
                      return q0(T) ? E0(T) : null
                    }

                    function RGT(T, R) {
                      if (z0(T, R !== null), R !== null) C0(T, R)
                    }

                    function I80(T) {
                      return q0(T) ? UR(T) : null
                    }

                    function g80(T, R) {
                      if (z0(T, R !== null), R !== null) HR(T, R)
                    }

                    function $80(T) {
                      return {
                        group: KR(T),
                        code: KR(T),
                        message: KR(T),
                        metadata: TGT(T),
                        actionId: I80(T)
                      }
                    }

                    function v80(T, R) {
                      YR(T, R.group), YR(T, R.code), YR(T, R.message), RGT(T, R.metadata), g80(T, R.actionId)
                    }

                    function j80(T) {
                      return {
                        id: UR(T),
                        output: E0(T)
                      }
                    }

                    function S80(T, R) {
                      HR(T, R.id), C0(T, R.output)
                    }

                    function O80(T) {
                      return {
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function d80(T, R) {
                      YR(T, R.name), C0(T, R.args)
                    }

                    function E80(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "Init", val: x80(T)
                          };
                        case 1:
                          return {
                            tag: "Error", val: $80(T)
                          };
                        case 2:
                          return {
                            tag: "ActionResponse", val: j80(T)
                          };
                        case 3:
                          return {
                            tag: "Event", val: O80(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function C80(T, R) {
                      switch (R.tag) {
                        case "Init": {
                          dR(T, 0), f80(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 1), v80(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 2), S80(T, R.val);
                          break
                        }
                        case "Event": {
                          dR(T, 3), d80(T, R.val);
                          break
                        }
                      }
                    }

                    function L80(T) {
                      return {
                        body: E80(T)
                      }
                    }

                    function M80(T, R) {
                      C80(T, R.body)
                    }

                    function D80(T) {
                      let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
                      return M80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function w80(T) {
                      let R = new A0(T, Oe),
                        a = L80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function B80(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function N80(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function U80(T) {
                      return {
                        eventName: KR(T),
                        subscribe: q0(T)
                      }
                    }

                    function H80(T, R) {
                      YR(T, R.eventName), z0(T, R.subscribe)
                    }

                    function W80(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "ActionRequest", val: B80(T)
                          };
                        case 1:
                          return {
                            tag: "SubscriptionRequest", val: U80(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function q80(T, R) {
                      switch (R.tag) {
                        case "ActionRequest": {
                          dR(T, 0), N80(T, R.val);
                          break
                        }
                        case "SubscriptionRequest": {
                          dR(T, 1), H80(T, R.val);
                          break
                        }
                      }
                    }

                    function z80(T) {
                      return {
                        body: W80(T)
                      }
                    }

                    function F80(T, R) {
                      q80(T, R.body)
                    }

                    function G80(T) {
                      let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
                      return F80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function K80(T) {
                      let R = new A0(T, Oe),
                        a = z80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function V80(T) {
                      return {
                        args: E0(T)
                      }
                    }

                    function X80(T, R) {
                      C0(T, R.args)
                    }

                    function Y80(T) {
                      let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
                      return X80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function Q80(T) {
                      let R = new A0(T, Oe),
                        a = V80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function Z80(T) {
                      return {
                        output: E0(T)
                      }
                    }

                    function J80(T, R) {
                      C0(T, R.output)
                    }

                    function T30(T) {
                      let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
                      return J80(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function R30(T) {
                      let R = new A0(T, Oe),
                        a = Z80(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function a30(T) {
                      return {
                        group: KR(T),
                        code: KR(T),
                        message: KR(T),
                        metadata: TGT(T)
                      }
                    }

                    function e30(T, R) {
                      YR(T, R.group), YR(T, R.code), YR(T, R.message), RGT(T, R.metadata)
                    }

                    function t30(T) {
                      let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
                      return e30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function r30(T) {
                      let R = new A0(T, Oe),
                        a = a30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function h30(T) {
                      return {
                        actorId: KR(T)
                      }
                    }

                    function i30(T, R) {
                      YR(T, R.actorId)
                    }

                    function c30(T) {
                      let R = new A0(new Uint8Array(Oe.initialBufferLength), Oe);
                      return i30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function s30(T) {
                      let R = new A0(T, Oe),
                        a = h30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function o30(T) {
                      return {
                        actorId: KR(T),
                        connectionId: KR(T)
                      }
                    }

                    function n30(T, R) {
                      YR(T, R.actorId), YR(T, R.connectionId)
                    }

                    function ueT(T) {
                      return q0(T) ? E0(T) : null
                    }

                    function yeT(T, R) {
                      if (z0(T, R !== null), R !== null) C0(T, R)
                    }

                    function l30(T) {
                      return q0(T) ? UR(T) : null
                    }

                    function A30(T, R) {
                      if (z0(T, R !== null), R !== null) HR(T, R)
                    }

                    function p30(T) {
                      return {
                        group: KR(T),
                        code: KR(T),
                        message: KR(T),
                        metadata: ueT(T),
                        actionId: l30(T)
                      }
                    }

                    function _30(T, R) {
                      YR(T, R.group), YR(T, R.code), YR(T, R.message), yeT(T, R.metadata), A30(T, R.actionId)
                    }

                    function b30(T) {
                      return {
                        id: UR(T),
                        output: E0(T)
                      }
                    }

                    function m30(T, R) {
                      HR(T, R.id), C0(T, R.output)
                    }

                    function u30(T) {
                      return {
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function y30(T, R) {
                      YR(T, R.name), C0(T, R.args)
                    }

                    function P30(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "Init", val: o30(T)
                          };
                        case 1:
                          return {
                            tag: "Error", val: p30(T)
                          };
                        case 2:
                          return {
                            tag: "ActionResponse", val: b30(T)
                          };
                        case 3:
                          return {
                            tag: "Event", val: u30(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function k30(T, R) {
                      switch (R.tag) {
                        case "Init": {
                          dR(T, 0), n30(T, R.val);
                          break
                        }
                        case "Error": {
                          dR(T, 1), _30(T, R.val);
                          break
                        }
                        case "ActionResponse": {
                          dR(T, 2), m30(T, R.val);
                          break
                        }
                        case "Event": {
                          dR(T, 3), y30(T, R.val);
                          break
                        }
                      }
                    }

                    function x30(T) {
                      return {
                        body: P30(T)
                      }
                    }

                    function f30(T, R) {
                      k30(T, R.body)
                    }

                    function I30(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return f30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function g30(T) {
                      let R = new A0(T, W3),
                        a = x30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function $30(T) {
                      return {
                        id: UR(T),
                        name: KR(T),
                        args: E0(T)
                      }
                    }

                    function v30(T, R) {
                      HR(T, R.id), YR(T, R.name), C0(T, R.args)
                    }

                    function j30(T) {
                      return {
                        eventName: KR(T),
                        subscribe: q0(T)
                      }
                    }

                    function S30(T, R) {
                      YR(T, R.eventName), z0(T, R.subscribe)
                    }

                    function O30(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "ActionRequest", val: $30(T)
                          };
                        case 1:
                          return {
                            tag: "SubscriptionRequest", val: j30(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function d30(T, R) {
                      switch (R.tag) {
                        case "ActionRequest": {
                          dR(T, 0), v30(T, R.val);
                          break
                        }
                        case "SubscriptionRequest": {
                          dR(T, 1), S30(T, R.val);
                          break
                        }
                      }
                    }

                    function E30(T) {
                      return {
                        body: O30(T)
                      }
                    }

                    function C30(T, R) {
                      d30(T, R.body)
                    }

                    function L30(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return C30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function M30(T) {
                      let R = new A0(T, W3),
                        a = E30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function D30(T) {
                      return {
                        args: E0(T)
                      }
                    }

                    function w30(T, R) {
                      C0(T, R.args)
                    }

                    function B30(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return w30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function N30(T) {
                      let R = new A0(T, W3),
                        a = D30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function U30(T) {
                      return {
                        output: E0(T)
                      }
                    }

                    function H30(T, R) {
                      C0(T, R.output)
                    }

                    function W30(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return H30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function q30(T) {
                      let R = new A0(T, W3),
                        a = U30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function z30(T) {
                      return q0(T) ? KR(T) : null
                    }

                    function F30(T, R) {
                      if (z0(T, R !== null), R !== null) YR(T, R)
                    }

                    function G30(T) {
                      return q0(T) ? q0(T) : null
                    }

                    function K30(T, R) {
                      if (z0(T, R !== null), R !== null) z0(T, R)
                    }

                    function V30(T) {
                      return q0(T) ? Ws(T) : null
                    }

                    function X30(T, R) {
                      if (z0(T, R !== null), R !== null) qs(T, R)
                    }

                    function Y30(T) {
                      return {
                        body: E0(T),
                        name: z30(T),
                        wait: G30(T),
                        timeout: V30(T)
                      }
                    }

                    function Q30(T, R) {
                      C0(T, R.body), F30(T, R.name), K30(T, R.wait), X30(T, R.timeout)
                    }

                    function Z30(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return Q30(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function J30(T) {
                      let R = new A0(T, W3),
                        a = Y30(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function Ta0(T) {
                      return {
                        status: KR(T),
                        response: ueT(T)
                      }
                    }

                    function Ra0(T, R) {
                      YR(T, R.status), yeT(T, R.response)
                    }

                    function aa0(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return Ra0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function ea0(T) {
                      let R = new A0(T, W3),
                        a = Ta0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function ta0(T) {
                      return {
                        group: KR(T),
                        code: KR(T),
                        message: KR(T),
                        metadata: ueT(T)
                      }
                    }

                    function ra0(T, R) {
                      YR(T, R.group), YR(T, R.code), YR(T, R.message), yeT(T, R.metadata)
                    }

                    function ha0(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return ra0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function ia0(T) {
                      let R = new A0(T, W3),
                        a = ta0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function ca0(T) {
                      return {
                        actorId: KR(T)
                      }
                    }

                    function sa0(T, R) {
                      YR(T, R.actorId)
                    }

                    function oa0(T) {
                      let R = new A0(new Uint8Array(W3.initialBufferLength), W3);
                      return sa0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function na0(T) {
                      let R = new A0(T, W3),
                        a = ca0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }
                    async function qa0(T) {
                      if (typeof T === "string") return T;
                      else if (T instanceof Blob) {
                        let R = await T.arrayBuffer();
                        return new Uint8Array(R)
                      } else if (T instanceof Uint8Array) return T;
                      else if (T instanceof ArrayBuffer || T instanceof SharedArrayBuffer) return new Uint8Array(T);
                      else throw new g1R
                    }

                    function oPT(T) {
                      return {
                        eventName: KR(T)
                      }
                    }

                    function za0(T, R) {
                      YR(T, R.eventName)
                    }

                    function Fa0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [oPT(T)];
                      for (let e = 1; e < R; e++) a[e] = oPT(T);
                      return a
                    }

                    function Ga0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) za0(T, R[a])
                    }

                    function nPT(T) {
                      return {
                        id: KR(T),
                        token: KR(T),
                        parameters: E0(T),
                        state: E0(T),
                        subscriptions: Fa0(T),
                        lastSeen: Ws(T)
                      }
                    }

                    function Ka0(T, R) {
                      YR(T, R.id), YR(T, R.token), C0(T, R.parameters), C0(T, R.state), Ga0(T, R.subscriptions), qs(T, R.lastSeen)
                    }

                    function tGT(T) {
                      return q0(T) ? E0(T) : null
                    }

                    function rGT(T, R) {
                      if (z0(T, R !== null), R !== null) C0(T, R)
                    }

                    function Va0(T) {
                      return {
                        action: KR(T),
                        args: tGT(T)
                      }
                    }

                    function Xa0(T, R) {
                      YR(T, R.action), rGT(T, R.args)
                    }

                    function Ya0(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "GenericPersistedScheduleEvent", val: Va0(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function Qa0(T, R) {
                      switch (R.tag) {
                        case "GenericPersistedScheduleEvent": {
                          dR(T, 0), Xa0(T, R.val);
                          break
                        }
                      }
                    }

                    function lPT(T) {
                      return {
                        eventId: KR(T),
                        timestamp: Ws(T),
                        kind: Ya0(T)
                      }
                    }

                    function Za0(T, R) {
                      YR(T, R.eventId), qs(T, R.timestamp), Qa0(T, R.kind)
                    }

                    function Ja0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [nPT(T)];
                      for (let e = 1; e < R; e++) a[e] = nPT(T);
                      return a
                    }

                    function Te0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) Ka0(T, R[a])
                    }

                    function Re0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [lPT(T)];
                      for (let e = 1; e < R; e++) a[e] = lPT(T);
                      return a
                    }

                    function ae0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) Za0(T, R[a])
                    }

                    function ee0(T) {
                      return {
                        input: tGT(T),
                        hasInitialized: q0(T),
                        state: E0(T),
                        connections: Ja0(T),
                        scheduledEvents: Re0(T)
                      }
                    }

                    function te0(T, R) {
                      rGT(T, R.input), z0(T, R.hasInitialized), C0(T, R.state), Te0(T, R.connections), ae0(T, R.scheduledEvents)
                    }

                    function re0(T) {
                      let R = new A0(new Uint8Array(m1.initialBufferLength), m1);
                      return te0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function he0(T) {
                      let R = new A0(T, m1),
                        a = ee0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function APT(T) {
                      return {
                        eventName: KR(T)
                      }
                    }

                    function ie0(T, R) {
                      YR(T, R.eventName)
                    }

                    function ce0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [APT(T)];
                      for (let e = 1; e < R; e++) a[e] = APT(T);
                      return a
                    }

                    function se0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) ie0(T, R[a])
                    }

                    function keT(T) {
                      return q0(T) ? E0(T) : null
                    }

                    function xeT(T, R) {
                      if (z0(T, R !== null), R !== null) C0(T, R)
                    }

                    function pPT(T) {
                      return {
                        id: KR(T),
                        token: KR(T),
                        parameters: E0(T),
                        state: E0(T),
                        subscriptions: ce0(T),
                        lastSeen: jA(T),
                        hibernatableRequestId: keT(T)
                      }
                    }

                    function oe0(T, R) {
                      YR(T, R.id), YR(T, R.token), C0(T, R.parameters), C0(T, R.state), se0(T, R.subscriptions), SA(T, R.lastSeen), xeT(T, R.hibernatableRequestId)
                    }

                    function ne0(T) {
                      return {
                        action: KR(T),
                        args: keT(T)
                      }
                    }

                    function le0(T, R) {
                      YR(T, R.action), xeT(T, R.args)
                    }

                    function Ae0(T) {
                      let R = T.offset;
                      switch (s3(T)) {
                        case 0:
                          return {
                            tag: "GenericPersistedScheduleEvent", val: ne0(T)
                          };
                        default:
                          throw T.offset = R, new I0(R, "invalid tag")
                      }
                    }

                    function pe0(T, R) {
                      switch (R.tag) {
                        case "GenericPersistedScheduleEvent": {
                          dR(T, 0), le0(T, R.val);
                          break
                        }
                      }
                    }

                    function _PT(T) {
                      return {
                        eventId: KR(T),
                        timestamp: jA(T),
                        kind: Ae0(T)
                      }
                    }

                    function _e0(T, R) {
                      YR(T, R.eventId), SA(T, R.timestamp), pe0(T, R.kind)
                    }

                    function bPT(T) {
                      return {
                        requestId: E0(T),
                        lastSeenTimestamp: jA(T),
                        msgIndex: jA(T)
                      }
                    }

                    function be0(T, R) {
                      C0(T, R.requestId), SA(T, R.lastSeenTimestamp), SA(T, R.msgIndex)
                    }

                    function me0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [pPT(T)];
                      for (let e = 1; e < R; e++) a[e] = pPT(T);
                      return a
                    }

                    function ue0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) oe0(T, R[a])
                    }

                    function ye0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [_PT(T)];
                      for (let e = 1; e < R; e++) a[e] = _PT(T);
                      return a
                    }

                    function Pe0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) _e0(T, R[a])
                    }

                    function ke0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [bPT(T)];
                      for (let e = 1; e < R; e++) a[e] = bPT(T);
                      return a
                    }

                    function xe0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) be0(T, R[a])
                    }

                    function fe0(T) {
                      return {
                        input: keT(T),
                        hasInitialized: q0(T),
                        state: E0(T),
                        connections: me0(T),
                        scheduledEvents: ye0(T),
                        hibernatableWebSockets: ke0(T)
                      }
                    }

                    function Ie0(T, R) {
                      xeT(T, R.input), z0(T, R.hasInitialized), C0(T, R.state), ue0(T, R.connections), Pe0(T, R.scheduledEvents), xe0(T, R.hibernatableWebSockets)
                    }

                    function ge0(T) {
                      let R = new A0(new Uint8Array(u1.initialBufferLength), u1);
                      return Ie0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function $e0(T) {
                      let R = new A0(T, u1),
                        a = fe0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function ve0(T) {
                      return VU(T, 4)
                    }

                    function je0(T, R) {
                      cGT(R.byteLength === 4), XU(T, R)
                    }

                    function Se0(T) {
                      return VU(T, 4)
                    }

                    function Oe0(T, R) {
                      cGT(R.byteLength === 4), XU(T, R)
                    }

                    function uw(T) {
                      return E0(T)
                    }

                    function yw(T, R) {
                      C0(T, R)
                    }

                    function mPT(T) {
                      return {
                        eventName: KR(T)
                      }
                    }

                    function de0(T, R) {
                      YR(T, R.eventName)
                    }

                    function Ee0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [mPT(T)];
                      for (let e = 1; e < R; e++) a[e] = mPT(T);
                      return a
                    }

                    function Ce0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) de0(T, R[a])
                    }

                    function Le0(T) {
                      let R = M8(T),
                        a = new Map;
                      for (let e = 0; e < R; e++) {
                        let t = T.offset,
                          r = KR(T);
                        if (a.has(r)) throw T.offset = t, new I0(t, "duplicated key");
                        a.set(r, KR(T))
                      }
                      return a
                    }

                    function Me0(T, R) {
                      D8(T, R.size);
                      for (let a of R) YR(T, a[0]), YR(T, a[1])
                    }

                    function De0(T) {
                      return {
                        id: KR(T),
                        parameters: uw(T),
                        state: uw(T),
                        subscriptions: Ee0(T),
                        gatewayId: ve0(T),
                        requestId: Se0(T),
                        serverMessageIndex: pw(T),
                        clientMessageIndex: pw(T),
                        requestPath: KR(T),
                        requestHeaders: Le0(T)
                      }
                    }

                    function we0(T, R) {
                      YR(T, R.id), yw(T, R.parameters), yw(T, R.state), Ce0(T, R.subscriptions), je0(T, R.gatewayId), Oe0(T, R.requestId), _w(T, R.serverMessageIndex), _w(T, R.clientMessageIndex), YR(T, R.requestPath), Me0(T, R.requestHeaders)
                    }

                    function Be0(T) {
                      let R = new A0(new Uint8Array(Wk.initialBufferLength), Wk);
                      return we0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function Ne0(T) {
                      let R = new A0(T, Wk),
                        a = De0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function hGT(T) {
                      return q0(T) ? uw(T) : null
                    }

                    function iGT(T, R) {
                      if (z0(T, R !== null), R !== null) yw(T, R)
                    }

                    function uPT(T) {
                      return {
                        eventId: KR(T),
                        timestamp: jA(T),
                        action: KR(T),
                        args: hGT(T)
                      }
                    }

                    function Ue0(T, R) {
                      YR(T, R.eventId), SA(T, R.timestamp), YR(T, R.action), iGT(T, R.args)
                    }

                    function He0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [uPT(T)];
                      for (let e = 1; e < R; e++) a[e] = uPT(T);
                      return a
                    }

                    function We0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) Ue0(T, R[a])
                    }

                    function qe0(T) {
                      return {
                        input: hGT(T),
                        hasInitialized: q0(T),
                        state: uw(T),
                        scheduledEvents: He0(T)
                      }
                    }

                    function ze0(T, R) {
                      iGT(T, R.input), z0(T, R.hasInitialized), yw(T, R.state), We0(T, R.scheduledEvents)
                    }

                    function Fe0(T) {
                      let R = new A0(new Uint8Array(Wk.initialBufferLength), Wk);
                      return ze0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function Ge0(T) {
                      let R = new A0(T, Wk),
                        a = qe0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function cGT(T, R) {
                      if (!T) throw Error(R ?? "Assertion failed")
                    }

                    function Ke0(T) {
                      return VU(T, 4)
                    }

                    function Ve0(T, R) {
                      nGT(R.byteLength === 4), XU(T, R)
                    }

                    function Xe0(T) {
                      return VU(T, 4)
                    }

                    function Ye0(T, R) {
                      nGT(R.byteLength === 4), XU(T, R)
                    }

                    function sS(T) {
                      return E0(T)
                    }

                    function oS(T, R) {
                      C0(T, R)
                    }

                    function yPT(T) {
                      return {
                        eventName: KR(T)
                      }
                    }

                    function Qe0(T, R) {
                      YR(T, R.eventName)
                    }

                    function Ze0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [yPT(T)];
                      for (let e = 1; e < R; e++) a[e] = yPT(T);
                      return a
                    }

                    function Je0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) Qe0(T, R[a])
                    }

                    function Tt0(T) {
                      let R = M8(T),
                        a = new Map;
                      for (let e = 0; e < R; e++) {
                        let t = T.offset,
                          r = KR(T);
                        if (a.has(r)) throw T.offset = t, new I0(t, "duplicated key");
                        a.set(r, KR(T))
                      }
                      return a
                    }

                    function Rt0(T, R) {
                      D8(T, R.size);
                      for (let a of R) YR(T, a[0]), YR(T, a[1])
                    }

                    function at0(T) {
                      return {
                        id: KR(T),
                        parameters: sS(T),
                        state: sS(T),
                        subscriptions: Ze0(T),
                        gatewayId: Ke0(T),
                        requestId: Xe0(T),
                        serverMessageIndex: pw(T),
                        clientMessageIndex: pw(T),
                        requestPath: KR(T),
                        requestHeaders: Tt0(T)
                      }
                    }

                    function et0(T, R) {
                      YR(T, R.id), oS(T, R.parameters), oS(T, R.state), Je0(T, R.subscriptions), Ve0(T, R.gatewayId), Ye0(T, R.requestId), _w(T, R.serverMessageIndex), _w(T, R.clientMessageIndex), YR(T, R.requestPath), Rt0(T, R.requestHeaders)
                    }

                    function tt0(T) {
                      let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
                      return et0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function rt0(T) {
                      let R = new A0(T, vi),
                        a = at0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function sGT(T) {
                      return q0(T) ? sS(T) : null
                    }

                    function oGT(T, R) {
                      if (z0(T, R !== null), R !== null) oS(T, R)
                    }

                    function PPT(T) {
                      return {
                        eventId: KR(T),
                        timestamp: jA(T),
                        action: KR(T),
                        args: sGT(T)
                      }
                    }

                    function ht0(T, R) {
                      YR(T, R.eventId), SA(T, R.timestamp), YR(T, R.action), oGT(T, R.args)
                    }

                    function it0(T) {
                      let R = M8(T);
                      if (R === 0) return [];
                      let a = [PPT(T)];
                      for (let e = 1; e < R; e++) a[e] = PPT(T);
                      return a
                    }

                    function ct0(T, R) {
                      D8(T, R.length);
                      for (let a = 0; a < R.length; a++) ht0(T, R[a])
                    }

                    function st0(T) {
                      return {
                        input: sGT(T),
                        hasInitialized: q0(T),
                        state: sS(T),
                        scheduledEvents: it0(T)
                      }
                    }

                    function ot0(T, R) {
                      oGT(T, R.input), z0(T, R.hasInitialized), oS(T, R.state), ct0(T, R.scheduledEvents)
                    }

                    function nt0(T) {
                      let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
                      return ot0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function lt0(T) {
                      let R = new A0(T, vi),
                        a = st0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function At0(T) {
                      return {
                        nextId: Ws(T),
                        size: ge(T)
                      }
                    }

                    function pt0(T, R) {
                      qs(T, R.nextId), $e(T, R.size)
                    }

                    function _t0(T) {
                      let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
                      return pt0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function bt0(T) {
                      let R = new A0(T, vi),
                        a = At0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function mt0(T) {
                      return q0(T) ? ge(T) : null
                    }

                    function ut0(T, R) {
                      if (z0(T, R !== null), R !== null) $e(T, R)
                    }

                    function kPT(T) {
                      return q0(T) ? jA(T) : null
                    }

                    function xPT(T, R) {
                      if (z0(T, R !== null), R !== null) SA(T, R)
                    }

                    function yt0(T) {
                      return q0(T) ? q0(T) : null
                    }

                    function Pt0(T, R) {
                      if (z0(T, R !== null), R !== null) z0(T, R)
                    }

                    function kt0(T) {
                      return {
                        name: KR(T),
                        body: sS(T),
                        createdAt: jA(T),
                        failureCount: mt0(T),
                        availableAt: kPT(T),
                        inFlight: yt0(T),
                        inFlightAt: kPT(T)
                      }
                    }

                    function xt0(T, R) {
                      YR(T, R.name), oS(T, R.body), SA(T, R.createdAt), ut0(T, R.failureCount), xPT(T, R.availableAt), Pt0(T, R.inFlight), xPT(T, R.inFlightAt)
                    }

                    function ft0(T) {
                      let R = new A0(new Uint8Array(vi.initialBufferLength), vi);
                      return xt0(R, T), new Uint8Array(R.view.buffer, R.view.byteOffset, R.offset)
                    }

                    function It0(T) {
                      let R = new A0(T, vi),
                        a = kt0(R);
                      if (R.offset < R.view.byteLength) throw new I0(R.offset, "remaining bytes");
                      return a
                    }

                    function nGT(T, R) {
                      if (!T) throw Error(R ?? "Assertion failed")
                    }

                    function P1(T) {
                      if (T.length === 0) return lGT;
                      return T.map((R) => {
                        if (R === "") return "\\0";
                        let a = R.replace(/\\/g, "\\\\");
                        return a = a.replace(/\//g, `\\${y1}`), a
                      }).join(y1)
                    }

                    function Ct0(T) {
                      if (T === void 0 || T === null || T === lGT) return [];
                      let R = [],
                        a = "",
                        e = !1,
                        t = !1;
                      for (let r = 0; r < T.length; r++) {
                        let h = T[r];
                        if (e) {
                          if (h === "0") t = !0;
                          else a += h;
                          e = !1
                        } else if (h === "\\") e = !0;
                        else if (h === y1) {
                          if (t) R.push(""), t = !1;
                          else R.push(a);
                          a = ""
                        } else a += h
                      }
                      if (e) R.push(a + "\\");
                      else if (t) R.push("");
                      else if (a !== "" || R.length > 0) R.push(a);
                      return R
                    }

                    function Bt0(T) {
                      if (!(T && Dt0(T) && T.name === "TypeError" && typeof T.message === "string")) return !1;
                      let {
                        message: R,
                        stack: a
                      } = T;
                      if (R === "Load failed") return a === void 0 || "__sentry_captured__" in T;
                      if (R.startsWith("error sending request for url")) return !0;
                      if (R === "Failed to fetch" || R.startsWith("Failed to fetch (") && R.endsWith(")")) return !0;
                      return wt0.has(R)
                    }
                    async function pGT(T, R) {
                      return new Promise((a, e) => {
                        R = {
                          ...R
                        }, R.onFailedAttempt ??= () => {}, R.shouldRetry ??= () => !0, R.retries ??= 10;
                        let t = Lt0.default.operation(R),
                          r = () => {
                            t.stop(), e(R.signal?.reason)
                          };
                        if (R.signal && !R.signal.aborted) R.signal.addEventListener("abort", r, {
                          once: !0
                        });
                        let h = () => {
                          R.signal?.removeEventListener("abort", r), t.stop()
                        };
                        t.attempt(async (i) => {
                          try {
                            let c = await T(i);
                            h(), a(c)
                          } catch (c) {
                            try {
                              if (!(c instanceof Error)) throw TypeError(`Non-error was thrown: "${c}". You should only throw errors.`);
                              if (c instanceof AGT) throw c.originalError;
                              if (c instanceof TypeError && !Bt0(c)) throw c;
                              if (IPT(c, i, R), !await R.shouldRetry(c)) t.stop(), e(c);
                              if (await R.onFailedAttempt(c), !t.retry(c)) throw t.mainError()
                            } catch (s) {
                              IPT(s, i, R), h(), e(s)
                            }
                          }
                        })
                      })
                    }

                    function k1(T, R) {
                      return T === "guard" && (R === "actor_ready_timeout" || R === "actor_runner_failed")
                    }
                    async function nS(T, R, a) {
                      g0().debug({
                        msg: "querying actor",
                        query: JSON.stringify(R)
                      });
                      let e;
                      if ("getForId" in R) {
                        let t = await a.getForId({
                          c: T,
                          name: R.getForId.name,
                          actorId: R.getForId.actorId
                        });
                        if (!t) throw new _yT(R.getForId.actorId);
                        e = t
                      } else if ("getForKey" in R) {
                        let t = await a.getWithKey({
                          c: T,
                          name: R.getForKey.name,
                          key: R.getForKey.key
                        });
                        if (!t) throw new _yT(`${R.getForKey.name}:${JSON.stringify(R.getForKey.key)}`);
                        e = t
                      } else if ("getOrCreateForKey" in R) e = {
                        actorId: (await a.getOrCreateWithKey({
                          c: T,
                          name: R.getOrCreateForKey.name,
                          key: R.getOrCreateForKey.key,
                          input: R.getOrCreateForKey.input,
                          region: R.getOrCreateForKey.region
                        })).actorId
                      };
                      else if ("create" in R) e = {
                        actorId: (await a.createActor({
                          c: T,
                          name: R.create.name,
                          key: R.create.key,
                          input: R.create.input,
                          region: R.create.region
                        })).actorId
                      };
                      else throw new mFT("Invalid query format");
                      return g0().debug({
                        msg: "actor query result",
                        actorId: e.actorId
                      }), {
                        actorId: e.actorId
                      }
                    }

                    function x1(T) {
                      if ("getForId" in T) return T.getForId.name;
                      if ("getForKey" in T) return T.getForKey.name;
                      if ("getOrCreateForKey" in T) return T.getOrCreateForKey.name;
                      if ("create" in T) return T.create.name;
                      throw new mFT("Invalid query format")
                    }

                    function zt0(T) {
                      return {
                        actorQuery: T
                      }
                    }

                    function feT(T) {
                      return "getForKey" in T || "getOrCreateForKey" in T
                    }
                    async function vl(T, R) {
                      if ("getForId" in T.actorQuery) return T.actorQuery.getForId.actorId;
                      if (!feT(T.actorQuery)) {
                        let {
                          actorId: e
                        } = await nS(void 0, T.actorQuery, R);
                        return e
                      }
                      if (T.resolvedActorId !== void 0) return T.resolvedActorId;
                      if (T.pendingResolve) return await T.pendingResolve;
                      let a = nS(void 0, T.actorQuery, R).then(({
                        actorId: e
                      }) => {
                        return T.resolvedActorId = e, T.pendingResolve = void 0, e
                      }).catch((e) => {
                        if (T.pendingResolve === a) T.pendingResolve = void 0;
                        throw e
                      });
                      return T.pendingResolve = a, await a
                    }

                    function Ft0(T, R) {
                      if (!feT(T.actorQuery)) return;
                      T.resolvedActorId = R, T.pendingResolve = void 0
                    }

                    function f1(T, R) {
                      return T === "actor" && (R === "not_found" || R.startsWith("destroyed_"))
                    }

                    function Gt0(T, R) {
                      let {
                        group: a,
                        code: e
                      } = HaT(R, g0(), {}, !0);
                      if (!f1(a, e)) return !1;
                      return bGT(T), !0
                    }

                    function bGT(T) {
                      if (!feT(T.actorQuery)) return;
                      T.resolvedActorId = void 0, T.pendingResolve = void 0
                    }
                    async function My(T, R, a) {
                      let e = !1;
                      while (!0) try {
                        return await R()
                      } catch (t) {
                        if (e || !Gt0(T, t)) throw t;
                        a == null || a(), e = !0
                      }
                    }
                    async function I1(T, R, a, e, t) {
                      let r = x1(e);
                      try {
                        let h = await t.getForId({
                          name: r,
                          actorId: a
                        });
                        if (h == null ? void 0 : h.error) return g0().info({
                          msg: "found actor scheduling error",
                          actorId: a,
                          error: h.error
                        }), new qt0(T, R, a, h.error)
                      } catch (h) {
                        g0().warn({
                          msg: "failed to fetch actor details for scheduling error check",
                          actorId: a,
                          error: _r(h)
                        })
                      }
                      return null
                    }

                    function Kt0(T) {
                      let [R, a] = T.split("#"), [e, t] = R.split(".");
                      if (!e || !t) {
                        g0().warn({
                          msg: "failed to parse close reason",
                          reason: T
                        });
                        return
                      }
                      return {
                        group: e,
                        code: t,
                        rayId: a
                      }
                    }

                    function Vt0(T) {
                      if (T instanceof Blob) return T.size;
                      if (T instanceof ArrayBuffer) return T.byteLength;
                      if (T instanceof Uint8Array) return T.byteLength;
                      if (typeof T === "string") return T.length;
                      FO(T)
                    }
                    async function IeT(T) {
                      g0().debug({
                        msg: "sending http request",
                        url: T.url,
                        encoding: T.encoding
                      });
                      let R, a;
                      if (T.method === "POST" || T.method === "PUT") Ut0.default(T.body !== void 0, "missing body"), R = S90(T.encoding), a = meT(T.encoding, T.body, T.requestVersionedDataHandler, T.requestVersion, T.requestZodSchema, T.requestToJson, T.requestToBare);
                      let e;
                      try {
                        e = await (T.customFetch ?? fetch)(new globalThis.Request(T.url, {
                          method: T.method,
                          headers: {
                            ...T.headers,
                            ...R ? {
                              "Content-Type": R
                            } : {},
                            "User-Agent": eYR()
                          },
                          body: a,
                          credentials: "include",
                          signal: T.signal
                        }))
                      } catch (t) {
                        throw new p4(`Request failed: ${t}`, {
                          cause: t
                        })
                      }
                      if (!e.ok) {
                        let t = await e.arrayBuffer(),
                          r = e.headers.get("content-type"),
                          h = e.headers.get("x-rivet-ray-id"),
                          i = (r == null ? void 0 : r.includes("application/json")) ? "json" : T.encoding;
                        try {
                          let c = b1(i, new Uint8Array(t), ga0, Ua0, (s) => s, (s) => ({
                            group: s.group,
                            code: s.code,
                            message: s.message,
                            metadata: s.metadata ? kb(new Uint8Array(s.metadata)) : void 0
                          }));
                          throw new nh(c.group, c.code, c.message, c.metadata)
                        } catch (c) {
                          if (c instanceof nh) throw c;
                          let s = new TextDecoder("utf-8", {
                            fatal: !1
                          }).decode(t);
                          if (h) throw new p4(`${e.statusText} (${e.status}) (Ray ID: ${h}):
${
s}
`);
                          else throw new p4(`${
e.statusText}
 (${
e.status}):
${
s}
`)
                        }
                      }
                      if (T.skipParseResponse) return;
                      try {
                        let t = new Uint8Array(await e.arrayBuffer());
                        return b1(T.encoding, t, T.responseVersionedDataHandler, T.responseZodSchema, T.responseFromJson, T.responseFromBare)
                      } catch (t) {
                        throw new p4(`Failed to parse response: ${
t}
`, {
                          cause: t
                        })
                      }
                    }

                    function mGT(T) {
                      async function R(a, e, t) {
                        let r = (t == null ? void 0 : t.wait) ?? !1,
                          h = t == null ? void 0 : t.timeout,
                          i = await IeT({
                            url: `http://actor/queue/${encodeURIComponent(a)}`,
                            method: "POST",
                            headers: {
                              [V2T]: T.encoding,
                              ...T.params !== void 0 ? {
                                [beT]: JSON.stringify(T.params)
                              } : {}
                            },
                            body: {
                              body: e,
                              wait: r,
                              timeout: h
                            },
                            encoding: T.encoding,
                            customFetch: T.customFetch,
                            signal: t == null ? void 0 : t.signal,
                            requestVersion: Hk,
                            requestVersionedDataHandler: fa0,
                            responseVersion: Hk,
                            responseVersionedDataHandler: Ia0,
                            requestZodSchema: Ba0,
                            responseZodSchema: Na0,
                            requestToJson: (c) => ({
                              ...c,
                              name: a
                            }),
                            requestToBare: (c) => ({
                              name: c.name ?? a,
                              body: KU(Gb(c.body)),
                              wait: c.wait ?? !1,
                              timeout: c.timeout !== void 0 ? BigInt(c.timeout) : null
                            }),
                            responseFromJson: (c) => {
                              if (c.response === void 0) return {
                                status: c.status
                              };
                              return {
                                status: c.status,
                                response: c.response
                              }
                            },
                            responseFromBare: (c) => {
                              if (c.response === null || c.response === void 0) return {
                                status: c.status
                              };
                              return {
                                status: c.status,
                                response: kb(new Uint8Array(c.response))
                              }
                            }
                          });
                        if (r) return i;
                        return
                      }
                      return {
                        send: R
                      }
                    }
                    async function Xt0(T, R, a, e, t) {
                      let r, h = t || {};
                      if (typeof e === "string") r = e;
                      else if (e instanceof URL) r = e.pathname + e.search;
                      else if (e instanceof Request) {
                        let i = new URL(e.url);
                        r = i.pathname + i.search;
                        let c = new Headers(e.headers),
                          s = new Headers((t == null ? void 0 : t.headers) || {}),
                          A = new Headers(c);
                        if (s.forEach((l, o) => {
                            A.set(o, l)
                          }), h = {
                            method: e.method,
                            body: e.body,
                            mode: e.mode,
                            credentials: e.credentials,
                            redirect: e.redirect,
                            referrer: e.referrer,
                            referrerPolicy: e.referrerPolicy,
                            integrity: e.integrity,
                            keepalive: e.keepalive,
                            signal: e.signal,
                            ...h,
                            headers: A
                          }, h.body) h.duplex = "half"
                      } else throw TypeError("Invalid input type for fetch");
                      try {
                        let {
                          actorId: i
                        } = await nS(void 0, R, T);
                        g0().debug({
                          msg: "found actor for raw http",
                          actorId: i
                        }), _GT.default(i, "Missing actor ID");
                        let c = r.startsWith("/") ? r.slice(1) : r,
                          s = new URL(`http://actor/request/${c}`),
                          A = new Headers(h.headers);
                        if (a) A.set(beT, JSON.stringify(a));
                        let l = new Request(s, {
                          ...h,
                          headers: A
                        });
                        return T.sendRequest(i, l)
                      } catch (i) {
                        let {
                          group: c,
                          code: s,
                          message: A,
                          metadata: l
                        } = HaT(i, g0(), {}, !0);
                        throw new nh(c, s, A, l)
                      }
                    }
                    async function Yt0(T, R, a, e, t) {
                      let {
                        actorId: r
                      } = await nS(void 0, R, T);
                      g0().debug({
                        msg: "found actor for action",
                        actorId: r
                      }), _GT.default(r, "Missing actor ID");
                      let h = "",
                        i = "";
                      if (e) {
                        let s = e.indexOf("?");
                        if (s !== -1) h = e.substring(0, s), i = e.substring(s);
                        else h = e;
                        if (h.startsWith("/")) h = h.slice(1)
                      }
                      let c = `${p90}${h}${i}`;
                      return g0().debug({
                        msg: "opening websocket",
                        actorId: r,
                        encoding: "bare",
                        path: c
                      }), await T.openWebSocket(c, r, "bare", a)
                    }

                    function Jt0(T, R = {}) {
                      let a = new Zt0(T, R.encoding);
                      return new Proxy(a, {
                        get: (e, t, r) => {
                          if (typeof t === "symbol" || t in e) {
                            let h = Reflect.get(e, t, r);
                            if (typeof h === "function") return h.bind(e);
                            return h
                          }
                          if (typeof t === "string") return {
                            get: (h, i) => {
                              return e.get(t, h, i)
                            },
                            getOrCreate: (h, i) => {
                              return e.getOrCreate(t, h, i)
                            },
                            getForId: (h, i) => {
                              return e.getForId(t, h, i)
                            },
                            create: async (h, i = {}) => {
                              return await e.create(t, h, i)
                            }
                          };
                          return
                        }
                      })
                    }

                    function KI(T) {
                      let R = new Map;
                      return new Proxy(T, {
                        get(a, e, t) {
                          if (typeof e === "symbol") return Reflect.get(a, e, t);
                          if (e === "constructor" || e in a) {
                            let r = Reflect.get(a, e, a);
                            if (typeof r === "function") return r.bind(a);
                            return r
                          }
                          if (typeof e === "string") {
                            if (e === "then") return;
                            let r = R.get(e);
                            if (!r) r = (...h) => a.action({
                              name: e,
                              args: h
                            }), R.set(e, r);
                            return r
                          }
                        },
                        has(a, e) {
                          if (typeof e === "string") return !0;
                          return Reflect.has(a, e)
                        },
                        getPrototypeOf(a) {
                          return Reflect.getPrototypeOf(a)
                        },
                        ownKeys(a) {
                          return Reflect.ownKeys(a)
                        },
                        getOwnPropertyDescriptor(a, e) {
                          let t = Reflect.getOwnPropertyDescriptor(a, e);
                          if (t) return t;
                          if (typeof e === "string") return {
                            configurable: !0,
                            enumerable: !1,
                            writable: !1,
                            value: (...r) => a.action({
                              name: e,
                              args: r
                            })
                          };
                          return
                        }
                      })
                    }

                    function er0(T, R) {
                      let a = _1(R, {
                        endpoint: T.endpoint,
                        path: ["endpoint"],
                        namespace: T.namespace,
                        token: T.token
                      });
                      return {
                        ...T,
                        endpoint: a == null ? void 0 : a.endpoint,
                        namespace: (a == null ? void 0 : a.namespace) ?? T.namespace ?? "default",
                        token: (a == null ? void 0 : a.token) ?? T.token
                      }
                    }

                    function m8() {
                      return Vx("remote-manager-driver")
                    }

                    function qk(T) {
                      return T.endpoint ?? "http://127.0.0.1:6420"
                    }
                    async function pp(T, R, a, e) {
                      let t = qk(T),
                        r = qaT(t, a, {
                          namespace: T.namespace
                        });
                      m8().debug({
                        msg: "making api call",
                        method: R,
                        url: r
                      });
                      let h = {
                        ...T.headers
                      };
                      if (T.token) h.Authorization = `Bearer ${T.token}`;
                      return await IeT({
                        method: R,
                        url: r,
                        headers: h,
                        body: e,
                        encoding: "json",
                        skipParseResponse: !1,
                        requestVersionedDataHandler: void 0,
                        requestVersion: void 0,
                        responseVersionedDataHandler: void 0,
                        responseVersion: void 0,
                        requestZodSchema: K.any(),
                        responseZodSchema: K.any(),
                        requestToJson: (i) => i,
                        requestToBare: (i) => i,
                        responseFromJson: (i) => i,
                        responseFromBare: (i) => i
                      })
                    }

                    function geT(T, R, a, e = "") {
                      let t = a !== void 0 ? `@${encodeURIComponent(a)}` : "",
                        r = `/gateway/${encodeURIComponent(R)}${t}${e}`;
                      return qaT(T, r)
                    }
                    async function rr0(T, R, a, e, t) {
                      let r = await gFT(),
                        h = qk(T),
                        i = geT(h, a, T.token, R);
                      m8().debug({
                        msg: "opening websocket to actor via guard",
                        actorId: a,
                        path: R,
                        guardUrl: i
                      });
                      let c = new r(i, PGT(T, e, t));
                      return c.binaryType = "arraybuffer", m8().debug({
                        msg: "websocket connection opened",
                        actorId: a
                      }), c
                    }

                    function PGT(T, R, a) {
                      let e = [];
                      if (e.push(b90), e.push(`${m90}${R}`), a) e.push(`${u90}${encodeURIComponent(JSON.stringify(a))}`);
                      return e
                    }
                    async function vPT(T, R, a) {
                      let e = new URL(a.url),
                        t = qk(T),
                        r = geT(t, R, T.token, `${e.pathname}${e.search}`),
                        h = null,
                        i = ir0(T, a, R);
                      if (a.method !== "GET" && a.method !== "HEAD") {
                        if (a.bodyUsed) throw Error("Request body has already been consumed");
                        let s = await a.arrayBuffer();
                        if (s.byteLength !== 0) h = s, i.delete("transfer-encoding"), i.set("content-length", String(h.byteLength))
                      }
                      let c = new Request(r, {
                        method: a.method,
                        headers: i,
                        body: h,
                        signal: a.signal
                      });
                      return hr0(await fetch(c))
                    }

                    function hr0(T) {
                      return new Response(T.body, T)
                    }

                    function ir0(T, R, a) {
                      let e = new Headers;
                      R.headers.forEach((t, r) => {
                        e.set(r, t)
                      });
                      for (let [t, r] of Object.entries(T.headers)) e.set(t, r);
                      if (T.token) e.set(_90, T.token);
                      return e
                    }
                    async function cr0(T, R, a) {
                      return pp(T, "GET", `/actors?actor_ids=${encodeURIComponent(a)}`)
                    }
                    async function sr0(T, R, a) {
                      let e = P1(a);
                      return pp(T, "GET", `/actors?name=${encodeURIComponent(R)}&key=${encodeURIComponent(e)}`)
                    }
                    async function or0(T, R) {
                      return pp(T, "GET", `/actors?name=${encodeURIComponent(R)}`)
                    }
                    async function nr0(T, R) {
                      return pp(T, "PUT", "/actors", R)
                    }
                    async function lr0(T, R) {
                      return pp(T, "POST", "/actors", R)
                    }
                    async function Ar0(T, R) {
                      return pp(T, "DELETE", `/actors/${encodeURIComponent(R)}`)
                    }
                    async function pr0(T) {
                      return pp(T, "GET", "/metadata")
                    }
                    async function _r0(T, R, a) {
                      return pp(T, "GET", `/actors/${encodeURIComponent(R)}/kv/keys/${encodeURIComponent(a)}`)
                    }
                    async function br0(T) {
                      let R = qk(T),
                        a = jPT.get(R);
                      if (a) return a;
                      let e = pGT(async () => {
                        m8().debug({
                          msg: "fetching metadata",
                          endpoint: R
                        });
                        let t = await pr0(T);
                        return m8().debug({
                          msg: "received metadata",
                          endpoint: R,
                          clientEndpoint: t.clientEndpoint
                        }), t
                      }, {
                        forever: !0,
                        minTimeout: 500,
                        maxTimeout: 15000,
                        onFailedAttempt: (t) => {
                          if (t.attemptNumber > 1) m8().warn({
                            msg: "failed to fetch metadata, retrying",
                            endpoint: R,
                            attempt: t.attemptNumber,
                            error: _r(t)
                          })
                        }
                      });
                      return jPT.set(R, e), e
                    }
                    async function mr0(T, R, a) {
                      let e = await gFT(),
                        t = {};
                      return {
                        onOpen: async (r, h) => {
                          if (m8().debug({
                              msg: "client websocket connected",
                              targetUrl: R
                            }), h.readyState !== 1) {
                            m8().warn({
                              msg: "client websocket not open on connection",
                              targetUrl: R,
                              readyState: h.readyState
                            });
                            return
                          }
                          let i = new e(R, a);
                          t.targetWs = i, t.connectPromise = new Promise((c, s) => {
                            i.addEventListener("open", () => {
                              if (m8().debug({
                                  msg: "target websocket connected",
                                  targetUrl: R
                                }), h.readyState !== 1) {
                                m8().warn({
                                  msg: "client websocket closed before target connected",
                                  targetUrl: R,
                                  clientReadyState: h.readyState
                                }), i.close(1001, "Client disconnected"), s(Error("Client disconnected"));
                                return
                              }
                              c()
                            }), i.addEventListener("error", (A) => {
                              m8().warn({
                                msg: "target websocket error during connection",
                                targetUrl: R
                              }), s(A)
                            })
                          }), t.targetWs.addEventListener("message", (c) => {
                            if (typeof c.data === "string" || c.data instanceof ArrayBuffer) h.send(c.data);
                            else if (c.data instanceof Blob) c.data.arrayBuffer().then((s) => {
                              h.send(s)
                            })
                          }), t.targetWs.addEventListener("close", (c) => {
                            m8().debug({
                              msg: "target websocket closed",
                              targetUrl: R,
                              code: c.code,
                              reason: c.reason
                            }), $z(h, c.code, c.reason)
                          }), t.targetWs.addEventListener("error", (c) => {
                            m8().error({
                              msg: "target websocket error",
                              targetUrl: R,
                              error: _r(c)
                            }), $z(h, 1011, "Target WebSocket error")
                          })
                        },
                        onMessage: async (r, h) => {
                          if (!t.targetWs || !t.connectPromise) {
                            m8().error({
                              msg: "websocket state not initialized",
                              targetUrl: R
                            });
                            return
                          }
                          try {
                            if (await t.connectPromise, t.targetWs.readyState === e.OPEN) t.targetWs.send(r.data);
                            else m8().warn({
                              msg: "target websocket not open",
                              targetUrl: R,
                              readyState: t.targetWs.readyState
                            })
                          } catch (i) {
                            m8().error({
                              msg: "failed to connect to target websocket",
                              targetUrl: R,
                              error: i
                            }), $z(h, 1011, "Failed to connect to target")
                          }
                        },
                        onClose: (r, h) => {
                          if (m8().debug({
                              msg: "client websocket closed",
                              targetUrl: R,
                              code: r.code,
                              reason: r.reason,
                              wasClean: r.wasClean
                            }), t.targetWs) {
                            if (t.targetWs.readyState === e.OPEN || t.targetWs.readyState === e.CONNECTING) t.targetWs.close(1000, r.reason || "Client disconnected")
                          }
                        },
                        onError: (r, h) => {
                          if (m8().error({
                              msg: "client websocket error",
                              targetUrl: R,
                              event: r
                            }), t.targetWs) {
                            if (t.targetWs.readyState === e.OPEN) t.targetWs.close(1011, "Client WebSocket error");
                            else if (t.targetWs.readyState === e.CONNECTING) t.targetWs.close()
                          }
                        }
                      }
                    }

                    function $z(T, R, a) {
                      if (T.readyState === 1) T.close(R, a);
                      else if ("close" in T && T.readyState === WebSocket.OPEN) T.close(R, a)
                    }

                    function VI(T) {
                      return {
                        actorId: T.actor_id,
                        name: T.name,
                        key: Ct0(T.key),
                        createTs: T.create_ts,
                        startTs: T.start_ts ?? null,
                        connectableTs: T.connectable_ts ?? null,
                        sleepTs: T.sleep_ts ?? null,
                        destroyTs: T.destroy_ts ?? null,
                        error: T.error ?? void 0
                      }
                    }

                    function yr0() {
                      return Vx("devtools")
                    }

                    function kr0(T) {
                      if (!window) {
                        yr0().warn("devtools not available outside browser environment");
                        return
                      }
                      if (!document.getElementById(SPT)) {
                        let R = document.createElement("script");
                        R.id = SPT, R.src = Pr0(), R.async = !0, document.head.appendChild(R)
                      }
                      window.__rivetkit = window.__rivetkit || [], window.__rivetkit.push(T)
                    }

                    function xr0(T) {
                      let R = T === void 0 ? {} : typeof T === "string" ? {
                          endpoint: T
                        } : T,
                        a = ar0.parse(R),
                        e = new ur0(a);
                      if (a.devtools) kr0(a);
                      return Jt0(e, a)
                    }

                    function NP(T, R) {
                      var a = {};
                      for (var e in T)
                        if (Object.prototype.hasOwnProperty.call(T, e) && R.indexOf(e) < 0) a[e] = T[e];
                      if (T != null && typeof Object.getOwnPropertySymbols === "function") {
                        for (var t = 0, e = Object.getOwnPropertySymbols(T); t < e.length; t++)
                          if (R.indexOf(e[t]) < 0 && Object.prototype.propertyIsEnumerable.call(T, e[t])) a[e[t]] = T[e[t]]
                      }
                      return a
                    }

                    function No(T, R) {
                      return (Array.isArray(R) ? R : [R]).some((a) => {
                        var e;
                        let t = ((e = T === null || T === void 0 ? void 0 : T.def) === null || e === void 0 ? void 0 : e.type) === fr0[a];
                        if (a === "ZodDiscriminatedUnion") return t && "discriminator" in T.def;
                        return t
                      })
                    }

                    function Ry(T) {
                      return T && "def" in T
                    }
                    class kGT {
                      constructor() {
                        this._map = new Map, this._idmap = new Map
                      }
                      add(T, ...R) {
                        let a = R[0];
                        if (this._map.set(T, a), a && typeof a === "object" && "id" in a) {
                          if (this._idmap.has(a.id)) throw Error(`ID ${a.id} already exists in the registry`);
                          this._idmap.set(a.id, T)
                        }
                        return this
                      }
                      clear() {
                        return this._map = new Map, this._idmap = new Map, this
                      }
                      remove(T) {
                        let R = this._map.get(T);
                        if (R && typeof R === "object" && "id" in R) this._idmap.delete(R.id);
                        return this._map.delete(T), this
                      }
                      get(T) {
                        let R = T._zod.parent;
                        if (R) {
                          let a = {
                            ...this.get(R) ?? {}
                          };
                          return delete a.id, {
                            ...a,
                            ...this._map.get(T)
                          }
                        }
                        return this._map.get(T)
                      }
                      has(T) {
                        return this._map.has(T)
                      }
                    }

                    function Ir0() {
                      return new kGT
                    }

                    function vz(T) {
                      return T === void 0
                    }

                    function gr0(T, R) {
                      let a = {};
                      return Object.entries(T).forEach(([e, t]) => {
                        if (!R.some((r) => r === e)) a[e] = t
                      }), a
                    }

                    function jz(T, R) {
                      let a = {};
                      return Object.entries(T).forEach(([e, t]) => {
                        if (!R(t, e)) a[e] = t
                      }), a
                    }
                    class Ho {
                      static collectMetadata(T, R) {
                        let a = this.getMetadataFromRegistry(T),
                          e = Object.assign(Object.assign({}, a === null || a === void 0 ? void 0 : a._internal), R === null || R === void 0 ? void 0 : R._internal),
                          t = Object.assign(Object.assign({}, a === null || a === void 0 ? void 0 : a.param), R === null || R === void 0 ? void 0 : R.param),
                          r = Object.assign(Object.assign(Object.assign(Object.assign({}, Object.keys(e).length > 0 ? {
                            _internal: e
                          } : {}), a), R), Object.keys(t).length > 0 ? {
                            param: t
                          } : {});
                        if (No(T, ["ZodOptional", "ZodNullable", "ZodDefault", "ZodPrefault", "ZodReadonly", "ZodNonOptional"]) && Ry(T._zod.def.innerType)) return this.collectMetadata(T._zod.def.innerType, r);
                        if (No(T, "ZodPipe")) {
                          let h = T._zod.def.in,
                            i = T._zod.def.out;
                          if (No(h, "ZodTransform") && Ry(i)) return this.collectMetadata(i, r);
                          if (Ry(h)) return this.collectMetadata(h, r)
                        }
                        return r
                      }
                      static getMetadata(T) {
                        return this.collectMetadata(T)
                      }
                      static getOpenApiMetadata(T) {
                        let R = this.collectMetadata(T),
                          a = R !== null && R !== void 0 ? R : {},
                          {
                            _internal: e
                          } = a;
                        return NP(a, ["_internal"])
                      }
                      static getInternalMetadata(T) {
                        var R;
                        return (R = this.collectMetadata(T)) === null || R === void 0 ? void 0 : R._internal
                      }
                      static getParamMetadata(T) {
                        let R = this.collectMetadata(T);
                        return Object.assign(Object.assign({}, R), {
                          param: Object.assign(Object.assign({}, (R === null || R === void 0 ? void 0 : R.description) ? {
                            description: R.description
                          } : {}), R === null || R === void 0 ? void 0 : R.param)
                        })
                      }
                      static buildSchemaMetadata(T) {
                        return jz(gr0(T, ["param", "_internal"]), vz)
                      }
                      static buildParameterMetadata(T) {
                        return jz(T, vz)
                      }
                      static applySchemaMetadata(T, R) {
                        return jz(Object.assign(Object.assign({}, T), this.buildSchemaMetadata(R)), vz)
                      }
                      static getRefId(T) {
                        var R;
                        return (R = this.getInternalMetadata(T)) === null || R === void 0 ? void 0 : R.refId
                      }
                      static unwrapChained(T) {
                        return this.unwrapUntil(T)
                      }
                      static getDefaultValue(T) {
                        var R;
                        let a = (R = this.unwrapUntil(T, "ZodDefault")) !== null && R !== void 0 ? R : this.unwrapUntil(T, "ZodPrefault");
                        return a === null || a === void 0 ? void 0 : a._zod.def.defaultValue
                      }
                      static unwrapUntil(T, R) {
                        if (R && No(T, R)) return T;
                        if (No(T, ["ZodOptional", "ZodNullable", "ZodDefault", "ZodPrefault", "ZodReadonly", "ZodNonOptional"]) && Ry(T._zod.def.innerType)) return this.unwrapUntil(T._zod.def.innerType, R);
                        if (No(T, "ZodPipe")) {
                          let a = T._zod.def.in,
                            e = T._zod.def.out;
                          if (No(a, "ZodTransform") && Ry(e)) return this.unwrapUntil(e, R);
                          if (Ry(a)) return this.unwrapUntil(a, R)
                        }
                        return R ? void 0 : T
                      }
                      static getMetadataFromInternalRegistry(T) {
                        return OPT.get(T)
                      }
                      static getMetadataFromRegistry(T) {
                        let R = this.getMetadataFromInternalRegistry(T),
                          a = T.meta();
                        if (!R) return a;
                        let {
                          _internal: e
                        } = R, t = NP(R, ["_internal"]), r = a !== null && a !== void 0 ? a : {}, {
                          id: h,
                          title: i
                        } = r, c = NP(r, ["id", "title"]);
                        return Object.assign(Object.assign(Object.assign({
                          _internal: Object.assign(Object.assign({}, h ? {
                            refId: h
                          } : {}), e)
                        }, t), i ? {
                          description: i
                        } : {}), c)
                      }
                      static setMetadataInRegistry(T, R) {
                        OPT.add(T, R)
                      }
                    }

                    function $o(T, R) {
                      let a = T[R];
                      if (typeof a !== "function") return;
                      T[R] = function(...e) {
                        let t = a.apply(this, e),
                          r = Ho.getMetadataFromRegistry(this);
                        if (r) Ho.setMetadataInRegistry(t, r);
                        return t
                      }
                    }

                    function $r0(T) {
                      if (typeof T.ZodType.prototype.openapi < "u") return;
                      T.ZodType.prototype.openapi = function(...R) {
                        let {
                          refId: a,
                          metadata: e,
                          options: t
                        } = vr0(...R), r = e !== null && e !== void 0 ? e : {}, {
                          param: h
                        } = r, i = NP(r, ["param"]), c = Ho.getMetadataFromRegistry(this), s = c !== null && c !== void 0 ? c : {}, {
                          _internal: A
                        } = s, l = NP(s, ["_internal"]), o = Object.assign(Object.assign(Object.assign({}, A), t), a ? {
                          refId: a
                        } : void 0), n = Object.assign(Object.assign(Object.assign({}, l), i), (l === null || l === void 0 ? void 0 : l.param) || h ? {
                          param: Object.assign(Object.assign({}, l === null || l === void 0 ? void 0 : l.param), h)
                        } : void 0), p = new this.constructor(this._def);

                        function _(b) {
                          Ho.setMetadataInRegistry(b, Object.assign(Object.assign({}, Object.keys(o).length > 0 ? {
                            _internal: o
                          } : void 0), n))
                        }
                        if (_(p), No(p, "ZodLazy")) _(this);
                        if (No(p, "ZodObject")) {
                          let b = Ho.getMetadataFromRegistry(p),
                            y = p.extend;
                          p.extend = function(...u) {
                            let P = y.apply(p, u),
                              k = b !== null && b !== void 0 ? b : {},
                              {
                                _internal: x
                              } = k,
                              f = NP(k, ["_internal"]);
                            return Ho.setMetadataInRegistry(P, {
                              _internal: {
                                extendedFrom: (x === null || x === void 0 ? void 0 : x.refId) ? {
                                  refId: x.refId,
                                  schema: p
                                } : x === null || x === void 0 ? void 0 : x.extendedFrom
                              }
                            }), P.openapi(f)
                          }, $o(p, "catchall")
                        }
                        $o(p, "optional"), $o(p, "nullable"), $o(p, "default"), $o(p, "transform"), $o(p, "refine"), $o(p, "length"), $o(p, "min"), $o(p, "max");
                        let m = p.meta;
                        return p.meta = function(...b) {
                          let y = m.apply(this, b);
                          if (b[0]) {
                            let u = Ho.getMetadataFromInternalRegistry(this);
                            if (u) Ho.setMetadataInRegistry(y, Object.assign(Object.assign({}, u), b[0]))
                          }
                          return y
                        }, p
                      }
                    }

                    function vr0(T, R, a) {
                      if (typeof T === "string") return {
                        refId: T,
                        metadata: R,
                        options: a
                      };
                      return {
                        refId: void 0,
                        metadata: T,
                        options: R
                      }
                    }
                    async function dr0(T, R) {
                      let a = await T.formData();
                      if (a) return Er0(a, R);
                      return {}
                    }

                    function Er0(T, R) {
                      let a = Object.create(null);
                      if (T.forEach((e, t) => {
                          if (!(R.all || t.endsWith("[]"))) a[t] = e;
                          else Cr0(a, t, e)
                        }), R.dot) Object.entries(a).forEach(([e, t]) => {
                        if (e.includes(".")) Lr0(a, e, t), delete a[e]
                      });
                      return a
                    }

                    function fGT(T, R) {
                      let a = this.buildAllMatchers(),
                        e = (t, r) => {
                          let h = a[t] || a[ta],
                            i = h[2][r];
                          if (i) return i;
                          let c = r.match(h[0]);
                          if (!c) return [
                            [], $eT
                          ];
                          let s = c.indexOf("", 1);
                          return [h[1][s], c]
                        };
                      return this.match = e, e(T, R)
                    }

                    function Ur0(T, R) {
                      if (T.length === 1) return R.length === 1 ? T < R ? -1 : 1 : -1;
                      if (R.length === 1) return 1;
                      if (T === _v || T === bv) return 1;
                      else if (R === _v || R === bv) return -1;
                      if (T === Pw) return 1;
                      else if (R === Pw) return -1;
                      return T.length === R.length ? T < R ? -1 : 1 : R.length - T.length
                    }

                    function gGT(T) {
                      return IGT[T] ??= new RegExp(T === "*" ? "" : `^${T.replace(/\/\*$|([.\\+*[^\]$()])/g,(R,a)=>a?`\\${a}`:"(?:|/.*)")}$`)
                    }

                    function zr0() {
                      IGT = Object.create(null)
                    }

                    function Fr0(T) {
                      let R = new Wr0,
                        a = [];
                      if (T.length === 0) return qr0;
                      let e = T.map((s) => [!/\*|\/:/.test(s[0]), ...s]).sort(([s, A], [l, o]) => s ? 1 : l ? -1 : A.length - o.length),
                        t = Object.create(null);
                      for (let s = 0, A = -1, l = e.length; s < l; s++) {
                        let [o, n, p] = e[s];
                        if (o) t[n] = [p.map(([m]) => [m, Object.create(null)]), $eT];
                        else A++;
                        let _;
                        try {
                          _ = R.insert(n, A, o)
                        } catch (m) {
                          throw m === Dy ? new iaT(n) : m
                        }
                        if (o) continue;
                        a[A] = p.map(([m, b]) => {
                          let y = Object.create(null);
                          b -= 1;
                          for (; b >= 0; b--) {
                            let [u, P] = _[b];
                            y[u] = P
                          }
                          return [m, y]
                        })
                      }
                      let [r, h, i] = R.buildRegExp();
                      for (let s = 0, A = a.length; s < A; s++)
                        for (let l = 0, o = a[s].length; l < o; l++) {
                          let n = a[s][l]?.[1];
                          if (!n) continue;
                          let p = Object.keys(n);
                          for (let _ = 0, m = p.length; _ < m; _++) n[p[_]] = i[n[p[_]]]
                        }
                      let c = [];
                      for (let s in h) c[s] = a[h[s]];
                      return [r, c, t]
                    }

                    function ay(T, R) {
                      if (!T) return;
                      for (let a of Object.keys(T).sort((e, t) => t.length - e.length))
                        if (gGT(a).test(R)) return [...T[a]];
                      return
                    }

                    function Pi0(T, R, a) {
                      let e = R,
                        t = R ? R.next : T.head,
                        r = new LeT(a, e, t, T);
                      return r.next === void 0 && (T.tail = r), r.prev === void 0 && (T.head = r), T.length++, r
                    }

                    function ki0(T, R) {
                      T.tail = new LeT(R, T.tail, void 0, T), T.head || (T.head = T.tail), T.length++
                    }

                    function xi0(T, R) {
                      T.head = new LeT(R, void 0, T.head, T), T.tail || (T.tail = T.head), T.length++
                    }

                    function nH(T) {
                      return xr0(T)
                    }

                    function Pi(T) {
                      if (T.includes("staging.ampcodedev.org")) return ic0;
                      return hc0
                    }

                    function lH(T) {
                      if (T.includes("staging.ampcodedev.org")) return sc0;
                      return cc0
                    }
                    async function RKT(T) {
                      let R = T.workerURL ?? Pi(T.ampURL),
                        a = await T.configService.getLatest(T.signal),
                        e = await a.secrets.getToken("apiKey", a.settings.url);
                      if (!e) throw Error("API key required. Please run `amp login` first.");
                      let t = await fetch(`${R}/threads/${T.threadID}/context-analysis`, {
                        method: "GET",
                        headers: {
                          Authorization: `Bearer ${e}`
                        },
                        signal: T.signal
                      });
                      if (!t.ok) {
                        let h = await t.text();
                        throw Error(`Context analysis request failed (${t.status}): ${h}`)
                      }
                      let r = await t.json();
                      if (!r.ok || !r.analysis) throw Error(r.error ?? "Invalid context analysis response from DTW");
                      return r.analysis
                    }
                    async function oc0(T) {
                      let R = lH(T.ampURL),
                        a = nH({
                          endpoint: R
                        }),
                        e = await T.configService.getLatest(T.signal),
                        t = await e.secrets.getToken("apiKey", e.settings.url);
                      if (!t) throw Error("API key required. Please run `amp login` first.");
                      let r = await a.threadActor.get([T.threadID]).fetch("/context-analysis", {
                        method: "GET",
                        headers: {
                          Authorization: `Bearer ${t}`
                        },
                        signal: T.signal
                      });
                      if (!r.ok) {
                        let i = await r.text();
                        throw Error(`Context analysis request failed (${r.status}): ${i}`)
                      }
                      let h = await r.json();
                      if (!h.ok || !h.analysis) throw Error(h.error ?? "Invalid context analysis response from DTW");
                      return h.analysis
                    }

                    function Ki(T, R = !1) {
                      if (R || T < 1000) return T.toLocaleString();
                      return `${(T/1000).toFixed(1)}k`
                    }

                    function lc0(T, R, a, e, t, r, h) {
                      return
                    }
                    async function eX0(T, R, a, e, t, r, h, i, c) {
                      r(t, T);
                      let s = await h(R, T);
                      try {
                        let A = e.v2 === !0;
                        nc0.write(oR.dim(A ? `Analyzing context tokens via v2 worker...
` : `Analyzing context tokens...
`));
                        let l = A ? await RKT({
                          ampURL: R.ampURL,
                          configService: s.configService,
                          threadID: a,
                          workerURL: e.workerUrl
                        }) : await (async () => {
                          let y = await i(a, s),
                            u = await m0(ln(s.configService).pipe(da((P) => P !== "pending")));
                          return oFT({
                            configService: s.configService,
                            buildSystemPromptDeps: {
                              configService: s.configService,
                              toolService: s.toolService,
                              filesystem: He,
                              skillService: s.skillService,
                              getThreadEnvironment: Hs,
                              threadService: s.threadService,
                              serverStatus: X9(u) ? u : void 0
                            },
                            mcpInitialized: s.mcpService.initialized
                          }, y)
                        })();
                        if (Ba.write(`
`), Ba.write(oR.bold(`Context Usage Analysis
`)), Ba.write(oR.dim("\u2500".repeat(50) + `
`)), A) Ba.write(oR.dim(`Source: v2 worker
`));
                        Ba.write(`Model: ${
l.modelDisplayName}
 (${
Ki(l.maxContextTokens)}
 context)

`);
                        let o = l.sections.flatMap((y) => [y.name, ...y.children?.map((u) => `  ${
u.name}
`) ?? []]),
                          n = Math.max(...o.map((y) => y.length));
                        for (let y of l.sections) {
                          let u = y.name.padEnd(n + 2),
                            P = Ki(y.tokens).padStart(8),
                            k = `(${
y.percentage.toFixed(1)}
%)`.padStart(8);
                          if (Ba.write(`  ${
u}
${
P}
 ${
k}
`), y.children && y.children.length > 0)
                            for (let x of y.children) {
                              let f = `  ${
x.name}
`.padEnd(n + 2),
                                v = Ki(x.tokens).padStart(8),
                                g = `(${
x.percentage.toFixed(1)}
%)`.padStart(8);
                              Ba.write(oR.dim(`  ${
f}
${
v}
 ${
g}
`))
                            }
                        }
                        Ba.write(`
`);
                        let p = (l.totalTokens / l.maxContextTokens * 100).toFixed(1);
                        Ba.write(`Used:  ${
Ki(l.totalTokens,!0)}
 tokens (${
p}
% used)
`), Ba.write(`Free:  ${
Ki(l.freeSpace,!0)}
 tokens
`);
                        let _ = [`${
l.toolCounts.builtin}
 builtin`];
                        if (l.toolCounts.toolbox > 0) _.push(`${
l.toolCounts.toolbox}
 toolbox`);
                        if (l.toolCounts.mcp > 0) _.push(`${
l.toolCounts.mcp}
 MCP`);
                        Ba.write(oR.dim(`Tools: ${
l.toolCounts.total}
 (${
_.join(", ")})
`));
                        let m = await i(a, s).catch(() => null),
                          b = m ? $h(m) : null;
                        if (b?.totalInputTokens) {
                          let y = b.totalInputTokens,
                            u = l.totalTokens - y;
                          if (Ba.write(`
`), Ba.write(oR.dim("\u2500".repeat(50) + `
`)), Ba.write(oR.dim(`Comparison with last inference:
`)), Ba.write(oR.dim(`  Last inference:   ${
Ki(y,!0).padStart(8)}
 tokens
`)), b.cacheCreationInputTokens || b.cacheReadInputTokens) Ba.write(oR.dim(`    (input: ${
Ki(b.inputTokens)}, cache-create: ${
Ki(b.cacheCreationInputTokens??0)}, cache-read: ${
Ki(b.cacheReadInputTokens??0)})
`));
                          Ba.write(oR.dim(`  Current analysis: ${
Ki(l.totalTokens,!0).padStart(8)}
 tokens
`));
                          let P = u >= 0 ? "+" : "-";
                          if (Ba.write(oR.dim(`  Difference:       ${
P}
${
Ki(Math.abs(u),!0).padStart(7)}
 tokens
`)), Math.abs(u) > 100) Ba.write(oR.dim(`  (Analysis regenerates context;
 differences expected due to dynamic content)
`))
                        }
                        await s.asyncDispose(), process.exit(0)
                      } catch (A) {
                        await s.asyncDispose();
                        let l = `Failed to analyze thread context: ${
A instanceof Error?A.message:String(A)}
`;
                        c(l)
                      }
                    }

                    function pc0() {
                      G1 = process.hrtime.bigint()
                    }

                    function _c0() {
                      if (G1 === null) return null;
                      return Number(process.hrtime.bigint() - G1) / 1e6
                    }

                    function Pc0(T) {
                      try {
                        if (K1.statSync(T).size > yc0) K1.truncateSync(T, 0)
                      } catch {}
                    }

                    function kc0(T) {
                      return T instanceof Error && T.message.includes("write after end")
                    }

                    function og(T, R, a, e) {
                      if (NeT) return;
                      try {
                        T[R](a, ...e)
                      } catch (t) {
                        if (!kc0(t)) throw t
                      }
                    }

                    function xc0(T) {
                      NeT = !1, u$ = null;
                      let {
                        logFile: R,
                        logLevel: a
                      } = T;
                      if (!AkT.includes(a)) console.warn(`Invalid log level: ${
a}
. Using 'info' instead.`);
                      try {
                        K1.mkdirSync(BeT.dirname(R), {
                          recursive: !0
                        })
                      } catch (i) {
                        console.error(`Failed to create log directory: ${
i}
`)
                      }
                      Pc0(R);
                      let e = Xh.default.format((i) => {
                          for (let c of Object.keys(i)) {
                            let s = i[c];
                            if (s instanceof Error) i[c] = {
                              name: s.name,
                              message: s.message,
                              stack: s.stack
                            }
                          }
                          return i
                        }),
                        t = Xh.default.format((i) => {
                          return i.pid = process.pid, i
                        }),
                        r = [new Xh.default.transports.File({
                          filename: R
                        }), new eKT];
                      if (process.env.AMP_CLI_STDOUT_DEBUG === "true") r.push(new Xh.default.transports.Console({
                        level: "debug",
                        format: Xh.default.format.combine(Xh.default.format.colorize(), Xh.default.format.simple())
                      }));
                      gv = Xh.default.createLogger({
                        level: AkT.includes(a) ? a : "info",
                        format: Xh.default.format.combine(Xh.default.format.timestamp(), t(), e(), Xh.default.format.json(), Xh.default.format.errors({
                          stack: !0
                        })),
                        transports: r
                      });
                      let h = gv;
                      return PnR({
                        error: (i, ...c) => {
                          og(h, "error", i, c)
                        },
                        warn: (i, ...c) => {
                          og(h, "warn", i, c)
                        },
                        info: (i, ...c) => {
                          og(h, "info", i, c)
                        },
                        debug: (i, ...c) => {
                          og(h, "debug", i, c)
                        },
                        audit: (i, ...c) => {
                          let s = typeof c[0] === "object" && c[0] !== null ? {
                            audit: !0,
                            ...c[0]
                          } : {
                            audit: !0
                          };
                          og(h, "info", i, [s])
                        }
                      }), R
                    }

                    function xb() {
                      if (u$) return u$;
                      let T = gv;
                      if (!T) return Promise.resolve();
                      return NeT = !0, u$ = new Promise((R) => {
                        let a = !1,
                          e = () => {
                            if (!a) {
                              if (a = !0, gv === T) gv = void 0;
                              R()
                            }
                          };
                        setImmediate(() => {
                          try {
                            T.once("finish", e).once("error", e).end()
                          } catch {
                            e()
                          }
                        }), setTimeout(e, 500)
                      }), u$
                    }

                    function eF(T) {
                      return T.endsWith("/") ? T.slice(0, -1) : T
                    }

                    function vc0(T) {
                      let R = pFT(T);
                      try {
                        let t = new URL(R);
                        return eF(`${
t.host}
${
t.pathname}
`).replace(/^\//, "")
                      } catch {}
                      let a = R.match(/^[^@]+@([^:/]+)[:/](.+)$/);
                      if (a?.[1] && a[2]) return eF(`${
a[1]}
/${a[2]}`).replace(/\.git$/, "");
                      let e = R.match(/^([^:]+):(.+)$/);
                      if (e?.[1] && e[2]) return eF(`${e[1]}/${e[2]}`).replace(/\.git$/, "");
                      return null
                    }
                    async function tKT(T) {
                      try {
                        let {
                          stdout: R
                        } = await gc0("git", ["remote", "get-url", "origin"], {
                          cwd: T
                        }), a = R.trim();
                        if (!a) return null;
                        return vc0(a)
                      } catch {
                        return null
                      }
                    }

                    function jc0(T) {
                      let R = [...$c0];
                      if (T?.team?.disablePrivateThreads) {
                        let a = R.indexOf("private");
                        if (a !== -1) R.splice(a, 1)
                      }
                      if (T?.team?.groups && T.team.groups.length > 0) R.push("group");
                      return R
                    }

                    function pkT(T) {
                      let R = T?.team?.disablePrivateThreads ?? !1,
                        a = T?.team?.defaultThreadVisibility;
                      if (!a || a === "private") return R ? "workspace" : "private";
                      if (a === "thread_workspace_shared") return "workspace";
                      if (a === "creator_groups_fallback_private") {
                        if (T?.team?.groups?.length) return "group";
                        return R ? "workspace" : "private"
                      }
                      return R ? "workspace" : "private"
                    }

                    function Sc0(T) {
                      if (T?.team?.groups !== void 0) return Error(["Group visibility is not available. ", `You are not a member of any group in this workspace.
`].join(""));
                      return Error(`Group visibility is not available.
`)
                    }

                    function _kT(T, R) {
                      let a = [`Invalid ${T?`visibility for amp.defaultVisibility.${T}`:"visibility"}. `, `Must be one of: ${R.join(", ")}.
`].join("");
                      return Error(a)
                    }

                    function Oc0(T, R) {
                      return R.includes(T)
                    }

                    function dc0(T) {
                      return T?.team?.billingMode === "enterprise" || T?.team?.billingMode === "enterprise.selfserve"
                    }

                    function rKT(T, R, a) {
                      if (T === void 0 || T === null) return;
                      let e = jc0(R);
                      if (typeof T !== "string") return _kT(a, e);
                      if (T === "group" && !e.includes("group")) return Sc0(R);
                      if (Oc0(T, e)) return T;
                      return _kT(a, e)
                    }
                    async function Ec0(T, R, a) {
                      let e = await tKT(R);
                      if (!e) return;
                      let t;
                      try {
                        t = await T.get("defaultVisibility")
                      } catch (h) {
                        J.warn("Failed to read defaultVisibility setting", {
                          error: h
                        });
                        return
                      }
                      let r = t?.[e];
                      return rKT(r, a, e)
                    }
                    async function UeT(T, R, a, e) {
                      if (e) return e;
                      if (!dc0(a)) return pkT(a);
                      let t = await Ec0(T, R, a);
                      if (t instanceof Error) return t;
                      return t ?? pkT(a)
                    }

                    function Cc0(T, R) {
                      return rKT(T, R)
                    }
                    async function Lc0(T, R, a) {
                      let e = await tKT(R);
                      if (!e) return Error("No git origin remote found for this repository.");
                      let t = {
                        ...await T.get("defaultVisibility", "global") ?? {},
                        [e]: a
                      };
                      return await T.set("defaultVisibility", t, "global"), {
                        repoKey: e
                      }
                    }

                    function HeT(T) {
                      let R = T.replace(/-/g, "");
                      if (R.length !== 32) throw Error(`Invalid UUID hex length: ${R.length}`);
                      let a = BigInt("0x" + R),
                        e = "";
                      while (a > 0n) e = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" [Number(a % 62n)] + e, a = a / 62n;
                      return e.padStart(22, "0")
                    }

                    function Vb() {
                      return `M-${HeT(VS())}`
                    }

                    function Nc0() {
                      return `TU-${HeT(VS())}`
                    }

                    function bkT() {
                      return `E-${HeT(VS())}`
                    }

                    function bo0(T) {
                      if (typeof T !== "string") return !1;
                      return _o0.has(T)
                    }

                    function mH(T, R) {
                      if (T && typeof T === "object" && "type" in T) {
                        let e = T;
                        if (e.type === "delta" || e.type === "snapshot") return e
                      }
                      if (R === "snapshot") return {
                        type: "snapshot",
                        value: T
                      };
                      let a = typeof T === "string" ? T : T !== void 0 ? JSON.stringify(T) : "";
                      return {
                        type: "delta",
                        blocks: a ? [{
                          type: "text",
                          text: a
                        }] : void 0,
                        state: "generating"
                      }
                    }

                    function xn0(T, R = {}) {
                      let a = (R.mode ?? "lenient") === "strict";
                      if (!Array.isArray(T)) return a ? null : [];
                      let e = [];
                      for (let t of T) {
                        if (typeof t !== "object" || t === null) {
                          if (a) return null;
                          continue
                        }
                        let r = t;
                        if (typeof r.uri !== "string" || r.uri.length === 0) {
                          if (a) return null;
                          continue
                        }
                        let h;
                        try {
                          h = d0(zR.parse(r.uri))
                        } catch {
                          if (a) return null;
                          continue
                        }
                        let i = {
                          uri: h
                        };
                        if (typeof r.content === "string") i.content = r.content;
                        if (typeof r.lineCount === "number" && Number.isFinite(r.lineCount)) i.lineCount = r.lineCount;
                        if (typeof r.hash === "string") i.hash = r.hash;
                        e.push(i)
                      }
                      return e
                    }

                    function Y1(T, R) {
                      if (T.length <= R) return T;
                      return `${T.slice(0,R)}...<truncated>`
                    }

                    function In0(T) {
                      return T.replace(/\s+/g, " ").trim()
                    }

                    function gn0(T) {
                      if (!T || typeof T !== "object") return [];
                      let R = T.issues;
                      return Array.isArray(R) ? R.slice(0, 5) : []
                    }

                    function $n0(T) {
                      if (T === void 0) return null;
                      if (typeof T === "string") return JSON.stringify(T);
                      if (typeof T === "number" || typeof T === "boolean" || T === null) return JSON.stringify(T);
                      try {
                        return Y1(JSON.stringify(T), 120)
                      } catch {
                        return Y1(String(T), 120)
                      }
                    }

                    function $KT(T) {
                      if (!Array.isArray(T) || T.length === 0) return null;
                      let R = T.map((a) => typeof a === "number" ? `[${a}]` : String(a)).join(".").replace(/\.\[/g, "[");
                      return R.length > 0 ? R : null
                    }

                    function vn0(T) {
                      if (!T || typeof T !== "object") return null;
                      let R = T,
                        a = typeof R.message === "string" ? R.message : null,
                        e = typeof R.note === "string" ? R.note : null,
                        t = $KT(R.path);
                      if (t && a && a !== "Invalid input") return `${t}: ${a}`;
                      if (t && e) return `${t}: ${e}`;
                      if (t && a) return `invalid value at ${t}`;
                      return e ?? a
                    }

                    function vKT(T) {
                      for (let R of T) {
                        let a = vn0(R);
                        if (a) return a
                      }
                      return null
                    }

                    function jn0(T) {
                      return T.some((R) => {
                        if (!R || typeof R !== "object") return !1;
                        let a = R;
                        return a.code === "invalid_union" && (a.note === "No matching discriminator" || a.discriminator === "type" || $KT(a.path) === "type")
                      })
                    }

                    function Sn0(T, R) {
                      let a = vKT(R);
                      if (T && a) return `type ${JSON.stringify(T)} failed validation: ${a}`;
                      if (T) return `type ${JSON.stringify(T)} failed validation`;
                      if (a) return `message payload failed validation: ${a}`;
                      return "message payload failed validation"
                    }

                    function On0(T, R, a) {
                      let e = gn0(R),
                        t = (() => {
                          let s = In0(T);
                          if (s.length === 0) return null;
                          return Y1(s, a?.payloadPreviewMaxChars ?? 1200)
                        })(),
                        r;
                      try {
                        r = JSON.parse(T)
                      } catch {
                        let s = vKT(e);
                        return {
                          failureType: "invalid_json",
                          summary: s ? `malformed JSON: ${s}` : "malformed JSON",
                          messageType: null,
                          typePreview: null,
                          payloadPreview: t,
                          issues: e
                        }
                      }
                      if (!r || typeof r !== "object" || Array.isArray(r)) return {
                        failureType: "invalid_shape",
                        summary: "expected a JSON object payload",
                        messageType: null,
                        typePreview: null,
                        payloadPreview: t,
                        issues: e
                      };
                      let h = r;
                      if (!Object.hasOwn(h, "type")) return {
                        failureType: "missing_type",
                        summary: 'missing string "type"',
                        messageType: null,
                        typePreview: null,
                        payloadPreview: t,
                        issues: e
                      };
                      let i = h.type,
                        c = $n0(i);
                      if (typeof i !== "string") return {
                        failureType: "invalid_type",
                        summary: `expected string "type", got ${c??"unknown value"}`,
                        messageType: null,
                        typePreview: c,
                        payloadPreview: t,
                        issues: e
                      };
                      if (jn0(e)) return {
                        failureType: "unknown_type",
                        summary: `unsupported type ${JSON.stringify(i)} (likely protocol version mismatch)`,
                        messageType: i,
                        typePreview: c,
                        payloadPreview: t,
                        issues: e
                      };
                      return {
                        failureType: "invalid_shape",
                        summary: Sn0(i, e),
                        messageType: i,
                        typePreview: c,
                        payloadPreview: t,
                        issues: e
                      }
                    }

                    function dn0(T) {
                      let R = Number.isFinite(T) ? T : 0,
                        a = 0,
                        e = R;

                      function t(h = R) {
                        if (Number.isFinite(h)) R = h;
                        return a = 0, e = R, R
                      }

                      function r(h) {
                        if (!Number.isFinite(h) || h < 1) return R;
                        if (h <= a) return R;
                        if (a === 0) e = R - (h - 1);
                        return R = Math.max(R, e + h), a = h, R
                      }
                      return {
                        getVersion: () => R,
                        reset: t,
                        advanceFromSeq: r
                      }
                    }

                    function Q1(T) {
                      return {
                        kind: jKT,
                        failureType: T.failureType ?? null,
                        source: T.source ?? null,
                        direction: T.direction ?? null,
                        stage: T.stage ?? null,
                        summary: T.summary ?? null,
                        messageType: T.messageType ?? null,
                        typePreview: T.typePreview ?? null,
                        payloadPreview: T.payloadPreview ?? null,
                        issues: T.issues ?? []
                      }
                    }

                    function Ln0(T) {
                      let R = Q1(T);
                      return JSON.stringify(R)
                    }

                    function SKT(T, R) {
                      let a = On0(T, R);
                      return Ln0({
                        failureType: a.failureType,
                        source: "dtw-transport",
                        direction: "server->client",
                        stage: "decode-server-message",
                        summary: a.summary,
                        messageType: a.messageType,
                        typePreview: a.typePreview,
                        payloadPreview: a.payloadPreview,
                        issues: a.issues
                      })
                    }

                    function Mn0(T) {
                      let R = T.startsWith(mkT) ? T.slice(mkT.length) : T,
                        a;
                      try {
                        a = JSON.parse(R)
                      } catch {
                        return null
                      }
                      let e = En0.safeParse(a);
                      if (e.success) return Q1(e.data);
                      let t = Cn0.safeParse(a);
                      if (t.success) return Q1(t.data);
                      return null
                    }

                    function XeT() {
                      return globalThis
                    }

                    function dKT(T) {
                      if (!T || typeof T !== "object") return null;
                      let R = T;
                      if (typeof R.addEventListener !== "function" || typeof R.removeEventListener !== "function") return null;
                      return R
                    }

                    function PkT() {
                      return dKT(XeT().window)
                    }

                    function tF() {
                      let T = XeT().document;
                      if (!dKT(T)) return null;
                      return T
                    }

                    function zn0() {
                      let T = XeT().navigator;
                      if (!T || typeof T !== "object") return null;
                      return T
                    }

                    function Fn0(T) {
                      if (!T) return "none";
                      let R = [T.type];
                      if (T.code !== void 0) R.push(`code=${T.code}`);
                      if (T.reason !== void 0) R.push(`reason=${T.reason}`);
                      if (T.error !== void 0) R.push(`error=${T.error}`);
                      return R.join(" ")
                    }

                    function EKT(T) {
                      return !!(T.apiKey && T.WebSocketClass)
                    }

                    function Gn0(T) {
                      if (EKT(T)) return "one-step";
                      return "two-step"
                    }
                    class YeT {
                      ws = null;
                      connectionInfo = {
                        state: "disconnected",
                        role: null,
                        clientId: null,
                        threadId: null
                      };
                      reconnectCause = null;
                      reconnectAttempts = 0;
                      reconnectTimeoutID = null;
                      reconnectResetTimeoutID = null;
                      pingIntervalID = null;
                      disposed = !1;
                      lastPongAt = Date.now();
                      intentionallyClosedSockets = new WeakSet;
                      reconnectActivityCleanup = null;
                      lifecycleEventID = 0;
                      lifecycleEvents = [];
                      connectionSubject = new f0({
                        state: "disconnected",
                        role: null,
                        clientId: null,
                        threadId: null
                      });
                      lifecycleEventSubject = new f0([]);
                      config;
                      currentThreadID = null;
                      currentWsToken = null;
                      constructor(T) {
                        this.config = {
                          baseURL: T.baseURL,
                          threadId: T.threadId,
                          apiKey: T.apiKey,
                          wsToken: T.wsToken,
                          wsTokenProvider: T.wsTokenProvider,
                          webSocketProvider: T.webSocketProvider,
                          reconnectDelayMs: T.reconnectDelayMs ?? Dn0,
                          maxReconnectDelayMs: T.maxReconnectDelayMs ?? wn0,
                          maxReconnectAttempts: T.maxReconnectAttempts ?? Bn0,
                          pingIntervalMs: T.pingIntervalMs ?? Nn0,
                          connectTimeoutMs: T.connectTimeoutMs ?? Un0,
                          WebSocketClass: T.WebSocketClass,
                          useThreadActors: T.useThreadActors
                        }, this.currentThreadID = T.threadId ?? null, this.currentWsToken = T.wsToken ?? null, this.recordLifecycleEvent("transport_initialized", `flow=${Gn0(this.config)} threadId=${this.currentThreadID??"none"}`)
                      }
                      getThreadId() {
                        return this.currentThreadID
                      }
                      connectionChanges() {
                        return this.connectionSubject
                      }
                      getConnectionInfo() {
                        return {
                          ...this.connectionInfo
                        }
                      }
                      waitForConnected(T) {
                        if (this.connectionInfo.state === "connected") return Promise.resolve(!0);
                        if (this.disposed || T <= 0) return Promise.resolve(!1);
                        return new Promise((R) => {
                          let a = !1,
                            e = null,
                            t = null,
                            r = (h) => {
                              if (a) return;
                              if (a = !0, e) clearTimeout(e), e = null;
                              t?.unsubscribe(), t = null, R(h)
                            };
                          e = setTimeout(() => {
                            r(!1)
                          }, T), t = this.connectionSubject.subscribe({
                            next: (h) => {
                              if (h.state === "connected") r(!0)
                            },
                            error: () => {
                              r(!1)
                            },
                            complete: () => {
                              r(!1)
                            }
                          })
                        })
                      }
                      connectionLifecycleChanges() {
                        return this.lifecycleEventSubject
                      }
                      getConnectionLifecycleEvents() {
                        return [...this.lifecycleEvents]
                      }
                      async connect() {
                        return this.connectInternal({
                          fromReconnect: !1
                        })
                      }
                      recordLifecycleEvent(T, R) {
                        let a = {
                            id: ++this.lifecycleEventID,
                            at: Date.now(),
                            type: T,
                            ...R ? {
                              details: R
                            } :
                            {}
                          },
                          e = Wn0,
                          t = this.lifecycleEvents.slice(-(e - 1));
                        this.lifecycleEvents = [...t, a], this.lifecycleEventSubject.next([...this.lifecycleEvents])
                      }
                      async connectInternal(T) {
                        if (this.disposed) throw new z8("Transport is disposed");
                        if (this.ws) return;
                        this.recordLifecycleEvent("connect_requested", T.fromReconnect ? `mode=reconnect attempt=${this.reconnectAttempts}` : "mode=initial"), this.updateConnectionState("connecting");
                        try {
                          let R = this.config.WebSocketClass ?? WebSocket,
                            a;
                          if (this.config.webSocketProvider) a = await this.config.webSocketProvider();
                          else if (EKT(this.config)) {
                            let e = this.config.baseURL.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
                              t = this.config.apiKey;
                            if (!t) throw new z8("1-step flow requires apiKey");
                            let r = this.currentThreadID ?? this.config.threadId;
                            if (!r) r = (await this.fetchWsToken()).threadId;
                            let h = `${e}/threads`;
                            if (r) h = `${h}?threadId=${encodeURIComponent(r)}`;
                            a = new R(h, {
                              headers: {
                                Authorization: `Bearer ${t}`
                              }
                            })
                          } else {
                            let e = this.config.baseURL.replace(/^http:/, "ws:").replace(/^https:/, "wss:"),
                              {
                                threadId: t,
                                wsToken: r
                              } = await this.ensureWsToken();
                            this.currentThreadID = t, this.currentWsToken = r;
                            let h = `${e}/threads`;
                            a = new R(h, ["amp", r])
                          }
                          try {
                            a.binaryType = "arraybuffer"
                          } catch {}
                          await this.waitForOpen(a), this.ws = a, this.lastPongAt = Date.now(), this.setupWebSocketHandlers(a), this.stopWaitingForReconnectActivity(), this.scheduleReconnectAttemptsReset(), this.reconnectCause = null, this.updateConnectionState("connected"), this.recordLifecycleEvent("connect_succeeded", `threadId=${this.currentThreadID??"none"} attempt=${this.reconnectAttempts}`)
                        } catch (R) {
                          let a = R instanceof Error ? R.message : String(R);
                          if (this.recordLifecycleEvent("connect_failed", `mode=${T.fromReconnect?"reconnect":"initial"} error=${a}`), !T.fromReconnect && !this.disposed) this.reconnectCause = {
                            type: "connect_failed",
                            at: Date.now(),
                            error: a
                          }, this.scheduleReconnect();
                          throw R
                        }
                      }
                      disconnect() {
                          this.recordLifecycleEvent("disconnect_requested"), this.stopPingInterval(), this.cancelReconnect(), this.reconnectCause = null;
                          let T = this.ws;
                          if (T) {
                            if (this.ws = null, this.intentionallyClosedSockets.add(T), T.readyState === WebSocket.OPEN) T.close(1000, "Client disconnect")
                          }
                          this