/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ImportFileInfo } from 'tiddlywiki';
import { basePath, joinPaths, makePathRelative } from './makePathRelative';

// Configuration tiddler titles
const ENABLE_EXTERNAL_ATTACHMENTS_TITLE = '$:/config/ExternalAttachments/Enable';
const ENABLE_FOR_IMAGE_TITLE = '$:/config/ExternalAttachments/EnableForImage';
const USE_ABSOLUTE_FOR_DESCENDENTS_TITLE = '$:/config/ExternalAttachments/UseAbsoluteForDescendents';
const USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE = '$:/config/ExternalAttachments/UseAbsoluteForNonDescendents';
const MOVE_TO_WIKI_FOLDER_TITLE = '$:/config/ExternalAttachments/MoveToWikiFolder';
const WIKI_FOLDER_TO_MOVE_TITLE = '$:/config/ExternalAttachments/WikiFolderToMove';

/**
 * Handles the 'th-importing-file' hook which is triggered when files are dragged or selected for import,
 * but before the import dialog is shown.
 *
 * This function intercepts file imports and converts them to external attachments based on user configuration.
 * It can optionally move files to a specified wiki folder and creates the necessary tiddler structure
 * with _canonical_uri to reference the external file.
 *
 * @param info - The file import information object
 * @param wikiFolderLocation - The location of the current wiki folder
 * @returns true if the file was handled by this function, false if it should be handled by the default importer
 */
export function handleImportingFile(info: ImportFileInfo, wikiFolderLocation: string): boolean {
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

  // Handle file movement if configured
  let moveFileMetaData: { willMoveFromPath: string; willMoveToPath: string } | undefined;
  if ($tw.wiki.getTiddlerText(MOVE_TO_WIKI_FOLDER_TITLE, '') === 'yes') {
    const wikiFolderToMove = $tw.wiki.getTiddlerText(
      WIKI_FOLDER_TO_MOVE_TITLE,
      '',
    );
    const willMoveFromPath = filePath;
    const willMoveToPath = joinPaths(
      wikiFolderLocation,
      wikiFolderToMove,
      basePath(filePath),
    );
    filePath = willMoveToPath;
    moveFileMetaData = { willMoveToPath, willMoveFromPath };
  }

  // Read configuration for path handling
  const useAbsoluteForNonDescendents = $tw.wiki.getTiddlerText(
    USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE,
    '',
  ) === 'yes';
  const useAbsoluteForDescendents = $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_DESCENDENTS_TITLE, '') ===
    'yes';

  // Calculate original path or related path after move
  const fileCanonicalPath = makePathRelative(filePath, wikiFolderLocation, {
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
