#!/usr/bin/env node

/**
 * Script pour télécharger et extraire le binaire Stockfish 17.1
 * Exécute: node download-stockfish.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const BIN_DIR = path.join(__dirname, 'bin');
const STOCKFISH_EXE = path.join(BIN_DIR, 'stockfish.exe');
const ZIP_FILE = path.join(__dirname, 'stockfish.zip');

// URL du ZIP Stockfish 17.1 pour Windows x86-64
const STOCKFISH_URL = 'https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-windows-x86-64.zip';

console.log('='.repeat(60));
console.log('Telechargement de Stockfish 17.1 pour Windows...');
console.log('='.repeat(60));
console.log('URL: ' + STOCKFISH_URL);
console.log('Destination: ' + STOCKFISH_EXE);
console.log('');

// Créer le répertoire s'il n'existe pas
if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

// Supprimer le fichier précédent s'il existe
if (fs.existsSync(STOCKFISH_EXE)) {
  console.log('Suppression de l\'ancien fichier...');
  fs.unlinkSync(STOCKFISH_EXE);
}

function downloadFile(url, dest, depth = 0) {
  if (depth > 5) {
    throw new Error('Trop de redirections');
  }

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const request = https.get(url, options, (response) => {
      console.log('Status: ' + response.statusCode);
      
      // Gestion des redirections
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const location = response.headers.location;
        console.log('Redirection vers: ' + location);
        downloadFile(location, dest, depth + 1).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error('HTTP ' + response.statusCode + ': ' + response.statusMessage));
        return;
      }

      console.log('Content-Type: ' + response.headers['content-type']);
      console.log('Content-Length: ' + response.headers['content-length'] + ' bytes');
      console.log('');

      const file = fs.createWriteStream(dest);
      let downloadedSize = 0;
      const totalSize = parseInt(response.headers['content-length']) || 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          process.stdout.write(`\rTelechargement: ${percent}% (${Math.round(downloadedSize / 1024 / 1024 * 100) / 100} MB)`);
        }
      });

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('\n\nTelechargement termine!');
        const stats = fs.statSync(dest);
        console.log('Fichier: ' + dest);
        console.log('Taille: ' + Math.round(stats.size / 1024 / 1024 * 100) / 100 + ' MB');
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });

    request.on('error', reject);
    request.setTimeout(120000, () => {
      request.abort();
      reject(new Error('Timeout apres 120 secondes'));
    });
  });
}

downloadFile(STOCKFISH_URL, ZIP_FILE)
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('Extraction du ZIP...');
    console.log('='.repeat(60));
    
    const zip = new AdmZip(ZIP_FILE);
    zip.extractAllTo(BIN_DIR, true);
    
    console.log('ZIP extrait!');
    
    // Chercher et renommer le .exe trouvé
    const files = fs.readdirSync(BIN_DIR);
    const exeFile = files.find(f => f.endsWith('.exe'));
    
    if (exeFile) {
      const sourcePath = path.join(BIN_DIR, exeFile);
      if (sourcePath !== STOCKFISH_EXE) {
        fs.renameSync(sourcePath, STOCKFISH_EXE);
        console.log('Renomme: ' + exeFile + ' -> stockfish.exe');
      }
    }
    
    // Nettoyer le ZIP
    fs.unlinkSync(ZIP_FILE);
    
    console.log('\n' + '='.repeat(60));
    console.log('SUCCESS - Stockfish 17.1 pret!');
    console.log('='.repeat(60));
    console.log('Fichier: ' + STOCKFISH_EXE);
    console.log('Taille: ' + Math.round(fs.statSync(STOCKFISH_EXE).size / 1024 / 1024 * 100) / 100 + ' MB');
    console.log('\nProchaines etapes:');
    console.log('1. Lance l\'app: npm start');
    console.log('');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n' + '='.repeat(60));
    console.error('ERREUR: ' + err.message);
    console.error('='.repeat(60));
    if (fs.existsSync(ZIP_FILE)) {
      try {
        fs.unlinkSync(ZIP_FILE);
        console.log('ZIP corrompu supprime.');
      } catch (_) {}
    }
    process.exit(1);
  });
