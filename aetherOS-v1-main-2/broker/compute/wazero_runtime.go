
package compute

import (
    "context"
    "sync"
    "time"

    "github.com/tetratelabs/wazero"
)

type WazeroRuntime struct {
    rt        wazero.Runtime
    mu        sync.RWMutex
    instances map[string]*wazeroInstance
}

func NewWazeroRuntime(rt wazero.Runtime) *WazeroRuntime {
    return &WazeroRuntime{
        rt:        rt,
        instances: make(map[string]*wazeroInstance),
    }
}

func (w *WazeroRuntime) Register(id string, inst *wazeroInstance) {
    w.mu.Lock()
    defer w.mu.Unlock()
    w.instances[id] = inst
}

func (w *WazeroRuntime) Unregister(id string) {
    w.mu.Lock()
    defer w.mu.Unlock()
    delete(w.instances, id)
}

func (w *WazeroRuntime) Get(id string) (*wazeroInstance, bool) {
    w.mu.RLock()
    defer w.mu.RUnlock()
    inst, ok := w.instances[id]
    return inst, ok
}

func (w *WazeroRuntime) Shutdown(ctx context.Context) error {
    w.mu.Lock()
    instances := make([]*wazeroInstance, 0, len(w.instances))
    for _, inst := range w.instances {
        instances = append(instances, inst)
    }
    w.instances = make(map[string]*wazeroInstance)
    w.mu.Unlock()

    for _, inst := range instances {
        inst.Kill()
    }

    select {
    case <-time.After(2 * time.Second):
    case <-ctx.Done():
    }

    return w.