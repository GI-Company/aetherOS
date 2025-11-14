
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
	Content string    `json:"content,omitempty"`
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
		"/home/user/documents/resume.txt": {Name: "resume.txt", Size: 1024, IsDir: false, ModTime: now, Path: "/home/user/documents/resume.txt", Content: "This is a sample resume."},
		"/home/user/photos":               {Name: "photos", IsDir: true, ModTime: now, Path: "/home/user/photos"},
		"/home/user/photos/vacation.jpg":  {Name: "vacation.jpg", Size: 204800, IsDir: false, ModTime: now, Path: "/home/user/photos/vacation.jpg", Content: "Image data placeholder"},
		"/home/user/welcome.txt":          {Name: "welcome.txt", Size: 256, IsDir: false, ModTime: now, Path: "/home/user/welcome.txt", Content: "Welcome to AetherOS!"},
		"/README.md":                      {Name: "README.md", Size: 512, IsDir: false, ModTime: now, Path: "/README.md", Content: "# AetherOS\n A browser-native OS with an AI core."},
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
			// create a copy without the content for list operations
			infoCopy := *info
			infoCopy.Content = ""
			results = append(results, &infoCopy)
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
					infoCopy := *info
					infoCopy.Content = ""
					results = append(results, &infoCopy)
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

// Read returns the content of a file.
func (vfs *VFSModule) Read(path string) (string, error) {
	vfs.mu.RLock()
	defer vfs.mu.RUnlock()

	cleanPath := filepath.Clean(path)
	fileInfo, ok := vfs.files[cleanPath]
	if !ok {
		return "", fmt.Errorf("file not found: %s", cleanPath)
	}
	if fileInfo.IsDir {
		return "", fmt.Errorf("path is a directory, not a file: %s", cleanPath)
	}

	return fileInfo.Content, nil
}

// Write sets the content of a file, creating it if it doesn't exist.
func (vfs *VFSModule) Write(path string, content string) error {
	vfs.mu.Lock()
	defer vfs.mu.Unlock()

	cleanPath := filepath.Clean(path)

	// Disallow writing to root
	if cleanPath == "/" {
		return fmt.Errorf("cannot write to root directory")
	}

	// Ensure parent directory exists
	parentDir := filepath.Dir(cleanPath)
	if parentDir != "/" {
		if _, ok := vfs.files[parentDir]; !ok || !vfs.files[parentDir].IsDir {
			return fmt.Errorf("parent directory does not exist: %s", parentDir)
		}
	}

	now := time.Now()
	if fileInfo, ok := vfs.files[cleanPath]; ok {
		// Update existing file
		if fileInfo.IsDir {
			return fmt.Errorf("cannot write content to a directory: %s", cleanPath)
		}
		fileInfo.Content = content
		fileInfo.Size = int64(len(content))
		fileInfo.ModTime = now
	} else {
		// Create new file
		vfs.files[cleanPath] = &FileInfo{
			Name:    filepath.Base(cleanPath),
			Size:    int64(len(content)),
			IsDir:   false,
			ModTime: now,
			Path:    cleanPath,
			Content: content,
		}
	}

	return nil
}

// CreateDir creates a new directory.
func (vfs *VFSModule) CreateDir(path string) error {
	vfs.mu.Lock()
	defer vfs.mu.Unlock()

	cleanPath := filepath.Clean(path)
	if _, ok := vfs.files[cleanPath]; ok {
		return fmt.Errorf("path already exists: %s", cleanPath)
	}

	parentDir := filepath.Dir(cleanPath)
	if parentDir != "/" && parentDir != "." {
		if _, ok := vfs.files[parentDir]; !ok || !vfs.files[parentDir].IsDir {
			return fmt.Errorf("parent directory does not exist: %s", parentDir)
		}
	}

	vfs.files[cleanPath] = &FileInfo{
		Name:    filepath.Base(cleanPath),
		IsDir:   true,
		ModTime: time.Now(),
		Path:    cleanPath,
	}
	return nil
}
