
package aether

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/storage"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/iterator"
)

// FileInfo represents a file or directory in the VFS.
type FileInfo struct {
	Name    string    `json:"name"`
	Size    int64     `json:"size"`
	IsDir   bool      `json:"isDir"`
	ModTime time.Time `json:"modTime"`
	Path    string    `json:"path"`
}

// VFSModule represents the virtual file system, now backed by Firebase Storage.
type VFSModule struct {
	mu         sync.RWMutex
	app        *firebase.App
	bucketName string
	client     *storage.Client
}

// NewVFSModule creates a new VFS module connected to Firebase Storage.
func NewVFSModule(app *firebase.App) (*VFSModule, error) {
	ctx := context.Background()
	client, err := app.Storage(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting storage client: %w", err)
	}

	bucketName, err := client.DefaultBucket().Attrs(ctx)
	if err != nil {
		return nil, fmt.Errorf("error getting default bucket name: %w", err)
	}

	storageClient, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("error creating cloud storage client: %w", err)
	}

	return &VFSModule{
		app:        app,
		bucketName: bucketName.Name,
		client:     storageClient,
	}, nil
}

// List returns the contents of a directory from Firebase Storage.
func (vfs *VFSModule) List(path string) ([]*FileInfo, error) {
	vfs.mu.RLock()
	defer vfs.mu.RUnlock()
	ctx := context.Background()

	var results []*FileInfo
	cleanPath := strings.Trim(path, "/")
	if cleanPath != "" {
		cleanPath += "/"
	}

	it := vfs.client.Bucket(vfs.bucketName).Objects(ctx, &storage.Query{
		Prefix:    cleanPath,
		Delimiter: "/",
	})

	// Handle subdirectories
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error iterating prefixes: %w", err)
		}
		// This gives us the subdirectories
		if attrs.Prefix != "" {
			dirName := strings.TrimSuffix(strings.TrimPrefix(attrs.Prefix, cleanPath), "/")
			if dirName != "" {
				results = append(results, &FileInfo{
					Name:    dirName,
					IsDir:   true,
					Path:    strings.TrimSuffix(attrs.Prefix, "/"),
					ModTime: time.Now(), // Storage doesn't have folder mod times
				})
			}
		}
	}
	
	// Re-create iterator without delimiter to get files in the current directory
	fileIt := vfs.client.Bucket(vfs.bucketName).Objects(ctx, &storage.Query{
		Prefix: cleanPath,
	})

	for {
		attrs, err := fileIt.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error iterating objects: %w", err)
		}

		// Ensure it's a file directly in this directory, not a sub-directory's file, and not a placeholder
        if !strings.Contains(strings.TrimPrefix(attrs.Name, cleanPath), "/") && !strings.HasSuffix(attrs.Name, "/.placeholder") {
			results = append(results, &FileInfo{
				Name:    filepath.Base(attrs.Name),
				Size:    attrs.Size,
				IsDir:   false,
				ModTime: attrs.Updated,
				Path:    attrs.Name,
			})
		}
	}


	sort.Slice(results, func(i, j int) bool {
		if results[i].IsDir != results[j].IsDir {
			return results[i].IsDir
		}
		return results[i].Name < results[j].Name
	})

	return results, nil
}

// Delete removes a file or folder from Firebase Storage.
func (vfs *VFSModule) Delete(path string) error {
	vfs.mu.Lock()
	defer vfs.mu.Unlock()
	ctx := context.Background()
	bucket := vfs.client.Bucket(vfs.bucketName)

	// Check if it's a directory by listing with a delimiter
	it := bucket.Objects(ctx, &storage.Query{Prefix: path + "/", Delimiter: "/"})
	_, err := it.Next()
	isDir := err == nil // If we get any result, it's a directory

	if isDir {
		// It's a directory, so delete all objects with this prefix
		deleteIt := bucket.Objects(ctx, &storage.Query{Prefix: path + "/"})
		for {
			attrs, err := deleteIt.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				return fmt.Errorf("failed to iterate objects for deletion: %w", err)
			}
			if err := bucket.Object(attrs.Name).Delete(ctx); err != nil {
				return fmt.Errorf("failed to delete object %s: %w", attrs.Name, err)
			}
		}
	} else {
		// It's a single file
		if err := bucket.Object(path).Delete(ctx); err != nil {
			return fmt.Errorf("failed to delete object %s: %w", path, err)
		}
	}

	return nil
}

// Read returns the content of a file.
func (vfs *VFSModule) Read(path string) (string, error) {
	vfs.mu.RLock()
	defer vfs.mu.RUnlock()
	ctx := context.Background()

	rc, err := vfs.client.Bucket(vfs.bucketName).Object(path).NewReader(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to create reader for %s: %w", path, err)
	}
	defer rc.Close()

	data, err := AetherReadAll(rc)
	if err != nil {
		return "", fmt.Errorf("failed to read content for %s: %w", path, err)
	}

	return string(data), nil
}

// AetherReadAll reads all data from an io.Reader, necessary because io.ReadAll is not available in Go 1.15
func AetherReadAll(r *storage.Reader) ([]byte, error) {
    b := make([]byte, 0, 512)
    for {
        n, err := r.Read(b[len(b):cap(b)])
        b = b[:len(b)+n]
        if err != nil {
            if err.Error() == "EOF" { // Simple string comparison for EOF
                return b, nil
            }
            return b, err
        }

        if len(b) == cap(b) {
            // Add more capacity (let's double it)
            b = append(b, 0)[:len(b)]
        }
    }
}


// Write sets the content of a file, creating it if it doesn't exist.
func (vfs *VFSModule) Write(path string, content string) error {
	vfs.mu.Lock()
	defer vfs.mu.Unlock()
	ctx := context.Background()
	obj := vfs.client.Bucket(vfs.bucketName).Object(path)
	
	wc := obj.NewWriter(ctx)
	if _, err := wc.Write([]byte(content)); err != nil {
		return fmt.Errorf("failed to write content to %s: %w", path, err)
	}
	
	if err := wc.Close(); err != nil {
		return fmt.Errorf("failed to close writer for %s: %w", path, err)
	}

	return nil
}

// CreateDir creates a new directory by creating a .placeholder file.
func (vfs *VFSModule) CreateDir(path string, name string) error {
    vfs.mu.Lock()
	defer vfs.mu.Unlock()
    
    // Path should be the parent directory
    fullPath := filepath.Join(path, name, ".placeholder")

    return vfs.Write(fullPath, "")
}

// CreateFile creates a new empty file.
func (vfs *VFSModule) CreateFile(path string, name string) error {
    vfs.mu.Lock()
    defer vfs.mu.Unlock()
    
    fullPath := filepath.Join(path, name)

    // Check if file already exists to avoid overwriting.
    _, err := vfs.client.Bucket(vfs.bucketName).Object(fullPath).Attrs(context.Background())
    if err == nil {
        return fmt.Errorf("file already exists: %s", fullPath)
    }
    if err != storage.ErrObjectNotExist {
        return fmt.Errorf("error checking file existence: %w", err)
    }

    return vfs.Write(fullPath, "")
}

// Close releases resources used by the VFS module.
func (vfs *VFSModule) Close() {
	if vfs.client != nil {
		vfs.client.Close()
	}
}
