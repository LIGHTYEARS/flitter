// Module: module-s0-jr-y8T
// Original: y8T
// Type: ESM (PT wrapper)
// Exports: e, fwT, mK, uAT, yAT
// Category: util

// Module: y8T (ESM)
()=>{s0(),jR(),Nr(),L8(),mm(),P0(),Br(),zfR(),uAT=mAT(HLT,tG,WLT),yAT=mAT(gmR,200,1024),mK={spec:{name:y8,description:Sa`
		Read a file or list a directory from the file system. If the path is a directory, it returns a line-numbered list of entries. If the file or directory doesn't exist, an error is returned.

		- The path parameter MUST be an absolute path.
		- By default, this tool returns the first ${tG} lines. To read more, call it multiple times with different read_ranges.
		- Use the ${ht} tool to find specific content in large files or files with long lines.
		- If you are unsure of the correct file path, use the ${hN} tool to look up filenames by glob pattern.
		- The contents are returned with each line prefixed by its line number. For example, if a file has contents "abc\\n", you will receive "1: abc\\n". For directories, entries are returned one per line (without line numbers) with a trailing "/" for subdirectories.
		- This tool can read images (such as PNG, JPEG, and GIF files) and present them to the model visually.
		- When possible, call this tool in parallel for all files you will want to read.
        - Avoid tiny repeated slices (e.g., 50\u2011line chunks). If you need more context from the same file, read a larger range or the full default window instead.
		`,inputSchema:{type:"object",properties:{path:{type:"string",description:"The absolute path to the file or directory (MUST be absolute, not relative)."},read_range:{type:"array",items:{type:"number"},minItems:2,maxItems:2,description:"An array of two integers specifying the start and end line numbers to view. Line numbers are 1-indexed. If not provided, defaults to [1, 1000]. Examples: [500, 700], [700, 1400]"}},required:["path"]},source:"builtin",executionProfile:{resourceKeys:(T)=>{if(T&&typeof T==="object"&&"path"in T&&typeof T.path==="string")return[{key:T.path,mode:"read"}];return[]}}},preprocessArgs:(T,R)=>{let a=T.path,e=!1;if(a.startsWith("~")&&typeof process<"u"){let t=process.env.HOME||process.env.USERPROFILE;if(t)a=a.replace(/^~/,t),e=!0}if(An(a))return e?{...T,path:a}:void 0;if(R.dir)return{...T,path:MR.resolvePath(R.dir,a).fsPath};return e?{...T,path:a}:void 0},fn:uAT},fwT={...mK,fn:yAT}}