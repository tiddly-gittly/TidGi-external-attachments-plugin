/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/**
 * Handles the 'th-saving-tiddler' hook which is triggered when a tiddler is about to be saved.
 * 
 * This function checks if an external attachment tiddler (with _canonical_uri) needs its
 * associated file moved to a different sub-wiki based on tag changes. This ensures that
 * when a user changes a tiddler's tags, the external file moves along with the tiddler.
 *
 * The file movement logic mirrors FileSystemAdaptor's routing logic, using the same
 * $tw.utils routing utilities.
 */

import { matchTiddlerToWorkspace } from './subwikiRouting';
import type { IWikiWorkspace } from './type';
import { basePath, joinPaths } from './makePathRelative';
import { WIKI_FOLDER_TO_MOVE_TITLE } from './config';

/**
 * Handle saving tiddler - move external attachment files when tags change
 * 
 * @param tiddler - The tiddler being saved
 * @param oldTiddler - The previous version of the tiddler (if exists)
 * @param workspacesWithRouting - List of all workspaces with routing configuration
 * @param mainWikiFolderLocation - The main wiki folder location
 * @returns The tiddler (potentially with updated _canonical_uri)
 */
export function handleSavingTiddler(
  tiddler: any,
  oldTiddler: any,
  workspacesWithRouting: IWikiWorkspace[],
  mainWikiFolderLocation: string,
): any {
  // Only process tiddlers with external attachments
  const canonicalUri = tiddler.fields._canonical_uri;
  if (!canonicalUri || typeof canonicalUri !== 'string') {
    return tiddler;
  }

  console.log('[handleSavingTiddler] Processing tiddler:', tiddler.fields.title, 'canonicalUri:', canonicalUri);

  // Skip if the canonical_uri is an absolute path or URL (not a relative path we manage)
  if (canonicalUri.startsWith('/') || canonicalUri.startsWith('file://') || canonicalUri.includes('://')) {
    console.log('[handleSavingTiddler] Skipping: absolute path or URL');
    return tiddler;
  }

  // Get the wiki folder for files
  const wikiFolderToMove = $tw.wiki.getTiddlerText(WIKI_FOLDER_TO_MOVE_TITLE, '');
  console.log('[handleSavingTiddler] wikiFolderToMove:', wikiFolderToMove);
  
  // Check if the file is in a managed folder (like "files/")
  if (!canonicalUri.startsWith(wikiFolderToMove)) {
    console.log('[handleSavingTiddler] Skipping: not in managed folder. canonicalUri starts with:', canonicalUri.substring(0, 10));
    return tiddler;
  }

  // Get current and old tags
  const currentTags = Array.isArray(tiddler.fields.tags) ? tiddler.fields.tags : [];
  const oldTags = oldTiddler && Array.isArray(oldTiddler.fields.tags) ? oldTiddler.fields.tags : [];
  console.log('[handleSavingTiddler] currentTags:', currentTags, 'oldTags:', oldTags);

  // Match tiddler to workspace based on current tags
  const currentMatchedWorkspace = matchTiddlerToWorkspace(
    tiddler.fields.title,
    currentTags,
    workspacesWithRouting,
    $tw.wiki,
    $tw.rootWidget,
  );

  // Match based on old tags to determine previous location
  const oldMatchedWorkspace = oldTiddler
    ? matchTiddlerToWorkspace(
        oldTiddler.fields.title,
        oldTags,
        workspacesWithRouting,
        $tw.wiki,
        $tw.rootWidget,
      )
    : undefined;

  // Determine current and target wiki folder locations
  const currentWikiFolderLocation = oldMatchedWorkspace?.wikiFolderLocation ?? mainWikiFolderLocation;
  const targetWikiFolderLocation = currentMatchedWorkspace?.wikiFolderLocation ?? mainWikiFolderLocation;

  console.log('[handleSavingTiddler] currentWikiFolderLocation:', currentWikiFolderLocation);
  console.log('[handleSavingTiddler] targetWikiFolderLocation:', targetWikiFolderLocation);
  console.log('[handleSavingTiddler] currentMatchedWorkspace:', currentMatchedWorkspace?.wikiFolderLocation);
  console.log('[handleSavingTiddler] oldMatchedWorkspace:', oldMatchedWorkspace?.wikiFolderLocation);

  // If the target wiki folder hasn't changed, no need to move the file
  if (currentWikiFolderLocation === targetWikiFolderLocation) {
    console.log('[handleSavingTiddler] Skipping: target folder unchanged');
    return tiddler;
  }

  // Calculate source and target file paths
  // The canonical URI is URL-encoded, but actual file names on disk are decoded
  const decodedCanonicalUri = decodeURIComponent(canonicalUri);
  const fileName = basePath(decodedCanonicalUri); // Extract just the filename
  const sourceFilePath = joinPaths(currentWikiFolderLocation, decodedCanonicalUri);
  const targetFolder = joinPaths(targetWikiFolderLocation, wikiFolderToMove);
  const targetFilePath = joinPaths(targetFolder, fileName);

  console.log('[handleSavingTiddler] Moving file from:', sourceFilePath, 'to:', targetFilePath);

  // Move the file
  void window.service?.native?.movePath?.(
    sourceFilePath,
    targetFilePath,
    { fileToDir: true },
  );

  // The canonical URI format stays the same (relative to wiki folder)
  // Since we're just moving from one wiki's files/ to another wiki's files/,
  // the relative path format (e.g., "files/xxx.png") remains the same
  // We keep the original canonicalUri (which is already properly encoded)
  // because the relative path structure is the same in both wikis
  
  console.log('[handleSavingTiddler] File moved, keeping original canonicalUri:', canonicalUri);

  // Return updated tiddler - keep the same _canonical_uri since relative path is the same
  return new $tw.Tiddler(tiddler, { _canonical_uri: canonicalUri });
}
