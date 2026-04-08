const fs = require('fs');
const path = require('path');

const src = '/Users/heogang/.gemini/antigravity/brain/eba8f198-ba0b-4f85-a361-fe212f6fc1c4/media__1775545524133.png';
const targets = [
  './assets/icon.png',
  './assets/splash.png',
  './assets/logo.png'
];

async function copyFiles() {
  console.log('Starting file copy via Node.js...');
  
  if (!fs.existsSync('./assets')) {
    fs.mkdirSync('./assets', { recursive: true });
    console.log('Created assets directory.');
  }

  targets.forEach(target => {
    try {
      fs.copyFileSync(src, target);
      console.log(`Successfully copied to ${target}`);
    } catch (err) {
      console.error(`Failed to copy to ${target}:`, err.message);
    }
  });
  
  console.log('Copy operation finished.');
}

copyFiles();
