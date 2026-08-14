'use strict';

// tsx derives its temporary directory from process.geteuid() on Unix and
// os.userInfo() on Windows. Restricted Windows test tokens can reject the
// latter even though the filesystem temp directory is available. Supplying a
// stable, process-local identifier avoids that OS lookup without changing the
// test runtime or application code.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  Object.defineProperty(process, 'geteuid', {
    configurable: true,
    value: () => 0,
  });
}
