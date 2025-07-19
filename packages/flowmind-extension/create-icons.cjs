#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create simple base64 encoded PNG icons as placeholders
const createIcon = (size) => {
  // This is a simple 1x1 blue pixel PNG encoded in base64
  // In a real project, you would use proper icon generation tools
  const bluePixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==';
  
  // Create a simple colored square for each size
  const canvas = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#3B82F6"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold">F</text>
  </svg>`;
  
  return canvas;
};

// Create icon files
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const svgContent = createIcon(size);
  const filename = `icon-${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svgContent);
  console.log(`Created ${filename}`);
});

console.log('Icon placeholders created successfully!');
console.log('Note: These are SVG placeholders. For production, convert to PNG using a tool like Inkscape or online converters.');
