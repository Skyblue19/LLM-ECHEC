const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const pieceToUnicode = {
  p: '♟',
  r: '♜',
  n: '♞',
  b: '♝',
  q: '♛',
  k: '♚',
  P: '♙',
  R: '♖',
  N: '♘',
  B: '♗',
  Q: '♕',
  K: '♔'
};

function normalizeFen(input) {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return { ok: false, error: 'FEN vide.' };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { ok: true, fen: `${parts[0]} w - - 0 1` };
  }

  if (parts.length < 2) {
    return { ok: false, error: 'FEN invalide: champs manquants.' };
  }

  if (parts.length >= 6) {
    return { ok: true, fen: parts.slice(0, 6).join(' ') };
  }

  const placement = parts[0];
  const active = parts[1];
  const castling = parts[2] ?? '-';
  const ep = parts[3] ?? '-';
  const halfmove = parts[4] ?? '0';
  const fullmove = parts[5] ?? '1';

  return { ok: true, fen: `${placement} ${active} ${castling} ${ep} ${halfmove} ${fullmove}` };
}

function parsePlacement(placement) {
  const ranks = placement.split('/');
  if (ranks.length !== 8) {
    return { ok: false, error: `Placement invalide: attendu 8 rangées, reçu ${ranks.length}.` };
  }

  const board = [];

  for (const rank of ranks) {
    const row = [];
    let fileCount = 0;

    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        const n = Number(ch);
        fileCount += n;
        for (let i = 0; i < n; i++) row.push(null);
      } else if (pieceToUnicode[ch]) {
        fileCount += 1;
        row.push(ch);
      } else {
        return { ok: false, error: `Caractère invalide dans la FEN: "${ch}".` };
      }
    }

    if (fileCount !== 8) {
      return { ok: false, error: `Rangée invalide: attendu 8 colonnes, reçu ${fileCount}.` };
    }

    board.push(row);
  }

  return { ok: true, board };
}

function parseFen(fen) {
  const parts = fen.split(/\s+/);
  if (parts.length < 2) return { ok: false, error: 'FEN invalide: au moins 2 champs requis.' };

  const placement = parts[0];
  const activeColor = parts[1];
  if (activeColor !== 'w' && activeColor !== 'b') {
    return { ok: false, error: 'FEN invalide: le trait doit être "w" ou "b".' };
  }

  const placementParsed = parsePlacement(placement);
  if (!placementParsed.ok) return placementParsed;

  return {
    ok: true,
    board: placementParsed.board,
    activeColor
  };
}

function renderBoard(board) {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = document.createElement('div');
      square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      
      // Ajouter l'attribut data-square pour la mise en évidence
      const file = String.fromCharCode(97 + c); // a-h
      const rank = String(8 - r); // 8-1
      square.setAttribute('data-square', file + rank);
      
      const piece = board[r][c];
      square.textContent = piece ? pieceToUnicode[piece] : '';
      boardEl.appendChild(square);
    }
  }
}

function setError(message) {
  const errorEl = document.getElementById('error');
  errorEl.textContent = message ?? '';
}

function setMeta(activeColor) {
  const metaEl = document.getElementById('meta');
  const label = activeColor === 'w' ? 'Blancs' : 'Noirs';
  metaEl.textContent = `À vous de jouer: ${label}`;
}

 function setStatus(message) {
   const statusEl = document.getElementById('status');
   if (!statusEl) return;
   statusEl.textContent = message ?? '';
 }

 function setResult(text) {
   const resultEl = document.getElementById('result');
   if (!resultEl) return;
   
   // Formater le texte avec des couleurs et mise en forme
   const formattedText = formatMistralResponse(text);
   resultEl.innerHTML = formattedText;
 }

function formatMistralResponse(text) {
  if (!text) return '';
  
  // Nettoyer seulement les caractères invisibles problématiques
  let formatted = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Retourner le texte brut sans aucun formatage
  return formatted;
}

function validateMove() {
  const pieceSelect = document.getElementById('pieceSelect');
  const fromSquare = document.getElementById('fromSquare');
  const toSquare = document.getElementById('toSquare');
  
  // Validation des cases (insensible à la casse)
  const squarePattern = /^[a-hA-H][1-8]$/;
  if (!squarePattern.test(fromSquare.value.trim())) {
    return { ok: false, error: 'Case de départ invalide. Ex: A2, E4, H8' };
  }
  
  if (!squarePattern.test(toSquare.value.trim())) {
    return { ok: false, error: 'Case d\'arrivée invalide. Ex: A2, E4, H8' };
  }
  
  // Construction du coup en notation algébrique
  let move = '';
  const piece = pieceSelect.value;
  const from = fromSquare.value.trim().toLowerCase(); // Convertir en minuscules pour la notation
  const to = toSquare.value.trim().toLowerCase();
  
  // Si pas de pièce sélectionnée, c'est un pion
  if (!piece || piece === 'P') {
    // Pion : ex: e4, exd5 (capture automatique si pièce sur la case d'arrivée)
    move = to; // e4 (la capture sera détectée automatiquement)
  } else {
    // Pièce : ex: Nf3, Bxe5 (capture automatique si pièce sur la case d'arrivée)
    move = piece + to; // Nf3 (la capture sera détectée automatiquement)
  }
  
  return { ok: true, move: move };
}

function clearMoveInputs() {
  document.getElementById('pieceSelect').value = '';
  document.getElementById('fromSquare').value = '';
  document.getElementById('toSquare').value = '';
}

async function analyzeMove() {
  const fenInput = document.getElementById('fenInput');
  
  const moveValidation = validateMove();
  if (!moveValidation.ok) {
    setStatus('');
    setError(moveValidation.error);
    return;
  }
  
  const fenValidation = normalizeFen(fenInput.value);
  if (!fenValidation.ok) {
    setStatus('');
    setError(fenValidation.error);
    return;
  }
  
  setStatus('Analyse du coup...');
  setError('');
  setResult('');
  
  if (!window.mistral || typeof window.mistral.analyzeMove !== 'function') {
    setStatus('');
    setError("L'analyse de coup n'est pas disponible.");
    return;
  }
  
  const res = await window.mistral.analyzeMove(fenValidation.fen, moveValidation.move);
  if (!res?.ok) {
    setStatus('');
    setError(res?.error || 'Erreur lors de l\'analyse du coup.');
    return;
  }
  
  setStatus('OK');
  setResult(res.content);
  
  // Mettre en évidence le coup sur l'échiquier
  highlightMove(moveValidation.move);
}

function highlightMove(move) {
  // Nettoyer les surbrillances précédentes
  clearMoveHighlights();
  
  console.log('Tentative de mise en évidence du coup:', move);
  
  // Parser le coup pour extraire les cases
  // Format attendu: e4, Nf3, exd5, etc.
  let from, to;
  
  // Cas des coups de pion simple: e4, d5, etc.
  if (/^[a-h][1-8]$/.test(move)) {
    // Pour un coup de pion, on ne peut pas déterminer la case de départ
    // On met juste en évidence la case d'arrivée
    to = move;
  }
  // Cas des coups de pièce: Nf3, Be5, etc.
  else if (/^[KQRBN][a-h][1-8]$/.test(move)) {
    to = move.substring(1); // f3, e5, etc.
  }
  // Cas des captures de pion: exd5, axb4, etc.
  else if (/^[a-h]x[a-h][1-8]$/.test(move)) {
    to = move.substring(2); // d5, b4, etc.
  }
  // Cas des captures de pièce: Nxf3, Bxe5, etc.
  else if (/^[KQRBN]x[a-h][1-8]$/.test(move)) {
    to = move.substring(2); // f3, e5, etc.
  }
  else {
    console.log('Format de coup non reconnu pour la mise en évidence:', move);
    return;
  }
  
  // Mettre en évidence la case d'arrivée
  const toSquare = document.querySelector(`[data-square="${to}"]`);
  if (toSquare) {
    toSquare.classList.add('move-to');
    console.log('Case d\'arrivée mise en évidence:', to);
  } else {
    console.log('Case d\'arrivée non trouvée:', to);
  }
  
  // Si on a une case de départ, la mettre en évidence aussi
  if (from) {
    const fromSquare = document.querySelector(`[data-square="${from}"]`);
    if (fromSquare) {
      fromSquare.classList.add('move-from');
      console.log('Case de départ mise en évidence:', from);
    }
  }
}

function clearMoveHighlights() {
  // Nettoyer les surbrillances de coups sur l'échiquier
  const squares = document.querySelectorAll('.square');
  squares.forEach(square => {
    square.classList.remove('move-highlight', 'move-from', 'move-to');
  });
}

function clearResult() {
   setStatus('');
   setResult('');
   setError('');
   // Nettoyer aussi la mise en évidence des coups
   clearMoveHighlights();
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loadBtn').addEventListener('click', loadFromInput);
  document.getElementById('resetBtn').addEventListener('click', setExample);
  document.getElementById('analyzeBtn').addEventListener('click', analyzeWithMistral);
  document.getElementById('clearBtn').addEventListener('click', clearResult);
  document.getElementById('saveSessionBtn').addEventListener('click', saveSession);
  document.getElementById('loadSessionBtn').addEventListener('click', loadSession);
  document.getElementById('launchDefiBtn').addEventListener('click', launchDefi);
  document.getElementById('analyzeMoveBtn').addEventListener('click', analyzeMove);
  document.getElementById('clearMoveBtn').addEventListener('click', clearMoveInputs);

  // Charger les défis au démarrage
  loadDefis();
  
  // Afficher la progression initiale
  updateProgression({});

  setExample();
});

async function saveSession() {
  const fenInput = document.getElementById('fenInput');
  const resultEl = document.getElementById('result');
  const statusEl = document.getElementById('status');
  const pieceSelect = document.getElementById('pieceSelect');
  const fromSquare = document.getElementById('fromSquare');
  const toSquare = document.getElementById('toSquare');
  
  const sessionData = {
    timestamp: new Date().toISOString(),
    fen: fenInput.value,
    result: resultEl.textContent,
    status: statusEl.textContent,
    themes: [], // TODO: extraire des thèmes depuis le résultat
    errors: [], // TODO: extraire des erreurs depuis le résultat
    // Ajouter les données de coup analysé si présentes
    moveAnalysis: pieceSelect.value && fromSquare.value && toSquare.value ? {
      piece: pieceSelect.value,
      from: fromSquare.value,
      to: toSquare.value,
      move: validateMove().move || null
    } : null
  };
  
  if (!window.session || typeof window.session.save !== 'function') {
    setError("Session non disponible (preload).");
    return;
  }
  
  setStatus('Sauvegarde en cours...');
  const res = await window.session.save(sessionData);
  setStatus('');
  
  if (!res?.ok) {
    if (res.canceled) return;
    setError(res?.error || 'Erreur sauvegarde session.');
    return;
  }
  
  setError('');
  setStatus(`Session sauvegardée : ${res.fileName}`);
}

async function loadSession() {
  if (!window.session || typeof window.session.load !== 'function') {
    setError("Session non disponible (preload).");
    return;
  }
  
  setStatus('Chargement en cours...');
  const res = await window.session.load();
  setStatus('');
  
  if (!res?.ok) {
    if (res.canceled) return;
    setError(res?.error || 'Erreur chargement session.');
    return;
  }
  
  const { sessionData, fileName } = res;
  
  // Restaurer les données
  const fenInput = document.getElementById('fenInput');
  const resultEl = document.getElementById('result');
  const statusEl = document.getElementById('status');
  
  fenInput.value = sessionData.fen || '';
  resultEl.textContent = sessionData.result || '';
  statusEl.textContent = sessionData.status || '';
  
  // Recharger l'échiquier si FEN présente
  if (sessionData.fen) {
    loadFromInput();
  }
  
  setError('');
  setStatus(`Session chargée : ${fileName}`);
}

async function loadDefis() {
  if (!window.defis || typeof window.defis.load !== 'function') {
    setError("Défis non disponible (preload).");
    return;
  }
  
  const res = await window.defis.load();
  if (!res?.ok) {
    setError(res?.error || 'Erreur chargement défis.');
    return;
  }
  
  const defisSelect = document.getElementById('defiSelect');
  defisSelect.innerHTML = '<option value="">-- Choisir un défi --</option>';
  
  res.defis.forEach(defi => {
    const option = document.createElement('option');
    option.value = defi.id;
    option.textContent = `${defi.titre} (${defi.niveau})`;
    defisSelect.appendChild(option);
  });
  
  setError('');
  setStatus(`${res.defis.length} défis chargés`);
}

async function launchDefi() {
  const defisSelect = document.getElementById('defiSelect');
  const selectedId = defisSelect.value;
  
  if (!selectedId) {
    setError('Choisis un défi d\'abord.');
    return;
  }
  
  if (!window.defis || typeof window.defis.load !== 'function') {
    setError("Défis non disponible (preload).");
    return;
  }
  
  const res = await window.defis.load();
  if (!res?.ok) {
    setError(res?.error || 'Erreur chargement défis.');
    return;
  }
  
  const defi = res.defis.find(d => d.id === selectedId);
  if (!defi) {
    setError('Défi non trouvé.');
    return;
  }
  
  // Charger la FEN du défi
  const fenInput = document.getElementById('fenInput');
  fenInput.value = defi.fen;
  loadFromInput();
  
  // Mettre à jour la progression
  updateProgression({
    defis_en_cours: defi.id,
    sessions_totales: (await getCurrentProgression()).sessions_totales + 1
  });
  
  setError('');
  setStatus(`Défi lancé : ${defi.titre}`);
}

async function getCurrentProgression() {
  if (!window.progression || typeof window.progression.update !== 'function') {
    return {
      sessions_totales: 0,
      defis_completes: 0,
      themes_travailles: [],
      score_moyen: 0
    };
  }
  
  const res = await window.progression.update({});
  return res?.progression || {
    sessions_totales: 0,
    defis_completes: 0,
    themes_travailles: [],
    score_moyen: 0
  };
}

async function updateProgression(data) {
  if (!window.progression || typeof window.progression.update !== 'function') {
    setError("Progression non disponible (preload).");
    return;
  }
  
  const res = await window.progression.update(data);
  if (!res?.ok) {
    setError(res?.error || 'Erreur mise à jour progression.');
    return;
  }
  
  // Mettre à jour l'affichage
  const progressionEl = document.getElementById('progression');
  if (progressionEl && res.progression) {
    progressionEl.innerHTML = `
      <div><strong>Sessions :</strong> ${res.progression.sessions_totales}</div>
      <div><strong>Défis complétés :</strong> ${res.progression.defis_completes}</div>
      <div><strong>Défi en cours :</strong> ${res.progression.defis_en_cours || 'Aucun'}</div>
      <div><strong>Score moyen :</strong> ${res.progression.score_moyen}</div>
    `;
  }
}

function loadFromInput() {
  const fenInput = document.getElementById('fenInput');
  const normalized = normalizeFen(fenInput.value);
  if (!normalized.ok) {
    setError(normalized.error);
    return;
  }

  const parsed = parseFen(normalized.fen);
  if (!parsed.ok) {
    setError(parsed.error);
    return;
  }

  setError('');
  setMeta(parsed.activeColor);
  renderBoard(parsed.board);
  setStatus('FEN chargée');
}

function setExample() {
  const fenInput = document.getElementById('fenInput');
  fenInput.value = DEFAULT_FEN;
  loadFromInput();
}

 async function analyzeWithMistral() {
   const fenInput = document.getElementById('fenInput');
   const normalized = normalizeFen(fenInput.value);
   if (!normalized.ok) {
     setError(normalized.error);
     return;
   }

   const parsed = parseFen(normalized.fen);
   if (!parsed.ok) {
     setError(parsed.error);
     return;
   }

   setError('');
   setStatus('Analyse en cours…');
   setResult('');

   if (!window.mistral || typeof window.mistral.analyze !== 'function') {
     setStatus('');
     setError("Mistral n'est pas disponible (preload).");
     return;
   }

   const res = await window.mistral.analyze(normalized.fen);
   if (!res?.ok) {
     setStatus('');
     setError(res?.error || 'Erreur Mistral.');
     return;
   }

   setStatus('OK');
   setResult(res.content);
 }

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loadBtn').addEventListener('click', loadFromInput);
  document.getElementById('resetBtn').addEventListener('click', setExample);
  document.getElementById('analyzeBtn').addEventListener('click', analyzeWithMistral);
  document.getElementById('clearBtn').addEventListener('click', clearResult);
  document.getElementById('saveSessionBtn').addEventListener('click', saveSession);
  document.getElementById('loadSessionBtn').addEventListener('click', loadSession);
  document.getElementById('launchDefiBtn').addEventListener('click', launchDefi);

  // Charger les défis au démarrage
  loadDefis();
  
  // Afficher la progression initiale
  updateProgression({});

  setExample();
});
