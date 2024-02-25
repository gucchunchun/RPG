const CANVAS_OVERLAP = document.getElementById('canvasOverlap');
const PLAYER_CTR = document.getElementById('playerCtr');
const PLAYER_INFO_CTR = document.getElementById('playerInfo');
const LIST_PLAYER_MOVE_BTN = document.getElementsByClassName('button__move');
const BATTLE_CTR = document.getElementById('battleCtr');
const BATTLE_DIALOG = document.getElementById('battleDialog');

// Canvas
const CANVAS = document.getElementById('canvas');
const C = CANVAS.getContext('2d');
CANVAS.width = 1024;
CANVAS.height = 576;
C.fillStyle = '#FFFFFF';
C.fillRect(0, 0, CANVAS.width, CANVAS.height);

// Setting
const FPS = 60; // 1000/60 millisecond per frame
const FRAME_INTERVAL = 1000 / 60;
const OFFSET = {
  x: -1880,
  y: -350,
}
const KEYS =  {
  up: {
    pressed: false,
    name: 'ArrowUp',
  },
  down: {
    pressed: false,
    name: 'ArrowDown',
  },
  left: {
    pressed: false,
    name: 'ArrowLeft',
  },
  right: {
    pressed: false,
    name: 'ArrowRight',
  },
  lastKey: undefined
}

// Utility Functions
function rectCollision({rect1, rect2}) {
  return (
    rect2.position.x <= rect1.position.x + rect1.width && 
    rect1.position.x <= rect2.position.x + rect2.width &&
    rect2.position.y <= rect1.position.y + rect1.height &&
    rect1.position.y <= rect2.position.y + rect2.height
  )
}
function randomWithRatio(ratio = 0.5) {
  const RETURN = Math.random() <= ratio;
  return RETURN;
}

// Collision Map (COLLISION: ./data/boundaries.js)
const COLLISION_MAP = [];
for(let i = 0; i < COLLISION.length; i += 70) {
  COLLISION_MAP.push(COLLISION.slice(i, i + 70));
}
const BOUNDARIES = [];
COLLISION_MAP.forEach((row, rowIndex)=>{
  row.forEach((symbol, colIndex)=>{
    if(symbol === 1025) {
      BOUNDARIES.push(new Boundary({
        position: {
          x: colIndex * Boundary.width + OFFSET.x,
          y: rowIndex * Boundary.height + OFFSET.y
        }
      }))
    }
  })
})

// Path Map (PATH: ./data/path.js)
const PATH_MAP = [];
for(let i = 0; i < PATH.length; i += 70) {
  PATH_MAP.push(PATH.slice(i, i + 70));
}
const PATH_ZONE = [];
PATH_MAP.forEach((row, rowIndex)=>{
  row.forEach((symbol, colIndex)=>{
    if(symbol === 1025) {
      PATH_ZONE.push(new Boundary({
        position: {
          x: colIndex * Boundary.width + OFFSET.x,
          y: rowIndex * Boundary.height + OFFSET.y
        }
      }))
    }
  })
})

// BG & FG Image Load
const IMAGE_MAP = new Image();
IMAGE_MAP.src = './img/map/map.png';
const IMAGE_FOREGROUND_OBJECT = new Image();
IMAGE_FOREGROUND_OBJECT.src = './img/map/map--foreground.png';
const IMAGE_BG_BATTLE = new Image();
IMAGE_BG_BATTLE.src = './img/battle/bg_battle.png';

// Sprites for animate()
const BG = new Sprite({
  canvas: CANVAS,
  canvasContent: C,
  position: {
    x: OFFSET.x,
    y: OFFSET.y,
  },
  image: IMAGE_MAP,
  frames: {max: 2},
  moving: true
});
const FOREGROUND_OBJECT = new Sprite({
  canvas: CANVAS,
  canvasContent: C,
  position: {
    x: OFFSET.x,
    y: OFFSET.y,
  },
  image: IMAGE_FOREGROUND_OBJECT
});
const PLAYER = new Character({
  canvas: CANVAS,
  canvasContent: C,
  image: SPRITE_MAIN_MALE.front,
  canvas: CANVAS,
  sprite: SPRITE_MAIN_MALE
});
const LIST_MOVABLE = [BG, FOREGROUND_OBJECT, ...BOUNDARIES]

let previous = new Date().getTime();
function animate() {
  window.requestAnimationFrame(animate);
  const CURRENT = new Date().getTime();
  const ELAPSED = CURRENT - previous;
  
  if(!(FRAME_INTERVAL <= ELAPSED)){
    return;
  }
  previous = CURRENT - (ELAPSED % FRAME_INTERVAL);
  
  // Update
  if(KEYS.down.pressed && KEYS.lastKey == KEYS.down.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x, y:BOUNDARY.position.y - 3}}})) {
        canMove = false;
        break;
      }else {
        continue;
      }
    }
    if(canMove) {
      LIST_MOVABLE.forEach((movable)=>{
        movable.update({position: {x:movable.position.x, y:movable.position.y - 3}});
      });
      const PLAYER_STATE = PLAYER.state;
      if(PLAYER_STATE.front === false) {
        PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
        PLAYER_STATE.front = true;
      }
      PLAYER.update({moving: true, state: PLAYER_STATE});
    }
  }else if(KEYS.up.pressed && KEYS.lastKey == KEYS.up.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x, y:BOUNDARY.position.y + 3}}})) {
        canMove = false;
        break;
      }else {
        continue;
      }
    }
    if(canMove) {
      LIST_MOVABLE.forEach((movable)=>{
        movable.update({position: {x:movable.position.x, y:movable.position.y + 3}});
      });
      const PLAYER_STATE = PLAYER.state;
      if(PLAYER_STATE.back === false) {
        PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
        PLAYER_STATE.back = true;
      }
      PLAYER.update({moving: true, state: PLAYER_STATE});
    }
  }else if(KEYS.left.pressed && KEYS.lastKey == KEYS.left.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x + 3, y:BOUNDARY.position.y}}})) {
        canMove = false;
        break;
      }else {
        continue;
      }
    }
    if(canMove) {
      LIST_MOVABLE.forEach((movable)=>{
        movable.update({position: {x:movable.position.x + 3, y:movable.position.y}});
      });
      const PLAYER_STATE = PLAYER.state;
      if(PLAYER_STATE.left === false) {
        PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
        PLAYER_STATE.left = true;
      }
      PLAYER.update({moving: true, state: PLAYER_STATE});
    }
  }else if(KEYS.right.pressed && KEYS.lastKey == KEYS.right.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x - 3, y:BOUNDARY.position.y}}})) {
        canMove = false;
        break;
      }else {
        continue;
      }
    }
    if(canMove) {
      LIST_MOVABLE.forEach((movable)=>{
        movable.update({position: {x:movable.position.x - 3, y:movable.position.y}});
      });
      const PLAYER_STATE = PLAYER.state;
      if(PLAYER_STATE.right === false) {
        PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
        PLAYER_STATE.right = true;
      }
      PLAYER.update({moving: true, state: PLAYER_STATE});
    }
  };

  // Render
  BG.draw();
  PLAYER.draw();
  FOREGROUND_OBJECT.draw();
  BOUNDARIES.forEach(boundary=>{
    boundary.draw();
  })
  PATH_ZONE.forEach(boundary=>{
    boundary.draw();
  })
}
animate();

// Sprites for animateBattle()
const BG_BATTLE = new Sprite({
  canvas: CANVAS,
  canvasContent: C,
  position: {
    x: 0,
    y: 0,
  },
  image: IMAGE_BG_BATTLE,
  moving: false
});
function animateBattle() {
  window.requestAnimationFrame(animateBattle);
  BG_BATTLE.draw();
}
// animateBattle();

// Player Move
window.addEventListener('keydown', (e)=> {
  const TARGET_KEY = e.key;
  for(let key of Object.keys(KEYS)) {
    if(key != 'lastKey'&&KEYS[key].name === TARGET_KEY) {
      KEYS[key].pressed = true;
      KEYS.lastKey = TARGET_KEY;
    }
  }
});
window.addEventListener('keyup', (e)=> {
  const TARGET_KEY = e.key;
  PLAYER.update({moving: false});
  for(let key of Object.keys(KEYS)) {
    if(key != 'lastKey'&&KEYS[key].name === TARGET_KEY) {
      KEYS[key].pressed = false;
    }
  }
});
for(let button of LIST_PLAYER_MOVE_BTN) {
  button.addEventListener('mousedown', (e)=> {
    const START_EVENT = new KeyboardEvent('keydown', {
      key: KEYS[e.target.id].name,
    });
    window.dispatchEvent(START_EVENT);
  });
  button.addEventListener('mouseup', (e)=> {
    const END_EVENT = new KeyboardEvent('keyup', {
      key: KEYS[e.target.id].name,
    });
    window.dispatchEvent(END_EVENT);
  });
}

// Save data
let isSaved = false;
// localStorage.setItem("name", "Chris");
// let myName = localStorage.getItem("name");
// myName;
// localStorage.removeItem("name");
// myName = localStorage.getItem("name");
// myName;

// Prevent Reload
window.addEventListener('beforeunload', (e)=> {
  e.preventDefault();
});