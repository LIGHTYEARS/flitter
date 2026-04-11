// Module: message-schemas
// Original: Px
// Type: ESM (PT wrapper)
// Exports: lET, uE, v2
// Category: schema

// Module: Px (ESM)
()=>{Ge(),rR(),uE=K.lazy(()=>K.union([K.string().describe('Pattern match where "*" matches any number of any characters'),K.array(uE).min(1).describe("OR match of each entry"),K.boolean().describe("A literal boolean match"),K.number().describe("A literal number match"),K.null().describe("A literal null match"),K.undefined().describe("A literal undefined match"),K.record(K.string(),uE).describe("Matching individual keys of an object")])),v2=K.object({tool:K.string().min(1).describe("The name of the tool to which this entry applies"),matches:K.record(K.string(),uE).optional().describe("Maps tool inputs to conditions"),action:K.enum(["allow","reject","ask","delegate"]).describe("How Amp should proceed in case of a match"),context:K.enum(["thread","subagent"]).optional().describe("Only apply this entry in this context"),to:K.string().min(1).optional().describe('Command to delegate to when action is "delegate"'),message:K.string().optional().describe('Message to return to the model when action is "reject". If set, the rejection is returned as an error so the model can continue.')}).superRefine((T,R)=>{if(T.action==="delegate"&&!T.to)R.addIssue({code:"custom",message:'delegate action requires "to" field',path:["to"]});
if(T.action!=="delegate"&&T.to)R.addIssue({code:"custom",message:'"to" field only allowed with delegate action',path:["to"]});
if(T.message&&T.action!=="reject")R.addIssue({code:"custom",message:'"message" field only allowed with reject action',path:["message"]})}),lET=K.array(v2).describe("Entries checked in sequence to configure tool permissions")}