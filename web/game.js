// ============================================================
// CLAWRISK ARENA — Territory Warfare Game
// Canvas 2D, vanilla JS, mobile-first, <200KB
// ============================================================

'use strict';

// === CANVAS SETUP ===
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H, cellSize, gridOffsetX, gridOffsetY;

function resize() {
  W = canvas.width = window.innerWidth * devicePixelRatio;
  H = canvas.height = window.innerHeight * devicePixelRatio;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  const pad = Math.min(W, H) * 0.04;
  const hudTop = 62 * devicePixelRatio;
  const hudBot = 115 * devicePixelRatio;
  const availW = W - pad * 2;
  const availH = H - hudTop - hudBot - pad;
  cellSize = Math.floor(Math.min(availW / 10, availH / 10));
  gridOffsetX = Math.floor((W - cellSize * 10) / 2);
  gridOffsetY = hudTop + Math.floor((availH - cellSize * 10) / 2);
}
window.addEventListener('resize', resize);
resize();

// === CONSTANTS ===
const GRID = 10;
const BG_COLOR = '#060614';

// === SPECIES (characters) ===
const SPECIES = {
  crab:     { name:'Iron Crab',    icon:'\u{1F980}', color:'#00ff88', passive:'Shell Armor: -1 damage taken on defense' },
  octopus:  { name:'Storm Kraken', icon:'\u{1F419}', color:'#ff4444', passive:'Ink Cloud: +1 attack die on deep water' },
  lobster:  { name:'Reef Lobster', icon:'\u{1F99E}', color:'#4488ff', passive:'Fortified Claws: +1 defense on reef terrain' },
  turtle:   { name:'Sea Titan',    icon:'\u{1F422}', color:'#ffaa00', passive:'Ancient Shell: starts with +1 troop per spot' },
  jellyfish:{ name:'Drift Jelly',  icon:'\u{1FAB8}', color:'#cc44ff', passive:'Electric Pulse: QTE sweet spot 20% wider' },
  shark:    { name:'Abyss Hunter', icon:'\u{1F988}', color:'#00dddd', passive:'Blood Frenzy: +1 attack after capturing a spot' },
};

const SPECIES_LIST = ['crab','octopus','lobster','turtle','jellyfish','shark'];

const PLAYER_COLORS     = ['#00ff88','#ff4444','#4488ff','#ffaa00','#cc44ff','#00dddd'];
const PLAYER_COLORS_DIM = ['#00994d','#991f1f','#1f5599','#996600','#772299','#009999'];
const PLAYER_NAMES = ['You','Storm Kraken','Reef Lobster','Abyss Hunter'];

// === OCEANS (regions as real-world oceans) ===
const TERRAIN = {
  shore:  {name:'Shallows',     color:'#c4a435', bg:'#2a2510', atkMod:0,  defMod:0, shellMult:1,   icon:'~'},
  reef:   {name:'Coral Reef',   color:'#e05a2a', bg:'#2a1510', atkMod:0,  defMod:1, shellMult:1.5, icon:'^'},
  deep:   {name:'Open Ocean',   color:'#1a3a8a', bg:'#080e22', atkMod:-1, defMod:0, shellMult:1,   icon:'\u2248'},
  coral:  {name:'Living Reef',  color:'#b83a8a', bg:'#200e1a', atkMod:0,  defMod:0, shellMult:2,   icon:'*'},
  crown:  {name:'Maelstrom',    color:'#ddc020', bg:'#2a2510', atkMod:0,  defMod:0, shellMult:3,   icon:'\u2655'},
  ice:    {name:'Frozen Sea',   color:'#88ccee', bg:'#0e1a22', atkMod:-1, defMod:1, shellMult:1.5, icon:'\u2744'},
  volcanic:{name:'Volcanic Vent',color:'#ff6622',bg:'#2a1008', atkMod:1,  defMod:-1,shellMult:2,   icon:'\u2666'},
};

const REGIONS = {
  pacific:  {name:'Pacific Basin',   bonus:2, spots:10, ocean:'Pacific',     terrainColor:'#1a5588'},
  atlantic: {name:'Atlantic Ridge',  bonus:3, spots:8,  ocean:'Atlantic',    terrainColor:'#2244aa'},
  indian:   {name:'Indian Depths',   bonus:5, spots:6,  ocean:'Indian',      terrainColor:'#883388'},
  arctic:   {name:'Arctic Circle',   bonus:3, spots:12, ocean:'Arctic',      terrainColor:'#4488aa'},
  crown:    {name:'The Maelstrom',   bonus:7, spots:4,  ocean:'Maelstrom',   terrainColor:'#aa8822'},
  southern: {name:'Southern Deep',   bonus:3, spots:10, ocean:'Southern',    terrainColor:'#226688'},
  coral_sea:{name:'Coral Sea',       bonus:2, spots:10, ocean:'Coral Sea',   terrainColor:'#cc5544'},
  mariana:  {name:'Mariana Trench',  bonus:4, spots:8,  ocean:'Mariana',     terrainColor:'#112244'},
};

// Region map: P=pacific A=atlantic I=indian R=arctic $=crown S=southern C=coral_sea M=mariana
const REGION_MAP_STR = [
  'PPP...AA..','PPPP.AAA..','PP...AAA.I','.RRRR...II',
  '.RRRR$$SSI','.RRR.$$SSI','..RR..SSSS','CC..MMM.SS',
  'CCCCMMMM..','CCCC.MM...',
];
const REGION_CHAR = {P:'pacific',A:'atlantic',I:'indian',R:'arctic',$:'crown',S:'southern',C:'coral_sea',M:'mariana'};

// Terrain map: s=shore r=reef d=deep c=coral *=crown i=ice v=volcanic
const TERRAIN_MAP_STR = [
  'sssd..rr..','ssss.rrr..','sd...rrr.d','.iiic...dd',
  '.iiic**ssd','.iii.**ssd','..ic..ssss','rr..ddd.ss',
  'rrrrddvv..','rrrr.dv...',
];
const TERRAIN_CHAR = {s:'shore',r:'reef',d:'deep',c:'coral','*':'crown',i:'ice',v:'volcanic','.':'shore'};

// (old region/terrain maps removed — replaced above)

// === GRID DATA ===
const cells = [];
for (let r = 0; r < GRID; r++) {
  for (let c = 0; c < GRID; c++) {
    const rc = REGION_MAP_STR[r][c], tc = TERRAIN_MAP_STR[r][c];
    cells.push({
      row:r, col:c,
      region: REGION_CHAR[rc]||null,
      terrain: TERRAIN_CHAR[tc]||'shore',
      owner:-1, troops:0,
      // visual: per-cell random seed for wave offset
      seed: Math.random() * 100,
    });
  }
}

function cellAt(r,c) { return (r<0||r>=GRID||c<0||c>=GRID)?null:cells[r*GRID+c]; }
function getNeighbors(r,c) {
  const n=[];
  if(r>0)n.push(cellAt(r-1,c)); if(r<9)n.push(cellAt(r+1,c));
  if(c>0)n.push(cellAt(r,c-1)); if(c<9)n.push(cellAt(r,c+1));
  return n;
}
function areConnected(c1,c2,owner) {
  const vis=new Set(), q=[c1.row*GRID+c1.col], tgt=c2.row*GRID+c2.col;
  vis.add(q[0]);
  while(q.length){const i=q.shift();if(i===tgt)return true;
    for(const nb of getNeighbors(Math.floor(i/GRID),i%GRID)){
      const ni=nb.row*GRID+nb.col;if(!vis.has(ni)&&nb.owner===owner){vis.add(ni);q.push(ni);}}}
  return false;
}
function getCoralDefenseBonus(cell) {
  if(cell.terrain!=='coral')return 0;
  let b=0;for(const nb of getNeighbors(cell.row,cell.col))if(nb.terrain==='coral'&&nb.owner===cell.owner)b++;
  return b;
}
function isAdjacent(a,b){return Math.abs(a.row-b.row)+Math.abs(a.col-b.col)===1;}
function cellCenter(cell){return{x:gridOffsetX+cell.col*cellSize+cellSize/2,y:gridOffsetY+cell.row*cellSize+cellSize/2};}

// === OCEAN BACKGROUND — ambient bubbles ===
const bubbles = [];
for (let i = 0; i < 40; i++) {
  bubbles.push({
    x: Math.random(), y: Math.random(),
    r: 1 + Math.random() * 3,
    speed: 0.01 + Math.random() * 0.02,
    wobble: Math.random() * 6,
    alpha: 0.1 + Math.random() * 0.15,
  });
}

// === NETWORKING ===
const net = {
  token: null,
  playerId: null,
  username: null,
  gameId: null,
  playerSlot: -1,
  ws: null,
  online: false,
  connecting: false,

  get apiBase() {
    // Same origin when served from Express (Railway or local :3847)
    if (location.port === '8080') return 'http://localhost:3847'; // dev only
    return ''; // same origin (Railway, or local :3847)
  },

  get wsBase() {
    if (location.port === '8080') return 'ws://localhost:3847';
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  },

  async auth() {
    try {
      // Try restoring saved token from TG CloudStorage or localStorage
      const saved = await this.loadSavedToken();
      if (saved) {
        const res = await fetch(this.apiBase + '/api/auth/me', {
          headers: { Authorization: 'Bearer ' + saved },
        });
        if (res.ok) {
          const data = await res.json();
          this.token = saved;
          this.playerId = data.id;
          this.username = data.username;
          return true;
        }
      }

      // Check for Telegram WebApp
      const tg = window.Telegram?.WebApp;
      if (tg && tg.initData) {
        const res = await fetch(this.apiBase + '/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        });
        if (res.ok) {
          const data = await res.json();
          this.token = data.token;
          this.playerId = data.player.id;
          this.username = data.player.username;
          this.saveToken(data.token);
          return true;
        }
      }

      // Guest auth
      const res = await fetch(this.apiBase + '/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        this.token = data.token;
        this.playerId = data.player.id;
        this.username = data.player.username;
        this.saveToken(data.token);
        return true;
      }
    } catch (e) {
      console.log('Server not available, playing offline');
    }
    return false;
  },

  saveToken(token) {
    try {
      localStorage.setItem('clawrisk_token', token);
    } catch(e) {}
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.CloudStorage) {
        tg.CloudStorage.setItem('auth_token', token);
      }
    } catch(e) {}
  },

  async loadSavedToken() {
    // Try TG CloudStorage first
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.CloudStorage) {
        return await new Promise((resolve) => {
          tg.CloudStorage.getItem('auth_token', (err, val) => {
            resolve(err ? null : val || null);
          });
        });
      }
    } catch(e) {}
    // Fallback to localStorage
    try {
      return localStorage.getItem('clawrisk_token');
    } catch(e) {}
    return null;
  },

  async joinGame(tier) {
    if (!this.token) return false;
    try {
      const res = await fetch(this.apiBase + '/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.token },
        body: JSON.stringify({ tier: tier || 'free' }),
      });
      if (res.ok) {
        const data = await res.json();
        this.gameId = data.gameId;
        this.playerSlot = data.slot;
        return true;
      }
    } catch (e) {}
    return false;
  },

  connectWS() {
    if (!this.token || !this.gameId) return;
    try {
      this.ws = new WebSocket(this.wsBase + '/?token=' + this.token);

      this.ws.onopen = () => {
        this.online = true;
        this.connecting = false;
        // Join the game room
        this.ws.send(JSON.stringify({ type: 'join', gameId: this.gameId }));
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          handleServerMessage(msg);
        } catch (err) {}
      };

      this.ws.onclose = () => {
        this.online = false;
        this.ws = null;
        console.log('WS disconnected');
      };

      this.ws.onerror = () => {
        this.online = false;
        this.connecting = false;
      };
    } catch (e) {
      this.online = false;
    }
  },

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  },
};

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'state': {
      // Full state sync from server
      const g = msg.game;
      for (let i = 0; i < g.cells.length && i < cells.length; i++) {
        cells[i].owner = g.cells[i].owner;
        cells[i].troops = g.cells[i].troops;
      }
      for (let i = 0; i < g.players.length; i++) {
        const p = g.players[i];
        game.shells[p.slot] = p.shells;
        game.reinforcements[p.slot] = p.reinforcements;
      }
      game.reinforceTimer = g.reinforceTimer;
      game.shellTimer = g.shellTimer;
      if (g.winner >= 0) {
        game.winner = g.winner;
        game.phase = 'gameover';
        audio.play('victory');
      }
      if (g.phase === 'deploy' && game.phase === 'play') {
        game.phase = 'deploy';
        spawnFloat(W / 2, gridOffsetY - 25, '+troops!', '#ffcc00');
        audio.play('reinforcements');
      }
      break;
    }

    case 'deploy': {
      const cell = cells[msg.cellIdx];
      if (cell) {
        cell.troops = msg.troops;
        game.reinforcements[msg.slot] = msg.reinforcements;
        if (msg.slot !== net.playerSlot) {
          const pos = cellCenter(cell);
          spawnParticles(pos.x, pos.y, PLAYER_COLORS[msg.slot], 3);
        }
      }
      break;
    }

    case 'combat': {
      const atk = msg.attacker;
      const def = msg.defender;
      // Update cells
      cells[msg.fromIdx].owner = atk.owner;
      cells[msg.fromIdx].troops = atk.troops;
      cells[msg.toIdx].owner = def.owner;
      cells[msg.toIdx].troops = def.troops;

      const dp = cellCenter(cells[msg.toIdx]);
      const ap = cellCenter(cells[msg.fromIdx]);

      if (msg.result.atkLoss > 0) spawnFloat(ap.x, ap.y, '-' + msg.result.atkLoss, '#ff6666');
      if (msg.result.defLoss > 0) spawnFloat(dp.x, dp.y, '-' + msg.result.defLoss, '#ff6666');

      if (msg.result.captured) {
        spawnParticles(dp.x, dp.y, PLAYER_COLORS[atk.owner], 12);
        spawnFloat(dp.x, dp.y - 25, 'CAPTURED!', '#ffdd00');
        audio.play('claim_territory');
      } else {
        audio.play(msg.result.atkLoss > msg.result.defLoss ? 'combat_lose' : 'combat_win');
      }

      // Show combat panel only for player's attacks
      if (msg.slot === net.playerSlot) {
        game.combatState = {
          attacker: cells[msg.fromIdx],
          defender: cells[msg.toIdx],
          result: msg.result,
          timer: 0, duration: 1.8, resolved: true, // already resolved server-side
        };
        game.phase = 'combat';
        audio.play('combat_start');
      }

      if (msg.gameOver) {
        game.winner = msg.winner;
        game.phase = 'gameover';
        audio.play('victory');
      }
      break;
    }

    case 'fortify': {
      cells[msg.fromIdx].troops = cells[msg.fromIdx].troops; // will be updated by next state sync
      // Immediate visual
      const pos = cellCenter(cells[msg.toIdx]);
      if (msg.slot !== net.playerSlot) {
        spawnFloat(pos.x, pos.y - 10, '+' + msg.moved, PLAYER_COLORS[msg.slot]);
      }
      break;
    }

    case 'bought': {
      game.shells[net.playerSlot] = msg.shells;
      game.reinforcements[net.playerSlot] = msg.reinforcements;
      break;
    }

    case 'error': {
      spawnFloat(W / 2, H / 2, msg.message || 'Error', '#ff4444');
      break;
    }
  }
}

// === GAME STATE ===
const game = {
  phase:'title', selectedCell:null,
  shells:[50,50,50,50], reinforcements:[5,5,5,5],
  reinforceTimer:0, shellTimer:0,
  combatState:null, attackCooldown:[0,0,0,0],
  winner:-1,
  particles:[], ripples:[], floatingTexts:[],
  marchAnims: [],  // troop march visuals
  time:0, dt:0, lastTime:0,
  fortifySource:null, hint:'',
  // Screen shake
  shakeX:0, shakeY:0, shakeIntensity:0, shakeDuration:0,
  // QTE
  qte: null, // { active, hit, timer, window, bonus }
  // Tutorial
  tutorial: 0, // 0=off, 1=deploy, 2=select, 3=attack, 4=expand, 5=done
  tutorialPulse: 0,
  firstGame: true,
  // Lobby
  lobby: null, // { tier, players:[], maxPlayers:4, timer:0, gameId }
  // Species per player slot (0-3)
  playerSpecies: ['crab','octopus','lobster','shark'],
  selectedSpecies: 'crab',
  // Audio
  muted: false,
  // Troop picker
  troopPicker: null, // { x, y, buttons:[], callback }
};

// === EFFECTS ===
function spawnRipple(x,y,color){game.ripples.push({x,y,color:color||'#fff',radius:5,maxRadius:cellSize*0.7,life:1});}
function spawnFloat(x,y,text,color){game.floatingTexts.push({x,y,text,color:color||'#fff',life:1.5,vy:-80});}
function spawnParticles(x,y,color,count){
  for(let i=0;i<count;i++) game.particles.push({
    x,y,vx:(Math.random()-.5)*200,vy:(Math.random()-.5)*200-50,
    life:.5+Math.random()*.5,color,size:2+Math.random()*4,
  });
}

function screenShake(intensity, duration) {
  game.shakeIntensity = intensity * devicePixelRatio;
  game.shakeDuration = duration || 0.3;
  haptic(intensity > 5 ? 'heavy' : 'light');
}

function haptic(type) {
  try {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      const tg = window.Telegram.WebApp.HapticFeedback;
      if (type === 'heavy') tg.impactOccurred('heavy');
      else if (type === 'medium') tg.impactOccurred('medium');
      else tg.impactOccurred('light');
    } else if (navigator.vibrate) {
      navigator.vibrate(type === 'heavy' ? 50 : type === 'medium' ? 25 : 10);
    }
  } catch(e) {}
}

function spawnMarch(fromCell, toCell, color, count) {
  const from = cellCenter(fromCell), to = cellCenter(toCell);
  for (let i = 0; i < count; i++) {
    game.marchAnims.push({
      x: from.x, y: from.y,
      tx: to.x + (Math.random() - 0.5) * cellSize * 0.3,
      ty: to.y + (Math.random() - 0.5) * cellSize * 0.3,
      color, life: 0.4 + i * 0.08, maxLife: 0.4 + i * 0.08,
      size: cellSize * 0.12,
    });
  }
}

function startQTE() {
  game.qte = {
    active: true, hit: false,
    timer: 0, window: 0.8, // 0.8s to tap
    bonus: 0,
    promptY: 0.5 + Math.random() * 0.15, // vary position slightly
  };
}

function hitQTE() {
  if (!game.qte || !game.qte.active || game.qte.hit) return;
  const t = game.qte.timer;
  const sweet = game.qte.window * 0.5; // sweet spot in middle
  const dist = Math.abs(t - sweet) / sweet;
  if (dist < 0.4) {
    // Perfect hit
    game.qte.hit = true;
    game.qte.bonus = 1;
    spawnFloat(W / 2, H * game.qte.promptY - 30, 'PERFECT! +1', '#ffdd00');
    audio.play('claim_territory');
  } else if (dist < 0.8) {
    // Good hit
    game.qte.hit = true;
    game.qte.bonus = 1;
    spawnFloat(W / 2, H * game.qte.promptY - 30, 'GOOD! +1', '#00ff88');
    audio.play('shell_earn');
  } else {
    game.qte.hit = true;
    game.qte.bonus = 0;
    spawnFloat(W / 2, H * game.qte.promptY - 30, 'MISS!', '#ff4444');
  }
}

// Fetch ETH balance periodically
async function fetchEthBalance() {
  if (!net.token) return;
  try {
    const res = await fetch(net.apiBase + '/api/wallet/balance', {
      headers: { Authorization: 'Bearer ' + net.token }
    });
    if (res.ok) {
      const d = await res.json();
      game._ethBalance = (d.balance_eth || 0).toFixed(4);
    }
  } catch(e) {}
}
// Refresh balance every 30s
setInterval(() => { if (net.token) fetchEthBalance(); }, 30000);

// === INIT ===
async function initGame() {
  game.floatingTexts=[];game.ripples=[];game.particles=[];
  game.selectedCell=null;game.combatState=null;
  game.fortifySource=null;game.hint='';
  game.winner=-1;

  // Start offline immediately so the game is playable
  initOfflineGame();

  // Then try to connect to server in background (non-blocking)
  if (!net.connecting) {
    net.connecting = true;
    try {
      const authed = await net.auth();
      if (authed) {
        fetchEthBalance();
        const joined = await net.joinGame('free');
        if (joined) {
          net.connectWS();
        }
      }
    } catch(e) {
      console.log('Server connection failed, playing offline');
    }
    net.connecting = false;
  }
}

function initOfflineGame() {
  for(const c of cells){c.owner=-1;c.troops=0;}
  const starts=[[[8,0],[8,1],[9,0],[9,1]],[[0,0],[0,1],[1,0],[1,1]],[[0,8],[0,9],[1,8],[1,9]],[[8,8],[8,9],[9,8],[9,9]]];
  for(let p=0;p<4;p++){
    for(const[r,c]of starts[p]){const cell=cellAt(r,c);cell.owner=p;cell.troops=3;}
    game.shells[p]=50;game.reinforcements[p]=2;game.attackCooldown[p]=0;
  }
  for(let p=1;p<4;p++) aiDeployReinforcements(p);
  for(const c of cells)if(c.owner===-1&&Math.random()<.2)c.troops=Math.floor(Math.random()*2)+1;
  game.phase='deploy';
  game.reinforceTimer=30;game.shellTimer=10;
  // Start tutorial on first game
  if(game.firstGame) game.tutorial=1;
}

function mySlot() { return net.online ? net.playerSlot : 0; }

// === COUNTS ===
function countTerritories(o){let n=0;for(const c of cells)if(c.owner===o)n++;return n;}
function getRegionControl(o){
  const ctrl=[];
  for(const[k]of Object.entries(REGIONS)){
    let own=0,tot=0;
    for(const c of cells)if(c.region===k){tot++;if(c.owner===o)own++;}
    if(tot>0&&own===tot)ctrl.push(k);
  }return ctrl;
}
function calcReinforcements(o){
  let base=Math.max(3,Math.floor(countTerritories(o)/3));
  for(const r of getRegionControl(o))base+=REGIONS[r].bonus;
  return base;
}

// === COMBAT ===
function rollDice(){return Math.floor(Math.random()*6)+1;}
function resolveCombat(atk,def){
  const ac=Math.min(atk.troops-1,3),dc=Math.min(def.troops,2);
  if(ac<=0)return null;
  const ar=[],dr=[];
  for(let i=0;i<ac;i++)ar.push(rollDice());
  for(let i=0;i<dc;i++)dr.push(rollDice());
  const t=TERRAIN[def.terrain],cb=getCoralDefenseBonus(def);
  for(let i=0;i<ar.length;i++)ar[i]=Math.max(1,ar[i]+t.atkMod);
  for(let i=0;i<dr.length;i++)dr[i]=Math.min(6,dr[i]+t.defMod+cb);
  ar.sort((a,b)=>b-a);dr.sort((a,b)=>b-a);
  let al=0,dl=0;
  for(let i=0;i<Math.min(ar.length,dr.length);i++){if(ar[i]>dr[i])dl++;else al++;}
  return{atkRolls:ar,defRolls:dr,atkLoss:al,defLoss:dl,atkCount:ac};
}
function applyCombatResult(a, d, r) {
  a.troops -= r.atkLoss; d.troops -= r.defLoss;
  const ap = cellCenter(a), dp = cellCenter(d);
  if (r.atkLoss > 0) spawnFloat(ap.x, ap.y, '-' + r.atkLoss, '#ff6666');
  if (r.defLoss > 0) spawnFloat(dp.x, dp.y, '-' + r.defLoss, '#ff6666');
  if (d.troops <= 0) {
    const mv = Math.min(a.troops - 1, r.atkCount);
    d.owner = a.owner; d.troops = mv; a.troops -= mv;
    audio.play('claim_territory');
    spawnParticles(dp.x, dp.y, PLAYER_COLORS[d.owner], 15);
    spawnFloat(dp.x, dp.y - 25, 'CAPTURED!', '#ffdd00');
  } else {
    audio.play(r.atkLoss > r.defLoss ? 'combat_lose' : 'combat_win');
  }
  if (countTerritories(a.owner) >= 60) { game.winner = a.owner; game.phase = 'gameover'; audio.play('victory'); return; }
  for (let p = 0; p < 4; p++) if (p !== a.owner && countTerritories(p) === 0 && game.attackCooldown[p] !== -1) {
    game.attackCooldown[p] = -1; spawnFloat(W / 2, H / 2, PLAYER_NAMES[p] + ' eliminated!', PLAYER_COLORS[p]);
  }
}

// Player attack: shows animated combat panel
function startPlayerCombat(atk, def) {
  const r = resolveCombat(atk, def); if (!r) return;
  game.phase = 'combat';
  game.combatState = { attacker: atk, defender: def, result: r, timer: 0, duration: 2.2, resolved: false };
  audio.play('combat_start');
  screenShake(4, 0.3);
  spawnMarch(atk, def, PLAYER_COLORS[atk.owner], Math.min(r.atkCount, 3));
  // Start QTE after short delay
  startQTE();
}

// AI attack: resolves instantly with floating text, no blocking
function startAICombat(atk, def) {
  const wasPlayerCell = def.owner === mySlot();
  const r = resolveCombat(atk, def); if (!r) return;
  applyCombatResult(atk, def, r);
  const dp = cellCenter(def);
  spawnParticles(dp.x, dp.y, PLAYER_COLORS[atk.owner], 6);
  spawnMarch(atk, def, PLAYER_COLORS[atk.owner], 2);
  // Shake if player lost territory
  if (wasPlayerCell && def.owner !== mySlot()) screenShake(6, 0.3);
}

function finishCombat() {
  const cs = game.combatState; if (!cs || cs.resolved) return;
  cs.resolved = true;

  // Apply QTE bonus to attacker's highest roll
  if (game.qte && game.qte.bonus > 0 && cs.result.atkRolls.length > 0) {
    cs.result.atkRolls[0] = Math.min(6, cs.result.atkRolls[0] + game.qte.bonus);
    // Recalculate result with bonus
    let al = 0, dl = 0;
    for (let i = 0; i < Math.min(cs.result.atkRolls.length, cs.result.defRolls.length); i++) {
      if (cs.result.atkRolls[i] > cs.result.defRolls[i]) dl++; else al++;
    }
    cs.result.atkLoss = al;
    cs.result.defLoss = dl;
  }
  game.qte = null;

  applyCombatResult(cs.attacker, cs.defender, cs.result);
  screenShake(cs.result.captured ? 8 : 5, 0.4);
}

// === ECONOMY ===
function doReinforcements(){
  for(let p=0;p<4;p++){
    if(countTerritories(p)===0)continue;
    const t=calcReinforcements(p);game.reinforcements[p]+=t;
    if(p===0){game.phase='deploy';spawnFloat(W/2,gridOffsetY-25,'+'+t+' troops!','#ffcc00');}
    else aiDeployReinforcements(p);
  }audio.play('reinforcements');
}
function doShellIncome(){
  for(let p=0;p<4;p++){
    let inc=0;const rc=getRegionControl(p);
    for(const c of cells)if(c.owner===p){let m=TERRAIN[c.terrain].shellMult;if(rc.some(r=>c.region===r))m*=2;inc+=m;}
    const earned=Math.floor(inc);game.shells[p]+=earned;
    if(p===0&&earned>0)spawnFloat(70*devicePixelRatio,22*devicePixelRatio,'+'+earned,'#ffcc00');
  }
}

// === AI ===
function aiDeployReinforcements(p){
  let n=game.reinforcements[p];if(n<=0)return;
  const bords=[];
  for(const c of cells)if(c.owner===p&&getNeighbors(c.row,c.col).some(nb=>nb.owner!==p))bords.push(c);
  const tgts=bords.length?bords:cells.filter(c=>c.owner===p);
  while(n>0&&tgts.length){tgts[Math.floor(Math.random()*tgts.length)].troops++;n--;}
  game.reinforcements[p]=0;
}
// AI personalities: 1=Storm Kraken(aggressive), 2=Reef Lobster(defensive), 3=Abyss Hunter(expansionist)
const AI_STYLE = { 1: 'aggressive', 2: 'defensive', 3: 'expansionist' };

function aiTurn(p){
  if(game.phase==='combat'||game.phase==='gameover')return;
  if(game.attackCooldown[p]===-1||game.attackCooldown[p]>0||countTerritories(p)===0)return;
  const style = AI_STYLE[p] || 'aggressive';

  // Buy troops — aggressive buys more, defensive saves
  const buyLimit = style === 'aggressive' ? 8 : style === 'defensive' ? 3 : 5;
  while(game.shells[p]>=10&&game.reinforcements[p]<buyLimit){game.shells[p]-=10;game.reinforcements[p]++;}
  if(game.reinforcements[p]>0)aiDeployReinforcements(p);

  // Find best attack based on personality
  let bs=-1,ba=null,bd=null;
  for(const c of cells){
    if(c.owner!==p||c.troops<2)continue;
    for(const nb of getNeighbors(c.row,c.col)){
      if(nb.owner===p)continue;
      let s=(c.troops-nb.troops)*2;

      // Base scoring
      if(nb.owner===-1)s+=3;
      if(nb.troops===0)s+=5;
      if(nb.terrain==='crown')s+=5;

      // Region completion
      if(nb.region){
        let ow=0,tot=0;
        for(const x of cells)if(x.region===nb.region){tot++;if(x.owner===p)ow++;}
        if(ow>=tot-2)s+=8;
        if(ow>=tot-1)s+=12; // one away from completing
      }

      // Personality modifiers
      if(style==='aggressive'){
        // Target the player with most territory
        if(nb.owner>=0&&nb.owner!==p){
          const enemySize=countTerritories(nb.owner);
          if(enemySize>15)s+=6; // hunt the leader
        }
        s+=2; // more willing to attack in general
      } else if(style==='defensive'){
        // Only attack when strong advantage
        if(c.troops<nb.troops+2)s-=8; // don't attack unless 2+ troop advantage
        if(nb.owner===-1)s+=4; // prefer unclaimed over risky fights
      } else if(style==='expansionist'){
        // Prefer unclaimed, spread wide
        if(nb.owner===-1)s+=6;
        if(nb.troops===0)s+=4;
        // Penalty for attacking strong enemies
        if(nb.owner>=0&&nb.troops>=3)s-=3;
      }

      s+=Math.random()*3;
      if(s>bs){bs=s;ba=c;bd=nb;}
    }
  }

  // Attack threshold varies by personality
  const threshold = style==='aggressive' ? -2 : style==='defensive' ? 4 : 0;
  if(ba&&bd&&bs>threshold){
    // Instant claim for empty cells
    if(bd.troops<=0&&bd.owner===-1){
      const mv=Math.min(ba.troops-1,3);
      ba.troops-=mv;bd.owner=p;bd.troops=mv;
      const dp=cellCenter(bd);
      spawnParticles(dp.x,dp.y,PLAYER_COLORS[p],6);
      game.attackCooldown[p]=2+Math.random()*2;
    } else {
      startAICombat(ba,bd);
      game.attackCooldown[p]= style==='aggressive' ? 2+Math.random()*2 : 3+Math.random()*3;
    }
  }

  // Fortify: move interior troops to border
  for(const c of cells){
    if(c.owner!==p||c.troops<=1)continue;
    if(getNeighbors(c.row,c.col).some(n=>n.owner!==p))continue;
    for(const nb of getNeighbors(c.row,c.col)){
      if(nb.owner===p&&getNeighbors(nb.row,nb.col).some(n=>n.owner!==p)){
        const mv=Math.floor((c.troops-1)/2);if(mv>0){nb.troops+=mv;c.troops-=mv;}break;}}
  }
}

// === INPUT ===
let touchStartPos=null;
function screenToGrid(sx,sy){
  const x=sx*devicePixelRatio,y=sy*devicePixelRatio;
  const col=Math.floor((x-gridOffsetX)/cellSize),row=Math.floor((y-gridOffsetY)/cellSize);
  return(row<0||row>=GRID||col<0||col>=GRID)?null:cellAt(row,col);
}
function handleTap(sx,sy){
  const px=sx*devicePixelRatio,py=sy*devicePixelRatio;
  spawnRipple(px,py,'#ffffff');
  if(game.phase==='title'){
    // Wallet button (only if logged in)
    if(game._walletBtnRect && net.token){
      const wb=game._walletBtnRect;
      if(px>=wb.x&&px<=wb.x+wb.w&&py>=wb.y&&py<=wb.y+wb.h){
        if(typeof openWallet==='function') openWallet();
        return;
      }
    }
    // Sign Up button (only if NOT logged in)
    if(game._signupBtnRect && !net.token){
      const sb=game._signupBtnRect;
      if(px>=sb.x&&px<=sb.x+sb.w&&py>=sb.y&&py<=sb.y+sb.h){
        if(typeof openSignup==='function') openSignup();
        return;
      }
    }
    // Help/FAQ button
    if(game._helpBtnRect){
      const hb=game._helpBtnRect;
      if(px>=hb.x&&px<=hb.x+hb.w&&py>=hb.y&&py<=hb.y+hb.h){
        if(typeof openHelp==='function') openHelp();
        return;
      }
    }
    // Species selection
    if (game._speciesRects) {
      for (const sr of game._speciesRects) {
        if (px >= sr.x && px <= sr.x + sr.w && py >= sr.y && py <= sr.y + sr.h) {
          game.selectedSpecies = sr.species;
          game.playerSpecies[0] = sr.species;
          // Update player color to match species
          PLAYER_COLORS[0] = SPECIES[sr.species].color;
          haptic('light');
          return; // don't start game, just select
        }
      }
    }
    // Check if tapped a specific arena tier button
    const tier = hitTierButton(px, py);
    if (tier) {
      joinLobby(tier);
    } else {
      initGame(); // free play
    }
    return;
  }
  if(game.phase==='lobby'){
    // Tap to cancel lobby
    game.phase='title';game.lobby=null;
    return;
  }
  if(game.phase==='gameover'){game.phase='title';clearSavedGameState();return;}
  // Skip tutorial button
  if(game.tutorial>0&&game.tutorial<7&&game._skipTutorialRect){
    const sr=game._skipTutorialRect;
    if(px>=sr.x&&px<=sr.x+sr.w&&py>=sr.y&&py<=sr.y+sr.h){
      game.tutorial=0;game.firstGame=false;return;
    }
  }
  // Info-only tutorial steps (4=shells, 5=regions, 6=win) — tap to continue
  if(game.tutorial>=4&&game.tutorial<7){advanceTutorial();return;}
  if(game.phase==='combat'){
    // QTE tap during combat
    if(game.qte&&game.qte.active&&!game.qte.hit) hitQTE();
    return;
  }
  // Mute button
  if(game._muteRect){
    const mr=game._muteRect;
    if(px>=mr.x&&px<=mr.x+mr.w&&py>=mr.y&&py<=mr.y+mr.h){
      game.muted=!game.muted;haptic('light');return;
    }
  }
  // In-game help button
  if(game._helpBtnRect2){
    const hb=game._helpBtnRect2;
    if(px>=hb.x&&px<=hb.x+hb.w&&py>=hb.y&&py<=hb.y+hb.h){
      if(typeof openHelp==='function') openHelp();return;
    }
  }
  // Reset button
  if(game._resetBtnRect){
    const rb=game._resetBtnRect;
    if(px>=rb.x&&px<=rb.x+rb.w&&py>=rb.y&&py<=rb.y+rb.h){
      resetGame();return;
    }
  }
  // In-game wallet button (only if logged in)
  if(game._walletBtnRect2 && net.token){
    const wb=game._walletBtnRect2;
    if(px>=wb.x&&px<=wb.x+wb.w&&py>=wb.y&&py<=wb.y+wb.h){
      if(typeof openWallet==='function') openWallet();return;
    }
  }
  if(handleHUDTap(sx,sy))return;
  const cell=screenToGrid(sx,sy);
  if(!cell)return;
  const pos=cellCenter(cell);
  // DEPLOY
  // TROOP PICKER — handle tap on picker buttons
  if (game.troopPicker) {
    const tp = game.troopPicker;
    for (const btn of tp.buttons) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        tp.callback(btn.count);
        game.troopPicker = null;
        return;
      }
    }
    // Tapped outside picker — cancel
    game.troopPicker = null;
    return;
  }

  // DEPLOY — only in deploy phase (play phase uses select/attack)
  if(game.phase==='deploy'){
    const s0=mySlot();
    if(game.reinforcements[s0]>0 && cell.owner===s0){
      const avail = game.reinforcements[s0];
      if (avail <= 3) {
        doDeploy(cell, avail, s0);
      } else {
        showTroopPicker(pos.x, pos.y, avail, (count) => doDeploy(cell, count, s0));
      }
      return;
    }
    // Tapped non-owned cell — switch to play, save remaining troops
    game.phase='play';
    if(game.tutorial===1) advanceTutorial();
  }
  // FORTIFY
  if(game.fortifySource){
    const s=mySlot();
    if(cell.owner===s&&cell!==game.fortifySource){
      if(areConnected(game.fortifySource,cell,s)){
        const fromIdx=game.fortifySource.row*10+game.fortifySource.col;
        const toIdx=cell.row*10+cell.col;
        if(net.online) net.send({type:'fortify',fromIdx,toIdx});
        const mv=Math.max(1,Math.floor((game.fortifySource.troops-1)/2));
        if(mv>0){game.fortifySource.troops-=mv;cell.troops+=mv;
          spawnFloat(pos.x,pos.y-10,'+'+mv,'#00dddd');audio.play('troop_deploy');}
      } else spawnFloat(pos.x,pos.y-10,'Not connected!','#ff6666');
    }
    game.fortifySource=null;game.selectedCell=null;return;
  }
  // SELECT / ATTACK
  const s=mySlot();
  if(!game.selectedCell){
    if(cell.owner===s&&cell.troops>=1){
      game.selectedCell=cell;spawnRipple(pos.x,pos.y,PLAYER_COLORS[s]);audio.play('shell_earn');
      if(game.tutorial===2) advanceTutorial(); // selected → attack
    }
    else if(cell.owner>=0&&cell.owner!==s)spawnFloat(pos.x,pos.y-10,'Enemy','#ff8888');
    else spawnFloat(pos.x,pos.y-10,'Empty','#666');
    return;
  }
  if(cell===game.selectedCell){game.selectedCell=null;return;}
  if(cell.owner!==s&&isAdjacent(game.selectedCell,cell)){
    if(game.selectedCell.troops<2){spawnFloat(pos.x,pos.y-10,'Need 2+ troops','#ff6666');return;}
    if(game.attackCooldown[s]>0){spawnFloat(pos.x,pos.y-10,'Wait '+Math.ceil(game.attackCooldown[s])+'s','#ff6666');return;}
    // Empty/unoccupied cell — move troops to claim (no combat)
    if(cell.troops<=0 && cell.owner===-1){
      const maxMove = game.selectedCell.troops - 1;
      const selCell = game.selectedCell;
      if (maxMove === 1) {
        // Only 1 to move — just do it
        doClaimCell(selCell, cell, 1, s);
      } else {
        // Show picker — let player choose
        showTroopPicker(pos.x, pos.y, maxMove, (count) => doClaimCell(selCell, cell, count, s));
        game.selectedCell = null;
      }
      return;
    }
    // Real combat against occupied cell
    if(net.online){
      const fromIdx=game.selectedCell.row*10+game.selectedCell.col;
      const toIdx=cell.row*10+cell.col;
      net.send({type:'attack',fromIdx,toIdx});
      game.attackCooldown[s]=2;game.selectedCell=null;
    } else {
      startPlayerCombat(game.selectedCell,cell);game.attackCooldown[s]=2;game.selectedCell=null;
    }
    if(game.tutorial===3) advanceTutorial(); // attacked → expand
    return;
  }
  if(cell.owner===s){game.selectedCell=cell;spawnRipple(pos.x,pos.y,PLAYER_COLORS[s]);audio.play('shell_earn');return;}
  if(cell.owner!==s)spawnFloat(pos.x,pos.y-10,'Not adjacent!','#ff6666');
  game.selectedCell=null;
}
function doDeploy(cell, count, slot) {
  const c = Math.min(count, game.reinforcements[slot]);
  for(let i=0;i<c;i++){
    if(net.online) net.send({type:'deploy',cellIdx:cell.row*10+cell.col});
    cell.troops++;game.reinforcements[slot]--;
  }
  audio.play('troop_deploy');haptic('light');
  const pos=cellCenter(cell);
  spawnRipple(pos.x,pos.y,PLAYER_COLORS[slot]);
  spawnFloat(pos.x,pos.y-cellSize*.3,'+'+c,'#00ff88');
  spawnParticles(pos.x,pos.y,PLAYER_COLORS[slot],5);
  if(game.reinforcements[slot]<=0 && game.phase==='deploy'){
    game.phase='play';
    if(game.tutorial===1) advanceTutorial();
  }
}

function doClaimCell(fromCell, toCell, count, slot) {
  const moveTroops = Math.min(count, fromCell.troops - 1);
  if (moveTroops <= 0) return;
  if (net.online) {
    net.send({type:'attack', fromIdx: fromCell.row*10+fromCell.col, toIdx: toCell.row*10+toCell.col});
  } else {
    fromCell.troops -= moveTroops;
    toCell.owner = slot;
    toCell.troops = moveTroops;
  }
  const pos = cellCenter(toCell);
  audio.play('claim_territory');
  spawnParticles(pos.x, pos.y, PLAYER_COLORS[slot], 10);
  spawnFloat(pos.x, pos.y - 20, 'Territory claimed!', '#00ff88');
  haptic('medium');
  game.attackCooldown[slot] = 0.5;
  game.selectedCell = null;
  if (game.tutorial===3||game.tutorial===4) advanceTutorial();
}

function showTroopPicker(cx, cy, maxCount, callback) {
  const dpr = devicePixelRatio;
  const btnW = 50 * dpr, btnH = 32 * dpr, gap = 6 * dpr;
  const half = Math.ceil(maxCount / 2);
  const options = [{ label: '1', count: 1 }, { label: '\u00BD', count: half }, { label: 'ALL', count: maxCount }];
  const totalW = options.length * (btnW + gap) - gap;
  // Clamp within screen bounds
  let startX = Math.max(8, Math.min(cx - totalW / 2, W - totalW - 8));
  let startY = cy - cellSize - btnH - 10 * dpr;
  if (startY < 80 * dpr) startY = cy + cellSize + 10 * dpr; // flip below if too high

  game.troopPicker = {
    x: cx, y: cy,
    buttons: options.map((opt, i) => ({
      x: startX + i * (btnW + gap),
      y: startY,
      w: btnW, h: btnH,
      label: opt.label + (opt.count > 1 ? ' ('+opt.count+')' : ''),
      count: opt.count,
    })),
    callback,
  };
}

function drawTroopPicker() {
  if (!game.troopPicker) return;
  const tp = game.troopPicker;
  const dpr = devicePixelRatio;

  // Dim background slightly
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Label
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(11*dpr,12)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('How many?', tp.x, tp.buttons[0].y - 8 * dpr);

  for (const btn of tp.buttons) {
    ctx.fillStyle = '#0d2d14';
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8); ctx.fill();
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8); ctx.stroke();
    ctx.fillStyle = '#00ff88';
    ctx.font = `bold ${Math.max(10*dpr,11)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, btn.x + btn.w/2, btn.y + btn.h * 0.65);
  }
}

function handleHUDTap(sx,sy){
  const y=sy*devicePixelRatio,x=sx*devicePixelRatio,dpr=devicePixelRatio;
  const btnH=46*dpr,btnW=Math.min(140*dpr,W*.35),gap=12*dpr,btnY=H-btnH-14*dpr;
  if(y<btnY)return false;
  const s=mySlot();
  const buyX=W/2-btnW-gap/2;
  if(x>=buyX&&x<=buyX+btnW&&y<=btnY+btnH){
    if(game.shells[s]>=10){
      const maxBuy=Math.floor(game.shells[s]/10);
      const count=maxBuy; // buy all affordable
      for(let i=0;i<count;i++){
        if(net.online) net.send({type:'buy'});
        game.shells[s]-=10;game.reinforcements[s]++;
      }
      if(game.phase==='play')game.phase='deploy';audio.play('shell_earn');haptic('medium');
      spawnFloat(x,btnY-10,'+'+count+' troops','#00ff88');
    } else spawnFloat(x,btnY-10,'Need 10 shells!','#ff6666');
    return true;
  }
  const fortX=W/2+gap/2;
  if(x>=fortX&&x<=fortX+btnW&&y<=btnY+btnH){
    if(game.selectedCell&&game.selectedCell.owner===s&&game.selectedCell.troops>1){
      game.fortifySource=game.selectedCell;spawnFloat(x,btnY-10,'Tap destination','#00dddd');
    } else spawnFloat(x,btnY-10,'Select a spot first','#ff6666');
    return true;
  }
  return false;
}
canvas.addEventListener('touchstart',e=>{e.preventDefault();touchStartPos={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();if(touchStartPos){handleTap(touchStartPos.x,touchStartPos.y);touchStartPos=null;}},{passive:false});
canvas.addEventListener('click',e=>{handleTap(e.clientX,e.clientY);});

// === EFFECTS UPDATE ===
function updateEffects(dt){
  for(let i=game.particles.length-1;i>=0;i--){
    const p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt;p.size*=.97;
    if(p.life<=0)game.particles.splice(i,1);
  }
  for(let i=game.ripples.length-1;i>=0;i--){
    const r=game.ripples[i];r.life-=dt*2.5;r.radius+=(r.maxRadius-r.radius)*dt*8;
    if(r.life<=0)game.ripples.splice(i,1);
  }
  for(let i=game.floatingTexts.length-1;i>=0;i--){
    const f=game.floatingTexts[i];f.y+=f.vy*dt;f.life-=dt;
    if(f.life<=0)game.floatingTexts.splice(i,1);
  }
  // March animations
  for(let i=game.marchAnims.length-1;i>=0;i--){
    const m=game.marchAnims[i];
    m.life-=dt;
    const progress=1-(m.life/m.maxLife);
    m.x+=(m.tx-m.x)*dt*6;
    m.y+=(m.ty-m.y)*dt*6;
    // Bounce
    m.y-=Math.sin(progress*Math.PI)*cellSize*0.2*dt*3;
    if(m.life<=0)game.marchAnims.splice(i,1);
  }
  // Screen shake decay
  if(game.shakeDuration>0){
    game.shakeDuration-=dt;
    game.shakeX=(Math.random()-.5)*2*game.shakeIntensity;
    game.shakeY=(Math.random()-.5)*2*game.shakeIntensity;
    game.shakeIntensity*=0.9;
  } else {
    game.shakeX=0;game.shakeY=0;
  }
  // QTE timer
  if(game.qte&&game.qte.active&&!game.qte.hit){
    game.qte.timer+=dt;
    if(game.qte.timer>=game.qte.window){
      game.qte.active=false;
      spawnFloat(W/2,H*0.45,'MISSED!','#ff4444');
    }
  }
  // Bubbles
  for(const b of bubbles){
    b.y-=b.speed*dt;b.x+=Math.sin(game.time*2+b.wobble)*0.001;
    if(b.y<-0.02){b.y=1.05;b.x=Math.random();}
  }
}

// === AUDIO ===
const audio={ctx:null,enabled:false,
  init(){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.enabled=true;this.startAmbient();}catch(e){}},
  startAmbient(){
    if(!this.ctx)return;const c=this.ctx;
    const bs=c.sampleRate*2,buf=c.createBuffer(1,bs,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<bs;i++)d[i]=Math.random()*2-1;
    const ns=c.createBufferSource();ns.buffer=buf;ns.loop=true;
    const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=400;f.Q.value=.5;
    const ng=c.createGain();ng.gain.value=.03;
    ns.connect(f);f.connect(ng);ng.connect(c.destination);ns.start();
    const dr=c.createOscillator();dr.type='sine';dr.frequency.value=65;
    const dg=c.createGain();dg.gain.value=.04;dr.connect(dg);dg.connect(c.destination);dr.start();
    const lfo=c.createOscillator();lfo.frequency.value=.15;
    const lg=c.createGain();lg.gain.value=.02;lfo.connect(lg);lg.connect(dg.gain);lfo.start();
  },
  play(s){
    if(!this.ctx||!this.enabled||game.muted)return;
    const c=this.ctx,now=c.currentTime;
    const q=(type,f1,f2,dur,vol)=>{
      const o=c.createOscillator(),g=c.createGain();o.type=type;
      o.frequency.setValueAtTime(f1,now);if(f2!==f1)o.frequency.exponentialRampToValueAtTime(f2,now+dur);
      g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.001,now+dur+.02);
      o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+dur+.03);
    };
    const chord=(notes,type,vol,start,dur)=>{
      notes.forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;
        g.gain.setValueAtTime(vol,now+start+i*.1);g.gain.exponentialRampToValueAtTime(.001,now+start+i*.1+dur);
        o.connect(g);g.connect(c.destination);o.start(now+start+i*.1);o.stop(now+start+i*.1+dur+.01);});
    };
    switch(s){
      case 'troop_deploy':q('sine',800,400,.1,.15);break;
      case 'combat_start':q('sawtooth',120,60,.3,.12);break;
      case 'claim_territory':q('sine',1000,1500,.08,.12);break;
      case 'shell_earn':q('sine',1000,1500,.05,.08);break;
      case 'combat_win':chord([523,659,784,1047],'square',.08,0,.15);break;
      case 'combat_lose':chord([494,415,330],'triangle',.1,0,.12);break;
      case 'region_captured':
        [523,659,784].forEach(f=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=f;
          g.gain.setValueAtTime(.06,now);g.gain.linearRampToValueAtTime(.08,now+.3);g.gain.exponentialRampToValueAtTime(.001,now+1);
          o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+1);});break;
      case 'reinforcements':chord([600,750,900],'sine',.1,0,.1);break;
      case 'victory':
        [[523,659,784],[587,740,880],[659,784,1047]].forEach((ch,ci)=>{
          ch.forEach(f=>{const o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=f;
            g.gain.setValueAtTime(.06,now+ci*.4);g.gain.linearRampToValueAtTime(.08,now+ci*.4+.2);
            g.gain.exponentialRampToValueAtTime(.001,now+ci*.4+.5);
            o.connect(g);g.connect(c.destination);o.start(now+ci*.4);o.stop(now+ci*.4+.5);});});break;
    }
  },
};
function initAudioOnce(){if(!audio.ctx){audio.init();canvas.removeEventListener('touchstart',initAudioOnce);canvas.removeEventListener('click',initAudioOnce);}}
canvas.addEventListener('touchstart',initAudioOnce,{passive:true});
canvas.addEventListener('click',initAudioOnce);

// ============================================================
// RENDERING
// ============================================================

function drawOceanBG() {
  // Deep ocean gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#060618');
  grad.addColorStop(0.5, '#080820');
  grad.addColorStop(1, '#040410');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle caustic light pattern
  const t = game.time * 0.3;
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 6; i++) {
    const cx = W * (0.2 + Math.sin(t + i * 1.1) * 0.3);
    const cy = H * (0.3 + Math.cos(t * 0.7 + i * 0.9) * 0.3);
    const r = Math.min(W, H) * (0.15 + Math.sin(t * 0.5 + i) * 0.05);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, '#2266aa');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 1;

  // Bubbles
  for (const b of bubbles) {
    ctx.globalAlpha = b.alpha;
    ctx.fillStyle = '#4488bb';
    ctx.beginPath();
    ctx.arc(b.x * W, b.y * H, b.r * devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#88ccff';
    ctx.beginPath();
    ctx.arc(b.x * W - b.r * 0.3, b.y * H - b.r * 0.3, b.r * 0.3 * devicePixelRatio, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGrid() {
  const t = game.time;

  for (const cell of cells) {
    const x = gridOffsetX + cell.col * cellSize;
    const y = gridOffsetY + cell.row * cellSize;
    const pad = 2;

    // Cell background — terrain color with water shimmer
    const ter = TERRAIN[cell.terrain];
    ctx.fillStyle = ter.bg;
    ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);

    // Water shimmer wave
    const wave = Math.sin(t * 1.5 + cell.seed + cell.row * 0.5) * 0.08 + 0.12;
    ctx.globalAlpha = wave;
    ctx.fillStyle = ter.color;
    ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);
    ctx.globalAlpha = 1;

    // Owner territory fill
    if (cell.owner >= 0) {
      // Gradient fill from center
      const cx = x + cellSize / 2, cy = y + cellSize / 2;
      const rad = cellSize * 0.55;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grd.addColorStop(0, PLAYER_COLORS[cell.owner] + '55');
      grd.addColorStop(1, PLAYER_COLORS[cell.owner] + '22');
      ctx.fillStyle = grd;
      ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);

      // Owned border — only draw on edges touching non-owned cells
      ctx.strokeStyle = PLAYER_COLORS[cell.owner];
      ctx.lineWidth = 2;
      const nbs = getNeighbors(cell.row, cell.col);
      for (const nb of nbs) {
        if (nb.owner === cell.owner) continue;
        ctx.beginPath();
        if (nb.row < cell.row) { ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + cellSize - pad, y + pad); }
        if (nb.row > cell.row) { ctx.moveTo(x + pad, y + cellSize - pad); ctx.lineTo(x + cellSize - pad, y + cellSize - pad); }
        if (nb.col < cell.col) { ctx.moveTo(x + pad, y + pad); ctx.lineTo(x + pad, y + cellSize - pad); }
        if (nb.col > cell.col) { ctx.moveTo(x + cellSize - pad, y + pad); ctx.lineTo(x + cellSize - pad, y + cellSize - pad); }
        ctx.stroke();
      }
      // Edge of grid borders
      if (cell.row === 0) { ctx.beginPath(); ctx.moveTo(x+pad,y+pad); ctx.lineTo(x+cellSize-pad,y+pad); ctx.stroke(); }
      if (cell.row === 9) { ctx.beginPath(); ctx.moveTo(x+pad,y+cellSize-pad); ctx.lineTo(x+cellSize-pad,y+cellSize-pad); ctx.stroke(); }
      if (cell.col === 0) { ctx.beginPath(); ctx.moveTo(x+pad,y+pad); ctx.lineTo(x+pad,y+cellSize-pad); ctx.stroke(); }
      if (cell.col === 9) { ctx.beginPath(); ctx.moveTo(x+cellSize-pad,y+pad); ctx.lineTo(x+cellSize-pad,y+cellSize-pad); ctx.stroke(); }
    }

    // Subtle grid line
    ctx.strokeStyle = '#1a1a30';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, cellSize, cellSize);
  }

  // Region boundaries
  ctx.setLineDash([5, 3]);
  ctx.lineWidth = 1.5;
  for (const cell of cells) {
    if (!cell.region) continue;
    const x = gridOffsetX + cell.col * cellSize;
    const y = gridOffsetY + cell.row * cellSize;
    ctx.strokeStyle = '#3a3a5a';
    for (const nb of getNeighbors(cell.row, cell.col)) {
      if (nb.region !== cell.region) {
        ctx.beginPath();
        if (nb.row < cell.row) { ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); }
        if (nb.row > cell.row) { ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); }
        if (nb.col < cell.col) { ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); }
        if (nb.col > cell.col) { ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); }
        ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);

  // Terrain icons in empty/neutral cells (small)
  const dpr = devicePixelRatio;
  const iconSize = Math.max(7 * dpr, 8);
  ctx.font = `${iconSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const cell of cells) {
    if (cell.owner >= 0 || cell.troops > 0) continue;
    const cx = gridOffsetX + cell.col * cellSize + cellSize / 2;
    const cy = gridOffsetY + cell.row * cellSize + cellSize / 2;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = TERRAIN[cell.terrain].color;
    const t = TERRAIN[cell.terrain];
    ctx.fillText(t.icon || '~', cx, cy);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = 'alphabetic';
}

function drawDeployHighlights() {
  if (game.phase !== 'deploy' || game.reinforcements[mySlot()] <= 0) return;
  const pulse = 0.12 + Math.sin(game.time * 5) * 0.08;
  const dpr = devicePixelRatio;
  for (const cell of cells) {
    if (cell.owner !== mySlot()) continue;
    const x = gridOffsetX + cell.col * cellSize;
    const y = gridOffsetY + cell.row * cellSize;
    const cx = x + cellSize / 2, cy = y + cellSize / 2;

    // Pulsing green overlay
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PLAYER_COLORS[mySlot()];
    ctx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
    ctx.globalAlpha = 1;

    // Plus icon
    const s = cellSize * 0.13;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.5 + Math.sin(game.time * 5) * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// === CRAB DRAWING ===
// === CREATURE DRAWING ===
// Each species has a unique look. species: 'crab','octopus','lobster','turtle','jellyfish','shark'
function drawCreature(cx, cy, size, color, troops, time, species) {
  const s = size;
  const sp = species || 'crab';

  // Shadow
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.7, s * 0.6, s * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (sp === 'octopus') drawOctopus(cx, cy, s, color, time);
  else if (sp === 'lobster') drawLobster(cx, cy, s, color, time);
  else if (sp === 'turtle') drawTurtle(cx, cy, s, color, time);
  else if (sp === 'jellyfish') drawJellyfish(cx, cy, s, color, time);
  else if (sp === 'shark') drawShark(cx, cy, s, color, time);
  else drawCrabBody(cx, cy, s, color, time);

  // Troop count badge
  if (troops > 0) {
    const badgeY = cy + s * 0.55;
    const fs = Math.max(10 * devicePixelRatio, s * 0.42);
    const badgeW = fs * (troops >= 10 ? 1.4 : 1) + 6;
    const badgeH = fs + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    roundRect(ctx, cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    roundRect(ctx, cx - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 4); ctx.stroke();
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(troops, cx, badgeY);
    ctx.textBaseline = 'alphabetic';
  }
}

// Keep backward compat
function drawCrab(cx, cy, size, color, troops, time) {
  drawCreature(cx, cy, size, color, troops, time, 'crab');
}

function drawCrabBody(cx, cy, s, color, time) {
  const legWiggle = Math.sin(time * 6) * 0.15;
  // Legs
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, s * 0.08); ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let leg = 0; leg < 3; leg++) {
      const bx = cx + side * s * 0.35, by = cy + (leg - 1) * s * 0.25;
      const mx = bx + side * s * 0.5, my = by + Math.sin(time * 5 + leg + side) * s * 0.12;
      const tx = mx + side * s * 0.25, ty = my + s * 0.2 + legWiggle * s * (leg === 1 ? -1 : 1);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    }
  }
  // Claws
  const cl = 0.2 + Math.sin(time * 3) * 0.05;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx - s * 0.75, cy - s * 0.15, s * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.75, cy - s * 0.15, s * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkenColor(color, 0.7);
  ctx.beginPath(); ctx.arc(cx - s * 0.82, cy - s * 0.15 - s * cl, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.82, cy - s * 0.15 - s * cl, s * 0.1, 0, Math.PI * 2); ctx.fill();
  // Body
  const bg = ctx.createRadialGradient(cx - s * 0.1, cy - s * 0.1, 0, cx, cy, s * 0.5);
  bg.addColorStop(0, lightenColor(color, 1.3)); bg.addColorStop(0.6, color); bg.addColorStop(1, darkenColor(color, 0.6));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.5, s * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  // Shell lines
  ctx.strokeStyle = darkenColor(color, 0.5); ctx.lineWidth = Math.max(1, s * 0.04); ctx.globalAlpha = 0.3;
  for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(cx, cy - s * 0.05, s * 0.15 * i, Math.PI * 0.8, Math.PI * 2.2); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // Eyes
  drawEyes(cx, cy, s, color, 0.2, -0.32);
}

function drawOctopus(cx, cy, s, color, time) {
  // Tentacles (8 wavy arms)
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.07); ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI * 0.5;
    const tx = cx + Math.cos(angle) * s * 0.3;
    const ty = cy + Math.sin(angle) * s * 0.2 + s * 0.1;
    const ex = cx + Math.cos(angle) * s * 0.8;
    const ey = cy + Math.sin(angle) * s * 0.5 + s * 0.15 + Math.sin(time * 3 + i) * s * 0.1;
    const mx = (tx + ex) / 2 + Math.sin(time * 4 + i * 0.8) * s * 0.15;
    const my = (ty + ey) / 2;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
    // Suction cups
    ctx.fillStyle = darkenColor(color, 0.5);
    ctx.beginPath(); ctx.arc(mx, my, s * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  // Body (dome)
  const bg = ctx.createRadialGradient(cx, cy - s * 0.1, 0, cx, cy, s * 0.45);
  bg.addColorStop(0, lightenColor(color, 1.4)); bg.addColorStop(0.6, color); bg.addColorStop(1, darkenColor(color, 0.5));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.05, s * 0.4, s * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  // Spots
  ctx.globalAlpha = 0.2; ctx.fillStyle = lightenColor(color, 1.5);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + Math.cos(i * 1.5) * s * 0.15, cy - s * 0.05 + Math.sin(i * 1.5) * s * 0.15, s * 0.06, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // Eyes (big, expressive)
  drawEyes(cx, cy, s, color, 0.18, -0.15, 0.14, 0.07);
}

function drawLobster(cx, cy, s, color, time) {
  // Tail segments
  ctx.fillStyle = darkenColor(color, 0.8);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(cx, cy + s * (0.2 + i * 0.15), s * (0.3 - i * 0.05), s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Tail fan
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.55); ctx.lineTo(cx - s * 0.25, cy + s * 0.75); ctx.lineTo(cx + s * 0.25, cy + s * 0.75); ctx.fill();
  // Antennae
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.04);
  const aw = Math.sin(time * 2) * s * 0.1;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.1, cy - s * 0.3); ctx.quadraticCurveTo(cx - s * 0.5 + aw, cy - s * 0.7, cx - s * 0.7, cy - s * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.1, cy - s * 0.3); ctx.quadraticCurveTo(cx + s * 0.5 - aw, cy - s * 0.7, cx + s * 0.7, cy - s * 0.5); ctx.stroke();
  // Big claws on long arms
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, s * 0.06);
  const clawAng = Math.sin(time * 2.5) * 0.1;
  ctx.beginPath(); ctx.moveTo(cx - s * 0.3, cy); ctx.lineTo(cx - s * 0.7, cy - s * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.3, cy); ctx.lineTo(cx + s * 0.7, cy - s * 0.2); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx - s * 0.7, cy - s * 0.2, s * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.7, cy - s * 0.2, s * 0.18, 0, Math.PI * 2); ctx.fill();
  // Pincers
  ctx.fillStyle = darkenColor(color, 0.6);
  ctx.beginPath(); ctx.arc(cx - s * 0.78, cy - s * 0.3 - clawAng * s, s * 0.08, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.78, cy - s * 0.3 + clawAng * s, s * 0.08, 0, Math.PI * 2); ctx.fill();
  // Body
  const bg = ctx.createRadialGradient(cx, cy - s * 0.1, 0, cx, cy, s * 0.35);
  bg.addColorStop(0, lightenColor(color, 1.2)); bg.addColorStop(1, darkenColor(color, 0.7));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.05, s * 0.35, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  // Eyes on stalks
  drawEyes(cx, cy, s, color, 0.15, -0.35);
}

function drawTurtle(cx, cy, s, color, time) {
  // Flippers
  ctx.fillStyle = darkenColor(color, 0.7);
  const flipAng = Math.sin(time * 3) * 0.2;
  for (let side = -1; side <= 1; side += 2) {
    ctx.save(); ctx.translate(cx + side * s * 0.35, cy + s * 0.1); ctx.rotate(side * (0.5 + flipAng));
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // Back flippers
    ctx.save(); ctx.translate(cx + side * s * 0.25, cy + s * 0.35); ctx.rotate(side * (0.8 - flipAng * 0.5));
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // Shell (hexagonal pattern)
  const bg = ctx.createRadialGradient(cx - s * 0.08, cy - s * 0.08, 0, cx, cy, s * 0.5);
  bg.addColorStop(0, lightenColor(color, 1.3)); bg.addColorStop(0.5, color); bg.addColorStop(1, darkenColor(color, 0.5));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.5, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  // Shell pattern (hexagons)
  ctx.strokeStyle = darkenColor(color, 0.4); ctx.lineWidth = Math.max(1, s * 0.03); ctx.globalAlpha = 0.4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * s * 0.35, cy + Math.sin(a) * s * 0.3); ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.2, s * 0.17, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  // Head
  ctx.fillStyle = darkenColor(color, 0.8);
  ctx.beginPath(); ctx.ellipse(cx, cy - s * 0.4, s * 0.15, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
  // Eyes
  drawEyes(cx, cy, s, color, 0.1, -0.42, 0.06, 0.03);
}

function drawJellyfish(cx, cy, s, color, time) {
  const bob = Math.sin(time * 2) * s * 0.08;
  const jy = cy + bob;
  // Trailing tentacles
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.03); ctx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i++) {
    const tx = cx + (i - 3) * s * 0.12;
    const len = s * (0.5 + Math.sin(time + i) * 0.15);
    ctx.beginPath(); ctx.moveTo(tx, jy + s * 0.2);
    ctx.quadraticCurveTo(tx + Math.sin(time * 3 + i) * s * 0.1, jy + s * 0.2 + len * 0.5, tx + Math.sin(time * 2 + i * 0.7) * s * 0.15, jy + s * 0.2 + len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Bell (translucent dome)
  ctx.globalAlpha = 0.7;
  const bg = ctx.createRadialGradient(cx, jy - s * 0.1, 0, cx, jy, s * 0.45);
  bg.addColorStop(0, lightenColor(color, 1.5)); bg.addColorStop(0.5, color); bg.addColorStop(1, darkenColor(color, 0.4));
  ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(cx, jy - s * 0.05, s * 0.4, s * 0.35, 0, Math.PI, Math.PI * 2); ctx.fill();
  // Bottom rim
  ctx.fillStyle = darkenColor(color, 0.7);
  ctx.beginPath(); ctx.ellipse(cx, jy + s * 0.15, s * 0.4, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Glow spots
  ctx.globalAlpha = 0.3 + Math.sin(time * 4) * 0.15; ctx.fillStyle = lightenColor(color, 1.8);
  ctx.beginPath(); ctx.arc(cx - s * 0.1, jy - s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.12, jy - s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Eyes (cute small ones)
  drawEyes(cx, cy + bob, s, color, 0.12, -0.1, 0.06, 0.03);
}

function drawShark(cx, cy, s, color, time) {
  const sw = Math.sin(time * 4) * s * 0.04; // tail sway
  // Tail fin
  ctx.fillStyle = darkenColor(color, 0.7);
  ctx.beginPath(); ctx.moveTo(cx + s * 0.5 + sw, cy); ctx.lineTo(cx + s * 0.85 + sw * 2, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.85 + sw * 2, cy + s * 0.2); ctx.fill();
  // Body (streamlined)
  const bg = ctx.createLinearGradient(cx - s * 0.5, cy - s * 0.3, cx - s * 0.5, cy + s * 0.3);
  bg.addColorStop(0, darkenColor(color, 0.6)); bg.addColorStop(0.4, color); bg.addColorStop(1, lightenColor(color, 1.2));
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.55, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  // Dorsal fin
  ctx.fillStyle = darkenColor(color, 0.5);
  ctx.beginPath(); ctx.moveTo(cx - s * 0.05, cy - s * 0.25); ctx.lineTo(cx + s * 0.1, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.25); ctx.fill();
  // Pectoral fins
  ctx.fillStyle = darkenColor(color, 0.6);
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy + s * 0.15 * side);
    ctx.lineTo(cx - s * 0.35, cy + s * 0.35 * side);
    ctx.lineTo(cx + s * 0.05, cy + s * 0.2 * side); ctx.fill();
  }
  // Mouth line
  ctx.strokeStyle = darkenColor(color, 0.3); ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath(); ctx.moveTo(cx - s * 0.45, cy + s * 0.05); ctx.lineTo(cx - s * 0.3, cy + s * 0.1); ctx.stroke();
  // Eye (single visible — side view)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - s * 0.35, cy - s * 0.08, s * 0.07, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx - s * 0.36, cy - s * 0.07, s * 0.035, 0, Math.PI * 2); ctx.fill();
  // Gill slits
  ctx.strokeStyle = darkenColor(color, 0.4); ctx.lineWidth = Math.max(1, s * 0.02); ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.2 + i * s * 0.06, cy - s * 0.1); ctx.lineTo(cx - s * 0.2 + i * s * 0.06, cy + s * 0.08); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

function drawEyes(cx, cy, s, color, xOff, yOff, eyeR, pupilR) {
  const er = eyeR || 0.1, pr = pupilR || 0.05;
  const ey = cy + s * (yOff || -0.32);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy + s * (yOff + 0.07)); ctx.lineTo(cx - s * xOff, ey); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.15, cy + s * (yOff + 0.07)); ctx.lineTo(cx + s * xOff, ey); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath();
  ctx.arc(cx - s * xOff, ey, s * er, 0, Math.PI * 2); ctx.arc(cx + s * xOff, ey, s * er, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath();
  ctx.arc(cx - s * (xOff - 0.02), ey + s * 0.01, s * pr, 0, Math.PI * 2);
  ctx.arc(cx + s * (xOff - 0.02), ey + s * 0.01, s * pr, 0, Math.PI * 2); ctx.fill();
}

function parseHex(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return [parseInt(hex.slice(0,2),16)||0, parseInt(hex.slice(2,4),16)||0, parseInt(hex.slice(4,6),16)||0];
}
function darkenColor(hex, factor) {
  const [r,g,b] = parseHex(hex);
  return `rgb(${Math.floor(r*factor)},${Math.floor(g*factor)},${Math.floor(b*factor)})`;
}
function lightenColor(hex, factor) {
  const [r,g,b] = parseHex(hex);
  return `rgb(${Math.min(255,Math.floor(r*factor))},${Math.min(255,Math.floor(g*factor))},${Math.min(255,Math.floor(b*factor))})`;
}

function drawTroops() {
  for (const cell of cells) {
    if (cell.troops <= 0) continue;
    const pos = cellCenter(cell);
    const size = cell.troops >= 20 ? cellSize * 0.42
               : cell.troops >= 10 ? cellSize * 0.36
               : cell.troops >= 4  ? cellSize * 0.3
               : cellSize * 0.26;
    const color = cell.owner >= 0 ? PLAYER_COLORS[cell.owner] : '#666677';

    // Glow for big armies
    if (cell.troops >= 15) {
      ctx.globalAlpha = 0.15 + Math.sin(game.time * 3 + cell.seed) * 0.08;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const sp = cell.owner >= 0 ? (game.playerSpecies[cell.owner] || 'crab') : 'crab';
    drawCreature(pos.x, pos.y - size * 0.1, size, color, cell.troops, game.time + cell.seed, sp);
  }
}

function drawSelection() {
  if (!game.selectedCell) return;
  const cell = game.selectedCell;
  const x = gridOffsetX + cell.col * cellSize;
  const y = gridOffsetY + cell.row * cellSize;
  const cx = x + cellSize / 2, cy = y + cellSize / 2;
  const dpr = devicePixelRatio;

  // Selection glow
  const pulse = 0.5 + Math.sin(game.time * 6) * 0.4;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.globalAlpha = pulse;
  ctx.strokeRect(x - 1, y - 1, cellSize + 2, cellSize + 2);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // "SELECTED" label
  ctx.font = `bold ${Math.max(8 * dpr, 9)}px monospace`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('SELECTED', cx, y - 5);

  // Attack indicators
  if (cell.troops >= 2 && game.phase === 'play') {
    for (const nb of getNeighbors(cell.row, cell.col)) {
      if (nb.owner === mySlot()) continue;
      const nx = gridOffsetX + nb.col * cellSize;
      const ny = gridOffsetY + nb.row * cellSize;
      const ncx = nx + cellSize / 2, ncy = ny + cellSize / 2;

      // Red pulse on target
      ctx.globalAlpha = 0.15 + Math.sin(game.time * 4) * 0.1;
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(nx + 3, ny + 3, cellSize - 6, cellSize - 6);
      ctx.globalAlpha = 1;

      // Arrow
      const dx = ncx - cx, dy = ncy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ux = dx / dist, uy = dy / dist;
      const a1 = { x: cx + ux * cellSize * 0.42, y: cy + uy * cellSize * 0.42 };
      const a2 = { x: ncx - ux * cellSize * 0.42, y: ncy - uy * cellSize * 0.42 };

      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + Math.sin(game.time * 4) * 0.3;
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();

      // Arrowhead
      const hl = cellSize * 0.15, angle = Math.atan2(uy, ux);
      ctx.beginPath();
      ctx.moveTo(a2.x, a2.y);
      ctx.lineTo(a2.x - hl * Math.cos(angle - 0.5), a2.y - hl * Math.sin(angle - 0.5));
      ctx.moveTo(a2.x, a2.y);
      ctx.lineTo(a2.x - hl * Math.cos(angle + 0.5), a2.y - hl * Math.sin(angle + 0.5));
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Swords icon
      ctx.font = `bold ${Math.max(12 * dpr, 13)}px monospace`;
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'center';
      ctx.fillText('\u2694', ncx, ny - 3);
    }
  }

  // Fortify highlight
  if (game.fortifySource) {
    const fx = gridOffsetX + game.fortifySource.col * cellSize;
    const fy = gridOffsetY + game.fortifySource.row * cellSize;
    ctx.strokeStyle = '#00dddd';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00dddd';
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.6 + Math.sin(game.time * 5) * 0.3;
    ctx.strokeRect(fx - 1, fy - 1, cellSize + 2, cellSize + 2);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

function drawCombat() {
  const cs = game.combatState; if (!cs) return;
  const progress = Math.min(cs.timer / cs.duration, 1);
  const dpr = devicePixelRatio;

  // Dim background
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Highlight cells
  const ap = cellCenter(cs.attacker), dp = cellCenter(cs.defender);
  ctx.globalAlpha = 0.35 + Math.sin(game.time * 8) * 0.15;
  ctx.fillStyle = PLAYER_COLORS[cs.attacker.owner];
  ctx.beginPath(); ctx.arc(ap.x, ap.y, cellSize * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = cs.defender.owner >= 0 ? PLAYER_COLORS[cs.defender.owner] : '#555';
  ctx.beginPath(); ctx.arc(dp.x, dp.y, cellSize * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Panel
  const pw = Math.min(W * 0.92, 480 * dpr);
  const ph = Math.min(H * 0.42, 300 * dpr);
  const px = (W - pw) / 2, py = (H - ph) / 2;

  // Panel bg
  const pgrd = ctx.createLinearGradient(px, py, px, py + ph);
  pgrd.addColorStop(0, '#0e0e28');
  pgrd.addColorStop(1, '#080818');
  ctx.fillStyle = pgrd;
  roundRect(ctx, px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = '#334';
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pw, ph, 14); ctx.stroke();

  const fs = Math.max(13 * dpr, 15);
  const bf = Math.max(17 * dpr, 19);
  const sf = Math.max(10 * dpr, 11);
  const dc = cs.defender.owner >= 0 ? PLAYER_COLORS[cs.defender.owner] : '#888';

  // Attacker
  ctx.fillStyle = PLAYER_COLORS[cs.attacker.owner];
  ctx.font = `bold ${bf}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(PLAYER_NAMES[cs.attacker.owner], px + pw * 0.25, py + ph * 0.18);
  // Mini crab
  drawCrab(px + pw * 0.25, py + ph * 0.38, ph * 0.15, PLAYER_COLORS[cs.attacker.owner], 0, game.time);
  ctx.font = `${fs}px monospace`;
  ctx.fillStyle = '#aaa';
  ctx.fillText(cs.attacker.troops + ' troops', px + pw * 0.25, py + ph * 0.55);

  // VS
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${bf * 1.3}px monospace`;
  ctx.fillText('VS', px + pw * 0.5, py + ph * 0.35);

  // Defender
  ctx.fillStyle = dc;
  ctx.font = `bold ${bf}px monospace`;
  const dn = cs.defender.owner >= 0 ? PLAYER_NAMES[cs.defender.owner] : 'Neutral';
  ctx.fillText(dn, px + pw * 0.75, py + ph * 0.18);
  drawCrab(px + pw * 0.75, py + ph * 0.38, ph * 0.15, cs.defender.owner >= 0 ? PLAYER_COLORS[cs.defender.owner] : '#666677', 0, game.time + 2);
  ctx.font = `${fs}px monospace`;
  ctx.fillStyle = '#aaa';
  ctx.fillText(cs.defender.troops + ' troops', px + pw * 0.75, py + ph * 0.55);

  // Dice label
  if (progress > 0.2) {
    ctx.fillStyle = '#555';
    ctx.font = `${sf * 0.9}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('DICE ROLLS', px + pw * 0.5, py + ph * 0.63);
  }

  // Dice
  if (progress > 0.3) {
    drawDice(px + pw * 0.25, py + ph * 0.72, cs.result.atkRolls, PLAYER_COLORS[cs.attacker.owner], pw * 0.38);
    drawDice(px + pw * 0.75, py + ph * 0.72, cs.result.defRolls, dc, pw * 0.38);
  }

  // Dice comparison — show which dice won
  if (progress > 0.5) {
    const r = cs.result;
    const sf2 = Math.max(9 * dpr, 10);
    const compY = py + ph * 0.84;
    const pairs = Math.min(r.atkRolls.length, r.defRolls.length);
    for (let i = 0; i < pairs; i++) {
      const atkWon = r.atkRolls[i] > r.defRolls[i];
      const cy2 = compY + i * 14 * dpr;
      ctx.font = `${sf2}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = atkWon ? '#00ff88' : '#ff6666';
      ctx.fillText(r.atkRolls[i] + (atkWon ? ' > ' : ' \u2264 ') + r.defRolls[i] + (atkWon ? ' \u2192 def -1' : ' \u2192 atk -1'), px + pw * 0.5, cy2);
    }
  }

  // Result
  if (progress > 0.7) {
    const r = cs.result;
    let txt, col;
    if (r.defLoss > r.atkLoss) { txt = 'ATTACKER WINS!'; col = '#00ff88'; }
    else if (r.atkLoss > r.defLoss) { txt = 'DEFENDER HOLDS!'; col = '#ff6666'; }
    else { txt = 'DRAW!'; col = '#ffcc00'; }
    ctx.fillStyle = col;
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(txt, px + pw * 0.5, py + ph * 0.98);
  }
}

function drawDice(cx, cy, rolls, color, maxW) {
  const dpr = devicePixelRatio;
  const ds = Math.min(28 * dpr, maxW / (rolls.length + 0.5));
  const tw = rolls.length * ds + (rolls.length - 1) * 4;
  let sx = cx - tw / 2;
  for (const val of rolls) {
    ctx.fillStyle = '#12122a';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    roundRect(ctx, sx, cy - ds / 2, ds, ds, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold ${ds * 0.6}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(val, sx + ds / 2, cy);
    ctx.textBaseline = 'alphabetic';
    sx += ds + 4;
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function drawHUD() {
  const dpr = devicePixelRatio;
  const fs = Math.max(12 * dpr, 14);
  const sf = Math.max(10 * dpr, 12);

  // Top bar (below ticker)
  const tickerH = 18 * dpr;
  const tbh = 56 * dpr;
  const tbGrad = ctx.createLinearGradient(0, tickerH, 0, tickerH + tbh);
  tbGrad.addColorStop(0, 'rgba(8,8,24,0.95)');
  tbGrad.addColorStop(1, 'rgba(8,8,24,0.8)');
  ctx.fillStyle = tbGrad;
  ctx.fillRect(0, tickerH, W, tbh);
  ctx.fillStyle = '#1a1a30';
  ctx.fillRect(0, tickerH + tbh - 1, W, 1);

  const ty = tickerH; // y offset for HUD content

  const me = mySlot();

  // Username + connection status
  ctx.font = `${sf}px monospace`;
  ctx.textAlign = 'left';
  if (net.online) {
    ctx.fillStyle = '#00ff88';
    ctx.fillText('\u25CF ' + (net.username || 'Connected'), 10 * dpr, ty + 12 * dpr);
  } else if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    ctx.fillStyle = '#888';
    ctx.fillText(window.Telegram.WebApp.initDataUnsafe.user.first_name, 10 * dpr, ty + 12 * dpr);
  }

  // Shells (with icon)
  ctx.font = `bold ${fs}px monospace`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffcc00';
  ctx.fillText('\u2728 ' + game.shells[me], 10 * dpr, ty + 26 * dpr);

  // Spots
  ctx.fillStyle = PLAYER_COLORS[me];
  ctx.fillText(countTerritories(me) + ' spots', 10 * dpr, ty + 44 * dpr);

  // Center info
  ctx.textAlign = 'center';
  if (game.phase === 'deploy' && game.reinforcements[me] > 0) {
    ctx.fillStyle = '#ffcc00';
    ctx.font = `bold ${fs}px monospace`;
    ctx.fillText('DEPLOY: ' + game.reinforcements[me] + ' troops', W / 2, ty + 26 * dpr);
    ctx.fillStyle = '#aaa';
    ctx.font = `${sf}px monospace`;
    ctx.fillText('Tap your green spots', W / 2, ty + 44 * dpr);
  } else {
    ctx.fillStyle = '#777';
    ctx.font = `${sf}px monospace`;
    ctx.fillText('Troops in ' + Math.ceil(game.reinforceTimer) + 's', W / 2, ty + 26 * dpr);
    const rc = getRegionControl(me).length;
    ctx.fillStyle = rc > 0 ? '#ffdd00' : '#555';
    ctx.fillText('Regions: ' + rc + '/8', W / 2, ty + 44 * dpr);
  }

  // Opponents
  ctx.textAlign = 'right';
  ctx.font = `${sf}px monospace`;
  for (let p = 1; p < 4; p++) {
    const tc = countTerritories(p);
    ctx.fillStyle = tc > 0 ? PLAYER_COLORS[p] : '#333';
    ctx.fillText(PLAYER_NAMES[p].slice(0, 5) + ' ' + (tc > 0 ? tc : 'X'), W - 8 * dpr, ty + (15 + (p - 1) * 15) * dpr);
  }

  // === BOTTOM ===
  const btnH = 46 * dpr;
  const btnW = Math.min(140 * dpr, W * 0.35);
  const gap = 12 * dpr;
  const btnY = H - btnH - 14 * dpr;

  // Buy button
  const buyX = W / 2 - btnW - gap / 2;
  const canBuy = game.shells[me] >= 10;
  const buyGrad = ctx.createLinearGradient(buyX, btnY, buyX, btnY + btnH);
  buyGrad.addColorStop(0, canBuy ? '#1a3a1a' : '#141414');
  buyGrad.addColorStop(1, canBuy ? '#0d200d' : '#0a0a0a');
  ctx.fillStyle = buyGrad;
  roundRect(ctx, buyX, btnY, btnW, btnH, 10); ctx.fill();
  ctx.strokeStyle = canBuy ? '#00ff88' : '#2a2a2a';
  ctx.lineWidth = canBuy ? 2 : 1;
  roundRect(ctx, buyX, btnY, btnW, btnH, 10); ctx.stroke();
  ctx.fillStyle = canBuy ? '#00ff88' : '#444';
  ctx.font = `bold ${Math.max(11 * dpr, 13)}px monospace`;
  ctx.textAlign = 'center';
  const maxBuyCount = Math.floor(game.shells[me] / 10);
  ctx.fillText(canBuy ? 'BUY ALL ('+maxBuyCount+')' : 'BUY TROOPS', buyX + btnW / 2, btnY + btnH * 0.42);
  ctx.font = `${Math.max(8 * dpr, 9)}px monospace`;
  ctx.fillStyle = canBuy ? '#66aa66' : '#333';
  ctx.fillText(canBuy ? maxBuyCount+'0 shells' : 'need 10+', buyX + btnW / 2, btnY + btnH * 0.75);

  // Fortify
  const fX = W / 2 + gap / 2;
  const canF = game.selectedCell && game.selectedCell.owner === me && game.selectedCell.troops > 1;
  const fGrad = ctx.createLinearGradient(fX, btnY, fX, btnY + btnH);
  fGrad.addColorStop(0, canF ? '#1a1a3a' : '#141414');
  fGrad.addColorStop(1, canF ? '#0d0d20' : '#0a0a0a');
  ctx.fillStyle = fGrad;
  roundRect(ctx, fX, btnY, btnW, btnH, 10); ctx.fill();
  ctx.strokeStyle = canF ? '#4488ff' : '#2a2a2a';
  ctx.lineWidth = canF ? 2 : 1;
  roundRect(ctx, fX, btnY, btnW, btnH, 10); ctx.stroke();
  ctx.fillStyle = canF ? '#4488ff' : '#444';
  ctx.font = `bold ${Math.max(11 * dpr, 13)}px monospace`;
  ctx.fillText('FORTIFY', fX + btnW / 2, btnY + btnH * 0.42);
  ctx.font = `${Math.max(8 * dpr, 9)}px monospace`;
  ctx.fillStyle = canF ? '#6688aa' : '#333';
  ctx.fillText('move troops', fX + btnW / 2, btnY + btnH * 0.75);

  // Win progress
  const barY = btnY - 22 * dpr;
  const barW = W * 0.55;
  const barX = (W - barW) / 2;
  const barH = 10 * dpr;
  const pct = countTerritories(me) / 60;

  ctx.fillStyle = '#111';
  roundRect(ctx, barX, barY, barW, barH, 5); ctx.fill();
  if (pct > 0) {
    const pgr = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
    pgr.addColorStop(0, '#006633');
    pgr.addColorStop(1, pct >= 1 ? '#ffdd00' : '#00ff88');
    ctx.fillStyle = pgr;
    roundRect(ctx, barX, barY, Math.max(barH, barW * Math.min(1, pct)), barH, 5); ctx.fill();
  }
  ctx.fillStyle = '#999';
  ctx.font = `${Math.max(8 * dpr, 9)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(countTerritories(me) + '/60 to dominate', W / 2, barY - 4);

  // Mute button (top right, below ticker)
  const muteSize = 24 * dpr;
  const muteX = W - muteSize - 8 * dpr;
  const muteY = tickerH + tbh + 6;
  ctx.fillStyle = 'rgba(20,20,40,0.7)';
  ctx.beginPath(); ctx.arc(muteX + muteSize/2, muteY + muteSize/2, muteSize/2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = game.muted ? '#ff4444' : '#666';
  ctx.font = `${Math.max(12*dpr,13)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(game.muted ? '\u2715' : '\u266B', muteX + muteSize/2, muteY + muteSize*0.62);
  // Store rect for tap detection
  game._muteRect = { x: muteX, y: muteY, w: muteSize, h: muteSize };

  // Help button (next to mute)
  const helpX = muteX - muteSize - 6 * dpr;
  ctx.fillStyle = 'rgba(20,20,40,0.7)';
  ctx.beginPath(); ctx.arc(helpX + muteSize/2, muteY + muteSize/2, muteSize/2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4488ff';
  ctx.font = `bold ${Math.max(13*dpr,14)}px monospace`;
  ctx.fillText('?', helpX + muteSize/2, muteY + muteSize*0.62);
  game._helpBtnRect2 = { x: helpX, y: muteY, w: muteSize, h: muteSize };

  game._walletBtnRect2 = null;
  if (net.token) {
    // Wallet button (next to help) — only when logged in
    const walX = helpX - muteSize - 6 * dpr;
    ctx.fillStyle = 'rgba(20,20,40,0.7)';
    ctx.beginPath(); ctx.arc(walX + muteSize/2, muteY + muteSize/2, muteSize/2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.font = `${Math.max(13*dpr,14)}px monospace`;
    ctx.fillText('\u{1F4B0}', walX + muteSize/2, muteY + muteSize*0.62);
    game._walletBtnRect2 = { x: walX, y: muteY, w: muteSize, h: muteSize };

    // ETH balance + username
    ctx.font = `${Math.max(8*dpr,9)}px monospace`;
    ctx.textAlign = 'right';
    if (game._ethBalance) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(game._ethBalance + ' ETH', muteX + muteSize, muteY + muteSize + 14 * dpr);
    }
    if (net.username) {
      ctx.fillStyle = '#00ff88';
      ctx.fillText(net.username, muteX + muteSize, muteY + muteSize + 26 * dpr);
    }
  }

  // Reset button (bottom-left)
  const rstW = 50 * dpr, rstH = 22 * dpr;
  const rstX = 8 * dpr, rstY = H - rstH - 70 * dpr;
  ctx.fillStyle = 'rgba(20,12,12,0.7)';
  roundRect(ctx, rstX, rstY, rstW, rstH, 5); ctx.fill();
  ctx.strokeStyle = '#ff444444'; ctx.lineWidth = 1;
  roundRect(ctx, rstX, rstY, rstW, rstH, 5); ctx.stroke();
  ctx.fillStyle = '#ff4444';
  ctx.font = `${Math.max(8*dpr,9)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('RESET', rstX + rstW/2, rstY + rstH * 0.65);
  game._resetBtnRect = { x: rstX, y: rstY, w: rstW, h: rstH };
}

function drawHintBar() {
  if (game.tutorial > 0 && game.tutorial < 7) return; // tutorial handles hints
  const dpr = devicePixelRatio;
  let hint = '';
  if (game.phase === 'deploy' && game.reinforcements[mySlot()] > 0)
    hint = 'Tap your GREEN spots to place troops';
  else if (game.phase === 'play' && !game.selectedCell && !game.fortifySource)
    hint = 'Tap one of your spots to select it';
  else if (game.phase === 'play' && game.selectedCell && game.selectedCell.troops >= 2)
    hint = 'Tap a RED target to attack, or select another spot';
  else if (game.phase === 'play' && game.selectedCell && game.selectedCell.troops < 2)
    hint = 'Need 2+ troops to attack \u2014 buy or wait';
  else if (game.fortifySource)
    hint = 'Tap a connected green spot to move troops';
  else if (game.phase === 'combat')
    hint = 'Combat in progress...';

  if (!hint) return;
  const barH = 28 * dpr;
  const barY = gridOffsetY + cellSize * 10 + 6;
  ctx.fillStyle = 'rgba(6,6,20,0.85)';
  roundRect(ctx, W * 0.04, barY, W * 0.92, barH, 8); ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  roundRect(ctx, W * 0.04, barY, W * 0.92, barH, 8); ctx.stroke();
  ctx.fillStyle = '#ccc';
  ctx.font = `bold ${Math.max(10 * dpr, 11)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(hint, W / 2, barY + barH * 0.65);
}

// === TUTORIAL OVERLAY ===
const TUTORIAL_STEPS = [
  null, // 0 = off
  { // 1 = deploy
    title: 'DEPLOY TROOPS',
    text: 'Tap your green spots to place crab troops.',
    sub: 'More troops = stronger defense & attack power.',
    highlight: 'own',
  },
  { // 2 = select
    title: 'SELECT A SPOT',
    text: 'Tap one of your spots to select it.',
    sub: 'Red arrows show which enemies you can attack.',
    highlight: 'own',
  },
  { // 3 = attack
    title: 'ATTACK!',
    text: 'Tap a red enemy to attack with RISK dice.',
    sub: 'Higher dice wins. Ties go to defender. Tap QTE for +1!',
    highlight: 'enemy',
  },
  { // 4 = scoring
    title: 'SHELLS & TROOPS',
    text: 'Earn shells every 10s from spots you hold.',
    sub: 'Reef=1.5x, Coral=2x, Crown=3x shells. Buy troops for 10 shells.',
    highlight: null,
  },
  { // 5 = regions
    title: 'REGIONS & BONUSES',
    text: 'Control all spots in a region = bonus troops!',
    sub: 'Crown=+7, Abyss=+5, Trench=+4. New troops every 30s.',
    highlight: null,
  },
  { // 6 = win
    title: 'HOW TO WIN',
    text: 'Capture 60 of 100 spots to dominate!',
    sub: 'Expand fast, fortify borders, crush the competition.',
    highlight: null,
  },
];

function drawTutorial() {
  const step = game.tutorial;
  if (step <= 0 || step >= 7) return;
  const info = TUTORIAL_STEPS[step];
  if (!info) return;

  const dpr = devicePixelRatio;
  const me = mySlot();
  game.tutorialPulse += game.dt * 3;

  // Dim non-highlighted areas
  if (info.highlight) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    // Bright pulsing highlight on target cells
    const pulse = 0.3 + Math.sin(game.tutorialPulse) * 0.2;
    for (const cell of cells) {
      let show = false;
      if (info.highlight === 'own' && cell.owner === me) show = true;
      if (info.highlight === 'enemy' && game.selectedCell) {
        if (cell.owner !== me && isAdjacent(game.selectedCell, cell)) show = true;
      }
      if (!show) continue;

      const x = gridOffsetX + cell.col * cellSize;
      const y = gridOffsetY + cell.row * cellSize;

      // Glow ring
      ctx.strokeStyle = info.highlight === 'enemy' ? '#ff4444' : '#00ff88';
      ctx.lineWidth = 3;
      ctx.globalAlpha = pulse;
      ctx.strokeRect(x - 2, y - 2, cellSize + 4, cellSize + 4);
      ctx.globalAlpha = 1;

      // Bouncing arrow above
      const ax = x + cellSize / 2;
      const ay = y - 8 - Math.sin(game.tutorialPulse * 1.5) * 6;
      ctx.fillStyle = info.highlight === 'enemy' ? '#ff4444' : '#00ff88';
      ctx.beginPath();
      ctx.moveTo(ax, ay + 8);
      ctx.lineTo(ax - 5, ay);
      ctx.lineTo(ax + 5, ay);
      ctx.fill();
    }
  }

  // Tutorial card at bottom
  const cardW = Math.min(W * 0.88, 400 * dpr);
  const cardH = 90 * dpr;
  const cardX = (W - cardW) / 2;
  const cardY = H - cardH - 70 * dpr;

  // Card bg
  const grad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  grad.addColorStop(0, 'rgba(10,20,40,0.95)');
  grad.addColorStop(1, 'rgba(6,10,24,0.95)');
  ctx.fillStyle = grad;
  roundRect(ctx, cardX, cardY, cardW, cardH, 12); ctx.fill();
  ctx.strokeStyle = '#00ff8855';
  ctx.lineWidth = 1.5;
  roundRect(ctx, cardX, cardY, cardW, cardH, 12); ctx.stroke();

  // Step indicator (dots)
  const dotY = cardY + 14 * dpr;
  for (let i = 1; i <= 6; i++) {
    const dx = W / 2 + (i - 3.5) * 14 * dpr;
    ctx.fillStyle = i === step ? '#00ff88' : i < step ? '#006633' : '#333';
    ctx.beginPath();
    ctx.arc(dx, dotY, 4 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title
  ctx.fillStyle = '#00ff88';
  ctx.font = `bold ${Math.max(14 * dpr, 15)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(info.title, W / 2, cardY + 34 * dpr);

  // Main text
  ctx.fillStyle = '#ddd';
  ctx.font = `${Math.max(12 * dpr, 13)}px monospace`;
  ctx.fillText(info.text, W / 2, cardY + 54 * dpr);

  // Sub text
  ctx.fillStyle = '#888';
  ctx.font = `${Math.max(10 * dpr, 11)}px monospace`;
  ctx.fillText(info.sub, W / 2, cardY + 72 * dpr);

  // Skip button
  const skipW = 80 * dpr, skipH = 28 * dpr;
  const skipX = (W - skipW) / 2, skipY = cardY + cardH + 8;
  ctx.fillStyle = '#1a1212';
  roundRect(ctx, skipX, skipY, skipW, skipH, 6); ctx.fill();
  ctx.strokeStyle = '#ff444466'; ctx.lineWidth = 1;
  roundRect(ctx, skipX, skipY, skipW, skipH, 6); ctx.stroke();
  ctx.fillStyle = '#ff4444';
  ctx.font = `bold ${Math.max(10 * dpr, 11)}px monospace`;
  ctx.fillText('SKIP', W / 2, skipY + skipH * 0.65);
  game._skipTutorialRect = { x: skipX, y: skipY, w: skipW, h: skipH };
}

function advanceTutorial() {
  if (game.tutorial <= 0) return;
  game.tutorial++;
  if (game.tutorial >= 7) {
    game.tutorial = 0;
    game.firstGame = false;
  }
}

// === PVP LOBBY ===
const LOBBY_TIERS = [
  { key: 'bronze', name: 'Bronze', entry: '0.005', color: '#cc8844' },
  { key: 'silver', name: 'Silver', entry: '0.02',  color: '#aaaacc' },
  { key: 'gold',   name: 'Gold',   entry: '0.05',  color: '#ffcc00' },
  { key: 'diamond',name: 'Diamond',entry: '0.2',   color: '#44ddff' },
];

// Title screen tier button positions (calculated in drawTitle)
let tierButtonRects = [];

function hitTierButton(px, py) {
  for (const r of tierButtonRects) {
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.tier;
  }
  return null;
}

async function joinLobby(tier) {
  game.lobby = { tier, players: [{ name: net.username || 'You', ready: true }], maxPlayers: 4, timer: 0, gameId: null, waitTime: 0 };
  game.phase = 'lobby';

  // Try to join on server
  if (!net.token) {
    const authed = await net.auth();
    if (!authed) { game.phase = 'title'; game.lobby = null; return; }
  }

  const joined = await net.joinGame(tier);
  if (joined) {
    game.lobby.gameId = net.gameId;
    net.connectWS();
    // Poll for more players
    pollLobby();
  } else {
    spawnFloat(W / 2, H / 2, 'Failed to join', '#ff4444');
    game.phase = 'title';
    game.lobby = null;
  }
}

function pollLobby() {
  if (!game.lobby || game.phase !== 'lobby') return;

  // Check if game started (WS will send state)
  if (net.online) {
    // Server already filled with AI after join — start the game
    game.phase = 'deploy';
    game.lobby = null;
    return;
  }

  // Retry connection
  setTimeout(() => {
    if (game.phase === 'lobby' && !net.online) {
      net.connectWS();
      setTimeout(pollLobby, 1000);
    } else if (game.phase === 'lobby' && net.online) {
      game.phase = 'deploy';
      game.lobby = null;
    }
  }, 500);
}

function drawLobby() {
  drawOceanBG();
  const dpr = devicePixelRatio;
  const lb = game.lobby;
  if (!lb) return;

  const tierInfo = LOBBY_TIERS.find(t => t.key === lb.tier) || LOBBY_TIERS[0];
  lb.waitTime += game.dt;

  // Header
  ctx.fillStyle = 'rgba(6,6,20,0.92)';
  ctx.fillRect(0, 0, W, 60 * dpr);

  ctx.fillStyle = tierInfo.color;
  ctx.font = `bold ${Math.max(20 * dpr, 22)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(tierInfo.name + ' Arena', W / 2, 28 * dpr);
  ctx.fillStyle = '#888';
  ctx.font = `${Math.max(12 * dpr, 13)}px monospace`;
  ctx.fillText('Entry: ' + tierInfo.entry + ' ETH', W / 2, 48 * dpr);

  // Waiting animation
  const dots = '.'.repeat(Math.floor(lb.waitTime * 2) % 4);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(18 * dpr, 20)}px monospace`;
  ctx.fillText('Waiting for players' + dots, W / 2, H * 0.3);

  // Player slots
  const slotW = Math.min(160 * dpr, W * 0.4);
  const slotH = 70 * dpr;
  const gap = 16 * dpr;
  const totalW = slotW * 2 + gap;
  const startX = (W - totalW) / 2;
  const startY = H * 0.38;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = startX + col * (slotW + gap);
    const sy = startY + row * (slotH + gap);

    const filled = i === 0; // slot 0 is always the player
    const isPlayer = i === 0;

    // Slot bg
    ctx.fillStyle = filled ? '#0c1a1c' : '#0c0c18';
    roundRect(ctx, sx, sy, slotW, slotH, 10); ctx.fill();
    ctx.strokeStyle = filled ? PLAYER_COLORS[i] : '#222';
    ctx.lineWidth = filled ? 2 : 1;
    roundRect(ctx, sx, sy, slotW, slotH, 10); ctx.stroke();

    if (filled) {
      // Crab
      drawCrab(sx + slotW * 0.25, sy + slotH * 0.5, slotH * 0.22, PLAYER_COLORS[i], 0, game.time + i);
      // Name
      ctx.fillStyle = PLAYER_COLORS[i];
      ctx.font = `bold ${Math.max(11 * dpr, 12)}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(isPlayer ? (net.username || 'You') : 'Player ' + (i + 1), sx + slotW * 0.45, sy + slotH * 0.45);
      ctx.fillStyle = '#00ff88';
      ctx.font = `${Math.max(9 * dpr, 10)}px monospace`;
      ctx.fillText('READY', sx + slotW * 0.45, sy + slotH * 0.7);
    } else {
      // Empty slot — pulsing "?"
      const pulse = 0.3 + Math.sin(game.time * 2 + i) * 0.2;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#444';
      ctx.font = `bold ${Math.max(24 * dpr, 26)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('?', sx + slotW / 2, sy + slotH * 0.6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#333';
      ctx.font = `${Math.max(9 * dpr, 10)}px monospace`;
      ctx.fillText('waiting...', sx + slotW / 2, sy + slotH * 0.85);
    }
  }

  // Timer
  ctx.fillStyle = '#555';
  ctx.font = `${Math.max(11 * dpr, 12)}px monospace`;
  ctx.textAlign = 'center';
  const waitSec = Math.floor(lb.waitTime);
  ctx.fillText('Waited ' + waitSec + 's \u2022 AI fills in ' + Math.max(0, 30 - waitSec) + 's', W / 2, H * 0.72);

  // Auto-fill with AI after 30 seconds
  if (lb.waitTime >= 30 && game.phase === 'lobby') {
    game.phase = 'deploy';
    game.lobby = null;
    if (!net.online) initOfflineGame();
  }

  // Cancel button
  const cbW = 140 * dpr, cbH = 40 * dpr;
  const cbX = (W - cbW) / 2, cbY = H * 0.8;
  ctx.fillStyle = '#1a1212';
  roundRect(ctx, cbX, cbY, cbW, cbH, 8); ctx.fill();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1;
  roundRect(ctx, cbX, cbY, cbW, cbH, 8); ctx.stroke();
  ctx.fillStyle = '#ff4444';
  ctx.font = `bold ${Math.max(12 * dpr, 13)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('CANCEL', W / 2, cbY + cbH * 0.62);

  // Prize pool
  const pot = (parseFloat(tierInfo.entry) * 4 * 0.9).toFixed(3);
  ctx.fillStyle = '#ffcc00';
  ctx.font = `bold ${Math.max(14 * dpr, 15)}px monospace`;
  ctx.fillText('Prize Pool: ' + pot + ' ETH', W / 2, H * 0.9);
  ctx.fillStyle = '#666';
  ctx.font = `${Math.max(9 * dpr, 10)}px monospace`;
  ctx.fillText('Winner takes 90% \u2022 10% platform fee', W / 2, H * 0.94);
}

function drawEffects() {
  // Ripples
  for (const r of game.ripples) {
    ctx.globalAlpha = r.life * 0.4;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.stroke();
  }
  // Floating texts
  const dpr = devicePixelRatio;
  for (const f of game.floatingTexts) {
    ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.fillStyle = '#000';
    ctx.font = `bold ${Math.max(13 * dpr, 14)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  // Particles
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 1.5);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  // March animations (little crabs walking)
  for (const m of game.marchAnims) {
    ctx.globalAlpha = Math.min(1, m.life * 3);
    drawCrab(m.x, m.y, m.size, m.color, 0, game.time + m.maxLife * 10);
  }
  ctx.globalAlpha = 1;
}

function drawQTE() {
  const q = game.qte;
  if (!q || !q.active) return;
  const dpr = devicePixelRatio;
  const py = H * q.promptY;

  // QTE bar background
  const barW = W * 0.5;
  const barH = 36 * dpr;
  const barX = (W - barW) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  roundRect(ctx, barX - 10, py - barH, barW + 20, barH * 2, 10);
  ctx.fill();

  // Progress bar
  const progress = q.timer / q.window;
  ctx.fillStyle = '#222';
  roundRect(ctx, barX, py - 6, barW, 12 * dpr, 4);
  ctx.fill();

  // Sweet spot zone (green in middle) with label
  const sweetStart = barW * 0.3;
  const sweetEnd = barW * 0.7;
  ctx.fillStyle = '#1a3a1a';
  ctx.fillRect(barX + sweetStart, py - 6, sweetEnd - sweetStart, 12 * dpr);
  // "sweet spot" markers
  ctx.fillStyle = '#00ff8844';
  ctx.fillRect(barX + sweetStart, py - 6, 2, 12 * dpr);
  ctx.fillRect(barX + sweetEnd - 2, py - 6, 2, 12 * dpr);

  // Moving indicator
  const indX = barX + barW * progress;
  const inZone = progress > 0.3 && progress < 0.7;
  ctx.fillStyle = inZone ? '#00ff88' : '#ff4444';
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(indX, py, 9 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Label — big and clear
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(16 * dpr, 17)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('TAP SCREEN NOW!', W / 2, py - barH * 0.6);

  // Explanation
  ctx.fillStyle = '#ffcc00';
  ctx.font = `bold ${Math.max(11 * dpr, 12)}px monospace`;
  ctx.fillText('+1 to your highest dice roll', W / 2, py - barH * 0.25);

  // Zone labels under bar
  ctx.fillStyle = '#444';
  ctx.font = `${Math.max(8 * dpr, 9)}px monospace`;
  ctx.fillText('miss', barX + sweetStart * 0.5, py + 16 * dpr);
  ctx.fillStyle = '#00ff88';
  ctx.fillText('\u2605 sweet spot \u2605', barX + barW * 0.5, py + 16 * dpr);
  ctx.fillStyle = '#444';
  ctx.fillText('miss', barX + sweetEnd + (barW - sweetEnd) * 0.5, py + 16 * dpr);
}

// === MOCK TICKER DATA (scrolls during gameplay) ===
const TICKER_NAMES = ['CrabKing','TidalWave','ReefLord','ShellHunter','DeepDiver','CoralQueen',
  'ClawMaster','AbyssCrab','TrenchRat','GoldPincer','NeonClaw','PixelCrab','SeaWolf','OceanAce',
  'SandCrab42','WaveBoss','KelpDuke','CrownCrab','ShoreKing','BasedCrab'];
const TICKER_ITEMS = [];
(function buildTicker() {
  const acts = ['won','won','dominated','claimed','eliminated','won'];
  const icons = { won:'\u2694', dominated:'\u2655', eliminated:'\u2620', claimed:'\u2690' };
  const cols = { won:'#00ff88', dominated:'#ffcc00', eliminated:'#ff4444', claimed:'#4488ff' };
  for (let i = 0; i < 20; i++) {
    const n = TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)];
    const a = acts[Math.floor(Math.random() * acts.length)];
    const eth = (a === 'dominated' ? 0.1 + Math.random() * 0.9 : 0.005 + Math.random() * 0.3).toFixed(3);
    const m = Math.floor(Math.random() * 60);
    TICKER_ITEMS.push({ name: n, action: a, eth, mins: m, icon: icons[a], color: cols[a] });
  }
})();

function drawTicker() {
  const dpr = devicePixelRatio;
  const tickH = 18 * dpr;
  // Dark bar at very top
  ctx.fillStyle = 'rgba(4,4,16,0.95)';
  ctx.fillRect(0, 0, W, tickH);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, tickH - 1, W, 1);

  // Scrolling items
  const sf = Math.max(8 * dpr, 9);
  ctx.font = `${sf}px monospace`;
  const itemW = 180 * dpr; // approx width per item
  const totalW = TICKER_ITEMS.length * itemW;
  const scrollX = -(game.time * 15 * dpr) % totalW;

  ctx.save();
  ctx.rect(0, 0, W, tickH);
  ctx.clip();

  for (let pass = 0; pass < 2; pass++) {
    const baseX = scrollX + pass * totalW;
    for (let i = 0; i < TICKER_ITEMS.length; i++) {
      const t = TICKER_ITEMS[i];
      const x = baseX + i * itemW;
      if (x > W + 10 || x + itemW < -10) continue;

      // Dot
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(x + 4, tickH / 2, 2.5 * dpr, 0, Math.PI * 2); ctx.fill();

      // Name
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'left';
      ctx.fillText(t.name, x + 12, tickH * 0.68);

      // Action
      ctx.fillStyle = t.color;
      const nameW = ctx.measureText(t.name).width;
      ctx.fillText(t.icon + ' ' + t.action, x + 16 + nameW, tickH * 0.68);

      // ETH
      ctx.fillStyle = '#ffcc00';
      ctx.font = `bold ${sf}px monospace`;
      const actW = ctx.measureText(t.icon + ' ' + t.action).width;
      ctx.fillText('+' + t.eth, x + 22 + nameW + actW, tickH * 0.68);
      ctx.font = `${sf}px monospace`;
    }
  }
  ctx.restore();
}

function drawTitle() {
  drawOceanBG();

  const dpr = devicePixelRatio;
  const ts = Math.max(34 * dpr, 38);

  // Grid preview faintly
  ctx.globalAlpha = 0.08;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const x = gridOffsetX + c * cellSize, y = gridOffsetY + r * cellSize;
    ctx.fillStyle = TERRAIN[cells[r * 10 + c].terrain].color;
    ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
  }
  ctx.globalAlpha = 1;

  // Title with glow
  ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffdd00';
  ctx.font = `bold ${ts}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('CLAWRISK', W / 2, H * 0.22);
  ctx.shadowColor = '#00ff88';
  ctx.fillStyle = '#00ff88';
  ctx.fillText('ARENA', W / 2, H * 0.22 + ts * 1.1);
  ctx.shadowBlur = 0;

  // Character roster — show all 6 species in a row
  const rosterY = H * 0.38;
  const creatureSize = Math.min(W, H) * 0.045;
  const rosterGap = Math.min(W / 7, 60 * dpr);
  const rosterStartX = W / 2 - (SPECIES_LIST.length - 1) * rosterGap / 2;
  game._speciesRects = [];

  for (let i = 0; i < SPECIES_LIST.length; i++) {
    const sp = SPECIES_LIST[i];
    const info = SPECIES[sp];
    const sx = rosterStartX + i * rosterGap;
    const selected = game.selectedSpecies === sp;

    // Selection ring
    if (selected) {
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = info.color;
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(sx, rosterY, creatureSize * 1.5, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw creature
    drawCreature(sx, rosterY, selected ? creatureSize * 1.2 : creatureSize * 0.9, info.color, 0, game.time + i, sp);

    // Name below
    ctx.fillStyle = selected ? info.color : '#555';
    ctx.font = `${selected ? 'bold ' : ''}${Math.max(7 * dpr, 8)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(info.name.split(' ').pop(), sx, rosterY + creatureSize * 2);

    game._speciesRects.push({ x: sx - creatureSize * 1.2, y: rosterY - creatureSize * 1.5, w: creatureSize * 2.4, h: creatureSize * 3.5, species: sp });
  }

  // Selected species info
  const selInfo = SPECIES[game.selectedSpecies];
  ctx.fillStyle = selInfo.color;
  ctx.font = `bold ${Math.max(13 * dpr, 14)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(selInfo.name, W / 2, H * 0.52);
  ctx.fillStyle = '#888';
  ctx.font = `${Math.max(10 * dpr, 11)}px monospace`;
  ctx.fillText(selInfo.passive, W / 2, H * 0.56);

  // How to play (condensed)
  ctx.fillStyle = '#555';
  ctx.font = `${Math.max(9 * dpr, 10)}px monospace`;
  ctx.fillText('Conquer 60 spots across 8 oceans \u2022 RISK dice combat \u2022 Win ETH', W / 2, H * 0.61);

  // Stats bar
  ctx.fillStyle = 'rgba(6,6,20,0.8)';
  const stY = H * 0.66;
  roundRect(ctx, W * 0.08, stY, W * 0.84, 32 * dpr, 8); ctx.fill();
  ctx.font = `${Math.max(10 * dpr, 11)}px monospace`;
  const stats = [
    ['142 online','#00ff88'], ['12.4 ETH won today','#ffcc00'], ['0.72 ETH top win','#44ddff']
  ];
  stats.forEach(([t,c],i) => {
    ctx.fillStyle = c;
    ctx.fillText(t, W * 0.08 + (i + 0.5) * (W * 0.84 / 3), stY + 20 * dpr);
  });

  // Top-right buttons
  const iconSize = 36 * dpr;
  const iconY = 12 * dpr;
  const loggedIn = !!net.token;
  game._walletBtnRect = null;
  game._signupBtnRect = null;

  if (loggedIn) {
    // Wallet button (logged in)
    const wbX = W - iconSize * 2 - 8 * dpr - 12 * dpr;
    ctx.fillStyle = '#0c0c1a';
    roundRect(ctx, wbX, iconY, iconSize, iconSize, 8); ctx.fill();
    ctx.strokeStyle = '#ffcc0066'; ctx.lineWidth = 1;
    roundRect(ctx, wbX, iconY, iconSize, iconSize, 8); ctx.stroke();
    ctx.fillStyle = '#ffcc00';
    ctx.font = `${Math.max(16 * dpr, 17)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('\u{1F4B0}', wbX + iconSize / 2, iconY + iconSize * 0.65);
    game._walletBtnRect = { x: wbX, y: iconY, w: iconSize, h: iconSize };

    // Show username + balance below
    ctx.fillStyle = '#00ff88';
    ctx.font = `bold ${Math.max(9 * dpr, 10)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(net.username || '', W - 12 * dpr, iconY + iconSize + 14 * dpr);
    if (game._ethBalance) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(game._ethBalance + ' ETH', W - 12 * dpr, iconY + iconSize + 26 * dpr);
    }
  } else {
    // Sign Up button (not logged in)
    const sbW = 90 * dpr, sbH = 30 * dpr;
    const sbX = W - sbW - iconSize - 20 * dpr, sbY = iconY + 3 * dpr;
    ctx.fillStyle = '#0d2d14';
    roundRect(ctx, sbX, sbY, sbW, sbH, 8); ctx.fill();
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5;
    roundRect(ctx, sbX, sbY, sbW, sbH, 8); ctx.stroke();
    ctx.fillStyle = '#00ff88';
    ctx.font = `bold ${Math.max(11 * dpr, 12)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SIGN UP', sbX + sbW / 2, sbY + sbH * 0.65);
    game._signupBtnRect = { x: sbX, y: sbY, w: sbW, h: sbH };
  }

  // Help/FAQ button (always shown)
  const hbX = W - iconSize - 12 * dpr;
  ctx.fillStyle = '#0c0c1a';
  roundRect(ctx, hbX, iconY, iconSize, iconSize, 8); ctx.fill();
  ctx.strokeStyle = '#4488ff66'; ctx.lineWidth = 1;
  roundRect(ctx, hbX, iconY, iconSize, iconSize, 8); ctx.stroke();
  ctx.fillStyle = '#4488ff';
  ctx.font = `bold ${Math.max(18 * dpr, 19)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('?', hbX + iconSize / 2, iconY + iconSize * 0.65);
  game._helpBtnRect = { x: hbX, y: iconY, w: iconSize, h: iconSize };

  // Free Play button (big, centered)
  const playBtnW = Math.min(240 * dpr, W * 0.6);
  const playBtnH = 44 * dpr;
  const playBtnX = (W - playBtnW) / 2;
  const playBtnY = H * 0.74;
  const pulse = 0.7 + Math.sin(game.time * 3) * 0.3;

  ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10 * pulse;
  const playGr = ctx.createLinearGradient(playBtnX, playBtnY, playBtnX, playBtnY + playBtnH);
  playGr.addColorStop(0, '#0d3d1d'); playGr.addColorStop(1, '#0a2a12');
  ctx.fillStyle = playGr;
  roundRect(ctx, playBtnX, playBtnY, playBtnW, playBtnH, 10); ctx.fill();
  ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
  roundRect(ctx, playBtnX, playBtnY, playBtnW, playBtnH, 10); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00ff88';
  ctx.font = `bold ${Math.max(16 * dpr, 17)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('\u2694 FREE PLAY', W / 2, playBtnY + playBtnH * 0.62);

  // Staked arena tier buttons — only show when logged in
  tierButtonRects = [];
  const tierY = H * 0.84;

  if (loggedIn) {
    const tbW = Math.min(W * 0.88, 420 * dpr);
    const tierBtnW = (tbW - 12 * dpr * 3) / 4;
    const tierBtnH = 32 * dpr;
    const tierStartX = (W - tbW) / 2;

    ctx.fillStyle = '#555';
    ctx.font = `${Math.max(9 * dpr, 10)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('STAKED ARENAS', W / 2, tierY - 6);

    LOBBY_TIERS.forEach((tier, i) => {
      const tx = tierStartX + i * (tierBtnW + 12 * dpr);
      ctx.fillStyle = '#0c0c1a';
      roundRect(ctx, tx, tierY, tierBtnW, tierBtnH, 6); ctx.fill();
      ctx.strokeStyle = tier.color + '88'; ctx.lineWidth = 1;
      roundRect(ctx, tx, tierY, tierBtnW, tierBtnH, 6); ctx.stroke();
      ctx.fillStyle = tier.color;
      ctx.font = `bold ${Math.max(9 * dpr, 10)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(tier.name, tx + tierBtnW / 2, tierY + tierBtnH * 0.4);
      ctx.fillStyle = '#888';
      ctx.font = `${Math.max(8 * dpr, 9)}px monospace`;
      ctx.fillText(tier.entry + ' ETH', tx + tierBtnW / 2, tierY + tierBtnH * 0.78);
      tierButtonRects.push({ x: tx, y: tierY, w: tierBtnW, h: tierBtnH, tier: tier.key });
    });
    ctx.fillStyle = '#333';
    ctx.font = `${Math.max(8 * dpr, 9)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('Join a staked arena to win ETH', W / 2, tierY + 32 * dpr + 14 * dpr);
  } else {
    // Not logged in — show sign up prompt
    ctx.fillStyle = '#555';
    ctx.font = `${Math.max(10 * dpr, 11)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('Sign up to play staked arenas & deposit ETH', W / 2, tierY + 10 * dpr);
  }

  // Ticker on top
  drawTicker();
}

function drawGameOver() {
  ctx.globalAlpha = 0.8; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  const dpr = devicePixelRatio;
  const big = Math.max(32 * dpr, 34);
  const med = Math.max(18 * dpr, 20);
  const sf = Math.max(12 * dpr, 13);
  const me = mySlot();
  ctx.textAlign = 'center';

  // Celebration particles (spawn continuously on victory)
  if (game.winner === me && Math.random() < 0.3) {
    const px = W * 0.2 + Math.random() * W * 0.6;
    spawnParticles(px, H * 0.15, ['#ffdd00','#00ff88','#ff4444','#4488ff','#ffaa00'][Math.floor(Math.random()*5)], 3);
  }

  if (game.winner === me) {
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffdd00'; ctx.font = `bold ${big}px monospace`;
    ctx.fillText('VICTORY!', W / 2, H * 0.22);
    ctx.shadowBlur = 0;

    // Three celebrating crabs
    const crabSize = Math.min(W, H) * 0.06;
    drawCrab(W / 2 - crabSize * 3, H * 0.34, crabSize, '#00ff88', 0, game.time);
    drawCrab(W / 2, H * 0.32, crabSize * 1.3, '#00ff88', 0, game.time + 1);
    drawCrab(W / 2 + crabSize * 3, H * 0.34, crabSize, '#00ff88', 0, game.time + 2);

    ctx.fillStyle = '#00ff88'; ctx.font = `bold ${med}px monospace`;
    ctx.fillText('You conquered the grid!', W / 2, H * 0.44);
  } else {
    ctx.fillStyle = '#ff4444'; ctx.font = `bold ${big}px monospace`;
    ctx.fillText('DEFEAT', W / 2, H * 0.22);
    drawCrab(W / 2, H * 0.34, Math.min(W, H) * 0.07, PLAYER_COLORS[game.winner], 0, game.time);
    ctx.fillStyle = PLAYER_COLORS[game.winner]; ctx.font = `${med}px monospace`;
    ctx.fillText(PLAYER_NAMES[game.winner] + ' dominates!', W / 2, H * 0.44);
  }

  // Stats panel
  const panelW = Math.min(W * 0.8, 350 * dpr);
  const panelH = 100 * dpr;
  const panelX = (W - panelW) / 2;
  const panelY = H * 0.5;
  ctx.fillStyle = 'rgba(12,12,32,0.8)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 10); ctx.fill();
  ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1;
  roundRect(ctx, panelX, panelY, panelW, panelH, 10); ctx.stroke();

  // Stats grid
  const stats = [
    ['Spots', '' + countTerritories(me), PLAYER_COLORS[me]],
    ['Shells', '' + game.shells[me], '#ffcc00'],
    ['Regions', '' + getRegionControl(me).length, '#ffdd00'],
  ];
  stats.forEach(([label, val, col], i) => {
    const sx = panelX + (i + 0.5) * (panelW / 3);
    ctx.fillStyle = col; ctx.font = `bold ${Math.max(18 * dpr, 20)}px monospace`;
    ctx.fillText(val, sx, panelY + panelH * 0.4);
    ctx.fillStyle = '#666'; ctx.font = `${sf}px monospace`;
    ctx.fillText(label, sx, panelY + panelH * 0.7);
  });

  // Scoreboard
  const sbY = panelY + panelH + 15 * dpr;
  ctx.font = `${sf}px monospace`;
  for (let p = 0; p < 4; p++) {
    const tc = countTerritories(p);
    ctx.fillStyle = tc > 0 ? PLAYER_COLORS[p] : '#444';
    ctx.textAlign = 'left';
    ctx.fillText((p === game.winner ? '\u2655 ' : '  ') + PLAYER_NAMES[p], panelX + 10, sbY + p * 16 * dpr);
    ctx.textAlign = 'right';
    ctx.fillText(tc + ' spots', panelX + panelW - 10, sbY + p * 16 * dpr);
  }

  const pulse = 0.3 + Math.sin(game.time * 3) * 0.6;
  ctx.globalAlpha = Math.max(0, pulse);
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(16 * dpr, 17)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('TAP TO CONTINUE', W / 2, H * 0.88);
  ctx.globalAlpha = 1;
}

// === UPDATE ===
function update(dt) {
  if (game.phase === 'title' || game.phase === 'gameover' || game.phase === 'lobby') { updateEffects(dt); return; }
  const me = mySlot();
  for (let p = 0; p < 4; p++) if (game.attackCooldown[p] > 0) game.attackCooldown[p] -= dt;

  // Combat animation timer (visual only)
  if (game.combatState) {
    game.combatState.timer += dt;
    if (game.combatState.timer >= game.combatState.duration && !game.combatState.resolved) finishCombat();
    if (game.combatState && game.combatState.timer >= game.combatState.duration + 1.2) {
      game.combatState = null; if (game.phase === 'combat') game.phase = 'play';
    }
  }
  updateEffects(dt);

  // When online, server handles AI, reinforcements, economy, win checks
  if (net.online) {
    if (game.phase === 'deploy' && game.reinforcements[me] <= 0) game.phase = 'play';
    return;
  }

  // Offline: local AI + economy
  if (game.phase !== 'combat') {
    game.reinforceTimer -= dt;
    if (game.reinforceTimer <= 0) { game.reinforceTimer = 30; doReinforcements(); }
    game.shellTimer -= dt;
    if (game.shellTimer <= 0) { game.shellTimer = 10; doShellIncome(); }
  }
  if (game.phase === 'play') for (let p = 1; p < 4; p++) aiTurn(p);
  if (game.phase === 'deploy' && game.reinforcements[me] <= 0) game.phase = 'play';
  for (let p = 0; p < 4; p++) {
    if (countTerritories(p) >= 60) { game.winner = p; game.phase = 'gameover'; audio.play('victory'); return; }
  }
  if (countTerritories(me) === 0 && game.phase !== 'gameover') {
    let best = 0, bp = 1;
    for (let p = 1; p < 4; p++) { const t = countTerritories(p); if (t > best) { best = t; bp = p; } }
    game.winner = bp; game.phase = 'gameover';
  }
}

// === MAIN LOOP ===
function gameLoop(ts) {
  const dt = game.lastTime ? Math.min((ts - game.lastTime) / 1000, 0.05) : 0.016;
  game.lastTime = ts; game.dt = dt; game.time += dt;

  try { update(dt); } catch(e) { console.error('UPDATE ERROR:', e); }

  try {
  if (game.phase === 'title') {
    drawTitle();
    drawEffects();
  } else if (game.phase === 'lobby') {
    drawLobby();
    drawEffects();
  } else {
    // Apply screen shake
    ctx.save();
    if (game.shakeX || game.shakeY) ctx.translate(game.shakeX, game.shakeY);

    drawOceanBG();
    drawGrid();
    drawDeployHighlights();
    drawTroops();
    drawSelection();
    drawEffects();
    if (game.combatState) {
      drawCombat();
      drawQTE();
    }

    ctx.restore(); // end shake transform

    drawHUD();
    drawTicker();
    drawHintBar();
    drawTutorial();
    drawTroopPicker();
    if (game.phase === 'gameover') drawGameOver();
  }
  } catch(e) { console.error('RENDER ERROR:', e); }
  requestAnimationFrame(gameLoop);
}

game.phase = 'title';

// === GAME STATE SAVE/RESTORE ===
const SAVE_VERSION = 2; // bump to invalidate old saves

function saveGameState() {
  if (game.phase !== 'play' && game.phase !== 'deploy' && game.phase !== 'combat') return;
  try {
    const state = {
      v: SAVE_VERSION,
      cells: cells.map(c => ({ owner: c.owner, troops: c.troops })),
      shells: game.shells,
      reinforcements: game.reinforcements,
      reinforceTimer: game.reinforceTimer,
      shellTimer: game.shellTimer,
      phase: game.phase === 'combat' ? 'play' : game.phase,
      playerSpecies: game.playerSpecies,
      selectedSpecies: game.selectedSpecies,
      savedAt: Date.now(),
    };
    localStorage.setItem('clawrisk_gamestate', JSON.stringify(state));
    // Also try TG CloudStorage
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.CloudStorage) tg.CloudStorage.setItem('gamestate', JSON.stringify(state));
    } catch(e) {}
  } catch(e) {}
}

function loadGameState() {
  try {
    const raw = localStorage.getItem('clawrisk_gamestate');
    if (!raw) return false;
    const state = JSON.parse(raw);
    // Version check — reject old saves
    if (state.v !== SAVE_VERSION) {
      clearSavedGameState();
      return false;
    }
    // Expiry check
    if (Date.now() - state.savedAt > 24 * 60 * 60 * 1000) {
      clearSavedGameState();
      return false;
    }
    // Validate: must have 100 cells
    if (!state.cells || state.cells.length !== 100) {
      clearSavedGameState();
      return false;
    }
    // Restore cells
    for (let i = 0; i < 100; i++) {
      cells[i].owner = state.cells[i].owner;
      cells[i].troops = state.cells[i].troops;
    }
    game.shells = state.shells;
    game.reinforcements = state.reinforcements;
    game.reinforceTimer = state.reinforceTimer;
    game.shellTimer = state.shellTimer;
    game.phase = state.phase;
    game.playerSpecies = state.playerSpecies || game.playerSpecies;
    game.selectedSpecies = state.selectedSpecies || game.selectedSpecies;
    PLAYER_COLORS[0] = SPECIES[game.selectedSpecies]?.color || '#00ff88';
    game.firstGame = false;
    game.tutorial = 0;
    return true;
  } catch(e) { clearSavedGameState(); return false; }
}

function resetGame() {
  clearSavedGameState();
  game.phase = 'title';
  game.selectedCell = null;
  game.combatState = null;
  game.fortifySource = null;
  game.troopPicker = null;
  game.winner = -1;
  for (const c of cells) { c.owner = -1; c.troops = 0; }
}

function clearSavedGameState() {
  try { localStorage.removeItem('clawrisk_gamestate'); } catch(e) {}
  try {
    const tg = window.Telegram?.WebApp;
    if (tg?.CloudStorage) tg.CloudStorage.removeItem('gamestate');
  } catch(e) {}
}

// Auto-save every 5 seconds during gameplay
setInterval(saveGameState, 5000);

// Clear save on game over
const _origUpdate = update;
// (we'll handle clearing in gameover tap instead)

// Try to restore saved session + game state on load
(async function restoreSession() {
  // Auth first — do TG auth immediately if available
  const tg = window.Telegram?.WebApp;
  if (tg && tg.initData && !net.token) {
    try {
      const res = await fetch(net.apiBase + '/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });
      if (res.ok) {
        const d = await res.json();
        net.token = d.token;
        net.playerId = d.player.id;
        net.username = d.player.username;
        net.saveToken(d.token);
        fetchEthBalance();
      }
    } catch(e) {}
  }

  // Then try saved token
  if (!net.token) {
    const saved = await net.loadSavedToken();
    if (saved) {
      try {
        const res = await fetch(net.apiBase + '/api/auth/me', { headers: { Authorization: 'Bearer ' + saved } });
        if (res.ok) {
          const d = await res.json();
          net.token = saved;
          net.playerId = d.id;
          net.username = d.username;
          fetchEthBalance();
        }
      } catch(e) {}
    }
  }

  // Restore game state if we have one
  if (loadGameState()) {
    // Game restored — skip title screen
    spawnFloat(W / 2, H * 0.5, 'Game restored!', '#00ff88');
  }
})();

requestAnimationFrame(gameLoop);
