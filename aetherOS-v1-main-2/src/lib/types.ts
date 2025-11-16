
export type FileItem = {
  name: string;
  type: "folder" | "file";
  size: number;
  // This is a string from the Go backend, but we'll parse it to a Date object on the frontend
  modTime: string; 
  path: string;
};
