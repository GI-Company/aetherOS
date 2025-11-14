
package aether

import (
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

// FileInfo represents a file or directory in the VFS.
type FileInfo struct {
	Name    string    `json:"name"`
	Size    int64     `json:"size"`
	IsDir   bool      `json:"isDir"`
	ModTime time.Time `json:"modTime"`
	Path    string    `json:"path"`
}

// VFSModule represents the virtual file system.
type VFSModule struct {
	mu    sync.RWMutex
	files map[string]*FileInfo
}

// NewVFSModule creates a new in-memory virtual file system with some default files.
func NewVFSModule() *VFSModule {
	vfs := &VFSModule{
		files: make(map[string]*FileInfo),
	}
	vfs.initDefaultFiles()
	return vfs
}

func (vfs *VFSModule) initDefaultFiles() {
	now := time.Now()
	// Adding some default files and folders for demonstration.
	// The key is the full path.
	vfs.files = map[string]*FileInfo{
		"/home":                           {Name: "home", IsDir: true, ModTime: now, Path: "/home"},
		"/home/user":                      {Name: "user", IsDir: true, ModTime: now, Path: "/home/user"},
		"/home/user/documents":            {Name: "documents", IsDir: true, ModTime: now, Path: "/home/user/documents"},
		"/home/user/documents/resume.txt": {Name: "resume.txt", Size: 1024, IsDir: false, ModTime: now, Path: "/home/user/documents/resume.txt"},
		"/home/user/photos":               {Name: "photos", IsDir: true, ModTime: now, Path: "/home/user/photos"},
		"/home/user/photos/vacation.jpg":  {Name: "vacation.jpg", Size: 204800, IsDir: false, ModTime: now, Path: "/home/user/photos/vacation.jpg"},
		"/home/user/welcome.txt":          {Name: "welcome.txt", Size: 256, IsDir: false, ModTime: now, Path: "/home/user/welcome.txt"},
		"/README.md":                      {Name: "README.md", Size: 512, IsDir: false, ModTime: now, Path: "/README.md"},
	}
}

// List returns the contents of a directory.
func (vfs *VFSModule) List(path string) ([]*FileInfo, error) {
	vfs.mu.RLock()
	defer vfs.mu.RUnlock()

	var results []*FileInfo

	// Clean the path to ensure consistency
	cleanPath := filepath.Clean(path)
	if cleanPath == "." {
		cleanPath = "/"
	}

	for p, info := range vfs.files {
		dir := filepath.Dir(p)
		if dir == "." {
			dir = "/"
		}
		// We want to list items that are directly inside the given path.
		if dir == cleanPath {
			results = append(results, info)
		}
	}

	// Add root directories if listing "/"
	if cleanPath == "/" {
		for p, info := range vfs.files {
			if !strings.Contains(strings.TrimPrefix(p, "/"), "/") && info.IsDir {
				alreadyAdded := false
				for _, r := range results {
					if r.Path == p {
						alreadyAdded = true
						break
					}
				}
				if !alreadyAdded {
					results = append(results, info)
				}
			}
		}
	}

	// Sort results: folders first, then by name
	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir != results[j].IsDir {
			return results[i].IsDir
		}
		return results[i].Name < results[i].Name
	})

	return results, nil
}

// Delete removes a file or folder from the VFS.
func (vfs *VFSModule) Delete(path string) error {
	vfs.mu.Lock()
	defer vfs.mu.Unlock()

	cleanPath := filepath.Clean(path)

	_, ok := vfs.files[cleanPath]
	if !ok {
		return fmt.Errorf("path not found: %s", cleanPath)
	}

	// If it's a directory, delete all children
	if vfs.files[cleanPath].IsDir {
		for p := range vfs.files {
			if strings.HasPrefix(p, cleanPath+"/") {
				delete(vfs.files, p)
			}
		}
	}

	// Delete the file/folder itself
	delete(vfs.files, cleanPath)

	return nil
}
