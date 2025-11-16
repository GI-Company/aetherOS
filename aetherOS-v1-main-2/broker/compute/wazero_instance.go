package compute

import (
    "context"
    "io"
    "log"
    "sync"

    "github.com/tetratelabs/wazero/api"
)

type wazeroInstance struct {
    mu      sync.Mutex
    mod     api.Module
    stdin   io.WriteCloser
    stdout  io.ReadCloser
    stderr  io.ReadCloser
    cancel  context.CancelFunc
    done    chan struct{}
    closed  bool
}

func (i *wazeroInstance) Stdin() io.WriteCloser  { return i.stdin }
func (i *wazeroInstance) Stdout() io.ReadCloser { return i.stdout }
func (i *wazeroInstance) Stderr() io.ReadCloser { return i.stderr }

func (i *wazeroInstance) Kill() {
    if i.cancel != nil {
        i.cancel()
    }

    i.mu.Lock()
    defer i.mu.Unlock()
    if i.closed {
        return
    }

    if i.mod != nil {
        if err := i.mod.Close(context.Background()); err != nil {
            log.Printf("wazeroInstance: error closing module: %v", err)
        }
        i.mod = nil
    }

    if i.stdin != nil {
        _ = i.stdin.Close()
        i.stdin = nil
    }
    if i.stdout != nil {
        _ = i.stdout.Close()
        i.stdout = nil
    }
    if i.stderr != nil {
        _ = i.stderr.Close()
        i.stderr = nil
    }

    i.closed = true
}