const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.next' || item === '.git' || item === 'scratch') continue;
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(item)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles('.');
const tableMatches = new Set();
const regex = /\.from\s*\(\s*["']([^"']+)["']\s*\)/g;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    tableMatches.add(match[1]);
  }
}

console.log('Discovered referenced tables:', Array.from(tableMatches));

async function checkTables() {
  const results = {};
  for (const table of tableMatches) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error && error.code === 'PGRST205') {
      results[table] = 'MISSING (PGRST205)';
    } else if (error) {
      results[table] = 'ERROR: ' + error.message;
    } else {
      results[table] = 'EXISTS';
    }
  }
  console.log('\n--- Live Database Schema Audit ---');
  console.log(JSON.stringify(results, null, 2));
}

checkTables();
