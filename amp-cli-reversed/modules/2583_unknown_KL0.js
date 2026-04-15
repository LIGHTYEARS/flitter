function KL0(T, R) {
  if (R === "zsh") return `#!/usr/bin/env zsh
##
# This program implements the Amp Toolbox protocol to provide
# custom tools to an LLM without writing an MCP server.
#
# Amp invokes this program once at startup with TOOLBOX_ACTION set
# to "describe".  The program then needs to write its tool schema
# to stdout.
#
# When the model wants to use the tool, TOOLBOX_ACTION is set to
# "execute" and tool parameters are passed to stdin,
# one parameter per line, as a key-value pair separated by a colon.
#
# Any output on stdout/stderr goes directly to the model and need not
# be structured.
main() {
	case "\${TOOLBOX_ACTION:-\${1:-describe}}" in
	describe) print_tool_definition ;;
	execute) read_args_and_run ;;
	*)
		printf "Unknown action: %s\\n" "$action" >&2
		exit 1
		;;
	esac
}

##
# Output Format:
#   <key>: <value>
#
# Empty lines are ignored
# Multiple lines with the same key are concatenated with a newline
#
# - name sets the tool name
# - description contains instructions for the LLM about when to use the tool.
#
# Other entries become tool parameters with this format:
# - <param>: <type> <description>
#
# Parameters are required by default, unless the description starts with the word optional
#
# The description MUST mention when to use this tool instead of Bash,
# otherwise the model will prefer unstructured command line tools.
#
# Tools like this one should always have highest priority, because
# they are carefully crafted for a specific purpose.
print_tool_definition() {
	cat <<-'EOF'
		    name: __TOOL_NAME__
		    description: Use this tool to get the current time.
		    description: Supported actions are:
			description: date to retrieve the current time

		    action: string the action to take
	EOF
}

##
# Input Format:
#   <key>: <value>
#
# Empty lines are ignored
read_args_and_run() {
    # create one local variable per parameter
	local action
	local input=$(</dev/stdin)
	while IFS=": " read name value; do
        if [ -n "$name" ]; then
            local $name="$value"
        fi
	done <<<"$input"

	printf "Got action: %s\\n" "$action"
	sleep 2
	case "$action" in
	date) date ;;
	*)
		printf "Unsupported action: $action\\n" >&2
		exit 1
		;;
	esac
}

main "$@"`.replaceAll("__TOOL_NAME__", T);
  if (R === "bash") return `#!/usr/bin/env bash
##
# This program implements the Amp Toolbox protocol to provide
# custom tools to an LLM without writing an MCP server.
#
# Amp invokes this program once at startup with TOOLBOX_ACTION set
# to "describe".  The program then needs to write its tool schema
# to stdout.
#
# When the model wants to use the tool, TOOLBOX_ACTION is set to
# "execute" and tool parameters are passed to stdin,
# one parameter per line, as a key-value pair separated by a colon.
#
# Any output on stdout/stderr goes directly to the model and need not
# be structured.
main() {
	case "\${TOOLBOX_ACTION:-\${1:-describe}}" in
	describe) print_tool_definition ;;
	execute) read_args_and_run ;;
	*)
		printf "Unknown action: %s\\n" "$action" >&2
		exit 1
		;;
	esac
}

##
# Output Format:
#   <key>: <value>
#
# Empty lines are ignored
# Multiple lines with the same key are concatenated with a newline
#
# - name sets the tool name
# - description contains instructions for the LLM about when to use the tool.
#
# Other entries become tool parameters with this format:
# - <param>: <type> <description>
#
# Parameters are required by default, unless the description starts with the word optional
#
# The description MUST mention when to use this tool instead of Bash,
# otherwise the model will prefer unstructured command line tools.
#
# Tools like this one should always have highest priority, because
# they are carefully crafted for a specific purpose.
print_tool_definition() {
	cat <<-'EOF'
		name: __TOOL_NAME__
		description: Use this tool to get the current time.
		description: Supported actions are:
		description: date to retrieve the current time

		action: string the action to take
	EOF
}

##
# Input Format:
#   <key>: <value>
#
# Empty lines are ignored
read_args_and_run() {
    # create one local variable per parameter
	local action
	local input=$(</dev/stdin)
	while IFS=": " read name value; do
        if [ -n "$name" ]; then
            local $name="$value"
        fi
	done <<<"$input"

	printf "Got action: %s\\n" "$action"
	sleep 2
	case "$action" in
	date) date ;;
	*)
		printf "Unsupported action: $action\\n" >&2
		exit 1
		;;
	esac
}

main "$@"`.replaceAll("__TOOL_NAME__", T);
  return `#!/usr/bin/env bun
import fs from "node:fs"

/**
 * This program implements the Amp Toolbox protocol to provide
 * custom tools to an LLM without writing an MCP server.
 *
 * Amp invokes this program once at startup with TOOLBOX_ACTION set
 * to "describe".  The program then needs to write its tool schema
 * to stdout.
 *
 * When the model wants to use the tool, TOOLBOX_ACTION is set to
 * "execute" and tool parameters are passed to stdin as a JSON object.
 *
 * Any output on stdout/stderr goes directly to the model and need not
 * be structured.
 */
const action = process.env.TOOLBOX_ACTION

if (action === 'describe') showDescription()
else if (action === 'execute') execute()

/**
 * Use args for a simplified tool description:
 *  - [type, description]
 *  - where type is "string", "number", "object", "array", "boolean"
 *
 * Use inputSchema instead for full JSON schema support.
 */
function showDescription() {
 // The description MUST mention when to use this tool instead of Bash,
 // otherwise the model will prefer unstructured command line tools.
 //
 // Tools like this one should always have highest priority, because
 // they are carefully crafted for a specific purpose.
 process.stdout.write(
  JSON.stringify({
   name: __TOOL_NAME__,
   description: 'You must use this tool to ...',
   args: { action: ['string', 'the action to take, one of: ...'] },
  }),
 )
}

function execute() {
 // parse parameters as JSON from stdin (matches inputSchema/args from showDescription)
 let action = JSON.parse(fs.readFileSync(0, 'utf-8'))['action']
 action = action && action.length > 0 ? action : 'help'

 // output goes directly to the model
 switch (action) {
	case "help": break;
    default: process.stderr.write(\`Unknown action: \${action}\`); process.exit(1);
 }
}
`.replaceAll("__TOOL_NAME__", JSON.stringify(T));
}