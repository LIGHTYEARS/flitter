// Module: get-conflict-resolution-recipe
// Original: gtR
// Type: CJS (RT wrapper)
// Exports: getConflictResolutionRecipe, getDescriptionResolutionRecipe, getIncompatibilityDetails, getTypeConflictResolutionRecipe, getUnitConflictResolutionRecipe, getValueTypeConflictResolutionRecipe
// Category: util

// Module: gtR (CJS)
(T)=>{Object.defineProperty(T,"__esModule",{value:!0}),T.getConflictResolutionRecipe=T.getDescriptionResolutionRecipe=T.getTypeConflictResolutionRecipe=T.getUnitConflictResolutionRecipe=T.getValueTypeConflictResolutionRecipe=T.getIncompatibilityDetails=void 0;
function R(i,c){let s="";
if(i.unit!==c.unit)s+=`	- Unit '${i.unit}' does not match '${c.unit}'
`;if(i.type!==c.type)s+=`	- Type '${i.type}' does not match '${c.type}'
`;if(i.valueType!==c.valueType)s+=`	- Value Type '${i.valueType}' does not match '${c.valueType}'
`;if(i.description!==c.description)s+=`	- Description '${i.description}' does not match '${c.description}'
`;return s}T.getIncompatibilityDetails=R;function a(i,c){return`	- use valueType '${i.valueType}' on instrument creation or use an instrument name other than '${c.name}'`}T.getValueTypeConflictResolutionRecipe=a;function e(i,c){return`	- use unit '${i.unit}' on instrument creation or use an instrument name other than '${c.name}'`}T.getUnitConflictResolutionRecipe=e;function t(i,c){let s={name:c.name,type:c.type,unit:c.unit},A=JSON.stringify(s);return`	- create a new view with a name other than '${i.name}' and InstrumentSelector '${A}'`}T.getTypeConflictResolutionRecipe=t;function r(i,c){let s={name:c.name,type:c.type,unit:c.unit},A=JSON.stringify(s);return`	- create a new view with a name other than '${i.name}' and InstrumentSelector '${A}'
    	- OR - create a new view with the name ${i.name} and description '${i.description}' and InstrumentSelector ${A}
    	- OR - create a new view with the name ${c.name} and description '${i.description}' and InstrumentSelector ${A}`}T.getDescriptionResolutionRecipe=r;function h(i,c){if(i.valueType!==c.valueType)return a(i,c);if(i.unit!==c.unit)return e(i,c);if(i.type!==c.type)return t(i,c);if(i.description!==c.description)return r(i,c);return""}T.getConflictResolutionRecipe=h}