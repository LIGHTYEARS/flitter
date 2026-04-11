// Module: pick-result-type
// Original: rm
// Type: CJS (RT wrapper)
// Exports: PickResultType, QueuePicker, UnavailablePicker
// Category: util

// Module: rm (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.QueuePicker=T.UnavailablePicker=T.PickResultType=void 0;
var R=Yt(),a=c8(),e;
(function(h){h[h.COMPLETE=0]="COMPLETE",h[h.QUEUE=1]="QUEUE",h[h.TRANSIENT_FAILURE=2]="TRANSIENT_FAILURE",h[h.DROP=3]="DROP"})(e||(T.PickResultType=e={}));
class t{constructor(h){this.status=Object.assign({code:a.Status.UNAVAILABLE,details:"No connection established",metadata:new R.Metadata},h)}pick(h){return{pickResultType:e.TRANSIENT_FAILURE,subchannel:null,status:this.status,onCallStarted:null,onCallEnded:null}}}T.UnavailablePicker=t;
class r{constructor(h,i){this.loadBalancer=h,this.childPicker=i,this.calledExitIdle=!1}pick(h){if(!this.calledExitIdle)process.nextTick(()=>{this.loadBalancer.exitIdle()}),this.calledExitIdle=!0;
if(this.childPicker)return this.childPicker.pick(h);
else return{pickResultType:e.QUEUE,subchannel:null,status:null,onCallStarted:null,onCallEnded:null}}}T.QueuePicker=r}