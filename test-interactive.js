const { spawn } = require('child_process');

console.log('Starting flitter CLI in interactive mode...');
const child = spawn('bun', ['run', 'apps/flitter-cli/bin/flitter.ts'], {
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' }
});

// 设置超时，如果 3 秒后还在运行，说明交互模式成功保持运行
const timeout = setTimeout(() => {
  console.log('\n[SUCCESS] CLI is still running after 3 seconds. Interactive mode did not exit immediately.');
  child.kill('SIGINT');
}, 3000);

child.on('exit', (code) => {
  clearTimeout(timeout);
  console.log(`\n[EXIT] CLI exited with code ${code}`);
  if (code !== null && code !== 130) {
    console.log('[FAILURE] CLI exited prematurely.');
  }
});
