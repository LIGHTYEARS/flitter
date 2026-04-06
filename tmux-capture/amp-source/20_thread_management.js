// ============================================================
// AMP (Anthropic Model Platform) - Thread Management Implementation
// Extracted from reverse-engineered JS bundles
// Date: 2026-04-06
//
// TABLE OF CONTENTS:
// 1.  Thread Schema & Type Definitions (Zod schemas)
// 1b. Message Schemas
// 1c. Thread Wire Protocol
// 2.  Thread Creation
// 2b. DTW Thread Pool (createThread/switchThread/navigation)
// 2c. Thread Activation & Provider Creation
// 2d. UI Layer - startAndSwitchToNewThread
// 3.  Thread Title Generation (triggerTitleGeneration)
// 3b. Thread Worker ops.titleGeneration
// 4.  Thread Persistence (threadService, exclusiveSyncReadWriter)
// 4b. uZR helper (create/resume thread)
// 4c. Chatkit API (remote thread storage)
// 4d. Thread Worker Service (global singleton)
// 5.  Thread Navigation (Back/Forward stacks)
// 5b. Navigation UI Bindings
// 6.  Thread Listing / Picker (loadThreadsForPicker)
// 6b. Recent Threads
// 7.  Thread Mentions (@@)
// 8.  Thread Handle - Write/Update Operations
// 9.  Thread Handoff (Sub-threads / Forks)
//
// KEY ARCHITECTURE:
// - Thread IDs: "T-{uuid}" format
// - Message IDs: "M-{nanoid}" format
// - ThreadService: persistence layer (read/write/observe threads)
// - ThreadWorker: per-thread state machine (inference, tools, title gen)
// - ThreadPool (RhR): manages multiple threads, navigation stacks
// - ThreadHandle (yZR): DTW handle with optimistic projections
// - Chatkit API: remote REST endpoints for thread CRUD
// - @@ Mentions: double-@ triggers thread picker in prompt editor
// ============================================================


// ============================================================
// SECTION 1: THREAD SCHEMA & TYPE DEFINITIONS
// Source: chunk-037.js
// Thread IDs follow pattern: "T-{uuid}" (e.g. "T-12345678-1234-1234-1234-123456789012")
// Message IDs follow pattern: "M-{nanoid}" 
// Relationship types: "fork" | "handoff" | "mention"
// ============================================================

ring().regex(/^[0-9a-f]{12}
$/)]),Gf=X.templateLiteral(["T-",$i0]),ji0=X.enum(["fork","handoff","mention"]),vi0=X.enum(["parent","child"]),mi0=X.object({
  threadID:Gf,type:ji0,role:vi0,messageIndex:X.number().int().nonnegative().optional(),blockIndex:X.number().int().nonnegative().optional(),createdAt:X.number().int().nonnegative(),comment:X.string().optional()}
),Q9=X.templateLiteral(["M-",$eR]);
Ea=X.templateLiteral(["TU-",$eR]);
jeR=X.templateLiteral(["E-",$eR]);
Oi0=X.looseObject({
  type:X.literal("object"),properties:X.record(X.string(),X.unknown()),required:X.array(X.string()).optional(),additionalProperties:X.boolean().optional()}
),Pi0=X.union([X.literal("builtin"),X.object({
  toolbox:u3}
).strict(),X.object({
  mcp:u3,target:X.enum(["global","workspace","flag","default"]).optional()}
).strict(),X.object({
  plugin:u3}
).strict(),X.object({
  remote:u3}
).strict()]),Ei0=X.object({
  serial:X.boolean().optional(),deferred:X.boolean().optional(),skillNames:X.array(u3).optional()}
),Mi0=X.looseObject({
  name:u3,description:X.string(),inputSchema:Oi0,source:Pi0,meta:Ei0.optional()}
),iV0=X.object({
  id:u3,category:u3,title:u3,description:X.string().optional(),pluginName:u3}
),sKR=X.strictObject({"agent.deepReasoningEffort":X.enum(["medium","high","xhigh"]).optional(),"agent.skipTitleGenerationIfMessageContains":X.array(X.string()).optional(),"anthropic.thinking.enabled":X.boolean().optional(),"anthropic.interleavedThinking.enabled":X.boolean().optional(),"anthropic.temperature":X.number().optional(),"anthropic.effort":X.enum(["low","medium","high","max"]).optional(),"anthropic.speed":X.enum(["standard","


// ============================================================
// SECTION 1b: MESSAGE SCHEMAS (User, Assistant, Info messages)
// Source: chunk-037.js
// User message: {threadId, role:"user", content, agentMode?, messageId, createdAt?}
// Assistant message: {threadId, role:"assistant", content, state, usage?, messageId, createdAt?}
// Info message: {threadId, role:"info", content, messageId, createdAt?}
// ============================================================

!==void 0),nc0=X.object({
  threadId:Gf,role:X.literal("user"),content:mKR,agentMode:PKR.optional(),discoveredGuidanceFiles:X.array(ec0).optional(),meta:ac0.optional(),userState:OKR.optional(),readAt:X.string().nullable().optional(),messageId:Q9,createdAt:X.string().optional()}
),EKR=X.object({
  model:X.string().optional(),maxInputTokens:X.number(),inputTokens:X.number(),outputTokens:X.number(),cacheCreationInputTokens:X.number().nullable(),cacheReadInputTokens:X.number().nullable(),totalInputTokens:X.number(),thinkingBudget:X.number().optional(),timestamp:X.string().optional()}
),gc0=X.union([X.object({
  type:X.literal("complete")}
),X.object({
  type:X.literal("cancelled")}
)]),Cc0=X.object({
  threadId:Gf,role:X.literal("assistant"),content:fKR,state:gc0.optional(),usage:EKR.optional(),readAt:X.string().nullable().optional(),messageId:Q9,createdAt:X.string().optional()}
),Ac0=X.object({
  threadId:Gf,role:X.literal("info"),content:tc0,messageId:Q9,createdAt:X.string().optional()}
),yc0=X.discriminatedUnion("role",[nc0,Cc0,Ac0]),feR=X.object({
  workspaceRoot:ln.optional(),workingDirectory:ln.optional(),rootDirectoryListing:X.string().nullable().optional(),trees:X.array(X.any()).optional(),platform:X.any().optional(),tags:X.array(X.string()).optional(),updatedAt:X.string().optional()}
),bc0=X.object({
  added:X.number().int().nonnegative(),deleted:X.number().int().nonnegative(),changed:X.number().int().nonnegative()}
),uc0=X.object({
  path:X.string(),previousPath:X.string().optional(),changeType:X.enum(["added","modified","deleted","renamed","copied","type_changed","unmerged","untracked"]),created:X.boolean(),diff:X.string(),fullFileDiff:X.string().optional(),oldContent:X.string().optional(),newContent:X.string().optional(),diffStat:bc0}
),dc0=X.object({
  hash:X.string(),shortHash:X.string(),subject:X.string()}
),kc0=X.object({
  provider:X.literal("git"),capturedAt:X.number(),available:X.boolean(),repositoryRoot:X.string().nullable(),repositoryName:X.string().nullable(),branch:X.string().nullable(),he


// ============================================================
// SECTION 1c: THREAD WIRE PROTOCOL - client_set_thread_title, deltas, etc.
// Source: chunk-037.js
// Notable: Kc0 = client_set_thread_title schema
// ============================================================

igDir:X.any().optional()}
),Oc0=X.object({
  type:X.literal("executor_guidance_discovery"),toolCallId:Ea,files:X.array(iH),isLast:X.boolean()}
),Pc0=X.object({
  type:X.literal("executor_skill_snapshot"),snapshotId:u3,skills:X.array(Vi0),isLast:X.boolean()}
),Ec0=X.object({
  type:X.literal("executor_rollback_ack"),editId:jeR,ok:X.boolean(),error:X.string().optional()}
),Mc0=X.object({
  type:X.literal("executor_environment_snapshot"),environment:feR}
),Lc0=X.object({
  type:X.literal("executor_environment_update"),environment:feR}
),Dc0=X.object({
  type:X.literal("executor_artifact_upsert"),artifact:_KR,toolCallId:Ea.optional()}
),wc0=X.object({
  type:X.literal("executor_artifact_delete"),key:u3}
),Bc0=X.object({
  type:X.literal("executor_tool_approval_request"),approval:MKR}
),Nc0=X.object({
  type:X.literal("executor_plugin_message"),message:LKR}
),Uc0=X.object({
  type:X.literal("client_append_user_msg"),content:cH,userState:OKR.optional(),discoveredGuidanceFiles:X.array(iH).optional(),agentMode:X.string().optional(),messageId:Q9}
),Hc0=X.object({
  type:X.literal("client_remove_queued_msg"),queuedMessageId:Q9}
),Wc0=X.object({
  type:X.literal("client_interrupt_queued_msg"),queuedMessageId:Q9}
),qc0=X.object({
  type:X.literal("client_edit_message"),messageId:Q9,editId:jeR,content:cH,agentMode:X.string().optional()}
),Gc0=X.object({
  type:X.literal("client_mark_message_read"),messageId:Q9}
),zc0=X.object({
  type:X.literal("client_mark_message_unread"),messageId:Q9}
),Kc0=X.object({
  type:X.literal("client_set_thread_title"),title:X.string().trim().min(1).max(256)}
),Vc0=X.object({
  auth:X.string().min(1),p256dh:X.string().min(1)}
),Fc0=X.object({
  endpoint:X.string().url(),keys:Vc0}
),Xc0=X.object({
  type:X.literal("client_upsert_notification_subscription"),subscription:Fc0,threadURL:X.string().min(1)}
),Yc0=X.object({
  type:X.literal("client_filesystem_read_directory"),requestId:lA,uri:tH}
),Qc0=X.object({
  type:X.literal("client_filesystem_read_file"),requestId:lA,uri:tH}
),Zc0=X.object({
  type:X.literal("executor_filesystem_read_directory_result"),requestId:lA,ok:X.boolean(),entries:X.array(veR).optional(),error:KI.optional()}
).superRefine((R,T)=>{
  if(R.ok){
  if(!R.entries)T.addIssue({
  code:X.ZodIssueCode.custom,message:"entries is required when ok is true"}
);
if(R.error)T.addIssue({
  code:X.ZodIssueCode.custom,message:"error must not be present when ok is true"}
);
return}
if(!R.error)T.addIssue({
  code:X.ZodIssueCode.custom,message:"error is required when ok is false"}
);
if(R.entries)T.addIssue({
  code:X.ZodIssueCode.custom,message:"en


// ============================================================
// SECTION 2: THREAD CREATION
// Source: chunk-012.js
// jM0(R) creates a new thread object: {id, created: Date.now(), v: 0, messages: []}
// gZR class is the legacy thread pool
// RhR class is the DTW thread pool (main implementation)
// ============================================================

eFiles,invokeBashTool:R.invokeBashTool}}
function jM0(R){
  return{
  id:R,created:Date.now(),v:0,messages:[]}}
class gZR{
  placeholderThreadID;
recentThreadIDsSubject=new j0([]);
threadTitlesSubject=new j0({
  }
);
threadHandlesSubject;
allConnectedThreadActivityStatusesSubject=new j0({
  }
);
legacyHandoffNavigationSubject=new H0;
initializationStatusSubject=new j0({
  pending:!0,message:QpR}
);
pendingApprovalsSubject=new j0([]);
pendingSkillsSubject=new j0([]);
attachedPoo


// ============================================================
// SECTION 2b: DTW THREAD POOL - createThread / switchThread / navigation
// Source: chunk-012.js (class RhR)
// This is the main thread pool implementation with:
//   - threadBackStack / threadForwardStack for navigation
//   - recentThreadIDs (max 50)
//   - threadHandleMap for active thread connections
//   - pendingHandoffThreads for optimistic handoff UI
// ============================================================

(),e.complete(),r.complete(),h.complete()}}}
function T40(R){
  if(!R.draft)return null;
let T=g0R(R.draft);
if(!T.text&&T.images.length===0)return null;
return T}
class RhR{
  deps;
recentThreadIDsSubject=new j0([]);
threadTitlesSubject=new j0({
  }
);
activeThreadHandleSubject=new j0(null);
allConnectedThreadActivityStatusesSubject=new j0({
  }
);
initializationStatusSubject=new j0({
  pending:!1,message:YM}
);
threadHandleMap=new Map;
pendingHandoffThreads=new Map;
threadBackStack=[];
threadForwardStack=[];
isThreadActivationInProgress=!1;
activeThreadContextID=null;
handoffService;
queueOnSubmitByDefault=!0;
constructor(R){
  this.deps=R,this.handoffService=pVR({
  configService:this.deps.configService,onFollow:this.followHandoffIfSourceActive}
)}
get recentThreadIDs$(){
  return this.recentThreadIDsSubject}
get threadTitles$(){
  return this.threadTitlesSubject}
get threadHandles$(){
  return this.activeThreadHandleSubject}
get allConnectedThreadActivityStatuses$(){
  return this.allConnectedThreadActivityStatusesSubject}
get initializationStatus$(){
  return this.initializationStatusSubject}
get activeThreadHandle(){
  if(!this.activeThreadContextID)throw Error("No active thread context");
let R=this.threadHandleMap.get(this.activeThreadContextID)??this.pendingHandoffThreads.get(this.activeThreadContextID)?.optimisticHandle.handle;
if(!R)throw Error(`No thread handle for ${
  this.activeThreadContextID}`);
return R}
get activeProvider(){
  if(!this.activeThreadContextID)return;
return this.threadHandleMap.get(this.activeThreadContextID)?.provider}
hasPendingInitialization(){
  return this.initializationStatusSubject.getValue().pending}
isDTWMode(){
  return!0}
isThreadActorsMode(){
  return this.deps.useThreadActors??!1}
getTransportConnectionState(){
  return this.activeProvider?.getConnectionState()??"disconnected"}
getTransportConnectionRole(){
  return this.activeProvider?.getConnectionRole()??null}
getCompactionStatus(){
  let R=this.activeProvider;
if(!R)return;
return{
  compactionState:R.getCompactionState()}}
async createThread(R){
  await this.activateThreadWithNavigation(R,{
  recordNavigation:!0}
)}
async switchThread(R){
  await this.activateThreadWithNavigation(R,{
  recordNavigation:!0}
)}
canNavigateBack(){
  return this.threadBackStack.length>0}
canNavigateForward(){
  return this.threadForwardStack.length>0}
async navigateBack(){
  if(!this.canNavigateBack())return;
let R=this.activeThreadContextID;
if(!R)return;
let T=this.threadBackStack.pop();
if(!T)return;
this.threadForwardStack.push(R);
try{
  await this.activateThreadWithNavigation(T,{
  recordNavigation:!1}
)}
catch(a){
  throw this.threadForwardStack.pop(),this.threadBackStack.push(T),a}}
async navigateForward(){
  if(!this.canNavigateForward())return;
let R=this.activeThreadContextID;
if(!R)return;
let T=this.threadForwardStack.pop();
if(!T)return;
this.threadBackStack.push(R);
try{
  await this.activateThreadWithNavigation(T,{
  recordNavigation:!1}
)}
catch(a){
  throw this.threadBackStack.pop(),this.threadForwardStack.push(T),a}}
followHandoffIfSourceActive=async(R)=>{
  if(this.activeThreadContextID!==R.sourceThreadID)return;
await this.switchThread(R.targetThreadID)}
;
async createHandoff(R,T){
  let a=this.threadHandleMap.get(R)?.provider.getThread()??this.activeProvider?.getThread();
if(!a||a.id!==R)throw Error("No thread available f


// ============================================================
// SECTION 2c: THREAD ACTIVATION & PROVIDER CREATION
// Source: chunk-012.js
// activateThread() - reuses existing handle or creates new provider
// activateThreadWithNavigation() - records navigation history
// createProvider() - creates the DTW transport provider
// materializePendingHandoffThread() - converts optimistic handoff to real thread
// ============================================================

vityStatuses(),Z.info("[dtw-thread-pool] activateThread:reused",{
  activeThreadID:r,handleCount:this.threadHandleMap.size}
);
return}
let e=R?this.pendingHandoffThreads.get(R):void 0;
if(R&&e){
  this.activeThreadContextID=R,this.activeThreadHandleSubject.next(e.optimisticHandle.handle),this.syncAllConnectedThreadActivityStatuses(),Z.info("[dtw-thread-pool] activateThread:optimistic",{
  activeThreadID:R,handleCount:this.threadHandleMap.size}
);
return}
this.isThreadActivationInProgress=!0,this.setInitializationStatus({
  pending:!0,message:YM}
);
try{
  let r=await this.createProvider(R);
if(T?.threadRelationships&&T.threadRelationships.length>0)r.setRelationships(T.threadRelationships);
let h=E3R({
  fileChangeTrackerStorage:this.deps.fileChangeTrackerStorage}
,this.deps.osFileSystem,r.threadId),t=new yZR(r,{
  configService:this.deps.configService,toolService:this.deps.toolService,skillService:this.deps.skillService,mcpService:this.deps.mcpService,clientID:this.deps.clientID,initialToolDiscovery:this.deps.initialToolDiscovery,fs:h,filesystem:this.deps.osFileSystem,threadService:this.deps.threadService,onThreadViewStateChange:()=>{
  this.syncAllConnectedThreadActivityStatuses()}
,handoffService:this.handoffService}
);
this.threadHandleMap.set(r.threadId,t),t.startProviderSubscription((i)=>{
  this.applyProviderState(r.threadId,i)}
),this.applyProviderState(r.threadId,r.getThread()),this.activeThreadContextID=r.threadId,this.activeThreadHandleSubject.next(t),this.addToRecentThreads(r.threadId),Z.info("[dtw-thread-pool] activateThread:created",{
  activeThreadID:r.threadId,handleCount:this.threadHandleMap.size}
)}
finally{
  this.isThreadActivationInProgress=!1,this.setInitializationStatus({
  pending:!1,message:YM}
)}}
async activateThreadWithNavigation(R,T){
  let a=this.activeThreadContextID;
await this.activateThread(R);
let e=this.activeThreadContextID;
if(T.recordNavigation&&a!==null&&e!==null&&a!==e)this.recordNavigation(a)}
applyProviderState(R,T){
  let a=this.threadHandleMap.get(R);
if(!a)return;
let e=a.resolveAuthoritativeThread(T);
a.writeThread(e);
let r=this.threadTitlesSubject.getValue();
if(r[R]!==e.title)this.threadTitlesSubject.next({...r,[R]:e.title}
);
this.syncAllConnectedThreadActivityStatuses()}
syncAllConnectedThreadActivityStatuses(){
  let R={
  }
;
for(let[T,a]of this.threadHandleMap.entries())R[T]=a.getThreadViewState();
for(let[T,a]of this.pendingHandoffThreads.entries())R[T]=a.optimisticHandle.getThreadViewState();
this.allConnectedThreadActivityStatusesSubject.next(R)}
addToRecentThreads(R){
  let T=[...this.recentThreadIDsSubject.getValue()],a=T.indexOf(R);
if(a!==-1)T.splice(a,1);
if(T.unshift(R),T.length>50)T.pop();
this.recentThreadIDsSubject.next(T)}
recordNavigation(R){
  this.threadBackStack.push(R),this.threadForwardStack=[]}
async createProvider(R){
  let T=R?void 0:(await this.deps.getThreadEnvironment()).trees?.[0]?.repository?.url,a=R?void 0:"local-client";
return erR.create({
  ampURL:this.deps.ampURL,configService:this.deps.configService,connectOnCreate:Boolean(R),executorType:a,onLegacyImportStateChange:(e)=>{
  if(e==="importing"){
  this.setInitializationStatus({
  pending:!0,message:a40}
);
return}
if(this.isThreadActivationInProgress)this.setInitializationStatus({
  pending:!0,message:YM}
)}
,repositoryURL:T,threadService:this.deps.threadService,threadId:R,workerUrl:process.env.AMP_WORKER_URL,useThreadActors:this.deps.useThreadActors,connectionMode:"executor+observer"}
)}
async materializePendingHandoffThread(R){
  let T=this.pendingHandoffThreads.get(R);
if(!T)throw Error(`No pending handoff thread for ${
  R}


// ============================================================
// SECTION 2d: UI LAYER - startAndSwitchToNewThread
// Source: chunk-044.js
// Called when user presses Ctrl+N or uses command palette
// Creates new thread via threadPool.createThread() and updates UI state
// ============================================================

heduleQueuedInterjectAfterSubmit")}
startAndSwitchToNewThread=async()=>{
  let R=this.widget.dependencies.activeThreadHandle.getThreadID();
await this.widget.dependencies.threadPool.createThread(),this.setState(()=>{
  this.onThreadSwitch(),this.previousThreadIdForHint=R??null}
)}
;
canChangeAgentModeInPromptEditor(){
  let R=!this.widget.dependencies.activeThreadHandle.isThreadEmpty(),T=this.messageViewController.editingMessageOrdinal===0,{
  isInHandoffMode:a,i


// ============================================================
// SECTION 3: THREAD TITLE GENERATION
// Source: chunk-009.js
// triggerTitleGeneration() is called:
//   - After thread resume (restoring from disk)
//   - After first user message submission
// Logic:
//   1. Skip if thread has mainThreadID (is a subthread) or already has title
//   2. Find first eligible user message (skip if message matches skipPatterns)
//   3. Call deps.generateThreadTitle(message, threadId, configService, signal)
//   4. On success, update thread with {type:"title", value: title, usage}
// Config: "agent.skipTitleGenerationIfMessageContains" - array of strings
// ============================================================

>{
  Z.debug("Failed to handle plugin agent.end continue",{
  error:T}
)}
)}
triggerTitleGeneration(){
  if(this.thread.mainThreadID!==void 0||this.thread.title)return;
this.ops.titleGeneration?.abort(),this.ops.titleGeneration=new AbortController;
let R=this.ops.titleGeneration.signal;
this.getConfig(R).then((T)=>{
  if(R.aborted)return;
let a=T.settings?.["agent.skipTitleGenerationIfMessageContains"],e=Array.isArray(a)?a.filter((h)=>typeof h==="string"):[],r=this.thread.messages.find((h)=>{
  if(h.role!=="user")return!1;
let t=bh(h.content);
if(!t)return!1;
if(e.length===0)return!0;
return!e.some((i)=>t.includes(i))}
);
if(Z.debug("Checking for message to generate title for",{
  skipPatterns:e,rawSkipPatterns:a,hasFirstEligibleMessage:r!==void 0,firstEligibleMessageId:r?.messageId}
),r)this.deps.generateThreadTitle(r,this.thread.id,this.deps.configService,R).then(({
  title:h,usage:t}
)=>{
  if(R.aborted||this.isDisposed)return;
if(h!==void 0&&this.thread.title!==h)this.updateThread({
  type:"title",value:h,usage:t}
)}
).catch((h)=>{
  if(!uh(h))Z.error("generateThreadTitle error",h,{
  name:"ThreadWorker",threadID:this.threadID}
);
else Z.info("Title generation aborted",{
  firstEligibleMessageId:r?.messageId,threadID:this.threadID}
)}
)}
).catch((T)=>{
  if(!uh(T))Z.error("ThreadWorker title generation config error",T);
else Z.info("Title generation aborted in outer catch",{
  threadID:this.threadID}
)}
)}
async getWorkspaceRoot(R){
  let T=awa


// ============================================================
// SECTION 3b: THREAD WORKER - ops.titleGeneration abort controller
// Source: chunk-009.js
// The ThreadWorker class maintains ops = {tools, toolMessages, inference, titleGeneration}
// titleGeneration is an AbortController that gets aborted/recreated on each trigger
// ============================================================

ter permission change",{
  toolName:T.name,toolUseID:R,reason:a.reason}
)}
catch(T){
  Z.warn("Failed to re-evaluate blocked tool",{
  error:T,toolUseID:R}
)}}
ops={
  tools:{
  }
,toolMessages:{
  }
,inference:null,titleGeneration:null}
;
_state=new j0("initial");
state=this._state.pipe(f9(),k3({
  shouldCountRefs:!0}
));
handleMutex=new fu;
ephemeralError=new j0(void 0);
ephemeralErrorRetryAttempt=0;
retryCountdownSeconds=new j0(void 0);
retryTimer=null;
retrySession=0;
_inferenceState=new j0("idle");
_turnStartTime=new j0(void 0);
_turnElapsedMs=new j0(void 0);
fileChanges=new j0({
  files:[]}
);
get inferenceState(){
  return this._inferenceState.getValue()}
toolCallUpdates=new H0;
trackedFiles=new Mo;
discoveredGuidanceFileURIs=new Set;
f


// ============================================================
// SECTION 4: THREAD PERSISTENCE
// Source: chunk-009.js, chunk-012.js
// Threads are persisted via threadService which provides:
//   - exclusiveSyncReadWriter(threadID) - get read/write handle for a thread
//   - observe(threadID) - get observable for thread changes
//   - updateThreadMeta(threadID, meta) - update thread metadata
//   - get(threadID) - fetch thread data
//   - invalidateThreadListCache() - force refresh thread list
// The ThreadWorker acquires a thread via acquireThread() which calls
// threadService.exclusiveSyncReadWriter(threadID)
// Updates happen via updateThread() which calls threadReadWriter.update()
// ============================================================

eadReadWriter.read())}
async acquireThread(){
  if(!this.threadReadWriter)this.threadReadWriter=await this.deps.threadService.exclusiveSyncReadWriter(this.threadID),this._state.next("active")}
__testing__setThread(R){
  }
__testing__getDeps(){
  return this.deps}
async resume(){
  if(this.resumed)return;
if(this.resumed=!0,this.handleCalled)throw Error("cannot call ThreadWorker.resume after ThreadWorker.handle");
if(await this.acquireThread(),!await this.isAutoSnapshotEnabled())await this.restoreFileChangesFromBackups();
let R=this.thread.messages.at(-1);
if(R?.role==="assistant"&&R.state.type==="streaming")this.updateThread({
  type:"thread:truncate",fromIndex:this.thread.messages.length-1}
);
if(this.trackFilesFromHistory(),this.triggerTitleGeneration(),!this.shouldResumeFromLastMessage(R))return;
await this.toolOrchestrator.onResume(),this.setupSettingsChangeHandlers(),this.setupEphemeralErrorLogging(),this.replayLastCompleteMessage()}
resumed=!1;
shouldResumeFromLastMessage(R){
  if(mnT(R)||fnT(R)&&!this.shouldC


// ============================================================
// SECTION 4b: THREAD PERSISTENCE - uZR helper (create/resume thread)
// Source: chunk-012.js
// uZR() is the main function for initializing or resuming a thread:
//   1. Gets thread from service or creates via exclusiveSyncReadWriter
//   2. Sets agentMode if empty thread
//   3. Updates thread metadata
//   4. Sets up onFirstAssistantMessage observer
//   5. Resumes the thread worker
// ============================================================

th>0)T.push(...R.images);
return T}
async function uZR(R,T){
  let{
  thread:a,threadMeta:e}=T,r=a?.id??T.threadID??jt(),h=tr.get(r),t=h?.thread??await R.threadService.get(r);
if(a&&!t){
  let c=await R.threadService.exclusiveSyncReadWriter(r);
c.write(a),await c.asyncDispose(),t=a}
let i=h??await tr.getOrCreateForThread(R,r);
if(T.agentMode&&!t?.agentMode&&(!t||$e(t)===0))await i.handle({
  type:"agent-mode",mode:T.agentMode}
);
if(e&&a)await R.threadService.updateThreadMeta(r,e);
if(e&&!a){
  let c=R.threadService.observe(r).subscribe((o)=>{
  if(o.messages.length===0)return;
c.unsubscribe(),R.threadService.updateThreadMeta(r,e).catch(()=>{
  return}
)}
)}
if(T.onFirstAssistantMessage){
  let c=R.threadService.observe(r).subscribe(async(o)=>{
  if(Er(o,"assistant"))await T.onFirstAssistantMessage?.(r),c.unsubscribe()}
)}
return await i.resume(),i}
async function dZR(R,T,a){
  await R.validateThreadOwnership?.(T,a);
let e=await R.threadService.get(T)??void 0;
return uZR(R.workerDeps,{
  threadID:T,threadMeta:R.switchThreadVisibility?fC(R.switchThreadVisibility):void 0,agentMode:e?void 0:R.switchThreadAgentMode,thread:e,onFirstAssistantMessage:R.onFirstAssistantMessage}
)}
async function l40(R,T,a){
  let e=T?await dZR(R,T,{
  nonBlockingOwnershipCheck:a?.nonBlockingOwnershipCheck??!1}
):await R.createThread();
return new ThR(R,e)}
class ThR{
  deps;
queueOnSubmitByDefault=!1;
restoreTo=this.truncateThread.bind(this);
stateTracker;
activeThreadH


// ============================================================
// SECTION 4c: CHATKIT API - Remote Thread Storage
// Source: chunk-030.js
// The chatkit API provides REST endpoints for thread management:
//   /chatkit/threads/{id} - retrieve, list, delete threads
//   /chatkit/threads/{id}/items - list thread items
//   /threads/{id}/messages - create, retrieve, update, list, delete messages
//   /threads/{id}/runs/{run_id}/steps - retrieve, list run steps
// Headers include: "OpenAI-Beta": "chatkit_beta=v1" or "assistants=v2"
// ============================================================

it/sessions/${
  T}/cancel`,{...a,headers:v0([{"OpenAI-Beta":"chatkit_beta=v1"}
,a?.headers])}
)}}}
),iyR=SR(()=>{
  J8(),_3(),e8(),AF=class extends w0{
  retrieve(T,a){
  return this._client.get(wT`/chatkit/threads/${
  T}`,{...a,headers:v0([{"OpenAI-Beta":"chatkit_beta=v1"}
,a?.headers])}
)}
list(T={
  }
,a){
  return this._client.getAPIList("/chatkit/threads",kx,{
  query:T,...a,headers:v0([{"OpenAI-Beta":"chatkit_beta=v1"}
,a?.headers])}
)}
delete(T,a){
  return this._client.delete(wT`/chatkit/threads/${
  T}`,{...a,headers:v0([{"OpenAI-Beta":"chatkit_beta=v1"}
,a?.headers])}
)}
listItems(T,a={
  }
,e){
  return this._client.getAPIList(wT`/chatkit/threads/${
  T}/items`,kx,{
  query:a,...e,headers:v0([{"OpenAI-Beta":"chatkit_beta=v1"}
,e?.headers])}
)}}}
),cyR=SR(()=>{
  tyR(),tyR(),iyR(),iyR(),G$=class extends w0{
  constructor(){
  super(...arguments);
this.sessions=new CF(this._client),this.threads=new AF(this._client)}}
,G$.Sessions=CF,G$.Threads=AF}
),oyR=SR(()=>{
  J8(),_3(),e8(),yF=class extends w0{
  create(T,a,e){
  return this._client.post(wT`/threads/${
  T}/messages`,{
  body:a,...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}
retrieve(T,a,e){
  let{
  thread_id:r}=a;
return this._client.get(wT`/threads/${
  r}/messages/${
  T}`,{...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}
update(T,a,e){
  let{
  thread_id:r,...h}=a;
return this._client.post(wT`/threads/${
  r}/messages/${
  T}`,{
  body:h,...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}
list(T,a={
  }
,e){
  return this._client.getAPIList(wT`/threads/${
  T}/messages`,Y3,{
  query:a,...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}
delete(T,a,e){
  let{
  thread_id:r}=a;
return this._client.delete(wT`/threads/${
  r}/messages/${
  T}`,{...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}}}
),lyR=SR(()=>{
  J8(),_3(),e8(),bF=class extends w0{
  retrieve(T,a,e){
  let{
  thread_id:r,run_id:h,...t}=a;
return this._client.get(wT`/threads/${
  r}/runs/${
  h}/steps/${
  T}`,{
  query:t,...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}
list(T,a,e){
  let{
  thread_id:r,...h}=a;
return this._client.getAPIList(wT`/threads/${
  r}/runs/${
  T}/steps`,Y3,{
  query:h,...e,headers:v0([{"OpenAI-Beta":"assistants=v2"}
,e?.headers])}
)}}}
),kPT=SR(()=>{
  yn()}
),nU=SR(()=>{
  dC(),kPT(),iU(),f6R()}
);
aNR=SR(()=>{
  Pc(),Q6R(),Rl(),H8R(),nU(),fS=class extends lU{
  constructor(){
  super(...arguments);
Pe.add(this),m5.set(this,[]),Kc.set(this,{
  }
),sE.set(this,{
  }
),Ui.set(this,void 0),KA.set(this,void 0),Bd.set(this,void 0),VA.set(this,void 0),_E.set(this,void 0),Vh.set(this,void 0),$E.set(this,void 0),jE.set(this,void 


// ============================================================
// SECTION 4d: THREAD WORKER SERVICE - Global Singleton
// Source: chunk-033.js
// tr = new yWR (threadWorkerService) is the global thread worker manager
// It maintains a map of thread workers and provides:
//   - getOrCreateForThread() 
//   - createThreadWorker()
//   - seedThreadMessages()
//   - applyParentRelationship()
// A gauge "thread_worker_count" tracks active workers
// ============================================================

,MI(),L0(),gf(),wDT(),wLR(),UDT()}
),AWR={
  }
;
Q3(AWR,{
  threadWorkerService:()=>tr}
);
hA=SR(()=>{
  vT(),hT(),tpT(),IET(),lf(),L0(),sET(),QDT(),FbR=c0(l0(),1),XbR=FbR.metrics.getMeter("thread-worker-service"),cL=XbR.createGauge("thread_worker_count",{
  description:"Number of active thread workers"}
),tr=new yWR}
),bWR=TR((R)=>{
  Object.defineProperty(R,"__esModule",{
  value:!0}
),R.dynamicAnchor=void 0;
var T=E9(),a


// ============================================================
// SECTION 5: THREAD NAVIGATION (Back/Forward)
// Source: chunk-012.js (class RhR)
// The DTW thread pool implements browser-like navigation:
//   - threadBackStack: array of previously visited thread IDs
//   - threadForwardStack: array of thread IDs navigated back from
//   - navigateBack(): pop from back stack, push current to forward stack
//   - navigateForward(): pop from forward stack, push current to back stack
//   - recordNavigation(id): push to back stack, clear forward stack
// Both navigate functions use activateThreadWithNavigation with recordNavigation:false
// Error handling: if activation fails, restore the stacks
// ============================================================
// (See SECTION 2b above for the full implementation)

his.newsFeedEntries=[...a,...this.newsFeedEntries]}
)}
,error:(a)=>{
  Z.error("News feed error:",a)}}
)}
navigateBack=async()=>{
  await this.widget.dependencies.threadPool.navigateBack(),this.onThreadSwitch()}
;
navigateForward=async()=>{
  await this.widget.dependencies.threadPool.navigateForward(),this.onThreadSwitch()}
;
onThreadSwitch(){
  this.handoffController?.resetUIState(),this.exitQueueMode(),this.isMessa


// ============================================================
// SECTION 5b: NAVIGATION UI BINDINGS
// Source: chunk-044.js
// navigateBack and navigateForward are exposed in the command palette context:
//   canNavigateBack: threadPool.canNavigateBack()
//   canNavigateForward: threadPool.canNavigateForward()
// ============================================================

idget.dependencies.threadPool.canNavigateForward(),canUseAmpFree:this.freeTierStatus.canUseAmpFree,isDailyGrantEnabled:this.freeTierStatus.isDailyGrantEnabled,switchToThread:async(t)=>{
  await this.switchToExistingThread(t),this.setState(()=>{
  this.isMessageViewInSelectionMode=!1,this.imagePreview=null}
);
return}
,handleHandoff:async(t,i)=>{
  let{
  goal:c,images:o}=i;
if(!c)return{
  ok:!1,error:Error("Goal is required")}
;
try{
  let C=this.widget.dependencies.activeThreadHandle,g=C.getThreadID();
if(!g)return{
  ok


// ============================================================
// SECTION 6: THREAD LISTING / PICKER
// Source: chunk-044.js
// loadThreadsForPicker():
//   1. Creates D9T (thread summary observer) from threadService
//   2. Calls observeThreadSummaries("", {includeArchived: true})
//   3. Subscribes to updates, populates threadsForPicker array
// unloadThreadsForPicker():
//   1. Unsubscribes from thread list
//   2. Clears stats cache
//   3. Invalidates thread list cache
// Thread picker is shown via command palette with commandId "continue" or "mention-thread"
// filterThreadPickerByWorkspace toggle filters threads by current workspace
// ============================================================

encies.pluginService.reload():void 0,pluginService:this.widget.dependencies.pluginService}}
;
loadThreadsForPicker(){
  if(this.threadLoadSubscription)return;
this.setState(()=>{
  this.isLoadingThreads=!0,this.threadLoadError=!1}
);
let R=new D9T(this.widget.dependencies.threadService);
this.threadLoadSubscription=R.observeThreadSummaries("",{
  includeArchived:!0}
).subscribe({
  next:(T)=>{
  this.setState(()=>{
  this.threadsForPicker=T,this.isLoadingThreads=!1}
)}
,error:(T)=>{
  Z.error("Failed to load threads",{
  error:T}
),this.setState(()=>{
  this.isLoadingThreads=!1,this.threadLoadError=!0}
)}}
)}
updateGitBranch=async()=>{
  let R=await pq0(process.cwd());
this.setState(()=>{
  this.currentGitBranch=R}
)}
;
removeBashInvocation=(R)=>{
  let T=this.pendingBashInvocations.get(R);
if(T){
  clearTimeout(T.showTimer),this.pendingBashInvocations.delete(R);
return}
let a=this.bashInvocationShownAt.get(R);
if(a!==void 0){
  let e=Date.now()-a,r=500;
if(e<500){
  if(!this.bashInvocationRemoveTimers.has(R))this.bashInvocationRemoveTimers.set(R,setTimeout(()=>{
  this.bashInvocationRemoveTimers.delete(R),this.doRemoveBashInvocation(R)}
,500-e));
return


// ============================================================
// SECTION 6b: RECENT THREADS
// Source: chunk-044.js
// getCommandPaletteContext provides:
//   recentThreadIDs: from widget.dependencies (max 50, maintained by addToRecentThreads)
//   currentThreadID: from threadState.mainThread.id
//   threads: this.threadsForPicker (loaded from threadService)
// ============================================================

mmandPaletteContext=(R)=>{
  let{
  threadState:T,recentThreadIDs:a}=this.widget.dependencies;
if(!T.mainThread)return null;
let e=R??this.lastRootContext;
if(!e)return null;
let r=qT.file(process.cwd()),h=f0(r);
return{
  recentThreadIDs:a,currentThreadID:T.mainThread.id,contextFallback:e,context:R,threadPool:this.widget.dependencies.threadPool,createSystemPromptDeps:this.widget.dependencies.createSystemPromptDeps,activeThreadHandle:this.widget.dependencies.activeThreadHandle,editorState:this.textController,isProcessing:this.isProcessing(),thread:T.mainThread,ampURL:this.tuiContext.ampURL,logFile:this.tuiContext.logFile,threadService:this.widget.dependencies.threadService,configService:this.widget.dependencies.configService,skillService:this.widget.dependencies.skillService,openInEditor:this.openInEdit


// ============================================================
// SECTION 7: THREAD MENTIONS (@@)
// Source: chunk-041.js, chunk-044.js
// 
// The @@ feature allows referencing other threads from within a message:
//
// TRIGGER DETECTION (chunk-041.js):
//   - PromptEditor detects when user types "@" which triggers autocomplete
//   - If the autocomplete query is exactly "@" (double-@), it calls onDoubleAtTrigger
//   - The autocomplete UI shows options with "@@" prefix for thread mentions
//   - On option selected: replaces @@ with either "@:" (commit) or "@@" (thread mention)
//
// HANDLER (chunk-044.js):
//   handleDoubleAtTrigger:
//   1. Finds last "@@" position in text before cursor
//   2. Opens command palette with commandId "mention-thread"
//   3. On thread selected, calls insertThreadMention()
//
//   insertThreadMention(controller, threadId):
//   1. Finds last "@@" in text
//   2. Replaces "@@" with "@{threadId}" + trailing space
//   3. Updates cursor position
//
// The thread picker loads all threads including archived ones for mention selection.
// ============================================================

// --- chunk-041.js: Autocomplete option handling ---

k1R=class k1R extends KT{
  props;
_effectiveFocusNode;
_textChangeListener=null;
_isCommitMode=!1;
_imageUploadSpinner=new Sa;
_imageUploadSpinnerInterval=null;
constructor(R){
  super();
this.props=R}
buildOptions=async(R)=>{
  let T=this.props.controller.text,a=this.props.controller.cursorPosition,e=new Ff().detect(T,a);
if(e&&this.props.completionBuilder){
  if(e.query==="@"&&this.props.onDoubleAtTrigger)return this.props.onDoubleAtTrigger(this.props.controller),[];
let r=e.query.toLowerCase().startsWith(Cx0);
if(r!==this._isCommitMode)this._isCommitMode=r,this.setState();
return await this.props.completionBuilder.buildOptions(e)}
if(this._isCommitMode)this._isCommitMode=!1,this.setState();
return[]}
;
defaultOnOptionSelected=(R)=>{
  switch(R.type){
  case"hint":{
  let T=this.props.controller.text,a=this.props.controller.cursorPosition,e=T.slice(0,a).lastIndexOf("@");
if(e!==-1){
  let r=T.slice(0,e),h=T.slice(a),t=R.kind==="commit"?"@:":"@@",i=r+t+h;
this.props.controller.clear(),this.props.controller.insertText(i),this.props.controller.cursorPosition=e+t.length}
return}
case"file":{
  let T=this.props.controller.text,a=this.props.controller.cursorPosition,e=T.slice(0,a).lastIndexOf("@");
if(e!==-1){
  let r=T.slice(0,e),h=T.slice(a),t=r+`@${
  R.path} `+h;
this.props.controller.clear(),this.props.controller.insertText(t),this.props.controller.cursorPosition=e+1+R.path.length+1}
break}
case"commit":{
  let T=this.props.controller.text,a=this.props.controller.cursorPosition,e=T.slice(0,a).lastIndexOf("@");
if(e!==-1){
  let r=T.slice(0,e),h=T.slice(a),t=`git-commit(${
  R.hash}
)`,i=r+t+" "+h;
this.props.controller.clear(),this.props.controller.insertText(i),this.props.controller.cursorPosition=e+t.length+1}
break}}}
;
initState(){
  super.initState(),this._effectiveFocusNode=this.props.focusNode||new g8({
  debugLabel:"PromptEditorFocus"}
),this._textChangeListener=()=>{
  this.setState()}
,this.props.controller.addListener(this._textChangeListener),this.props.controller.onInsertText=(R,T)=>{
  if(R.length<=3)return!0;
let a=WS0(R);
if(a.length===0)return!0;
if(this.props.onInsertImage){
  for(let e of a)this.props.onInsertImage(e);
return!1}
return!0}
,this.syncImageUploadSpinner()}
didUpdateWidget(R){
  super.didUpdateWidget(R),this.props=this.widget


// --- chunk-041.js: Option view rendering for @@ mentions ---

erflow:"ellipsis"}
)}
),new pR({
  text:new F(` ${
  o.relativeDate}`,new iR({
  color:A,dim:!0}
))}
)]}
)}
);
let u=[];
switch(o.type){
  case"file":u.push(new F("@",new iR({
  color:l}
))),u.push(new F(o.path,new iR({
  color:n}
)));
break;
case"hint":u.push(new F(o.kind==="commit"?"@:":"@@",new iR({
  color:y}
))),u.push(new F(" ",new iR({
  }
))),u.push(new F(o.message,new iR({
  color:y}
)));
break}
let b=nx0(o);
if(b)u.push(new F(" - ",new iR({
  color:A,dim:!0}
))),u.push(new F(b,new iR({
  color:A,dim:!0}
)));
return new OT({
  decoration:new i8(g),child:new pR({
  text:new F("",void 0,u),maxLines:1,overflow:"ellipsis"}
)}
)}}
),i=[];
if(this.props.topWidget)i.push(this.props.topWidget);
if(r||h){
  let c=[];
if(r)c.push(r);
if(r&&h)c.push(new pR({
  text:new F("  ")}
));
if(h)c.push(h);
let o=new OT({
  padding:RT.only({
  bottom:1}
),child:new T0({
  mainAxisSize:


// --- chunk-044.js: handleDoubleAtTrigger and insertThreadMention ---

=()=>{
  this.setState(()=>{
  this.filterThreadPickerByWorkspace=!this.filterThreadPickerByWorkspace}
)}
;
handleDoubleAtTrigger=(R)=>{
  let{
  text:T,cursorPosition:a}=R,e=T.slice(0,a).lastIndexOf("@@"),r=R!==this.textController;
if(Z.info("[handleDoubleAtTrigger] called",{
  isEditingPreviousMessage:r,text:T,cursor:a,atAtIndex:e}
),r)this.setState(()=>{
  this.paletteOnThreadMentionSelected=(h)=>{
  let t=this.messageViewController.editingController;
if(!t){
  Z.warn("[paletteOnThreadMentionSelected] no editing controller found");
return}
this.insertThreadMention(t,h)}}
);
else this.setState(()=>{
  this.paletteOnThreadMentionSelected=null}
);
this.showCommandPalette({
  type:"standalone",commandId:"mention-thread",onBeforeExecute:r?void 0:()=>{
  if(e!==-1){
  let h=R.text,t=h.slice(0,e)+h.slice(e+2);
R.text=t,R.cursorPosition=e}}
,onSubmit:()=>{
  this.setState(()=>{
  this.paletteOnThreadMentionSelected=null}
),this.dismissPalette()}
,onCancel:()=>{
  this.setState(()=>{
  this.paletteOnThreadMentionSelected=null}
),this.dismissPalette()}}
)}
;
insertThreadMention(R,T){
  let{
  text:a,cursorPosition:e}=R,r=a.slice(0,e).lastIndexOf("@@");
if(r!==-1){
  let h=a.slice(e),t=h.length===0,i=`@${
  T}
${
  t?" ":""}`,c=a.slice(0,r)+i+h,o=r+i.length;
R.text=c,R.cursorPosition=o}
else R.insertText(`@${
  T} `)}
showCommandPalette(R){
  if(this.handoffState.isGeneratingHandoff)return;
let T=!this.isShowingPalette;
if(this.setState(()=>{
  if(this.isShowingPalette=T,this.palett


// ============================================================
// SECTION 8: THREAD HANDLE - Write/Update Operations
// Source: chunk-012.js (class yZR - DTW thread handle)
// writeThread(R) - writes resolved thread to threadSubject
// resolveAuthoritativeThread(R) - resolves optimistic projections
// submitMessage() - submits user message to thread:
//   1. Creates optimistic update via optimisticThreadProjection
//   2. Writes optimistic thread state
//   3. Sends message to provider
//   4. On failure, rolls back optimistic update
// editMessage() - edits existing user message
// ============================================================

tion.setAgentLoopState(e),e==="error")this.inferenceErrorsSubject.next(Error("Agent failed to complete the request."));
this.updateThreadViewStateFromProvider()}}
);
this.providerSubscriptions={
  unsubscribe:()=>{
  T.unsubscribe(),a.unsubscribe()}}}
writeThread(R){
  this.currentAgentLoopState=this.provider.getAgentLoopState(),this.threadSubject.next(R)}
providerThread(){
  return this.provider.getThread()}
resolveAuthoritativeThread(R){
  return this.optimisticThreadProjection.resolve(R)}
getThreadViewState(){
  return this.threadViewStateSubject.getValue()}
getCurrentThread(){
  return this.threadSubject.getValue()}
getThreadID(){
  return this.getCurrentThread().id}
getThreadTitle(){
  return this.getCurrentThread().title}
getAgentMode(){
  return this.getCurrentThread().agentMode}
getMessages(){
  return this.getCurrentThread().messages}
getQueuedMessages(){
  return this.getCurrentThread().queuedMessages??[]}
getInitialTreeURI(){
  return this.getCurrentThread().env?.initial.trees?.[0]?.uri}
shouldAutoSubmitDraft(){
  let R=this.getCurrentThread();
if(!R.autoSubmitDraft)return!1;
return $e(R)===0}
getEmptyHandoffParentThreadID(){
  let R=this.getCurrentThread();
if($e(R)>0)return;
return hPR(R,"handoff")?.threadID}
isThreadEmpty(){
  return $e(this.getCurrentThread())===0}
isStreaming(){
  let R=this.getMessages().at(-1);
return R?.role==="assistant"&&R.state.type==="streaming"}
getResolvedTokenUsage(){
  return xt(this.thread$.getValue())}
async dispose(){
  this.providerSubscriptions?.unsubscribe(),this.providerSubscriptions=null;
for(let R of this.transportSubscriptions)R.unsubscribe();
this.transportSubscriptions.length=0,this.clearRetryCountdownTimer(),this.executorRuntime.dispose(),await this.provider.disposeAndWaitForClose(),this.threadSubject.complete(),this.threadStateSubject.complete(),this.threadViewStateSubject.complete(),this.inferenceErrorsSubject.complete(),this.pendingApprovalsSubject.complete(),this.pendingSkillsSubject.complete()}
async sendMessage(R){
  if(R.editIndex!==void 0){
  await this.ensureProviderReadyForExecutorActions();
let r=this.thread$.getValue(),h=r.messages[R.editIndex];
if(!h||h.role!=="user"||!h.dtwMessageID)throw Error("Unable to edit message: missing DTW message ID");
let t=r.messages.findIndex((c)=>c.role==="user");
if(R.editIndex===t&&R.agentMode&&r.agentMode!==R.agentMode)this.provider.setAgentMode(R.agentMode,{
  overwrite:!0}
),this.updateThread((c)=>{
  c.agentMode=R.agentMode}
);
this.provider.editUserMessage(h.dtwMessageID,R.content,HSR(),R.agentMode);
let i=this.optimisticThreadProjection.optimisticUpdate({
  type:"edit",targetMessageID:h.dtwMessageID,content:R.content}
);
this.writeThread(i);
return}
let T=this.thread$.getValue();
if(!T.messages.some((r)=>r.role==="user")&&R.agentMode&&T.agentMode!==R.agentMode)this.provider.setAgentMode(R.agentMode,{
  overwrite:!0}
),this.updateThread((r)=>{
  r.agentMode=R.agentMode}
);
let a=rb(),e=this.optimisticThreadProjection.optimisticUpdate({
  type:"submit",clientMessageID:a,content:R.content}
);
this.writeThread(e);
try{
  let r=R.prepareContentForSend?await R.prepareContentForSend(R.content):R.content;
await this.ensureProviderConnectedForClientWrites();
let h=await this.discoverGuidanceFilesForUserMessage(r);
if(h&&h.length>0){
  let i=h.map((o)=>({
  uri:o.uri,lineCount:o.lineCount??0,...typeof o.content==="string"?{
  content:o.content}:{
  }}
)),c=this.optimisticThreadProjection


// ============================================================
// SECTION 9: THREAD HANDOFF (Sub-threads / Forks)
// Source: chunk-012.js
// createHandoff() on the thread pool:
//   1. Gets parent thread and repository URL
//   2. Creates handoff draft via handoffService
//   3. Creates relationship: {threadID, type:"handoff", messageIndex, comment}
//   4. Creates optimistic thread with relationships
//   5. Returns new thread ID for UI navigation
// Thread relationships define parent-child connections:
//   - type: "fork" | "handoff" | "mention"
//   - role: "parent" | "child"
// ============================================================

sageIndex:r.parentMessageIndex}:{
  }
,comment:T.goal}
,i=jt(),c=Date.now(),o=[{
  threadID:R,type:"handoff",role:"child",...r.parentMessageIndex!==void 0?{
  messageIndex:r.parentMessageIndex}:{
  }
,createdAt:c,comment:T.goal}],C={
  id:i,created:Date.now(),v:0,messages:[],relationships:o,...h?{
  agentMode:h}:{
  }
,...r.content.length>0?{
  draft:r.content,autoSubmitDraft:!1}:{
  }}
,g=R40({
  thread:C,materialize:()=>this.materializePendingHandoffThread(i)}
);
return this.pendingHandoffThreads.set(i,{
  agentMode:h??void 0,relationship:t,repositoryURL:e,threadRelationships:o,optimisticHandle:g,materializingPromise:null}
),i}
async dispose(){
  for(let R of this.threadHandleMap.values())await R.dispose();
for(let R of this.pendingHandoffThreads.values())await R.optimisticHandle.dispose();
this.threadHandleMap.clear(),this.pendingHandoffThreads.clear(),this.activeThreadHandleSubject.complete(),this.allConnectedThreadActivityStatusesSubject.complete(),this.initializationStatusSubject.complete(),this.threadTitlesSubject.complete()