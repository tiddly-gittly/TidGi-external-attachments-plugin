/**
 * Minimal IWikiWorkspace interface for plugin usage
 */
export interface IWikiWorkspace {
  id: string;
  isSubWiki: boolean;
  mainWikiID: string | null;
  wikiFolderLocation: string;
  tagNames: string[];
  includeTagTree: boolean;
  fileSystemPathFilterEnable: boolean;
  fileSystemPathFilter: string | null;
  order: number;
}

declare global {
  interface Window {
    meta?: () => { 
      workspace?: { 
        id: string;
      };
    };
    remote?: {
      getPathForFile: (file: File) => string;
    };
    service?: {
      native?: {
        /**
         * Move a file or directory. The directory can have contents.
         * @param fromFilePath Note that if src is a directory it will copy everything inside of this directory, not the entire directory itself (see fs.extra issue #537).
         * @param toFilePath Note that if src is a file, dest cannot be a directory (see fs.extra issue #323). (but you can set `options.fileToDir` to true)
         * @param options.fileToDir true means dest is a directory, create if not exist
         * @returns false if failed. If success, returns the absolute path of the copied file or directory.
         */
        movePath(
          fromFilePath: string,
          toFilePath: string,
          options?: { fileToDir?: boolean },
        ): Promise<false | string>;
        /**
         * Move a file or directory to the trash bin.
         * @param filePath The absolute path of the file or directory to move to the trash.
         * @returns A promise that resolves to true if the operation was successful, false otherwise.
         */
        moveToTrash(filePath: string): Promise<boolean>;
        path(
          method: 'basename' | 'dirname' | 'join',
          pathString: string | undefined,
          ...paths: string[]
        ): Promise<string | undefined>;
        /**
         * Save base64 encoded data to a file.
         * @param filePath The absolute path where the file should be saved.
         * @param base64Data The base64 encoded string to save.
         * @returns A promise that resolves to true if successful, false otherwise.
         */
        saveBase64File(filePath: string, base64Data: string): Promise<boolean>;
      };
      workspace?: {
        get(workspaceID: string): Promise<IWikiWorkspace | undefined>;
        /**
         * Get all sub-wikis of a main wiki
         */
        getSubWorkspacesAsList(workspaceID: string): Promise<IWikiWorkspace[]>;
        /**
         * Get all workspaces
         */
        getWorkspacesAsList(): Promise<IWikiWorkspace[]>;
      };
    };
  }
}
export {};
