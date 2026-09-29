const fs = require('fs');

const nativePath = 'c:/Users/sahen/attendance-payroll-app/src/services/quotationPdf.ts';
const webPath = 'c:/Users/sahen/attendance-payroll-app/admin-web/src/services/quotationWebPdf.js';

let nativeContent = fs.readFileSync(nativePath, 'utf8');
let webContent = fs.readFileSync(webPath, 'utf8');

// Extract buildQuotationHtml from Native App
const match = nativeContent.match(/export function buildQuotationHtml\(q: any\): string \{([\s\S]*?\n\})/);
if (!match) throw new Error('Could not find buildQuotationHtml in native app');

let nativeFunction = 'export function buildQuotationHtml(q) {' + match[1];

// Replace esc with escapeHtml
nativeFunction = nativeFunction.replace(/\besc\(/g, 'escapeHtml(');
// Replace inr with formatINR
nativeFunction = nativeFunction.replace(/\binr\(/g, 'formatINR(');

// Apply API_HOST replacement for the image tag in web (native app uses pure acc.image because it is base64)
// But on Web we need: acc.image.startsWith('/') ? API_HOST + acc.image : acc.image
nativeFunction = nativeFunction.replace(
  /\`\<img src=\"\$\{acc\.image\}\" /g,
  "`<img src=\"${acc.image.startsWith('/') ? API_HOST + acc.image : acc.image}\" "
);

// Now replace the existing buildQuotationHtml in webContent
const webMatch = webContent.match(/export function buildQuotationHtml\(q\) \{([\s\S]*?\n\})/);
if (!webMatch) throw new Error('Could not find buildQuotationHtml in web app');

webContent = webContent.replace(webMatch[0], nativeFunction);

fs.writeFileSync(webPath, webContent);
console.log('Successfully synced PDF template!');
