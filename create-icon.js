const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple server icon
function createIcon() {
  const sizes = [16, 32, 48, 64, 128, 256];
  const canvas = createCanvas(256, 256);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#007bff';
  ctx.fillRect(0, 0, 256, 256);
  
  // Server icon design
  ctx.fillStyle = 'white';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖥️', 128, 128);
  
  // Save as PNG for now (in a real scenario, you'd use a proper ICO converter)
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('assets/icon.png', buffer);
  
  console.log('Icon created successfully');
}

createIcon();