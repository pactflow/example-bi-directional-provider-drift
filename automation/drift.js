/**
 * Drift CLI runner
 *
 * Spawns the `drift verify` command as a child process and returns its exit code.
 * Used by the Jest test files (api-inmemory.test.js, api-postgres.test.js) so
 * that a non-zero Drift exit code surfaces as a failed Jest test.
 *
 * Drift exit codes:
 *   0 — all operations passed OAS validation
 *   1 — one or more operations failed, or Drift encountered an error
 */
const { spawn } = require('child_process');

/**
 * Run `drift verify` against the API server on localhost:8080.
 *
 * @param {'default'|'postgres'} variant - Selects which test file set to use:
 *   - 'default'  → drift/drift.yaml        (in-memory repository)
 *   - 'postgres' → drift-postgres/drift.yaml (PostgreSQL repository)
 * @returns {Promise<number>} The Drift process exit code (0 = pass, 1 = fail)
 */
const runDrift = (variant = 'default') => {
  const testFilePath = variant === 'postgres'
    ? './drift-postgres/drift.yaml'
    : './drift/drift.yaml';

  return new Promise((resolve, reject) => {
    const child = spawn(
      'drift',
      [
        'verify',
        '--test-files', testFilePath,   // path to the drift.yaml test case definitions
        '--server-url', 'http://localhost:8080/', // base URL of the API under test
        '--log-level', 'error',         // suppress info/debug output during test runs
        '--output-dir', 'output',       // write results + JUnit XML report here
        '--generate-result'             // produce a .result file for PactFlow publishing
      ],
      {
        stdio: 'inherit', // pipe Drift's stdout/stderr directly to the terminal
        shell: true
      }
    );

    child.on('error', (err) => reject(err));
    child.on('close', (code) => resolve(code ?? 1));
  });
};

module.exports = { runDrift };
