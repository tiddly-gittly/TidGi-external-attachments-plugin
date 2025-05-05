/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */

import { handleBeforeImporting } from './handleBeforeImporting';
import { handleDeletingTiddler } from './handleDeletingTiddler';
import { handleImportingFile } from './handleImportingFile';
import { makePathRelative } from './makePathRelative';

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

/**
 * Startup function for the TidGi external attachments plugin.
 * Registers hooks for file importing to handle external attachments.
 */
exports.startup = function() {
  // Check if running in TidGi environment
  const isTidGi = typeof window !== 'undefined' &&
    typeof window.meta === 'function';
  if (!isTidGi) return;

  // Get workspace ID from TidGi
  const workspaceID = window?.meta?.()?.workspaceID;
  if (!workspaceID) return;

  // Get workspace information from TidGi service
  void window?.service?.workspace?.get(workspaceID).then((workspace) => {
    const wikiFolderLocation = workspace?.wikiFolderLocation;
    if (!wikiFolderLocation) return;

    // Register the hook that's called when files are dragged or selected for import
    $tw.hooks.addHook('th-importing-file', function(info) {
      return handleImportingFile(info, wikiFolderLocation);
    });

    // Register the hook that's called when the user clicks the Import button in the import dialog
    $tw.hooks.addHook('th-before-importing', function(info) {
      return handleBeforeImporting(info);
    });

    $tw.hooks.addHook("th-deleting-tiddler", function(tiddler) {
      return handleDeletingTiddler(tiddler, wikiFolderLocation);
    });
  });
};
