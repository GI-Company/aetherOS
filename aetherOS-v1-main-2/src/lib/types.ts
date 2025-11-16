
export type FileItem = {
  name: string;
  type: "folder" | "file";
  isDir: boolean; // Add isDir to align with backend VFSModule response
  size: number;
  modTime: Date; 
  path: string;
};
