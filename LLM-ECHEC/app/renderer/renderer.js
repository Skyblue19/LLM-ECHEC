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

// État courant pour relier l'échiquier aux clics utilisateur
let currentBoard = null;
let currentActiveColor = 'w';
let selectedFromSquare = null;
let selectedToSquare = null;
let selectedPieceCode = null;

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

function squareToIndices(square) {
  if (!square || square.length !== 2) return null;
  const file = square[0].toLowerCase();
  const rank = Number(square[1]);
  if (file < 'a' || file > 'h' || Number.isNaN(rank) || rank < 1 || rank > 8) return null;
  return { row: 8 - rank, col: file.charCodeAt(0) - 97 };
}

function getPieceAtSquare(square) {
  if (!currentBoard) return null;
  const coords = squareToIndices(square);
  if (!coords) return null;
  return currentBoard[coords.row]?.[coords.col] ?? null;
}

function pieceCodeFromChar(ch) {
  if (!ch) return null;
  const upper = ch.toUpperCase();
  return ['P', 'N', 'B', 'R', 'Q', 'K'].includes(upper) ? upper : null;
}

function belongsToCurrentPlayer(piece) {
  if (!piece) return false;
  if (currentActiveColor === 'w') {
    return piece === piece.toUpperCase();
  } else {
    return piece === piece.toLowerCase();
  }
}

function isValidMoveForPiece(fromSquare, toSquare, pieceCode) {
  const fromCoords = squareToIndices(fromSquare);
  const toCoords = squareToIndices(toSquare);
  
  if (!fromCoords || !toCoords) return false;
  
  const dr = Math.abs(toCoords.row - fromCoords.row);
  const dc = Math.abs(toCoords.col - fromCoords.col);
  const diffRow = toCoords.row - fromCoords.row;
  const diffCol = toCoords.col - fromCoords.col;
  
  const targetPiece = getPieceAtSquare(toSquare);
  if (targetPiece && belongsToCurrentPlayer(targetPiece)) {
    return false;
  }
  
  switch (pieceCode) {
    case 'P': {
      const direction = currentActiveColor === 'w' ? -1 : 1;
      const startRow = currentActiveColor === 'w' ? 6 : 1;
      
      if (diffCol === 0 && diffRow === direction && !targetPiece) return true;
      if (diffCol === 0 && diffRow === 2 * direction && fromCoords.row === startRow && !getPieceAtSquare(toSquare)) return true;
      if (Math.abs(diffCol) === 1 && diffRow === direction && targetPiece) return true;
      return false;
    }
    case 'N': {
      return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    }
    case 'B': {
      if (dr !== dc || dr === 0) return false;
      return isPathClear(fromCoords, toCoords);
    }
    case 'R': {
      if (diffRow !== 0 && diffCol !== 0) return false;
      return isPathClear(fromCoords, toCoords);
    }
    case 'Q': {
      if (diffRow !== 0 && diffCol !== 0 && dr !== dc) return false;
      return isPathClear(fromCoords, toCoords);
    }
    case 'K': {
      return dr <= 1 && dc <= 1 && (dr > 0 || dc > 0);
    }
    default:
      return false;
  }
}

function isPathClear(fromCoords, toCoords) {
  const dr = toCoords.row > fromCoords.row ? 1 : (toCoords.row < fromCoords.row ? -1 : 0);
  const dc = toCoords.col > fromCoords.col ? 1 : (toCoords.col < fromCoords.col ? -1 : 0);
  
  let currentRow = fromCoords.row + dr;
  let currentCol = fromCoords.col + dc;
  
  while (currentRow !== toCoords.row || currentCol !== toCoords.col) {
    const file = String.fromCharCode(97 + currentCol);
    const rank = String(8 - currentRow);
    if (getPieceAtSquare(file + rank)) {
      return false;
    }
    currentRow += dr;
    currentCol += dc;
  }
  return true;
}

function findKing(board, color) {
  const kingChar = color === 'w' ? 'K' : 'k';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingChar) {
        const file = String.fromCharCode(97 + col);
        const rank = String(8 - row);
        return file + rank;
      }
    }
  }
  return null;
}

function isSquareAttacked(board, square, attackingColor) {
  const targetCoords = squareToIndices(square);
  if (!targetCoords) return false;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const isAttacker = attackingColor === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
      if (!isAttacker) continue;
      
      const file = String.fromCharCode(97 + col);
      const rank = String(8 - row);
      const fromSquare = file + rank;
      
      const pieceCode = pieceCodeFromChar(piece);
      if (isValidMoveForPieceSimple(board, fromSquare, square, pieceCode, attackingColor)) {
        return true;
      }
    }
  }
  return false;
}

function isValidMoveForPieceSimple(board, fromSquare, toSquare, pieceCode, color) {
  const fromCoords = squareToIndices(fromSquare);
  const toCoords = squareToIndices(toSquare);
  
  if (!fromCoords || !toCoords) return false;
  
  const dr = Math.abs(toCoords.row - fromCoords.row);
  const dc = Math.abs(toCoords.col - fromCoords.col);
  const diffRow = toCoords.row - fromCoords.row;
  const diffCol = toCoords.col - fromCoords.col;
  
  const targetPiece = board[toCoords.row][toCoords.col];
  if (targetPiece) {
    const targetIsWhite = targetPiece === targetPiece.toUpperCase();
    const attackerIsWhite = color === 'w';
    if (targetIsWhite === attackerIsWhite) return false;
  }
  
  switch (pieceCode) {
    case 'P': {
      const direction = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      
      if (diffCol === 0 && diffRow === direction && !targetPiece) return true;
      if (diffCol === 0 && diffRow === 2 * direction && fromCoords.row === startRow && !board[toCoords.row][toCoords.col]) return true;
      if (Math.abs(diffCol) === 1 && diffRow === direction && targetPiece) return true;
      return false;
    }
    case 'N': {
      return (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    }
    case 'B': {
      if (dr !== dc || dr === 0) return false;
      return isPathClearSimple(board, fromCoords, toCoords);
    }
    case 'R': {
      if (diffRow !== 0 && diffCol !== 0) return false;
      return isPathClearSimple(board, fromCoords, toCoords);
    }
    case 'Q': {
      if (diffRow !== 0 && diffCol !== 0 && dr !== dc) return false;
      return isPathClearSimple(board, fromCoords, toCoords);
    }
    case 'K': {
      return dr <= 1 && dc <= 1 && (dr > 0 || dc > 0);
    }
    default:
      return false;
  }
}

function isPathClearSimple(board, fromCoords, toCoords) {
  const dr = toCoords.row > fromCoords.row ? 1 : (toCoords.row < fromCoords.row ? -1 : 0);
  const dc = toCoords.col > fromCoords.col ? 1 : (toCoords.col < fromCoords.col ? -1 : 0);
  
  let currentRow = fromCoords.row + dr;
  let currentCol = fromCoords.col + dc;
  
  while (currentRow !== toCoords.row || currentCol !== toCoords.col) {
    if (board[currentRow][currentCol]) {
      return false;
    }
    currentRow += dr;
    currentCol += dc;
  }
  return true;
}

function isKingInCheck(board, color) {
  const kingSquare = findKing(board, color);
  if (!kingSquare) return false;
  
  const opponentColor = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingSquare, opponentColor);
}

function isMoveLegal(fromSquare, toSquare) {
  if (!currentBoard) return false;
  
  const fromCoords = squareToIndices(fromSquare);
  const toCoords = squareToIndices(toSquare);
  if (!fromCoords || !toCoords) return false;
  
  // Créer une copie de l'échiquier
  const boardCopy = currentBoard.map(row => [...row]);
  
  // Simuler le coup
  const piece = boardCopy[fromCoords.row][fromCoords.col];
  boardCopy[toCoords.row][toCoords.col] = piece;
  boardCopy[fromCoords.row][fromCoords.col] = null;
  
  // Vérifier si le roi est en échec après le coup
  return !isKingInCheck(boardCopy, currentActiveColor);
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
      square.setAttribute('data-piece', board[r][c] ?? '');
      
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
  // Vérifier que les variables de sélection sont remplies
  if (!selectedFromSquare || !selectedToSquare || !selectedPieceCode) {
    return { ok: false, error: 'Sélectionne un coup sur l\'échiquier : clique sur la pièce puis sur la case de destination.' };
  }
  
  // Construction du coup en notation algébrique
  let move = '';
  const to = selectedToSquare.toLowerCase();
  
  // Si c'est un pion
  if (selectedPieceCode === 'P') {
    move = to; // e4
  } else {
    move = selectedPieceCode + to; // Nf3
  }
  
  return { ok: true, move: move };
}

function clearMoveInputs() {
  clearMoveSelection();
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

function clearMoveSelection() {
  selectedFromSquare = null;
  selectedToSquare = null;
  selectedPieceCode = null;
  clearMoveHighlights();
}

function applyMoveSelectionHighlight() {
  clearMoveHighlights();
  if (selectedFromSquare) {
    const fromSquareEl = document.querySelector(`[data-square="${selectedFromSquare}"]`);
    if (fromSquareEl) fromSquareEl.classList.add('move-from');
  }
  if (selectedToSquare) {
    const toSquareEl = document.querySelector(`[data-square="${selectedToSquare}"]`);
    if (toSquareEl) toSquareEl.classList.add('move-to');
  }
}

function handleBoardClick(event) {
  const squareEl = event.target.closest('.square');
  if (!squareEl) return;

  const square = squareEl.getAttribute('data-square');
  if (!square) return;

  if (!currentBoard) {
    setError('Charge une position FEN avant de sélectionner un coup.');
    setStatus('');
    return;
  }

  const piece = getPieceAtSquare(square);

  if (!selectedFromSquare) {
    if (!piece) {
      setError('Choisis une pièce sur l\'échiquier.');
      setStatus('');
      return;
    }
    
    if (!belongsToCurrentPlayer(piece)) {
      const playerColor = currentActiveColor === 'w' ? 'blancs' : 'noirs';
      setError(`Cette pièce n'appartient pas aux ${playerColor}.`);
      setStatus('');
      return;
    }

    selectedFromSquare = square;
    selectedPieceCode = pieceCodeFromChar(piece);
    setError('');
    setStatus(`Pièce sélectionnée : ${pieceToUnicode[piece]} en ${square.toUpperCase()}. Choisis la case d'arrivée.`);
    selectedToSquare = null;
    applyMoveSelectionHighlight();
    return;
  }

  const fromPiece = getPieceAtSquare(selectedFromSquare);
  const fromPieceCode = pieceCodeFromChar(fromPiece);

  if (piece && belongsToCurrentPlayer(piece)) {
    selectedFromSquare = square;
    selectedPieceCode = pieceCodeFromChar(piece);
    setError('');
    setStatus(`Nouvelle pièce sélectionnée : ${pieceToUnicode[piece]} en ${square.toUpperCase()}. Choisis la case d'arrivée.`);
    selectedToSquare = null;
    applyMoveSelectionHighlight();
    return;
  }

  if (!isValidMoveForPiece(selectedFromSquare, square, fromPieceCode)) {
    setError(`Ce coup est impossible pour ${fromPieceCode === 'P' ? 'un pion' : fromPieceCode}.`);
    setStatus('');
    return;
  }

  // Vérifier si le coup est légal (ne met pas / ne laisse pas le roi en échec)
  if (!isMoveLegal(selectedFromSquare, square)) {
    setError(`Ce coup est illégal : il laisse votre roi en échec.`);
    setStatus('');
    return;
  }

  selectedToSquare = square;
  setError('');
  setStatus(`Coup sélectionné : ${pieceToUnicode[fromPiece]} ${selectedFromSquare.toUpperCase()} → ${square.toUpperCase()}. Clique sur "Analyser mon coup".`);
  applyMoveSelectionHighlight();
}

function initBoardInteractions() {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;
  boardEl.addEventListener('click', handleBoardClick);
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

  initBoardInteractions();

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
  
  const sessionData = {
    timestamp: new Date().toISOString(),
    fen: fenInput.value,
    result: resultEl.textContent,
    status: statusEl.textContent,
    themes: [], // TODO: extraire des thèmes depuis le résultat
    errors: [], // TODO: extraire des erreurs depuis le résultat
    // Ajouter les données de coup analysé si présentes
    moveAnalysis: selectedFromSquare && selectedToSquare && selectedPieceCode ? {
      piece: selectedPieceCode,
      from: selectedFromSquare,
      to: selectedToSquare,
      move: validateMove().ok ? validateMove().move : null
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
  currentBoard = parsed.board;
  currentActiveColor = parsed.activeColor;
  clearMoveSelection();
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

