function vKR(T) {
  return `
## Repository Provider: Bitbucket Enterprise (self-hosted)

Use the Bitbucket Enterprise tools (read_bitbucket_enterprise, list_directory_bitbucket_enterprise, list_repositories_bitbucket_enterprise, glob_bitbucket_enterprise, search_bitbucket_enterprise, diff_bitbucket_enterprise, commit_search_bitbucket_enterprise) for self-hosted Bitbucket Server/Data Center instances.
\`search_bitbucket_enterprise\` requires the Bitbucket Code Search plugin to be installed.

Instance guidance:
- The configured instance URL is ${T}
- Always pass exactly \`${T}\` as \`instanceUrl\` for every Bitbucket Enterprise tool call
- When a tool expects \`repository\`, pass a repository browse URL on this instance, for example
  ${T}/projects/PROJ/repos/repo-name/browse

Linking:
- Link files as
  \`${T}/projects/<PROJECT>/repos/<repo>/browse/<filepath>?at=<ref>#<line>\`

Example:
<example-file-url>${T}/projects/CORE/repos/api-service/browse/src/auth.ts?at=develop#42</example-file-url>
`;
}