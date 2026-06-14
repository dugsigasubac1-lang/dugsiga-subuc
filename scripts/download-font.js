import https from 'https';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const url = 'https://www.1001fonts.com/download/lutfey-arabic-demo.zip';
const zipPath = path.join(process.cwd(), 'lutfey-font.zip');
const outputDir = path.join(process.cwd(), 'src', 'assets', 'fonts');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Downloading font from: ${url}...`);

const file = fs.createWriteStream(zipPath);
https.get(url, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download: Status Code ${response.statusCode}`);
    process.exit(1);
  }

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('Download complete. Extracting files...');
    
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      
      let foundFontFile = false;
      zipEntries.forEach((entry) => {
        const ext = path.extname(entry.entryName).toLowerCase();
        if (ext === '.ttf' || ext === '.otf' || ext === '.woff' || ext === '.woff2') {
          console.log(`Extracting: ${entry.entryName}`);
          zip.extractEntryTo(entry, outputDir, false, true);
          foundFontFile = true;
        }
      });
      
      if (!foundFontFile) {
        console.warn('No font file (.ttf / .otf / .woff / .woff2) was found in the downloaded zip archive.');
      } else {
        console.log('Font files successfully extracted to src/assets/fonts/');
      }
      
      // Cleanup zip file
      fs.unlinkSync(zipPath);
      console.log('Cleanup complete.');
    } catch (err) {
      console.error('Error during font extraction:', err);
    }
  });
}).on('error', (err) => {
  console.error('HTTP Request Error:', err);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
});
