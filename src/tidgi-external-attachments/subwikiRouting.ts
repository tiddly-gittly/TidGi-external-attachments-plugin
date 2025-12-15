/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/**
 * Sub-wiki routing utilities for the external attachments plugin.
 * Uses the routing functions from $tw.utils (provided by TidGi's watch-filesystem-adaptor plugin).
 */

import type { IWikiWorkspace } from './type';

/**
 * Get all workspaces with routing configuration, sorted by order.
 * This includes the main workspace and all its sub-wikis that have routing config.
 * 
 * Uses the routing utility functions from $tw.utils which are provided by
 * TidGi's watch-filesystem-adaptor plugin.
 */
export async function getWorkspacesWithRouting(
  mainWorkspaceId: string,
): Promise<IWikiWorkspace[]> {
  if (!window.service?.workspace) {
    return [];
  }

  // Access routing utilities from $tw.utils (exported by watch-filesystem-adaptor plugin)
  const utils = $tw.utils as any;
  if (!utils.isWikiWorkspaceWithRouting || !utils.workspaceSorter) {
    console.error('Routing utilities not available. Make sure watch-filesystem-adaptor plugin is loaded.');
    return [];
  }

  try {
    const allWorkspaces = await window.service.workspace.getWorkspacesAsList();

    // Filter to wiki workspaces with routing config (main or sub-wikis)
    const workspacesWithRouting = allWorkspaces
      .filter((w) => utils.isWikiWorkspaceWithRouting(w, mainWorkspaceId))
      .sort(utils.workspaceSorter);

    return workspacesWithRouting;
  } catch (error) {
    console.error('Failed to get workspaces with routing:', error);
    return [];
  }
}

/**
 * Match a tiddler to a workspace based on routing rules.
 * This uses the implementation from $tw.utils.
 */
export function matchTiddlerToWorkspace(
  tiddlerTitle: string,
  tiddlerTags: string[],
  workspacesWithRouting: IWikiWorkspace[],
  wiki: any,
  rootWidget: any,
): IWikiWorkspace | undefined {
  const utils = $tw.utils as any;
  if (!utils.matchTiddlerToWorkspace) {
    console.error('matchTiddlerToWorkspace not available in $tw.utils');
    return undefined;
  }
  return utils.matchTiddlerToWorkspace(tiddlerTitle, tiddlerTags, workspacesWithRouting, wiki, rootWidget);
}

