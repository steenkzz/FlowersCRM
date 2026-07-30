/** Simple concurrency-limited task queue. Excess calls wait in FIFO order
 * until a slot frees up — used to hard-cap simultaneous agentic API calls
 * from the pipeline board regardless of how many cards trigger them. */
export function createLimiter(maxConcurrent: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  function next() {
    if (active >= maxConcurrent) return;
    const run = queue.shift();
    if (!run) return;
    active += 1;
    run();
  }

  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
  };
}

// Shared across both pipelines (E-Commerce + Innovation Partners) so the
// "never more than 3 concurrent" cap is global, not per-pipeline.
export const pipelineCallLimiter = createLimiter(3);
