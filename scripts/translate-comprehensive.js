const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../messages/en.json');
const esPath = path.join(__dirname, '../messages/es.json');
const frPath = path.join(__dirname, '../messages/fr.json');

console.log('Reading files...');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
let es = JSON.parse(fs.readFileSync(esPath, 'utf8'));
let fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));

// Use Google Translate API via a simple approach
// Since we can't use external APIs, we'll use a pattern-based translation
// For production, you'd want to use a proper translation service

function translateRecursive(target, source, lang) {
  let count = 0;
  
  for (const key in source) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      if (target[key]) {
        count += translateRecursive(target[key], source[key], lang);
      }
    } else if (typeof source[key] === 'string' && target[key] === source[key]) {
      // This is English text that needs translation
      // For now, we'll mark it but can't auto-translate without an API
      // In production, use Google Translate API or similar
      count++;
    }
  }
  
  return count;
}

const esCount = translateRecursive(es, en, 'es');
const frCount = translateRecursive(fr, en, 'fr');

console.log(`\nFound ${esCount} untranslated strings in Spanish`);
console.log(`Found ${frCount} untranslated strings in French`);
console.log('\n⚠️  To translate all strings, you need to:');
console.log('   1. Use a translation API (Google Translate, DeepL, etc.)');
console.log('   2. Or manually translate the remaining strings');
console.log('   3. Or use a translation service/script with API access');
