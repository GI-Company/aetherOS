
package aether

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sync"
)

// SandboxConfig defines the execution environment for an app.
type SandboxConfig struct {
	Profile string `json:"profile"`
}

// SigningInfo contains the public key and fingerprint for an app.
type SigningInfo struct {
	PublicKey   string `json:"publicKey"`
	Fingerprint string `json:"fingerprint"`
}

// AppManifest defines the structure of the manifest.json file.
type AppManifest struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Version     string                 `json:"version"`
	Entry       string                 `json:"entry"`
	Permissions map[string]interface{} `json:"permissions"`
	Sandbox     SandboxConfig          `json:"sandbox"`
	Signing     SigningInfo            `json:"signing"`
}

// PermissionManager loads and manages app manifests and their permissions.
type PermissionManager struct {
	mu        sync.RWMutex
	manifests map[string]*AppManifest
}

// NewPermissionManager creates a new PermissionManager and loads all manifests.
func NewPermissionManager(appsPath string) (*PermissionManager, error) {
	pm := &PermissionManager{
		manifests: make(map[string]*AppManifest),
	}
	if err := pm.loadManifests(appsPath); err != nil {
		return nil, fmt.Errorf("failed to load app manifests: %w", err)
	}
	return pm, nil
}

// loadManifests walks the given directory and loads all manifest.json files.
func (pm *PermissionManager) loadManifests(root string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && info.Name() == "manifest.json" {
			data, readErr := ioutil.ReadFile(path)
			if readErr != nil {
				log.Printf("Warning: Could not read manifest file at %s: %v", path, readErr)
				return nil // Continue walking even if one manifest fails
			}

			var manifest AppManifest
			if jsonErr := json.Unmarshal(data, &manifest); jsonErr != nil {
				log.Printf("Warning: Could not parse manifest file at %s: %v", path, jsonErr)
				return nil
			}

			if manifest.ID == "" {
				log.Printf("Warning: Manifest at %s is missing an 'id' field.", path)
				return nil
			}

			pm.manifests[manifest.ID] = &manifest
			log.Printf("Loaded manifest for app: %s", manifest.ID)
		}
		return nil
	})
}

// HasPermission checks if a given app has the required permission.
// For now, this is a simple check. It will be expanded for granular permissions.
func (pm *PermissionManager) HasPermission(appID string, requiredPermission string) bool {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	manifest, ok := pm.manifests[appID]
	if !ok {
		log.Printf("Permission check failed: No manifest found for app ID '%s'", appID)
		return false // No manifest means no permissions
	}

	// This is a simplified check. We look for the key in the permissions map.
	// In a real scenario, the value might contain configuration for the permission.
	if _, exists := manifest.Permissions[requiredPermission]; exists {
		return true
	}

	log.Printf("Permission denied for app '%s': missing required permission '%s'", appID, requiredPermission)
	return false
}

// GetPermissions returns all permissions for a given app.
func (pm *PermissionManager) GetPermissions(appID string) map[string]interface{} {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if manifest, ok := pm.manifests[appID]; ok {
		return manifest.Permissions
	}
	return nil
}
