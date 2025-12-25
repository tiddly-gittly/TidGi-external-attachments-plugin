/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/**
 * Handler for tm-convert-to-external-attachment message.
 * Converts embedded binary tiddlers to external attachments for better performance.
 */

import { matchTiddlerToWorkspace } from './subwikiRouting';
import type { IWikiWorkspace } from './type';
import { WIKI_FOLDER_TO_MOVE_TITLE } from './config';

/**
 * Convert an embedded binary tiddler to an external attachment.
 * Extracts the binary data, saves it to the appropriate files folder,
 * and updates the tiddler to reference the external file.
 */
export async function convertToExternalAttachment(
  title: string,
  workspacesWithRouting: IWikiWorkspace[],
  mainWikiFolderLocation: string,
): Promise<void> {
  const tiddler = $tw.wiki.getTiddler(title);
  
  if (!tiddler) {
    console.error('[convertToExternalAttachment] Tiddler not found:', title);
    return;
  }

  const text = tiddler.fields.text;
  const type = tiddler.fields.type;

  // Check if it's a binary tiddler (has text and type, and type indicates binary)
  if (!text || !type) {
    console.log('[convertToExternalAttachment] Not a binary tiddler:', title);
    return;
  }

  // Check if type is binary
  const contentTypeInfo = $tw.config.contentTypeInfo[type] || {};
  if (contentTypeInfo.encoding !== 'base64') {
    console.log('[convertToExternalAttachment] Not a base64-encoded binary tiddler:', title, 'encoding:', contentTypeInfo.encoding);
    return;
  }

  // Check if already external
  if (tiddler.fields._canonical_uri) {
    console.log('[convertToExternalAttachment] Already an external attachment:', title);
    return;
  }

  console.log('[convertToExternalAttachment] Converting binary tiddler to external attachment:', title);

  // Get the wiki folder for files
  const wikiFolderToMove = $tw.wiki.getTiddlerText(WIKI_FOLDER_TO_MOVE_TITLE, 'files');
  
  // Determine target workspace based on tiddler tags
  const tags = Array.isArray(tiddler.fields.tags) ? tiddler.fields.tags : [];
  const matchedWorkspace = matchTiddlerToWorkspace(
    title,
    tags,
    workspacesWithRouting,
    $tw.wiki,
    $tw.rootWidget,
  );

  const targetWikiFolderLocation = matchedWorkspace?.wikiFolderLocation ?? mainWikiFolderLocation;

  // Generate filename from title or use title directly
  // Clean up the title to make it filesystem-safe
  let filename = title;
  
  // Get file extension from type
  const extensions = Object.keys($tw.config.fileExtensionInfo).filter(
    ext => $tw.config.fileExtensionInfo[ext].type === type
  );
  const extension = extensions[0] || '';
  
  // If title doesn't have the right extension, add it
  if (extension && !filename.toLowerCase().endsWith(extension.toLowerCase())) {
    filename = filename + extension;
  }

  // Clean filename (remove invalid characters)
  filename = filename.replace(/[<>:"|?*]/g, '_');

  const relativePath = `${wikiFolderToMove}/${filename}`;
  const targetFilePath = `${targetWikiFolderLocation}/${relativePath}`;

  // Save file using TidGi service
  try {
    // Check if window.service is available (browser environment)
    if (typeof window !== 'undefined' && window.service?.native?.saveBase64File) {
      // Use TidGi native service to save base64 data to file
      const success = await window.service.native.saveBase64File(targetFilePath, text);
      if (!success) {
        throw new Error('Failed to save file');
      }
      console.log('[convertToExternalAttachment] File saved to:', targetFilePath);
    } else {
      console.error('[convertToExternalAttachment] TidGi native service not available');
      $tw.notifier.display('$:/plugins/linonetwo/tidgi-external-attachments/notifications/conversion-error', {
        variables: {
          title,
          error: 'TidGi native service not available',
        },
      });
      return;
    }

    // Update tiddler to reference external file
    // Use URL encoding for the canonical URI
    const canonicalUri = encodeURIComponent(relativePath).replace(/%2F/g, '/');
    
    // Create updated tiddler without text field but with _canonical_uri
    const updatedFields = {
      ...tiddler.fields,
      text: undefined, // Remove embedded data
      _canonical_uri: canonicalUri,
    };

    $tw.wiki.addTiddler(new $tw.Tiddler(updatedFields));
    console.log('[convertToExternalAttachment] Tiddler updated with _canonical_uri:', canonicalUri);

    // Show success notification
    $tw.notifier.display('$:/plugins/linonetwo/tidgi-external-attachments/notifications/conversion-success', {
      variables: {
        title,
        filepath: relativePath,
      },
    });
  } catch (error) {
    console.error('[convertToExternalAttachment] Error:', error);
    $tw.notifier.display('$:/plugins/linonetwo/tidgi-external-attachments/notifications/conversion-error', {
      variables: {
        title,
        error: (error as Error).message,
      },
    });
  }
}

/**
 * Message handler registration
 */
export function setupConvertToExternalHandler(
  workspacesWithRouting: IWikiWorkspace[],
  mainWikiFolderLocation: string,
): void {
  $tw.rootWidget.addEventListener('tm-convert-to-external-attachment', async (event) => {
    const title = event.param || event.tiddlerTitle;
    if (!title) {
      console.error('[tm-convert-to-external-attachment] No title provided');
      return;
    }

    await convertToExternalAttachment(title, workspacesWithRouting, mainWikiFolderLocation);
  });
}
