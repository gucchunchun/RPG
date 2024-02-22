// CANVAS
const CANVAS = document.getElementById('canvas');
const C = CANVAS.getContext('2d');
CANVAS.width = 1024;
CANVAS.height = 576;
C.fillStyle = '#FFFFFF';
C.fillRect(0, 0, canvas.width, canvas.height);

// COLLISION MAP (COLLISION: ./data/collision.js)
const COLLISION_MAP = [];
for(let i = 0; i < COLLISION.length; i += 70) {
  COLLISION_MAP.push(COLLISION.slice(i, i + 70));
}

// SETTING
const OFFSET = {
  x: -2330,
  y: -1300,
}
const KEYS =  {
  ArrowUp: {
    pressed: false,
    name: 'ArrowUp',
  },
  ArrowDown: {
    pressed: false,
    name: 'ArrowDown',
  },
  ArrowLeft: {
    pressed: false,
    name: 'ArrowLeft',
  },
  ArrowRight: {
    pressed: false,
    name: 'ArrowRight',
  },
  lastKey: undefined
}

class Boundary {
  static width = 48 // 12*12(TILE) * 400 (ZOOM)
  static height = 48 // 12*12(TILE) * 400 (ZOOM)
  constructor({position}) {
    this.position = position;
    this.width = 48;
    this.height = 48;
  }
  draw() {
    // C.fillStyle =  '#FF0000';
    C.fillStyle =  'transparent';
    C.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
  update({position}) {
    this.position.x = position.x;
    this.position.y = position.y;
  }
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

// Images
const IMAGE_MAP = new Image();
IMAGE_MAP.src = './img/map/map.png';
const IMAGE_FOREGROUND_OBJECT = new Image();
IMAGE_FOREGROUND_OBJECT.src = './img/map/ForegroundObjects.png';
const CHARACTER_GIRL = new Image();
CHARACTER_GIRL.src = './img/character/girlFront.png';

class Sprite {
  constructor({position, velocity, image, frames = {max: 1}}) {
    this.position = position;
    this.image = image;
    this.frames = frames;
    this.image.onload = () => {
      this.width = this.image.width / this.frames.max;
      this.height = this.image.height;
    }
  }
  draw() {
    C.drawImage(
      this.image,
      0,
      0,
      this.width,
      this.height,
      this.position.x,
      this.position.y,
      this.width,
      this.height,
    );
  }
  update({position}) {
    this.position.x = position.x;
    this.position.y = position.y;
  }
}

const BACK_GROUND = new Sprite({
  position: {
    x: OFFSET.x,
    y: OFFSET.y,
  },
  image: IMAGE_MAP
});
const FOREGROUND_OBJECT = new Sprite({
  position: {
    x: OFFSET.x,
    y: OFFSET.y,
  },
  image: IMAGE_FOREGROUND_OBJECT
});
const CHARACTER = new Sprite({
  position: {
    x: CANVAS.width/2 - CHARACTER_GIRL.width/4/2,
    y: CANVAS.height/2 - CHARACTER_GIRL.height/2,
  },
  image: CHARACTER_GIRL,
  frames: {max: 4}
});
const LIST_MOVABLE = [BACK_GROUND,FOREGROUND_OBJECT, ...BOUNDARIES]

function rectCollision({rect1, rect2}) {
  return (
    rect2.position.x <= rect1.position.x + rect1.width && 
    rect1.position.x <= rect2.position.x + rect2.width &&
    rect2.position.y <= rect1.position.y + rect1.height &&
    rect1.position.y <= rect2.position.y + rect2.height
  )
}

function animate() {
  window.requestAnimationFrame(animate);
  BACK_GROUND.draw();
  CHARACTER.draw();
  FOREGROUND_OBJECT.draw();
  BOUNDARIES.forEach(boundary=>{
    boundary.draw();
  })

  if(KEYS.ArrowDown.pressed && KEYS.lastKey == KEYS.ArrowDown.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:CHARACTER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x, y:BOUNDARY.position.y - 3}}})) {
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
    }
  }else if(KEYS.ArrowUp.pressed && KEYS.lastKey == KEYS.ArrowUp.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:CHARACTER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x, y:BOUNDARY.position.y + 3}}})) {
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
    }
  }else if(KEYS.ArrowLeft.pressed && KEYS.lastKey == KEYS.ArrowLeft.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:CHARACTER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x + 3, y:BOUNDARY.position.y}}})) {
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
    }
  }else if(KEYS.ArrowRight.pressed && KEYS.lastKey == KEYS.ArrowRight.name) {
    let canMove = true;
    for(let i = 0; i < BOUNDARIES.length; i++) {
      const BOUNDARY = BOUNDARIES[i];
      if(rectCollision({rect1:CHARACTER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x - 3, y:BOUNDARY.position.y}}})) {
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
    }
  };
}

animate();

window.addEventListener('keydown', (e)=> {
  const TARGET_KEY = e.key;
  KEYS[TARGET_KEY].pressed = true;
  KEYS.lastKey = TARGET_KEY;
});
window.addEventListener('keyup', (e)=> {
  const TARGET_KEY = e.key;
  KEYS[TARGET_KEY].pressed = false;
});