/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { Tiddler } from 'tiddlywiki';
import { joinPaths } from './makePathRelative';

// Configuration tiddler title
const MOVE_TO_TRASH_TITLE = '$:/config/ExternalAttachments/MoveToTrash';

/**
 * Handles the 'th-deleting-tiddler' hook which is triggered when a tiddler is being deleted.
 * If the tiddler references an external file via _canonical_uri, this function can move that file to trash.
 *
 * @param tiddler - The tiddler being deleted
 * @param wikiFolderLocation - The location of the current wiki folder
 * @returns The tiddler (unmodified)
 */
export function handleDeletingTiddler(tiddler: Tiddler, wikiFolderLocation: string): Tiddler {
  // Check if we should move external files to trash on tiddler deletion
  const moveToTrash = $tw.wiki.getTiddlerText(MOVE_TO_TRASH_TITLE, '') === 'yes';
  if (!moveToTrash) return tiddler;

  // Check if the tiddler has a canonical URI (reference to external file)
  const canonicalUri = tiddler.fields._canonical_uri;
  if (!canonicalUri || typeof canonicalUri !== 'string') return tiddler;
  let filePath: string;
  // Handle relative vs absolute paths
  if (
    canonicalUri.startsWith('/') ||
    (canonicalUri.length > 1 && canonicalUri[1] === ':')
  ) {
    // Absolute path
    filePath = canonicalUri;
  } else {
    // Relative path - resolve against wiki folder location
    filePath = joinPaths(wikiFolderLocation, canonicalUri);
  }

  // Move the file to trash using TidGi's API
  try {
    void window.service?.native?.moveToTrash?.(filePath);

    // Optional: Log operation to console
    console.log(`Moved file to trash: ${filePath}`);
  } catch (error) {
    console.error(`Failed to move file to trash: ${filePath}`, error);
  }

  return tiddler;
}
