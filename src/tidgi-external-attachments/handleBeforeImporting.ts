/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { ITiddlerFields, ITiddlerFieldsParam, Tiddler } from 'tiddlywiki';

/**
 * Handles the 'th-before-importing' hook which is triggered when the user clicks the Import button
 * in the import dialog after dragging files or selecting them.
 *
 * This function processes the import data from tiddlers that were specially prepared by our
 * handleImportingFile function (identified by the presence of 'willMoveFromPath' field).
 * It moves files to their target locations and properly prepares the tiddler for import.
 *
 * @param info - The import information containing the tiddlers to be imported
 * @returns The modified import tiddler with updated fields
 */
export function handleBeforeImporting(info: Tiddler): Tiddler {
  // Quick check if this tiddler bundle is created by our import process
  // If not, we skip processing to save CPU cycles
  if (!info.fields.text.includes('willMoveFromPath')) return info;

  /**
   * info object here is a plugin tiddler, with fields like:
   * ```js
   * {
   *   bag: "default",
   *   "plugin-type": "import",
   *   revision: "0",
   *   status: "pending",
   *   text: "{\n    \"tiddlers\": {\n        \"TiddlyWikiIconBlack.png\": {\n            \"title\": \"TiddlyWikiIconBlack.png\",\n            \"type\": \"image/png\",\n            \"_canonical_uri\": \"files/TiddlyWikiIconBlack.png\",\n            \"willMoveFromPath\": \"/Users/linonetwo/Desktop/repo/Tiddlywiki-NodeJS-Github-Template/tiddlers/TiddlyWikiIconBlack.png\",\n            \"willMoveToPath\": \"/Users/linonetwo/Desktop/repo/Tiddlywiki-NodeJS-Github-Template/files/TiddlyWikiIconBlack.png\"\n        }\n    }\n}",
   *   title: "$:/Import",
   *   type: "application/json"
   * }
   * ```
   */
  const importData: {
    tiddlers?: Record<string, ITiddlerFields>;
  } = $tw.utils.parseJSONSafe(info.fields.text);
  const tiddlers = importData?.tiddlers ?? {} as Record<string, ITiddlerFields>;

  Object.keys(tiddlers).forEach((title) => {
    const tiddler = tiddlers[title];
    const { willMoveFromPath, willMoveToPath, ...resultTiddlerFields } = tiddler;

    if (willMoveFromPath && typeof willMoveFromPath === 'string' && willMoveToPath && typeof willMoveToPath === 'string') {
      // Move the file from source to target location
      void window.service?.native?.movePath?.(
        willMoveFromPath,
        willMoveToPath,
        { fileToDir: true },
      );

      const importingTiddler = {
        ...$tw.wiki.getTiddler(title)?.fields,
        ...resultTiddlerFields,
        // Add date fields so it appears in the Recent history
        ...($tw.wiki.tiddlerExists(title) ? {} : $tw.wiki.getCreationFields()),
        ...$tw.wiki.getModificationFields(),
      };

      // Fix Date object become JS standard date string after stringify, but TW can't parse it.
      if (importingTiddler.created) {
        (importingTiddler as unknown as ITiddlerFieldsParam).created = $tw.utils.stringifyDate(importingTiddler.created);
      }
      if (importingTiddler.modified) {
        (importingTiddler as unknown as ITiddlerFieldsParam).modified = $tw.utils.stringifyDate(importingTiddler.modified);
      }

      tiddlers[title] = importingTiddler;
    }
  });

  const newImportTiddler = new $tw.Tiddler(info, { text: JSON.stringify({ tiddlers }) });
  // In core's handlePerformImportEvent, it will `getTiddlerDataCached` from title,
  // instead of using returned tiddler, so we need to add this tiddler to wiki to update the data source.
  $tw.wiki.addTiddler(newImportTiddler);

  return newImportTiddler;
}
