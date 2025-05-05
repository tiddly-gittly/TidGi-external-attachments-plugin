declare global {
  interface Window {
    meta?: () => { workspaceID?: string };
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
      };
      workspace?: {
        get(workspaceID: string): Promise<
          {
            wikiFolderLocation: string;
          } | undefined
        >;
      };
    };
  }
}
export {};
