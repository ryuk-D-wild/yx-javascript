const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
  <text x="10" y="30" font-family="Arial" font-size="24" fill="blue">Hello World</text>
</svg>`;

const encoded = encodeURIComponent(svg);
const dataUrl = `data:image/svg+xml,${encoded}`;

console.log(dataUrl);
