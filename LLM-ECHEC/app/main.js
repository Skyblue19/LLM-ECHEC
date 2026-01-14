require('dotenv').config();
console.log('Clé chargée depuis .env :', process.env.MISTRAL_API_KEY ? 'OK' : 'MANQUANTE');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

async function mistralChat({ apiKey, model, messages }) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Mistral API error (${res.status}): ${text || res.statusText}`);
  }

  return res.json();
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('mistral:analyze', async (_event, payload) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Clé Mistral manquante. Définis la variable d\'environnement MISTRAL_API_KEY puis relance l\'application.'
    };
  }

  const fen = payload?.fen;
  if (!fen || typeof fen !== 'string') {
    return { ok: false, error: 'Entrée invalide: FEN manquante.' };
  }

  const model = payload?.model || 'mistral-small-latest';

  const messages = [
    {
      role: 'system',
      content:
        "Tu es un tuteur d'échecs francophone pour joueurs (niveau 1600–2200 Elo). Ton rôle : expliquer en langage naturel, poser des questions, donner des indices avant la solution. Structure ta réponse en 3 sections : 1) Plans possibles, 2) Questions guidées, 3) Synthèse. Sois concis et actionnable. N'invente pas de faits ; si tu es incertain, dis-le."
    },
    {
      role: 'user',
      content:
        `Position (FEN) : ${fen}\n\nAnalyse et donne :\n1) Trois plans possibles (court, 1-2 lignes chacun)\n2) Trois questions pour guider l'apprenant\n3) Une synthèse ultra-courte (1 phrase)\n\nSois pédagogique, pas technique.`
    }
  ];

  try {
    const data = await mistralChat({ apiKey, model, messages });
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Mistral response empty:', data);
      return { ok: false, error: 'Réponse Mistral vide (contenu manquant).' };
    }

    return { ok: true, content };
  } catch (err) {
    console.error('Mistral API error:', err);
    const msg = err?.message || '';
    if (msg.includes('401')) return { ok: false, error: 'Clé Mistral invalide.' };
    if (msg.includes('429')) return { ok: false, error: 'Trop de requêtes Mistral (quota dépassé).' };
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return { ok: false, error: 'Erreur réseau Mistral (vérifie ta connexion).' };
    }
    return { ok: false, error: `Erreur Mistral : ${msg}` };
  }
});

// Handler pour l'analyse de coup
ipcMain.handle('mistral:analyzeMove', async (_event, payload) => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Clé Mistral manquante. Définis la variable d\'environnement MISTRAL_API_KEY puis relance l\'application.'
    };
  }

  const fen = payload?.fen;
  const move = payload?.move;
  
  if (!fen || typeof fen !== 'string') {
    return { ok: false, error: 'Entrée invalide: FEN manquante.' };
  }
  
  if (!move || typeof move !== 'string') {
    return { ok: false, error: 'Entrée invalide: coup manquant.' };
  }

  const model = payload?.model || 'mistral-small-latest';

  const messages = [
    {
      role: 'system',
      content:
        "Tu es un tuteur d'échecs francophone pour joueurs (niveau 1600–2200 Elo). Ton rôle : analyser un coup spécifique dans une position et donner une critique constructive. Structure ta réponse en 3 sections : 1) Évaluation du coup (excellent/bon/moyen/mauvais), 2) Alternatives meilleures, 3) Explication pédagogique. Sois concis et actionnable. N'invente pas de faits ; si tu es incertain, dis-le."
    },
    {
      role: 'user',
      content:
        `Position (FEN) : ${fen}\nCoup analysé : ${move}\n\nAnalyse ce coup et donne :\n1) Évaluation du coup (excellent/bon/moyen/mauvais) avec justification\n2) 2-3 alternatives meilleures avec explications\n3) Une explication pédagogique (pourquoi ce coup est bon/mauvais)\n\nSois pédagogique et constructif.`
    }
  ];

  try {
    const data = await mistralChat({ apiKey, model, messages });
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('Mistral response empty:', data);
      return { ok: false, error: 'Réponse Mistral vide (contenu manquant).' };
    }

    return { ok: true, content };
  } catch (err) {
    console.error('Mistral API error:', err);
    const msg = err?.message || '';
    if (msg.includes('401')) return { ok: false, error: 'Clé Mistral invalide.' };
    if (msg.includes('429')) return { ok: false, error: 'Trop de requêtes Mistral (quota dépassé).' };
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return { ok: false, error: 'Erreur réseau Mistral (vérifie ta connexion).' };
    }
    return { ok: false, error: `Erreur Mistral : ${msg}` };
  }
});

// Handler pour sauvegarder une session
ipcMain.handle('session:save', async (_event, sessionData) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `session-${timestamp}.json`;
    const filePath = path.join(__dirname, 'data', fileName);
    
    // Assurer que le dossier data existe
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    await fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), 'utf8');
    return { ok: true, fileName };
  } catch (err) {
    console.error('Erreur sauvegarde session:', err);
    return { ok: false, error: err.message };
  }
});

// Handler pour recharger une session
ipcMain.handle('session:load', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Recharger une session',
      defaultPath: path.join(__dirname, 'data'),
      filters: [{ name: 'JSON Sessions', extensions: ['json'] }],
      properties: ['openFile']
    });
    
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, canceled: true };
    }
    
    const filePath = result.filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    const sessionData = JSON.parse(content);
    
    return { ok: true, sessionData, fileName: path.basename(filePath) };
  } catch (err) {
    console.error('Erreur chargement session:', err);
    return { ok: false, error: err.message };
  }
});

// Handler pour charger les défis
ipcMain.handle('defis:load', async () => {
  try {
    const defisPath = path.join(__dirname, 'data', 'defis-data.json');
    const content = await fs.readFile(defisPath, 'utf8');
    const defis = JSON.parse(content);
    return { ok: true, defis };
  } catch (err) {
    console.error('Erreur chargement défis:', err);
    return { ok: false, error: err.message };
  }
});

// Handler pour mettre à jour la progression
ipcMain.handle('progression:update', async (_event, progressionData) => {
  try {
    const progressionPath = path.join(__dirname, 'data', 'progression.json');
    
    // Lire la progression actuelle
    let progression;
    try {
      const content = await fs.readFile(progressionPath, 'utf8');
      progression = JSON.parse(content);
    } catch {
      progression = {
        sessions_totales: 0,
        defis_completes: 0,
        themes_travailles: [],
        score_moyen: 0,
        derniere_session: null,
        defis_en_cours: null
      };
    }
    
    // Mettre à jour avec les nouvelles données
    Object.assign(progression, progressionData);
    
    await fs.writeFile(progressionPath, JSON.stringify(progression, null, 2), 'utf8');
    return { ok: true, progression };
  } catch (err) {
    console.error('Erreur mise à jour progression:', err);
    return { ok: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
