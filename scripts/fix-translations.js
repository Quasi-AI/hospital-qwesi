const fs = require('fs');
const path = require('path');

// Read all translation files
const enPath = path.join(__dirname, '../messages/en.json');
const esPath = path.join(__dirname, '../messages/es.json');
const frPath = path.join(__dirname, '../messages/fr.json');

console.log('Reading translation files...');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

// Function to merge translations: use English structure, preserve existing translations
function mergeTranslations(english, existing) {
  const result = {};
  
  for (const key in english) {
    if (typeof english[key] === 'object' && english[key] !== null && !Array.isArray(english[key])) {
      // Recursively merge nested objects
      result[key] = mergeTranslations(
        english[key],
        existing && existing[key] ? existing[key] : {}
      );
    } else {
      // Use existing translation if available, otherwise use English as placeholder
      result[key] = (existing && existing[key]) ? existing[key] : english[key];
    }
  }
  
  return result;
}

console.log('Merging Spanish translations...');
const esMerged = mergeTranslations(en, es);

console.log('Merging French translations...');
const frMerged = mergeTranslations(en, fr);

console.log('Writing updated files...');
fs.writeFileSync(esPath, JSON.stringify(esMerged, null, 2) + '\n', 'utf8');
fs.writeFileSync(frPath, JSON.stringify(frMerged, null, 2) + '\n', 'utf8');

console.log('✅ Translation files fixed!');
console.log('📝 Note: Keys that were missing now have English text as placeholders.');
console.log('🌐 You can translate these later or use a translation service.');
