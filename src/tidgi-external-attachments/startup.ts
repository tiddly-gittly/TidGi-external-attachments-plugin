/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { ITiddlerFields, ITiddlerFieldsParam } from 'tiddlywiki';
import { basePath, joinPaths, makePathRelative } from './makePathRelative';

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
const ENABLE_EXTERNAL_ATTACHMENTS_TITLE = '$:/config/ExternalAttachments/Enable';
const ENABLE_FOR_IMAGE_TITLE = '$:/config/ExternalAttachments/EnableForImage';
const USE_ABSOLUTE_FOR_DESCENDENTS_TITLE = '$:/config/ExternalAttachments/UseAbsoluteForDescendents';
const USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE = '$:/config/ExternalAttachments/UseAbsoluteForNonDescendents';
const MOVE_TO_WIKI_FOLDER_TITLE = '$:/config/ExternalAttachments/MoveToWikiFolder';
const WIKI_FOLDER_TO_MOVE_TITLE = '$:/config/ExternalAttachments/WikiFolderToMove';

declare var exports: {
  after: string[];
  /** Exported for test in wiki/tiddlers/tests/example/makePathRelative.js */
  makePathRelative: typeof makePathRelative;
  name: string;
  platforms: string[];
  startup: () => void;
  synchronous: boolean;
};

// Export name and synchronous status
exports.name = 'tidgi-external-attachments';
exports.platforms = ['browser'];
exports.after = ['startup'];
exports.synchronous = true;
exports.makePathRelative = makePathRelative;

exports.startup = function() {
  const isTidGi = typeof window !== 'undefined' &&
    typeof window.meta === 'function';
  if (!isTidGi) return;
  const workspaceID = window?.meta?.()?.workspaceID;
  if (!workspaceID) return;
  void window?.service?.workspace?.get(workspaceID).then((workspace) => {
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    if (!wikiFolderLocation) return;
    $tw.hooks.addHook('th-before-importing', function(
      info,
    ) {
      // do a quick search for if this tiddler bundle is created by our import process. So we can skip regular import process so save some CPU.
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
        tiddlers?: ITiddlerFields;
      } = $tw.utils.parseJSONSafe(info.fields.text);
      const tiddlers = importData?.tiddlers ?? {};
      Object.keys(tiddlers).forEach((title) => {
        const tiddler = tiddlers[title] as ITiddlerFields;
        const { willMoveFromPath, willMoveToPath, ...resultTiddlerFields } = tiddler;
        if (willMoveFromPath && typeof willMoveFromPath === 'string' && willMoveToPath && typeof willMoveToPath === 'string') {
          void window.service?.native?.movePath?.(
            willMoveFromPath,
            willMoveToPath,
            { fileToDir: true },
          );
          const importingTiddler = {
            ...$tw.wiki.getTiddler(title)?.fields,
            ...resultTiddlerFields,
            // add date fields so it appears in the Recent history
            ...($tw.wiki.tiddlerExists(title) ? {} : $tw.wiki.getCreationFields()),
            ...$tw.wiki.getModificationFields(),
          };
          // fix Date object become JS standard date string after stringify, but TW can't parse it.
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
      // In core's handlePerformImportEvent, it will `getTiddlerDataCached` from title, instead of using returned tiddler, so we need to add this tiddler to wiki to update the data source.
      $tw.wiki.addTiddler(newImportTiddler);
      return newImportTiddler;
    });
    $tw.hooks.addHook('th-importing-file', function(info) {
      const isImage = info.type.startsWith('image');
      const skipForImage = isImage &&
        $tw.wiki.getTiddlerText(ENABLE_FOR_IMAGE_TITLE, '') === 'no';
      if (skipForImage) return false;
      let filePath = window.remote?.getPathForFile?.(info.file as File);
      if (
        info.isBinary && filePath &&
        $tw.wiki.getTiddlerText(ENABLE_EXTERNAL_ATTACHMENTS_TITLE, '') === 'yes'
      ) {
        // Move file to folder if needed
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
        // calculate original path or related path after move
        const fileCanonicalPath = makePathRelative(filePath, wikiFolderLocation, {
          useAbsoluteForNonDescendents: $tw.wiki.getTiddlerText(
            USE_ABSOLUTE_FOR_NON_DESCENDENTS_TITLE,
            '',
          ) === 'yes',
          useAbsoluteForDescendents: $tw.wiki.getTiddlerText(USE_ABSOLUTE_FOR_DESCENDENTS_TITLE, '') ===
            'yes',
        });
        const importingTiddler = {
          title: info.file.name,
          type: info.type,
          _canonical_uri: fileCanonicalPath,
          // our custom data that pass to th-before-importing
          willMoveFromPath: moveFileMetaData.willMoveFromPath,
          willMoveToPath: moveFileMetaData.willMoveToPath,
        };
        // If the path is not relative, don't add `file://` to it here, since TidGi / TiddlyWeb supports relative path like `./files/xxxx.png` or simply `files/xxxx.png` out of box. And only TidGi supports `file://` protocol.
        info.callback([
          importingTiddler,
        ]);
        return true;
      } else {
        return false;
      }
    });
  });
};
