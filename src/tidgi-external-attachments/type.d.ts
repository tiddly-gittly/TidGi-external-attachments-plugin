declare global {
  interface Window {
    meta?: { workspaceID?: string };
    service?: {
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
