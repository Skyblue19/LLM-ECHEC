require('dotenv').config();
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const { Chess } = require('chess.js');
const { spawn } = require('child_process');
const os = require('os');

// Configuration du fichier de log
const LOG_FILE = path.join(__dirname, 'app.log');

// Fonction de logging qui ecrit dans le fichier et la console
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${type}] ${message}\n`;
  
  // Ecrire dans la console
  if (type === 'ERROR') {
    console.error(message);
  } else {
    console.log(message);
  }
  
  // Ecrire dans le fichier (mode append)
  try {
    fsSync.appendFileSync(LOG_FILE, logLine, 'utf8');
  } catch (err) {
    console.error('Erreur ecriture log:', err);
  }
}

// Initialiser le fichier de log
try {
  const startMessage = `\n${'='.repeat(80)}\nDemarrage application - ${new Date().toISOString()}\n${'='.repeat(80)}\n`;
  fsSync.writeFileSync(LOG_FILE, startMessage, 'utf8');
} catch (err) {
  console.error('Erreur initialisation fichier log:', err);
}

log('Cle chargee depuis .env : ' + (process.env.MISTRAL_API_KEY ? 'OK' : 'MANQUANTE'));

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

function convertToUciMove(fen, sanMove) {
  log('[UCI] Conversion SAN -> UCI: ' + JSON.stringify({ fen, sanMove }));
  const chess = new Chess(fen);
  const move = chess.move(sanMove, { sloppy: true });
  if (!move) {
    log('[UCI] ERREUR - Coup invalide: ' + sanMove, 'ERROR');
    return null;
  }
  const promotion = move.promotion ? move.promotion : '';
  const uciMove = `${move.from}${move.to}${promotion}`;
  log('[UCI] OK - Resultat: ' + uciMove);
  return uciMove;
}

function getStockfishPath() {
  // Déterminer le chemin du binaire stockfish en fonction de l'OS
  const platform = os.platform();
  const binDir = path.join(__dirname, 'bin');
  
  if (platform === 'win32') {
    return path.join(binDir, 'stockfish.exe');
  } else if (platform === 'darwin') {
    return path.join(binDir, 'stockfish-mac');
  } else {
    return path.join(binDir, 'stockfish');
  }
}

function analyzeWithStockfish(fen, uciMove, depth = 20, timeoutMs = 15000) {
  log('[STOCKFISH] Demarrage analyse REELLE avec FEN: ' + fen.substring(0, 50) + '...');
  log('[STOCKFISH] UCI Move: ' + uciMove + ', Depth: ' + depth);
  
  return new Promise((resolve) => {
    const stockfishPath = getStockfishPath();
    
    // Vérifier que le binaire existe
    if (!fsSync.existsSync(stockfishPath)) {
      log('[STOCKFISH] ERREUR - Binaire Stockfish introuvable: ' + stockfishPath, 'ERROR');
      log('[STOCKFISH] Chemin attendu: ' + stockfishPath, 'ERROR');
      log('[STOCKFISH] Les fichiers du dossier bin sont: ' + JSON.stringify(fsSync.readdirSync(path.join(__dirname, 'bin'), { recursive: true })), 'ERROR');
      resolve({ ok: false, error: 'Binaire Stockfish manquant. Verifie le dossier /bin' });
      return;
    }
    
    log('[STOCKFISH] Lancement du processus: ' + stockfishPath);
    const engine = spawn(stockfishPath);
    
    let evalCp = null;
    let evalMate = null;
    let pvLine = '';
    let bestmove = '';
    let settled = false;
    let buffer = '';

    const cleanup = () => {
      try {
        engine.stdin.write('quit\n');
        engine.kill();
      } catch (_) { /* ignore */ }
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      log('[STOCKFISH] TIMEOUT apres ' + timeoutMs + 'ms', 'ERROR');
      resolve({ ok: false, error: 'Analyse Stockfish expiree (timeout).' });
    }, timeoutMs);

    engine.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      lines.forEach(line => {
        const text = line.trim();
        if (!text) return;
        
        log('[STOCKFISH] RECU: ' + text);

        if (text.startsWith('info ')) {
          const mateMatch = text.match(/score\s+mate\s+(-?\d+)/);
          const cpMatch = text.match(/score\s+cp\s+(-?\d+)/);
          
          if (mateMatch) {
            evalMate = Number(mateMatch[1]);
            log('[STOCKFISH] EVAL MATE: ' + evalMate);
          } else if (cpMatch) {
            evalCp = Number(cpMatch[1]);
            log('[STOCKFISH] EVAL CP: ' + (evalCp / 100).toFixed(2));
          }

          const pvMatch = text.match(/ pv (.+)$/);
          if (pvMatch) {
            pvLine = pvMatch[1].trim();
          }
        }

        if (text.startsWith('bestmove')) {
          bestmove = text.split(' ')[1] || '';
          log('[STOCKFISH] BESTMOVE: ' + bestmove);
          
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          cleanup();
          
          const result = { 
            ok: true, 
            bestmove, 
            evalCp, 
            evalMate, 
            pv: pvLine || uciMove 
          };
          log('[STOCKFISH] RESULTAT FINAL: ' + JSON.stringify(result));
          resolve(result);
        }
      });
    });

    engine.stderr.on('data', (data) => {
      log('[STOCKFISH] STDERR: ' + data.toString(), 'ERROR');
    });

    engine.on('error', (err) => {
      log('[STOCKFISH] ERREUR PROCESSUS: ' + err.message, 'ERROR');
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: 'Erreur Stockfish: ' + err.message });
    });

    // Envoyer les commandes UCI
    log('[STOCKFISH] ENVOI: uci');
    engine.stdin.write('uci\n');
    
    log('[STOCKFISH] ENVOI: isready');
    engine.stdin.write('isready\n');
    
    log('[STOCKFISH] ENVOI: setoption name MultiPV value 3');
    engine.stdin.write('setoption name MultiPV value 3\n');
    
    log('[STOCKFISH] ENVOI: ucinewgame');
    engine.stdin.write('ucinewgame\n');
    
    log('[STOCKFISH] ENVOI: position fen ' + fen);
    engine.stdin.write(`position fen ${fen}\n`);
    
    log('[STOCKFISH] ENVOI: go depth ' + depth);
    engine.stdin.write(`go depth ${depth}\n`);
  });
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
  try {
    log('\n' + '='.repeat(80));
    log('[HANDLER ANALYZE] Nouvelle requete d\'analyse de position');
    log('[HANDLER ANALYZE] Payload recu: ' + JSON.stringify(payload, null, 2));

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      log('[HANDLER ANALYZE] ERREUR - Cle Mistral manquante', 'ERROR');
      return {
        ok: false,
        error:
          'Clé Mistral manquante. Définis la variable d\'environnement MISTRAL_API_KEY puis relance l\'application.'
      };
    }

    const fen = payload?.fen;
    if (!fen || typeof fen !== 'string') {
      log('[HANDLER ANALYZE] ERREUR - FEN invalide', 'ERROR');
      return { ok: false, error: 'Entrée invalide: FEN manquante.' };
    }

    const model = payload?.model || 'mistral-small-latest';
    log('[HANDLER ANALYZE] Modele Mistral: ' + model);

    // Analyser la position avec Stockfish (SANS forcer un coup specifique)
    log('[HANDLER ANALYZE] Lancement analyse Stockfish de la position...');
    const engineRes = await analyzeWithStockfish(fen, 'a1a1');  // Dummy move pour le paramètre
    if (!engineRes?.ok) {
      log('[HANDLER ANALYZE] ERREUR - Stockfish: ' + (engineRes?.error || 'inconnue'), 'ERROR');
      return { ok: false, error: engineRes?.error || 'Erreur Stockfish.' };
    }
    log('[HANDLER ANALYZE] OK - Analyse Stockfish reussie: ' + JSON.stringify(engineRes));

    const activeColor = fen.split(' ')[1] === 'w' ? 'blancs' : 'noirs';

    const evalText = engineRes.evalMate !== null
      ? `Mate en ${Math.abs(engineRes.evalMate)} ${engineRes.evalMate > 0 ? '(avantage ' + activeColor + ')' : '(desavantage ' + activeColor + ')'}`
      : (engineRes.evalCp !== null ? `${(engineRes.evalCp/100).toFixed(2)} pions pour ${activeColor}` : 'Eval inconnue');

    let positionAssessment = 'Position indeterminee.';
    if (engineRes.evalMate !== null) {
      positionAssessment = engineRes.evalMate > 0
        ? `Position gagnante pour ${activeColor} - Mat annonce !`
        : `Position perdante pour ${activeColor} - Mat annonce contre !`;
    } else if (engineRes.evalCp !== null) {
      const cp = engineRes.evalCp;
      if (cp >= 300) positionAssessment = `Gros avantage pour ${activeColor} (${(cp/100).toFixed(2)} pions).`;
      else if (cp >= 100) positionAssessment = `Avantage pour ${activeColor} (${(cp/100).toFixed(2)} pions).`;
      else if (cp > -100) positionAssessment = `Position equilibree.`;
      else if (cp > -300) positionAssessment = `Legere avantage pour l'adversaire (${Math.abs(cp/100).toFixed(2)} pions).`;
      else positionAssessment = `Gros desavantage pour ${activeColor} (${Math.abs(cp/100).toFixed(2)} pions).`;
    }

    const stockfishAnalysis = [
      `FEN: ${fen}`,
      `Camp au trait: ${activeColor}`,
      `Evaluation: ${evalText}`,
      `Assessment: ${positionAssessment}`,
      `Meilleur coup: ${engineRes.bestmove}`,
      `Ligne principale: ${engineRes.pv}`
    ].join('\n');

    log('[HANDLER ANALYZE] Analyse Stockfish pour Mistral:');
    log(stockfishAnalysis);

    const messages = [
      {
        role: 'system',
        content:
          `Tu es Stockfish 17.1, le moteur d'echecs. Parle a la premiere personne. Ne dis jamais "d'apres Stockfish", "selon le moteur" ou quoi que ce soit qui indique que tu rapportes une analyse externe.\n\nREGLES D'EXPRESSION:\n- Exprime TOUTES les evaluations en pions (cp/100), arrondies a 2 decimales. N'utilise jamais les termes "centipawns" ou "cp".\n- N'invente rien: base-toi uniquement sur les donnees fournies.\n\nStructure ta reponse EXACTEMENT comme suit:\n1) **Evaluation position**: Qui est mieux et de combien (en pions), avec 1-2 raisons claires.\n2) **Meilleur coup**: Explique LE meilleur coup que je recommande et pourquoi il fonctionne (themes tactiques/strategiques).\n3) **Autres options (si disponibles)**: Cite d'autres bons coups uniquement s'ils sont fournis; sinon precise qu'aucune alternative fiable n'est disponible.\n4) **Plan general**: Donne un plan strategique simple pour ${activeColor}.`
      },
      {
        role: 'user',
        content:
          `Analyse de la position:\n${stockfishAnalysis}\n\nExplique cette position et recommande les meilleurs coups (en pions).`
      }
    ];

    log('[HANDLER ANALYZE] Envoi requete a Mistral AI...');
    log('[HANDLER ANALYZE] Messages: ' + JSON.stringify(messages, null, 2));

    const data = await mistralChat({ apiKey, model, messages });
    log('[HANDLER ANALYZE] Reponse recue: ' + JSON.stringify(data, null, 2));
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      log('[HANDLER ANALYZE] ERREUR - Reponse vide: ' + JSON.stringify(data), 'ERROR');
      return { ok: false, error: 'Reponse Mistral vide (contenu manquant).' };
    }

    log('[HANDLER ANALYZE] Contenu de la reponse: ' + content);
    log('[HANDLER ANALYZE] OK - Analyse complete terminee avec succes');
    log('='.repeat(80) + '\n');
    return { ok: true, content, engine: engineRes };
  } catch (err) {
    log('[HANDLER ANALYZE] ERREUR CRITIQUE: ' + err.message, 'ERROR');
    log('[HANDLER ANALYZE] Stack: ' + err.stack, 'ERROR');
    return { ok: false, error: 'Erreur interne: ' + err.message };
  }
});

// Handler pour l'analyse de coup
ipcMain.handle('mistral:analyzeMove', async (_event, payload) => {
  try {
    log('\n' + '='.repeat(80));
    log('[HANDLER] Nouvelle requete d\'analyse de coup');
    log('[HANDLER] Payload recu: ' + JSON.stringify(payload, null, 2));
    
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      log('[HANDLER] ERREUR - Cle Mistral manquante', 'ERROR');
      return {
        ok: false,
        error:
          'Cle Mistral manquante. Definis la variable d\'environnement MISTRAL_API_KEY puis relance l\'application.'
      };
    }

    const fen = payload?.fen;
    const move = payload?.move;
    
    if (!fen || typeof fen !== 'string') {
      log('[HANDLER] ERREUR - FEN invalide: ' + fen, 'ERROR');
      return { ok: false, error: 'Entree invalide: FEN manquante.' };
    }
    
    if (!move || typeof move !== 'string') {
      log('[HANDLER] ERREUR - Coup invalide: ' + move, 'ERROR');
      return { ok: false, error: 'Entree invalide: coup manquant.' };
    }

    log('[HANDLER] Position FEN: ' + fen);
    log('[HANDLER] Coup demande: ' + move);

    const model = payload?.model || 'mistral-small-latest';
    log('[HANDLER] Modele Mistral: ' + model);

    log('[HANDLER] Conversion en notation UCI...');
    const uciMove = convertToUciMove(fen, move);
    if (!uciMove) {
      log('[HANDLER] ERREUR - Conversion UCI echouee', 'ERROR');
      return { ok: false, error: `Coup invalide ou non reconnu : ${move}` };
    }
    log('[HANDLER] OK - Coup UCI: ' + uciMove);

    // Analyser AVANT le coup pour connaître le meilleur coup du joueur
    log('[HANDLER] Lancement analyse Stockfish sur position AVANT le coup (pour meilleur coup du joueur)...');
    const engineResBefore = await analyzeWithStockfish(fen, uciMove);
    if (!engineResBefore?.ok) {
      log('[HANDLER] ERREUR - Stockfish (avant): ' + (engineResBefore?.error || 'inconnue'), 'ERROR');
      return { ok: false, error: engineResBefore?.error || 'Erreur Stockfish.' };
    }
    log('[HANDLER] OK - Analyse Stockfish AVANT reussie: ' + JSON.stringify(engineResBefore));
    const bestMoveForPlayer = engineResBefore.bestmove;
    const bestMovePVForPlayer = engineResBefore.pv;

    // Calculer la position APRES le coup joue
    log('[HANDLER] Calcul de la position apres le coup...');
    const chess = new Chess(fen);
    const moveResult = chess.move(move, { sloppy: true });
    if (!moveResult) {
      log('[HANDLER] ERREUR - Impossible de jouer le coup', 'ERROR');
      return { ok: false, error: `Coup invalide : ${move}` };
    }
    const fenAfterMove = chess.fen();
    log('[HANDLER] FEN apres coup: ' + fenAfterMove);

    log('[HANDLER] Lancement analyse Stockfish sur position APRES le coup...');
    const engineRes = await analyzeWithStockfish(fenAfterMove, uciMove);
    if (!engineRes?.ok) {
      log('[HANDLER] ERREUR - Stockfish: ' + (engineRes?.error || 'inconnue'), 'ERROR');
      return { ok: false, error: engineRes?.error || 'Erreur Stockfish.' };
    }
    log('[HANDLER] OK - Analyse Stockfish APRES reussie: ' + JSON.stringify(engineRes));

    // Determiner le camp qui vient de jouer (celui de la position AVANT le coup)
    const playerColor = fen.split(' ')[1] === 'w' ? 'blancs' : 'noirs';
    // Determiner le camp au trait MAINTENANT (apres le coup)
    const activeColor = fenAfterMove.split(' ')[1] === 'w' ? 'blancs' : 'noirs';

    // L'evaluation Stockfish est du point de vue du camp AU TRAIT (activeColor)
    // Pour evaluer le coup du joueur, on doit INVERSER le signe
    // Car un score positif pour l'adversaire = score negatif pour le joueur
    const evalForPlayer = engineRes.evalCp !== null ? -engineRes.evalCp : null;
    const evalMateForPlayer = engineRes.evalMate !== null ? -engineRes.evalMate : null;

    const evalText = evalMateForPlayer !== null
      ? `Mate en ${Math.abs(evalMateForPlayer)} ${evalMateForPlayer > 0 ? '(vous matez)' : '(vous etes mate)'}`
      : (evalForPlayer !== null ? `${(evalForPlayer/100).toFixed(2)} pions pour ${playerColor}` : 'Eval inconnue');

    let evalInterpretation = 'Indetermine.';
    if (evalMateForPlayer !== null) {
      evalInterpretation = evalMateForPlayer > 0
        ? 'Coup gagnant ! (mat annonce pour vous).'
        : 'Coup perdant (mat annonce contre vous).';
    } else if (evalForPlayer !== null) {
      const cp = evalForPlayer;
      if (cp >= 150) evalInterpretation = 'Excellent coup ! Gros avantage obtenu.';
      else if (cp >= 50) evalInterpretation = 'Bon coup, avantage pour vous.';
      else if (cp > -50) evalInterpretation = 'Coup acceptable, position equilibree.';
      else if (cp > -150) evalInterpretation = 'Coup discutable, legers problemes.';
      else evalInterpretation = 'Mauvais coup ! Gros desavantage.';
    }

    const engineSummary = [
      `Position initiale: ${fen}`,
      `Coup joue: ${move} (UCI: ${uciMove}) par ${playerColor}`,
      `Position resultante: ${fenAfterMove}`,
      `Evaluation du coup pour ${playerColor}: ${evalText}`,
      `Interpretation: ${evalInterpretation}`,
      `Camp au trait maintenant: ${activeColor}`,
      `MEILLEUR COUP POUR ${playerColor.toUpperCase()} dans la position AVANT le coup: ${bestMoveForPlayer}`,
      `Ligne principale pour ${playerColor}: ${bestMovePVForPlayer}`,
      `Evaluation brute (du point de vue ${activeColor}): ${(engineRes.evalCp !== null ? (engineRes.evalCp/100).toFixed(2) + ' pions' : 'inconnue')}`,
      `Ligne principale APRES le coup (response des blancs): ${engineRes.pv}`
    ].join('\n');

    log('[HANDLER] Resume moteur pour Mistral:');
    log(engineSummary);

    const messages = [
      {
        role: 'system',
        content:
          `Tu es Stockfish 17.1, le moteur d'echecs. Parle a la premiere personne et ne fais aucune reference a "d'apres Stockfish" ou "selon le moteur".\n\nREGLES STRICTES ABSOLUES:\n1) L'evaluation est exprimee en pions (cp/100) du point de vue du joueur (deja inversee). Negatif = mauvais pour le joueur. N'utilise jamais "centipawns" ou "cp".\n2) Notation du coup (seuils en pions):\n   - eval <= -1.50: MAUVAIS/ERREUR (perte importante)\n   - -1.50 < eval <= -0.50: DISCUTABLE (legers problemes)\n   - -0.50 < eval < 0.50: NEUTRE/ACCEPTABLE\n   - 0.50 <= eval < 1.50: BON\n   - eval >= 1.50: EXCELLENT\n3) Compare le coup joue avec le meilleur coup que je recommande.\n4) Ne cite QUE les coups fournis. N'invente JAMAIS de coups.\n\nStructure ta reponse:\n1) Note du coup (avec evaluation en pions)\n2) Pourquoi ce coup est bon/mauvais (themes tactiques/strategiques)\n3) Le meilleur coup et la difference avec le coup joue\n4) Conclusion courte (4-6 phrases), uniquement basee sur les donnees fournies.`
      },
      {
        role: 'user',
        content:
          `Analyse:\n${engineSummary}\n\nRedige une critique pedagogique du coup joue. Compare-le au MEILLEUR COUP pour le joueur (en pions).`
      }
    ];

    log('[MISTRAL] Envoi requete a Mistral AI...');
    log('[MISTRAL] Messages: ' + JSON.stringify(messages, null, 2));

    const data = await mistralChat({ apiKey, model, messages });
    log('[MISTRAL] Reponse recue: ' + JSON.stringify(data, null, 2));
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      log('[MISTRAL] ERREUR - Reponse vide: ' + JSON.stringify(data), 'ERROR');
      return { ok: false, error: 'Reponse Mistral vide (contenu manquant).' };
    }

    log('[MISTRAL] Contenu de la reponse: ' + content);
    log('[HANDLER] OK - Analyse complete terminee avec succes');
    log('='.repeat(80) + '\n');
    return { ok: true, content, engine: engineRes, uciMove };
  } catch (err) {
    log('[HANDLER] ERREUR CRITIQUE: ' + err.message, 'ERROR');
    log('[HANDLER] Stack: ' + err.stack, 'ERROR');
    return { ok: false, error: 'Erreur interne: ' + err.message };
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
    log('Erreur sauvegarde session: ' + err.message, 'ERROR');
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
    log('Erreur chargement session: ' + err.message, 'ERROR');
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
    log('Erreur chargement defis: ' + err.message, 'ERROR');
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
    log('Erreur mise a jour progression: ' + err.message, 'ERROR');
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
