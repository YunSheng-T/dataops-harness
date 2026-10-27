/**
 * Host half of the dataops workbench plugin.
 *
 * Today the workbench is front-end only: the tools it renders are provided by
 * MCP servers or by a later dataops-tools package. This entry exists so the
 * package is a valid Cordis plugin that a profile bundle can mount; it adds no
 * services and must stay side-effect free.
 */
export const name = 'dataops-client'

export function apply() {}
