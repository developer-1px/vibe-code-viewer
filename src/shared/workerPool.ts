/**
 * workerPool.ts - Phase C: Web Worker Pool Manager
 * 여러 파일을 동시에 파싱하기 위한 Worker Pool
 */

import type { CodeLine } from '../widgets/CodeViewer/core/types';

interface ParseRequest {
  filePath: string;
  content: string;
  files: Record<string, string>;
  deadCodeResults: any;
}

interface ParseResponse {
  type: 'result';
  filePath: string;
  lines: CodeLine[];
  parseTime: number;
}

type ParseCallback = (lines: CodeLine[], parseTime: number) => void;

class WorkerPool {
  private workers: Worker[] = [];
  private workerCount: number;
  private currentWorkerIndex = 0;
  private callbacks = new Map<string, ParseCallback>();

  constructor(workerCount: number = navigator.hardwareConcurrency || 4) {
    this.workerCount = workerCount;
    this.initWorkers();
  }

  private initWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(new URL('../workers/codeParser.worker.ts', import.meta.url), { type: 'module' });

      worker.addEventListener('message', (event: MessageEvent<ParseResponse>) => {
        const { filePath, lines, parseTime } = event.data;
        const callback = this.callbacks.get(filePath);

        if (callback) {
          callback(lines, parseTime);
          this.callbacks.delete(filePath);
        }
      });

      worker.addEventListener('error', (error) => {
        console.error('[WorkerPool] Worker error:', error);
      });

      this.workers.push(worker);
    }

    console.log(`[WorkerPool] Initialized ${this.workerCount} workers`);
  }

  /**
   * 파일 파싱 요청 (Round-robin 방식으로 Worker 할당)
   */
  public parse(request: ParseRequest, callback: ParseCallback): void {
    // Callback 등록
    this.callbacks.set(request.filePath, callback);

    // Round-robin으로 Worker 선택
    const worker = this.workers[this.currentWorkerIndex];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.workerCount;

    // Worker에 파싱 요청
    worker.postMessage({
      type: 'parse',
      ...request,
    });
  }

  /**
   * 모든 Worker 종료
   */
  public terminate() {
    this.workers.forEach((worker) => worker.terminate());
    this.workers = [];
    this.callbacks.clear();
    console.log('[WorkerPool] All workers terminated');
  }
}

// Singleton instance
let workerPool: WorkerPool | null = null;

export function getWorkerPool(): WorkerPool {
  if (!workerPool) {
    workerPool = new WorkerPool();
  }
  return workerPool;
}

export function terminateWorkerPool() {
  if (workerPool) {
    workerPool.terminate();
    workerPool = null;
  }
}
