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
    };
    remote?: {
      getPathForFile: (file: File) => string;
    }
  }
}
export {};
