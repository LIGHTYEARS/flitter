// Module: activity-feed-ui
// Original: segment1[2428989:2443895]
// Type: Scope-hoisted
// Exports: lhT, p8R, _8R, b8R, m8R, qQ, u8R, KQ, YgT, J50, x8R
// Category: widget

.content
}
`:"none",e=o8R(this.options.subagentContentByParentID[T]);return`
progress: $ {
    a
  } |
  subagents: $ {
    e
  }
`}_toolRunSignature(T){if(this._isToolRunCompleted(T.status))return`
run: $ {
  T.status
}
`;let R="progress"in T?this._unknownValueSignature(T.progress):"no-progress",a="result"in T?this._unknownValueSignature(T.result):"no-result";return`
run: $ {
    T.status
  } |
  progress: $ {
    R
  } |
  result: $ {
    a
  }
`}_unknownValueSignature(T,R=0){if(T===void 0)return"undefined";if(T===null)return"null";if(typeof T==="string")return`
string: $ {
  T.length
}: $ {
  T.slice(0, 120)
}
`;if(typeof T==="number"||typeof T==="boolean"||typeof T==="bigint")return`
$ {
  typeof T
}: $ {
  String(T)
}
`;if(Array.isArray(T)){if(R>=2)return`
array: $ {
  T.length
}
`;return`
array: [$ {
  T.map((a) => this._unknownValueSignature(a, R + 1)).join(",")
}] `}if(typeof T==="object"){let a=Object.entries(T);if(R>=2)return`
object: {
  $ {
    a.map(([e]) => e).sort().join(",")
  }
}
`;return`
object: {
  $ {
    a.sort(([e], [t]) => e.localeCompare(t)).map(([e, t]) => `${e}:${this._unknownValueSignature(t,R+1)}`).join(",")
  }
}
`}return typeof T}_isToolRunCompleted(T){return T!=="in-progress"&&T!=="queued"&&T!=="blocked-on-user"}_getDenseItemExpanded(T,R){let a=this._getDenseItemLocalExpanded(T);if(a===void 0){if(_i.instance.allExpanded)return!0;return R??!1}return _i.instance.allExpanded?!0:a}_getDenseItemLocalExpanded(T){let R=T.type==="toolGroup"?T.id:T.item.id;return this.options.stateController.denseViewItemStates.get(R)}_setDenseItemExpanded(T,R){let a=T.type==="toolGroup"?T.id:T.item.id;this.options.stateController.setDenseViewItemState(a,R)}_touchDenseItem(T){let R=T.type==="toolGroup"?T.id:T.item.id;this.options.stateController.setDenseViewItemTouched(R)}_getDenseActivityGroupLifecycle(T){let R=T.actions.filter((p)=>p.kind!=="thinking"&&p.status).map((p)=>p.status),a=R.length>0,e=R.some((p)=>p==="queued"||p==="in-progress"),t=R.some((p)=>p==="cancelled"),r=a&&R.every((p)=>p==="done"),h=this._getDenseActivityGroupAssistantState(T),i=h==="streaming",c=h==="cancelled",s=h===void 0&&!e&&this._isLatestOpenDenseActivityGroup(T)&&this._isThreadStillGenerating(),A=this.options.threadViewState,l=A?.state==="active"&&A.inferenceState==="cancelled",o=this._getRenderIndexForDenseEntry(T),n=!(o!==null&&this._hasRenderBoundaryAfter(o))&&(i||e||s);return{active:n,cancelled:!n&&!r&&(t||c||l),done:!n&&(r||!a&&h==="complete")}}_getDenseActivityGroupAssistantState(T){let R=T.assistantSourceIndex??T.sourceIndex;if(R==null)return;let a=this.options.items[R];if(!a||a.type!=="message"||a.message.role!=="assistant")return;return a.message.state.type}_isActiveDenseActivityGroup(T){if(T.type!=="activity-group")return!1;return this._getDenseActivityGroupLifecycle(T).active}_isThreadStillGenerating(){let T=this.options.threadViewState;if(T?.state==="active"&&(T.inferenceState==="running"||T.inferenceState==="retrying"||T.interactionState==="tool-running"))return!0;if(this.options.hasStartedStreamingResponse)return!0;return this.options.items.some((R)=>R.type==="toolResult"&&(R.toolResult.run.status==="queued"||R.toolResult.run.status==="in-progress"))}_isLatestOpenDenseActivityGroup(T){let R=this._getRenderIndexForDenseEntry(T);if(R===null)return!1;if(this._hasRenderBoundaryAfter(R))return!1;for(let a=R+1;a<this._renderItems.length;a+=1){let e=this._renderItems[a];if(e?.type==="dense"&&e.item.type==="activity-group")return!1}return!0}_getRenderIndexForDenseEntry(T){for(let[R,a]of this._renderItems.entries()){if(a.type!=="dense")continue;if(a.item===T)return R;if(a.item.id===T.id&&a.item.type===T.type)return R}return null}_hasRenderBoundaryAfter(T){let R=this._renderItems[T+1];if(!R)return!1;if(R.type==="dense")return R.item.type!=="activity-group";if(R.type==="item"){if(R.item.type==="message")return R.item.message.role==="assistant"||R.item.message.role==="user";return!0}return!0}_closeDenseActivityGroupsOnBoundary(){for(let[T,R]of this._renderItems.entries()){if(R.type!=="dense"||R.item.type!=="activity-group")continue;if(this.options.stateController.denseViewItemTouched.has(R.item.id))continue;if(!this._getDenseItemExpanded(R,this._isActiveDenseActivityGroup(R.item)))continue;if(!this._shouldCollapseDenseActivityGroup(R,T))continue;this._setDenseItemExpanded(R,!1)}}_shouldCollapseDenseActivityGroup(T,R){let a=T.item;if(a.type!=="activity-group")return!1;let e=this._getDenseActivityGroupLifecycle(a);if(e.cancelled)return!0;if(e.active)return!1;let t=this._renderItems[R+1];if(!t)return!1;if(t.type==="dense"){if(t.item.type==="activity-group")return!1;if(t.item.type==="message")return t.item.role==="user"||t.item.role==="assistant";return!0}if(t.type==="item"){if(t.item.type==="message")return t.item.message.role==="user"||t.item.message.role==="assistant";return!0}return!0}_buildDenseToolGroup(T,R,a){let e=$R.of(T),t=this._getDenseItemExpanded(R),r=[],h=new cT({color:e.app.toolName,bold:!0}),i=new cT({color:e.colors.foreground,dim:!0});if(R.kind==="bashExplore")r.push(new G("Explored by running",h)),r.push(new G(`
$ {
  R.items.length
}
$ {
  o9(R.items.length, "command")
}
`,i));else r.push(new G("Explored",h)),r.push(new G(`($ {
    R.items.length
  }
  $ {
    o9(R.items.length, "tool")
  })`,i));let c=new xT({text:new G("",void 0,r),selectable:!0}),s=R.items.map((l)=>{let o=WQ(T,l.toolUse,l.toolResult.run);return new uR({padding:TR.only({left:2}),child:o})}),A=s.length===0?new SR:new xR({crossAxisAlignment:"start",mainAxisSize:"min",children:s});return new Ds({key:new k3(`
dense - group - $ {
  R.id
}
`),title:c,child:A,expanded:t,onChanged:(l)=>{this.options.onStateUpdate(()=>{this._touchDenseItem(R),this._setDenseItemExpanded(R,l),this.options.onInvalidateRenderItemIndex(a)})}})}_buildDenseEntry(T,R,a){let e=R.item;if(e.type==="activity-group"){let t=this._getDenseActivityGroupLifecycle(e);return new r9R({reads:e.reads,searches:e.searches,explores:e.explores,actions:e.actions,active:t.active,cancelled:t.cancelled,completed:t.done,expanded:this._getDenseItemExpanded(R,!1),onToggle:(r)=>{this.options.onStateUpdate(()=>{this._touchDenseItem(R),this._setDenseItemExpanded(R,r),this.options.onInvalidateRenderItemIndex(a)})}})}if(e.type==="apply-patch")return new s9R({guidanceFiles:e.guidanceFiles,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})},toolRun:e.status?{status:e.status,result:e.result,error:e.error?{message:e.error}:void 0}:void 0});if(e.type==="code-review")return new l9R({status:e.status,subTools:e.subTools,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})}});if(e.type==="bash")return new o9R({command:e.command,guidanceFiles:e.guidanceFiles,output:e.output,error:e.error,exitCode:e.exitCode,progressOutput:e.progressOutput,status:e.status,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})}});if(e.type==="shell-command")return new b9R({command:e.command,workdir:e.workdir,guidanceFiles:e.guidanceFiles,output:e.output,error:e.error,exitCode:e.exitCode,progressOutput:e.progressOutput,status:e.status,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})}});if(e.type==="edit-file")return new _9R({guidanceFiles:e.guidanceFiles,path:e.path,oldText:e.oldText,newText:e.newText,toolRun:e.status?{status:e.status,result:e.diff?{diff:e.diff}:void 0,error:e.error?{message:e.error}:void 0}:void 0,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})}});if(e.type==="create-file")return new A9R({guidanceFiles:e.guidanceFiles,path:e.path,content:e.content,toolRun:e.status?{status:e.status,result:{},error:e.error?{message:e.error}:void 0}:void 0,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})}});if(e.type==="undo-edit")return new u9R({path:e.path,toolRun:e.status?{status:e.status,result:e.diff??"",error:e.error?{message:e.error}:void 0}:void 0,expanded:this._getDenseItemExpanded(R),onToggle:(t)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,t)})}});if(e.type==="skill"){let t=e.sourceIndex!==void 0?this.options.items[e.sourceIndex]:void 0;if(t?.type==="toolResult")return new chT({toolUse:t.toolUse,toolRun:t.toolResult.run})}if(e.type==="generic-tool"){let t=this.options.items[e.sourceIndex];if(t?.type==="toolResult"){if(Z50(t.toolUse)){let r=this._isToolRunCompleted(t.toolResult.run.status),h=this._getDenseItemExpanded(R,!r),i=WQ(T,t.toolUse,t.toolResult.run),c=new Bs({toolUse:t.toolUse,toolRun:t.toolResult.run,toolProgress:this.options.toolProgressByToolUseID.get(t.toolUse.id),userInput:t.toolResult.userInput,subagentContent:this.options.subagentContentByParentID[t.toolUse.id],hideHeader:!0});return new Ds({key:new k3(`
dense - generic - tool - $ {
  e.id
}
`),title:i,child:c,expanded:h,onChanged:(s)=>{this.options.onStateUpdate(()=>{this._setDenseItemExpanded(R,s)})}})}return this.options.buildThreadItemWidget(T,t,e.sourceIndex)}}if(e.type==="message")return this.options.buildThreadItemWidget(T,{type:"message",id:e.id,message:e.message},e.sourceIndex);return new SR}}function lhT(T,R){let a=$R.of(T).colors,e=R.toolRun.status==="done"?R.toolRun.result.output:("progress"in R.toolRun)?R.toolRun.progress?.output:void 0,t=R.toolRun.status==="done"?R.toolRun.result.exitCode:void 0,r=R.toolRun.status==="cancelled"?"Cancelled":R.toolRun.status==="error"?"Errored":void 0,h=new cT({color:a.foreground,dim:!0,italic:!0}),i=[],c=(s)=>{let A=i.length===0?"":`

`;i.push(new G(`
$ {
  A
}
$ {
  s
}
`,h))};if(e&&e.trim())i.push(new G(e.trimEnd(),new cT({color:a.foreground,dim:!0})));if(t!==void 0&&t!==0)c(`
exit code: $ {
  t
}
`);if(r)c(`($ {
  r
}, command and output not shown to agent)`);else if(R.hidden)c("(Command and output not shown to agent)");if(i.length===0)return null;return new xT({text:new G("",void 0,i),selectable:!0})}function p8R(T,R){let a=$R.of(R),e=YP(T);if(e?.visibility===ex)return a.app.shellModeHidden;if(e?.visibility===VrT)return a.app.shellMode;return a.app.userMessage}function _8R(T,R,a,e){if(R.length===0)return null;let t=$R.maybeOf(T)?.colors??Z0.of(T).colorScheme,r=[new xT({text:new G("Images: ",new cT({color:t.foreground,dim:!0}))})];for(let h=0;h<R.length;h++){let i=h;if(r.push(new G0({onClick:()=>e(i),cursor:"pointer",child:new xT({text:new G(` [image $ {
  h + 1
}] `,new cT({color:a.color,italic:a.italic,underline:!0}))})})),h<R.length-1)r.push(new xT({text:new G(" ")}))}return new uR({padding:TR.only({}),child:new T0({mainAxisSize:"min",children:r})})}function b8R(T,R){if(R.length===0)return null;let a=[];for(let e of R)a.push(new xT({text:new G(`
Loaded $ {
  ZA(e.uri)
}
($ {
    e.lineCount
  }
  lines)`,new cT({color:$R.of(T).app.toolSuccess,dim:!0})),selectable:!0}));if(a.length===1)return a[0];return new xR({mainAxisSize:"min",crossAxisAlignment:"start",children:a})}function m8R(T){let R=[];for(let a of T.content)if(a.type==="text")R.push(a.text);return R.join(`
`).trim()}function qQ(T,R,a,e){let t=[];if(t.push(new G(T,R)),a)t.push(new G(" (interrupted)",new cT({color:e,italic:!0})));return new xT({text:new G("",void 0,t),selectable:!0})}function u8R(T,R){if(R.length===0)return null;let a=$R.of(T).colors,e=rf(T),t=[];for(let r=0;r<R.length;r++){let h=R[r];if(r>0)t.push(new G(`
`));let i=h.startsWith("file://")?zR.parse(h):zR.file(h),c=Mr(i,e??void 0);t.push(new G(`
\u2022 $ {
  c
}
`,new cT({color:a.foreground,dim:!0})))}return new xT({text:new G("",void 0,t)})}function KQ(T){if(T.type==="message"){let t=T.message;if(t.role==="user"){let h=kr(t.content),i=t.content.filter((s)=>s.type==="image").length,c=(t.discoveredGuidanceFiles??[]).map((s)=>`
$ {
  s.uri
} |
$ {
  s.lineCount
}
`).join("||");return`
$ {
  T.id
} |
user | $ {
    t.interrupted ? 1 : 0
  } |
  $ {
    i
  } |
  $ {
    h
  } |
  $ {
    c
  }
`}if(t.role==="assistant"){let h=t.state?.type??"none",i=t.content.filter((o)=>o.type==="thinking"),c=t.content.filter((o)=>o.type==="tool_use"),s=i.map((o)=>{return`
$ {
  tf(o.thinking).length
}: $ {
  Xm(o) ? "1" : "0"
}
`}).join("|"),A=t.usage,l=A?`
$ {
  A.inputTokens
} |
$ {
  A.outputTokens
} |
$ {
  A.cacheCreationInputTokens ?? ""
} |
$ {
  A.cacheReadInputTokens ?? ""
} |
$ {
  A.model ?? ""
}
`:"no-usage";return`
$ {
  T.id
} |
assistant | $ {
    h
  } |
  $ {
    i.length
  } |
  $ {
    c.length
  } |
  $ {
    s
  } |
  $ {
    l
  } |
  $ {
    t.turnElapsedMs ?? ""
  }
`}let r=t.content.map((h)=>h.type).join(",");return`
$ {
  T.id
} |
info | $ {
  r
}
`}let R=T.toolResult.run.status,a=T.toolResult.userInput,e=a?`
accepted: $ {
    a.accepted ? 1 : 0
  } |
  ask: $ {
    a.askAnswers ? Object.keys(a.askAnswers).length : 0
  }
`:"none";return`
$ {
  T.id
} |
tool | $ {
    R
  } |
  $ {
    T.toolUse.id
  } |
  $ {
    e
  }
`}function YgT(T){return(T.normalizedName??T.name)===Dt}function J50(T,R,a){let e=$R.maybeOf(T)?.colors??Z0.of(T).colorScheme,t=R.trimStart().startsWith("You're absolutely right"),r=new k3(`
$ {
  a
} -
text`),h=[];if(t)h.push(new l8R({key:r,markdown:R,defaultColor:e.foreground}));else h.push(new Z3({key:r,markdown:R}));if(h.length===1)return h[0];return new xR({crossAxisAlignment:"stretch",mainAxisSize:"min",children:h})}class x8R{options;constructor(T){this.options=T}getRenderItems(){let T=[];for(let[R,a]of this.options.items.entries())T.push({type:"item",item:a,sourceIndex:R});return T}getSourceIndex(T){return T.sourceIndex}includesSourceIndex(T,R){return T.sourceIndex===R}getCacheIdentity(T){if(T.item.type==="message"){let R=T.item.message;return`
message: $ {
  R.dtwMessageID ?? `${R.role}:${R.messageId}`
}
`}return`
tool: $ {
  T.item.toolUse.id
}
`}getRenderSignature(T){let R=KQ(T.item),a=this._getTaskSignatureSuffix(T);if(a)return`
$ {
  R
} |
$ {
  a
}
`;return R}buildWidget(T,R,a){if(R.item.type==="toolResult"&&YgT(R.item.toolUse))return this._buildCollapsibleTaskItem(T,R,a);return this.buildThreadItemWidget(T,R.item,R.sourceIndex)}buildThreadItemWidget(T,R,a){let e=new k3(`
thread - item - $ {
  R.id
}
`);if(R.type==="message"){let r=R.message;if(r.role==="user"){let l,o=(n,p)=>{this.options.onShowImagePreview(n,p,()=>{})};if(!this.options.isInSelectionMode)l=new S$({message:r,isFirstMessage:a>0,onShowImagePreview:o});else{let n=this.options.onGetOrdinalFromUserMessageIndex(a);if(n===null)l=new S$({message:r,isFirstMessage:a>0,onShowImagePreview:o});else if(this.options.stateController.editingMessageOrdinal===n&&this.options.stateController.editingController)l=new GQ({controller:this.options.stateController.editingController,message:r,onSubmitted:(p,_)=>{this.options.onEditConfirmationRequest(p,_)},completionBuilder:this.options.completionBuilder,autocompleteHandle:this.options.autocompleteHandle,onShowImagePreview:this.options.onShowImagePreview,onDoubleAtTrigger:this.options.onDoubleAtTrigger,submitOnEnter:this.options.submitOnEnter});else if(this.options.stateController.selectedUserMessageOrdinal===n)l=new zQ({message:r,isFirstMessage:a>0,showRestoreHint:this.options.showRestoreHint,isShowingRestoreConfirmation:this.options.stateController.isShowingRestoreConfirmation,isShowingEditConfirmation:this.options.stateController.isShowingEditConfirmation,affectedFiles:[...this.options.stateController.affectedFiles],pendingEditText:this.options.stateController.pendingEditTex