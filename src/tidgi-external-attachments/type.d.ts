declare global {
  interface Window {
    meta?: () => { workspaceID?: string };
    service?: {
      workspace?: {
        get(workspaceID: string): Promise<
          {
            wikiFolderLocation: string;
          } | undefined
        >;
      };
      native?: {
        path(
          method: "basename" | "dirname" | "join",
          pathString: string | undefined,
          ...paths: string[]
        ): Promise<string | undefined>;
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
      };
    };
    remote?: {
      getPathForFile: (file: File) => string;
    };
  }
}
export {};
