
export type FileItem = {
  name: string;
  type: "folder" | "file";
  size: number;
  modified: Date;
  path: string;
};
