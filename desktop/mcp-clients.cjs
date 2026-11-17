// Ready-to-paste configuration of the stdio server for the MCP clients we support.
// Same server for all of them: Electron's bundled runtime in Node mode, no external Node install.
const NAME='cinema-studio';
// TOML literal strings keep Windows backslashes as-is; fall back to an escaped basic string.
const toml=value=>/['\r\n]/.test(value)?JSON.stringify(value):`'${value}'`;
// Windows command line quoting for PowerShell / cmd.
const quote=value=>/[\s"&|<>^]/.test(value)?'"'+value.replace(/"/g,'\\"')+'"':value;
function clients({command,server,directory}){
 const env={ELECTRON_RUN_AS_NODE:'1',CINEMA_MCP_DIR:directory};
 const entry={type:'stdio',command,args:[server],env};
 const codex=[
  '# Codex: añade este bloque a %USERPROFILE%\\.codex\\config.toml',
  `[mcp_servers.${NAME}]`,
  `command = ${toml(command)}`,
  `args = [${toml(server)}]`,
  'startup_timeout_sec = 30',
  'tool_timeout_sec = 180',
  '',
  `[mcp_servers.${NAME}.env]`,
  `ELECTRON_RUN_AS_NODE = "1"`,
  `CINEMA_MCP_DIR = ${toml(directory)}`,
  ''
 ].join('\n');
 const claudeCommand=`claude mcp add ${NAME} --scope user -e ELECTRON_RUN_AS_NODE=1 -e CINEMA_MCP_DIR=${quote(directory)} -- ${quote(command)} ${quote(server)}`;
 return {name:NAME,entry,claudeJson:{mcpServers:{[NAME]:entry}},codex,claudeCommand};
}
module.exports={clients,NAME};
