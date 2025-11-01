const sharp = require('sharp');
const path = require('path');

async function createLargeIcon() {
  try {
    await sharp('assets/icon.png')
      .resize(256, 256)
      .toFile('assets/icon-large.ico');

    console.log('Created 256x256 icon successfully');
  } catch (error) {
    console.error('Error creating icon:', error);
    process.exit(1);
  }
}

createLargeIcon();