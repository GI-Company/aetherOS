
export interface TaskNode {
  id: string;
  tool: string;
  input: Record<string, any>;
  dependsOn: string[];
}

export interface TaskGraph {
  id: string;
  nodes: TaskNode[];
  createdAt: number;
}

export interface TaskGraphPayload {
  taskGraph: TaskGraph;
}

export interface TaskGraphEvent {
  id: string;
  topic: string;
  payload: any;
  timestamp: string;
}

export interface TaskNodeStatus {
    nodeId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt?: number;
    finishedAt?: number;
    error?: string;
    logs?: string[];
}
