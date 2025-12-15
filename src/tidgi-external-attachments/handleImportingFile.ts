/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ImportFileInfo } from 'tiddlywiki';
import { basePath, joinPaths, makePathRelative } from './makePathRelative';
import type { IWikiWorkspace } from './type';
import {
  ENABLE_EXTERNAL_ATTACHMENTS_TITLE,
  ENABLE_FOR_IMAGE_TITLE,
  MOVE_TO_WIKI_FOLDER_TITLE,
  USE_ABSOLUTE_FOR_DESCENDENTS_TITLE,
  USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE,
  WIKI_FOLDER_TO_MOVE_TITLE,
} from './config';

/**
 * Handles the 'th-importing-file' hook which is triggered when files are dragged or selected for import,
 * but before the import dialog is shown.
 *
 * This function intercepts file imports and converts them to external attachments based on user configuration.
 * It can optionally move files to a specified wiki folder (or sub-wiki folder) and creates the necessary 
 * tiddler structure with _canonical_uri to reference the external file.
 *
 * With sub-wiki routing support, files are automatically routed to the correct sub-wiki's files folder
 * based on the tiddler's tags matching the sub-wiki's tagNames configuration.
 *
 * @param info - The file import information object
 * @param mainWikiFolderLocation - The location of the main wiki folder
 * @param workspacesWithRouting - List of all workspaces (main + sub-wikis) with routing configuration
 * @returns true if the file was handled by this function, false if it should be handled by the default importer
 */
export function handleImportingFile(
  info: ImportFileInfo, 
  mainWikiFolderLocation: string,
  workspacesWithRouting: IWikiWorkspace[] = [],
): boolean {
  // Check if this is an image and if we should skip processing images
  const isImage = info.type.startsWith('image');
  const skipForImage = isImage &&
    $tw.wiki.getTiddlerText(ENABLE_FOR_IMAGE_TITLE, '') === 'no';
  if (skipForImage) return false;

  // Get file path from the File object using TidGi's API
  let filePath = window.remote?.getPathForFile?.(info.file as File);

  // Check if external attachments are enabled for binary files
  const enabledForBinary = $tw.wiki.getTiddlerText(ENABLE_EXTERNAL_ATTACHMENTS_TITLE, '') === 'yes';
  if (!(info.isBinary && filePath && enabledForBinary)) return false;

  // Note: Sub-wiki routing will happen later in handleBeforeImporting hook
  // At this stage, we don't have the tiddler's tags yet (user hasn't added them in import dialog)
  // So we use the main wiki folder location for now
  const targetWikiFolderLocation = mainWikiFolderLocation;

  // Handle file movement if configured
  let moveFileMetaData: { willMoveFromPath: string; willMoveToPath: string } | undefined;
  if ($tw.wiki.getTiddlerText(MOVE_TO_WIKI_FOLDER_TITLE, '') === 'yes') {
    const wikiFolderToMove = $tw.wiki.getTiddlerText(
      WIKI_FOLDER_TO_MOVE_TITLE,
      '',
    );
    const willMoveFromPath = filePath;
    const targetFolder = joinPaths(targetWikiFolderLocation, wikiFolderToMove);
    const willMoveToPath = joinPaths(targetFolder, basePath(filePath));

    // Check if the file is already in the target location - if so, don't move it
    // This prevents unnecessary file operations
    const isAlreadyInTargetLocation = filePath.startsWith(targetFolder);

    if (!isAlreadyInTargetLocation) {
      // Only set up the move operation if the file isn't already where it needs to be
      moveFileMetaData = { willMoveToPath, willMoveFromPath };
      filePath = willMoveToPath; // Update filepath to the eventual destination
    }
    // If file is already in target location, keep using original filePath
  }

  // Read configuration for path handling
  const useAbsoluteForNonDescendents = $tw.wiki.getTiddlerText(
    USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE,
    '',
  ) === 'yes';
  const useAbsoluteForDescendents = $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_DESCENDENTS_TITLE, '') ===
    'yes';

  // Calculate original path or related path after move
  // Use the target wiki folder as the base for relative path calculation
  const fileCanonicalPath = makePathRelative(filePath, targetWikiFolderLocation, {
    useAbsoluteForNonDescendents,
    useAbsoluteForDescendents,
  });

  // Create the tiddler structure for importing
  const importingTiddler = {
    title: info.file.name,
    type: info.type,
    _canonical_uri: fileCanonicalPath,
    // Our custom data that will be passed to th-before-importing
    willMoveFromPath: moveFileMetaData?.willMoveFromPath,
    willMoveToPath: moveFileMetaData?.willMoveToPath,
  };

  // Call the callback with our tiddler to show the import dialog
  info.callback([
    importingTiddler,
  ]);

  return true;
}
