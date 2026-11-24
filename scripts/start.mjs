import { spawn } from 'node:child_process';

const environment = process.argv[2] ?? 'production';
if (!['staging', 'production'].includes(environment)) {
  throw new Error(`Unsupported environment: ${environment}`);
}

const args = [`--env-file-if-exists=.env.${environment}`];
args.push('src/server.mjs');

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: environment,
    NODE_ENV: 'production'
  }
});
child.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
