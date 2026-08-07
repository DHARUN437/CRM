const fs = require('fs');

const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const gdrive = fs.readFileSync('components/settings/google-drive-card.tsx', 'utf8');

console.log('--- Verifying Root Layout & Hydration Fixes ---');

if (layout.includes('dark bg-[var(--background)]') && layout.includes('colorScheme: "dark"')) {
  console.log('✅ Root layout app/layout.tsx is locked to dark theme.');
} else {
  console.error('❌ Root layout theme check failed.');
}

if (!layout.includes('ThemeProvider') && !layout.includes('forcedTheme="light"')) {
  console.log('✅ ThemeProvider and forced light theme removed from root layout.');
} else {
  console.error('❌ ThemeProvider check failed.');
}

if (gdrive.includes('toLocaleDateString("en-US"')) {
  console.log('✅ GoogleDriveCard date formatting uses explicit en-US locale (hydration mismatch resolved).');
} else {
  console.error('❌ GoogleDriveCard locale check failed.');
}

console.log('🎉 Root Theme & Hydration Verification Complete.');
