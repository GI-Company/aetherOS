
export type FileItem = {
  name: string;
  type: "folder" | "file";
  size: number;
  modTime: Date; 
  path: string;
};

    