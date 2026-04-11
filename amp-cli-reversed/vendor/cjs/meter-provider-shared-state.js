// Module: meter-provider-shared-state
// Original: EtR
// Type: CJS (RT wrapper)
// Exports: MeterProviderSharedState
// Category: util

// Module: etR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.InMemoryLogRecordExporter=void 0;
var R=$9();
class a{_finishedLogRecords=[];
_stopped=!1;
export(e,t){if(this._stopped)return t({code:R.ExportResultCode.FAILED,error:Error("Exporter has been stopped")});
this._finishedLogRecords.push(...e),t({code:R.ExportResultCode.SUCCESS})}shutdown(){return this._stopped=!0,this.reset(),Promise.resolve()}getFinishedLogRecords(){return this._finishedLogRecords}reset(){this._finishedLogRecords=[]}}T.InMemoryLogRecordExporter=a}