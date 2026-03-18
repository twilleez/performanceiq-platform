// Run this in browser console ONCE to download placeholder icons
// Then upload the downloaded files to your repo under /icons/

const sizes  = [72, 96, 128, 144, 152, 192, 384, 512];
const bg     = '#0d1b3e';
const accent = '#22c955';
const text   = 'PIQ';

sizes.forEach(size => {
  const canvas  = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Text
  ctx.fillStyle   = accent;
  ctx.font        = `bold ${size * 0.35}px 'Oswald', sans-serif`;
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);

  // Download
  const a    = document.createElement('a');
  a.href     = canvas.toDataURL('image/png');
  a.download = `icon-${size}.png`;
  a.click();
});
