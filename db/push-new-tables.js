// This script pushes the initial schema to the database
// It automatically selects "create table" for all new tables

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🚀 Pushing database schema to NeonDB...');

const child = spawn('npx', ['drizzle-kit', 'push'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';

child.stdout.on('data', (data) => {
  const output = data.toString();
  outputBuffer += output;

  // Check if we're being prompted for a table creation choice
  if (output.includes('Is') && output.includes('table created or renamed')) {
    // Auto-select the first option (create table) by sending Enter
    setTimeout(() => {
      child.stdin.write('\n');
    }, 100);
  }

  process.stdout.write(output);
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Database schema pushed successfully!');
  } else {
    console.error(`\n❌ Process exited with code ${code}`);
  }
  process.exit(code);
});