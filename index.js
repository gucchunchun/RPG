const CANVAS = document.getElementById('canvas');
const C = CANVAS.getContext('2d');

CANVAS.width = 1024;
CANVAS.height = 576;

C.fillStyle = '#FFFFFF';
C.fillRect(0, 0, canvas.width, canvas.height);

const IMAGE_MAP = new Image();
IMAGE_MAP.src = './img/map/map.png';

const CHARACTER_GIRL = new Image();
CHARACTER_GIRL.src = './img/character/girlFront.png';

class Sprite {
  constructor({position, velocity, image}) {
    this.position = position;
    this.image = image;
  }
  draw() {
    C.drawImage(this.image, this.position.x, this.position.y);
  }
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

const BACK_GROUND = new Sprite({
  position: {
    x: -2330,
    y: -1300,
  },
  image: IMAGE_MAP
});

function animate() {
  window.requestAnimationFrame(animate);
  BACK_GROUND.draw();
  C.drawImage(
    CHARACTER_GIRL,
    0,
    0,
    CHARACTER_GIRL.width/4,
    CHARACTER_GIRL.height,
    CANVAS.width/2 - CHARACTER_GIRL.width/8,
    CANVAS.height/2 - CHARACTER_GIRL.height/2,
    CHARACTER_GIRL.width/4,
    CHARACTER_GIRL.height,
  );

  if(KEYS.ArrowDown.pressed && KEYS.lastKey == KEYS.ArrowDown.name) BACK_GROUND.position.y = BACK_GROUND.position.y - 3;
  else if(KEYS.ArrowUp.pressed && KEYS.lastKey == KEYS.ArrowUp.name) BACK_GROUND.position.y = BACK_GROUND.position.y + 3;
  else if(KEYS.ArrowLeft.pressed && KEYS.lastKey == KEYS.ArrowLeft.name) BACK_GROUND.position.x = BACK_GROUND.position.x + 3;
  else if(KEYS.ArrowRight.pressed && KEYS.lastKey == KEYS.ArrowRight.name) BACK_GROUND.position.x = BACK_GROUND.position.x - 3;
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