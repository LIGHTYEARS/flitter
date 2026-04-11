// Module: unknown-upR
// Original: upR
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: upR (CJS)
(T,R)=>{var a=X0T(),{Duplex:e}=qT("stream");
function t(c){c.emit("close")}function r(){if(!this.destroyed&&this._writableState.finished)this.destroy()}function h(c){if(this.removeListener("error",h),this.destroy(),this.listenerCount("error")===0)this.emit("error",c)}function i(c,s){let A=!0,l=new e({...s,autoDestroy:!1,emitClose:!1,objectMode:!1,writableObjectMode:!1});
return c.on("message",function(o,n){let p=!n&&l._readableState.objectMode?o.toString():o;
if(!l.push(p))c.pause()}),c.once("error",function(o){if(l.destroyed)return;
A=!1,l.destroy(o)}),c.once("close",function(){if(l.destroyed)return;
l.push(null)}),l._destroy=function(o,n){if(c.readyState===c.CLOSED){n(o),process.nextTick(t,l);
return}let p=!1;
if(c.once("error",function(_){p=!0,n(_)}),c.once("close",function(){if(!p)n(o);
process.nextTick(t,l)}),A)c.terminate()},l._final=function(o){if(c.readyState===c.CONNECTING){c.once("open",function(){l._final(o)});
return}if(c._socket===null)return;
if(c._socket._writableState.finished){if(o(),l._readableState.endEmitted)l.destroy()}else c._socket.once("finish",function(){o()}),c.close()},l._read=function(){if(c.isPaused)c.resume()},l._write=function(o,n,p){if(c.readyState===c.CONNECTING){c.once("open",function(){l._write(o,n,p)});
return}c.send(o,p)},l.on("end",r),l.on("error",h),l}R.exports=i}