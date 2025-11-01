export interface ServerProcess {
  pid: number;
  name: string;
  command: string;
  port?: number;
  status: 'running' | 'stopped' | 'error';
  startTime: Date;
  cpu?: number;
  memory?: number;
}

export interface ServerAction {
  id: string;
  action: 'start' | 'stop' | 'restart' | 'list' | 'status';
  target?: {
    pid?: number;
    name?: string;
    port?: number;
  };
  parameters?: Record<string, any>;
}

export interface ServerActionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  status: string;
  port?: number;
  startTime: Date;
  user: string;
}