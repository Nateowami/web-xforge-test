'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_1 = __importDefault(require('fs'));
const inspector_1 = __importDefault(require('inspector'));
const node_v8_1 = require('node:v8');
const path_1 = __importDefault(require('path'));
const resource_monitor_1 = require('./resource-monitor');
// POSIX defines SIGUSR1 and SIGUSR2 as user-defined signals, but SIGUSR1 is reserved by Node.js to start the debugger.
// Send the signal using e.g. kill -USR2 <node process id>
// or pkill --signal USR2 --full  'node.*5002'
process.on('SIGUSR2', () => {
  switch (process.env['SF_SIGUSR2_ACTION']) {
    case 'resourceUsage':
      recordResourceUsage();
      break;
    case 'profile':
    default:
      createHeapSnapshot();
      break;
  }
});
console.log(`Diagnostics enabled for Node process with pid ${process.pid}`);
function createHeapSnapshot() {
  const secondsToProfile = 30;
  console.log('Signal SIGUSR2 received; writing heap snapshot');
  const heapPath = path_1.default.join(process.cwd(), 'scriptureforge.heapsnapshot');
  // Warning: This is a synchronous operation and will block the event loop!
  (0, node_v8_1.writeHeapSnapshot)(heapPath);
  console.log(`Heap snapshot written to ${heapPath}`);
  console.log('Starting profiling');
  const session = new inspector_1.default.Session();
  session.connect();
  session.post('Profiler.enable', () => {
    session.post('Profiler.start', () => {
      console.log('Profiler started');
      setTimeout(() => {
        session.post('Profiler.stop', (err, { profile }) => {
          if (err) throw err;
          console.log('Profiler stopped');
          const filePath = path_1.default.join(process.cwd(), 'profile.cpuprofile');
          console.log(`Writing profiler file to ${filePath}`);
          fs_1.default.writeFile(filePath, JSON.stringify(profile), err => {
            if (err) throw err;
            console.log('File written');
          });
        });
      }, secondsToProfile * 1000);
    });
  });
}
function recordResourceUsage() {
  console.log('Recording resource usage');
  void resource_monitor_1.ResourceMonitor.instance.record();
}
//# sourceMappingURL=diagnostics.js.map
