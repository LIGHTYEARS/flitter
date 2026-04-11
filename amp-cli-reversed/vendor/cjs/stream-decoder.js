// Module: stream-decoder
// Original: $vT
// Type: CJS (RT wrapper)
// Exports: StreamDecoder
// Category: util

// Module: $vT (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.StreamDecoder=void 0;
var R;
(function(e){e[e.NO_DATA=0]="NO_DATA",e[e.READING_SIZE=1]="READING_SIZE",e[e.READING_MESSAGE=2]="READING_MESSAGE"})(R||(R={}));
class a{constructor(e){this.maxReadMessageLength=e,this.readState=R.NO_DATA,this.readCompressFlag=Buffer.alloc(1),this.readPartialSize=Buffer.alloc(4),this.readSizeRemaining=4,this.readMessageSize=0,this.readPartialMessage=[],this.readMessageRemaining=0}write(e){let t=0,r,h=[];
while(t<e.length)switch(this.readState){case R.NO_DATA:this.readCompressFlag=e.slice(t,t+1),t+=1,this.readState=R.READING_SIZE,this.readPartialSize.fill(0),this.readSizeRemaining=4,this.readMessageSize=0,this.readMessageRemaining=0,this.readPartialMessage=[];
break;
case R.READING_SIZE:if(r=Math.min(e.length-t,this.readSizeRemaining),e.copy(this.readPartialSize,4-this.readSizeRemaining,t,t+r),this.readSizeRemaining-=r,t+=r,this.readSizeRemaining===0){if(this.readMessageSize=this.readPartialSize.readUInt32BE(0),this.maxReadMessageLength!==-1&&this.readMessageSize>this.maxReadMessageLength)throw Error(`Received message larger than max (${this.readMessageSize} vs ${this.maxReadMessageLength})`);if(this.readMessageRemaining=this.readMessageSize,this.readMessageRemaining>0)this.readState=R.READING_MESSAGE;else{let i=Buffer.concat([this.readCompressFlag,this.readPartialSize],5);this.readState=R.NO_DATA,h.push(i)}}break;case R.READING_MESSAGE:if(r=Math.min(e.length-t,this.readMessageRemaining),this.readPartialMessage.push(e.slice(t,t+r)),this.readMessageRemaining-=r,t+=r,this.readMessageRemaining===0){let i=[this.readCompressFlag,this.readPartialSize].concat(this.readPartialMessage),c=Buffer.concat(i,this.readMessageSize+5);this.readState=R.NO_DATA,h.push(c)}break;default:throw Error("Unexpected read state")}return h}}T.StreamDecoder=a}