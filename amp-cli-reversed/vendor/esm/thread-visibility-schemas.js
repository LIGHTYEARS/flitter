// Module: thread-visibility-schemas
// Original: X9T
// Type: ESM (PT wrapper)
// Exports: Nj, hkR, rkR, tkR, xlT
// Category: schema

// Module: X9T (ESM)
()=>{Ge(),xlT=["private","public_unlisted","public_discoverable","thread_workspace_shared"],tkR=K.enum(xlT),rkR=K.union([K.object({visibility:K.literal("private"),sharedGroupIDs:K.array(K.string())}),K.object({visibility:K.literal("private"),shareWithAllCreatorGroups:K.literal(!0)}),K.object({visibility:K.enum(["thread_workspace_shared","public_unlisted","public_discoverable"])})]),Nj=/^[a-z0-9](?:[a-z0-9]*(?:-[a-z0-9]+)*)?$/,hkR=K.string().regex(Nj,"Must be lowercase a-z, 0-9, hyphens only, no start/end hyphen, no consecutive hyphens").min(1).max(Db)}