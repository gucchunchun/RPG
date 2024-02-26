import { fetchJsonData } from './fetchData.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom } from './utils.js';
import { Boundary, Sprite, Character, Player } from './classes.js';
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from './data/boundaries.js';

// グローバル設定
const FPS = 60; // 1フレームあたり 1000/60 millisecond
const FRAME_INTERVAL = 1000 / FPS;
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
  pressed: false,
  lastKey: undefined
}
const PATH_TO_CHAR_IMG = './img/character/';

// HTML要素
const LIST_PLAYER_MOVE_BTN = document.getElementsByClassName('button__move');

fetchJsonData('./data/gameData.json')
.then(json=>{
  const DATA = json.data;
  // Canvas
  const CANVAS = document.getElementById('canvas');
  const C = CANVAS.getContext('2d');
  CANVAS.width = 1024;
  CANVAS.height = 576;
  C.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // Maps (COLLISION: ./data/boundaries.js)
  const COLLISION_MAP = makeMap(COLLISION, CANVAS, C, OFFSET);
  const PATH_MAP = makeMap(PATH, CANVAS, C, OFFSET);
  const FOREST_MAP = makeMap(FOREST, CANVAS, C, OFFSET);
  const ITEM_MAP = makeMap(ITEM, CANVAS, C, OFFSET);
  const WATER_MAP = makeMap(WATER, CANVAS, C, OFFSET);
  const NAP_MAP = makeMap(NAP, CANVAS, C, OFFSET);


  // 固定背景:
  const IMG_MAP = new Image();
  const BG = new Sprite({
    canvas: CANVAS,
    canvasContent: C,
    position: {
      x: OFFSET.x,
      y: OFFSET.y,
    },
    image: IMG_MAP,
    frames: {max: 2},
    moving: true
  });
  IMG_MAP.src = './img/map/map.png';
  const IMG_FG_OBJ = new Image();
  const FOREGROUND_OBJECT = new Sprite({
    canvas: CANVAS,
    canvasContent: C,
    position: {
      x: OFFSET.x,
      y: OFFSET.y,
    },
    image: IMG_FG_OBJ
  });
  IMG_FG_OBJ.src = './img/map/map--foreground.png';
  const IMG_BG_BATTLE = new Image();
  const BG_BATTLE = new Sprite({
    canvas: CANVAS,
    canvasContent: C,
    position: {
      x: 0,
      y: 0,
    },
    image: IMG_BG_BATTLE,
    moving: false
  });
  IMG_BG_BATTLE.src = './img/battle/bg_battle.png';
  
  
  const PLAYER_DATA = DATA.player.male;
  const PLAYER_SPRITES = {};
  for(let key of Object.keys(PLAYER_DATA.image)) {
    const IMAGE = new Image();
    IMAGE.src = PATH_TO_CHAR_IMG + PLAYER_DATA.image[key];
    PLAYER_SPRITES[key] = IMAGE;
  }
  // console.log(PLAYER.data)
  const PLAYER = new Player({
    canvas: CANVAS,
    canvasContent: C,
    image: PLAYER_SPRITES.down,
    canvas: CANVAS,
    sprite: PLAYER_SPRITES,
    data: PLAYER_DATA
  });
  const LIST_MOVABLE = [BG, FOREGROUND_OBJECT, ...COLLISION_MAP, ...PATH_MAP, ...ITEM_MAP, ...WATER_MAP, ...NAP_MAP, ...FOREST_MAP]

  // Game Loop
  let previous = new Date().getTime();
  let walk = 0;
  function animate() {
    const ANIMATION_ID = window.requestAnimationFrame(animate);
    const CURRENT = new Date().getTime();
    const ELAPSED = CURRENT - previous;

    if(!(FRAME_INTERVAL <= ELAPSED)){
      return;
    }
    previous = CURRENT - (ELAPSED % FRAME_INTERVAL);

    // Update
    //  プレイヤー歩行
    //  1歩 ＝ 24px, 足が一歩動くアニメーション(Player.frame.valの２つ分)
    const MOVING = PLAYER.moving;
    let moved = PLAYER.moved;
    let stepped = false;
    //    一歩のアニメーションが終了していない場合
    if(MOVING && 0 < moved && moved < 24) {
      const STATE = Object.keys(PLAYER.state).find(key=>PLAYER.state[key]);
      let xChange = 0;
      let yChange = 0;
      switch (STATE) {
        case 'down':
          yChange = -PLAYER.velocity;
          break;
        case 'up':
          yChange = PLAYER.velocity;
          break;
        case 'left':
          xChange = PLAYER.velocity;
          break;
        case 'right':
          xChange = -PLAYER.velocity;
          break;
      }
      let colliding = false;
      for(let i = 0; i < COLLISION_MAP.length; i++) {
        const BOUNDARY = COLLISION_MAP[i];
        const X = Math.round((BOUNDARY.position.x + xChange) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y + yChange) * 10)/10;
        if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x: X, y: Y}}})) {
          colliding = true;
          break;
        }else {
          continue;
        }
      }
      if(!colliding) {
        LIST_MOVABLE.forEach((movable)=>{
          const X = Math.round((movable.position.x + xChange) * 10)/10;
          const Y = Math.round((movable.position.y + yChange) * 10)/10;
          movable.update({position: {x: X, y: Y}});
        });
        moved = Math.round((moved + PLAYER.velocity)*10)/10;
        if(24 <= moved) {
          stepped = true;
          PLAYER.update({step: PLAYER.step++});
        }else {
          PLAYER.moved = moved;
        }
      }else {
        PLAYER.update({moving: false})
      }
    }
    //    歩行アニメーションの開始
    else if(KEYS.pressed) {
      let colliding = false;
      if(KEYS.down.pressed && KEYS.lastKey == KEYS.down.name) {
        for(let i = 0; i < COLLISION_MAP.length; i++) {
          const BOUNDARY = COLLISION_MAP[i];
          const X = BOUNDARY.position.x;
          const Y = Math.round((BOUNDARY.position.y - PLAYER.velocity) * 10)/10;
          if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x: X, y: Y}}})) {
            colliding = true;
            break;
          }else {
            continue;
          }
        }
        if(!colliding) {
          LIST_MOVABLE.forEach((movable)=>{
            const X = movable.position.x;
            const Y = Math.round((movable.position.y - PLAYER.velocity) * 10)/10;
            movable.update({position: {x: X, y: Y}});
          });
          const PLAYER_STATE = PLAYER.state;
          if(PLAYER_STATE.down === false) {
            PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
            PLAYER_STATE.down = true;
          }
          PLAYER.update({moving: true, state: PLAYER_STATE});
          PLAYER.moved = Math.round((PLAYER.moved + PLAYER.velocity)*10)/10;
        }
      }else if(KEYS.up.pressed && KEYS.lastKey == KEYS.up.name) {
      for(let i = 0; i < COLLISION_MAP.length; i++) {
        const BOUNDARY = COLLISION_MAP[i];
        const X = BOUNDARY.position.x;
        const Y = Math.round((BOUNDARY.position.y + PLAYER.velocity) * 10)/10;
        if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x: X, y: Y}}})) {
          colliding = true;
          break;
        }else {
          continue;
        }
      }
      if(!colliding) {
        LIST_MOVABLE.forEach((movable)=>{
          const X = movable.position.x;
          const Y = Math.round((movable.position.y + PLAYER.velocity) * 10)/10;
          movable.update({position: {x: X, y: Y}});
        });
        const PLAYER_STATE = PLAYER.state;
        if(PLAYER_STATE.up === false) {
          PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
          PLAYER_STATE.up = true;
        }
        PLAYER.update({moving: true, state: PLAYER_STATE});
        PLAYER.moved = Math.round((PLAYER.moved + PLAYER.velocity)*10)/10;
      }
      }else if(KEYS.left.pressed && KEYS.lastKey == KEYS.left.name) {
        for(let i = 0; i < COLLISION_MAP.length; i++) {
          const BOUNDARY = COLLISION_MAP[i];
          const X = Math.round((BOUNDARY.position.x + PLAYER.velocity) * 10)/10;
          const Y = BOUNDARY.position.y;
          if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x: X, y: Y}}})) {
            colliding = true;
            break;
          }else {
            continue;
          }
        }
        if(!colliding) {
          LIST_MOVABLE.forEach((movable)=>{
            const X = Math.round((movable.position.x + PLAYER.velocity) * 10)/10;
            const Y = movable.position.y;
            movable.update({position: {x: X, y: Y}});
          });
          const PLAYER_STATE = PLAYER.state;
          if(PLAYER_STATE.left === false) {
            PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
            PLAYER_STATE.left = true;
          }
          PLAYER.update({moving: true, state: PLAYER_STATE});
          PLAYER.moved = Math.round((PLAYER.moved + PLAYER.velocity)*10)/10;
        }
      }else if(KEYS.right.pressed && KEYS.lastKey == KEYS.right.name) {
        for(let i = 0; i < COLLISION_MAP.length; i++) {
          const BOUNDARY = COLLISION_MAP[i];
          const X = Math.round((BOUNDARY.position.x - PLAYER.velocity) * 10)/10;
          const Y = BOUNDARY.position.y;
          if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x: X, y: Y}}})) {
            colliding = true;
            break;
          }else {
            continue;
          }
        }
        if(!colliding) {
          LIST_MOVABLE.forEach((movable)=>{
            const X = Math.round((movable.position.x - PLAYER.velocity) * 10)/10;
            const Y = movable.position.y;
            movable.update({position: {x: X, y: Y}});
          });
          const PLAYER_STATE = PLAYER.state;
          if(PLAYER_STATE.right === false) {
            PLAYER_STATE[Object.keys(PLAYER_STATE).find(state=>PLAYER_STATE[state])] = false;
            PLAYER_STATE.right = true;
          }
          PLAYER.update({moving: true, state: PLAYER_STATE});
          PLAYER.moved = Math.round((PLAYER.moved + PLAYER.velocity)*10)/10;
        }
      };
    }
    //    キーボードが押されていない場合＝プレイヤー停止
    else {
      PLAYER.update({moving: false});
    }

    let onPath = false;
    let onForest = false;
    //  プレイヤーが道を歩いている場合：1歩 ＝ 4px * 6frames 早歩き
    for(let i = 0; i < PATH_MAP.length; i++) {
      const BOUNDARY = PATH_MAP[i];
      if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x, y:BOUNDARY.position.y}}})) {
        onPath = true;
        PLAYER.movementDelay = 3;
        PLAYER.velocity = 4;
        break;
      }else {
        continue;
      }
    }
    //  プレイヤーが森を歩いている場合：1歩 ＝ 1px * 12frames　ゆっくり
    for(let i = 0; i < FOREST_MAP.length; i++) {
      const BOUNDARY = FOREST_MAP[i];
      if(rectCollision({rect1:PLAYER, rect2:{...BOUNDARY, position: {x:BOUNDARY.position.x, y:BOUNDARY.position.y}}})) {
        onForest = true;
        PLAYER.movementDelay = 12;
        PLAYER.velocity = 1;
        break;
      }else {
        continue;
      }
    }
    //  プレイヤーが草原を歩いている場合：1歩 ＝ 2.4px * 5frames　デフォルト
    if(!onPath && !onForest) {
      PLAYER.movementDelay = 5;
      PLAYER.velocity = 2.4;
    }


    if(stepped) {
        console.log("walk")
        let encountering = false;
        // プレイヤーが道を歩いている場合：
        if(!onPath) {
          let ratio = PLAYER.data.rateEncounter;
          if(onForest) {
            // Double ratio of encountering enemy on the forest
            ratio * 2;
          }
          encountering = trueWithRatio(ratio);
        }
        if(encountering) {
          console.log("battle")
          PLAYER.update({moving: false});
          // 通常アニメーション停止
          window.cancelAnimationFrame(ANIMATION_ID);
          // 戦闘アニメーションへの変遷、開始
          handleBattleStart();
        }
    }


    // Render
    BG.draw();
    PLAYER.draw();
    FOREGROUND_OBJECT.draw();
    COLLISION_MAP.forEach(boundary=>{
      boundary.draw();
    })
    PATH_MAP.forEach(boundary=>{
      boundary.draw();
    })
    FOREST_MAP.forEach(boundary=>{
      boundary.draw();
    })
    ITEM_MAP.forEach(boundary=>{
      boundary.draw();
    })
    WATER_MAP.forEach(boundary=>{
      boundary.draw();
    })
    NAP_MAP.forEach(boundary=>{
      boundary.draw();
    })
  }
  animate();

  // 戦闘アニメーション用Sprites
  

  // 戦闘アニメーション
  function animateBattle() {
    window.requestAnimationFrame(animateBattle);
    BG_BATTLE.draw();
  }
  // 戦闘アニメーションへの開始
  function handleBattleStart() {
    gsap.to('#playerCtr', {
      left: "100%",
      opacity: 0, 
    });
    gsap.fromTo('#canvasOverlap', 
      {scale:0, opacity: 0.5}, 
      {
        scale:8, 
        opacity: 1, 
        duration: 2, 
        ease: "expoScale(0, 8, power1.inOut)",
        onComplete() {
          gsap.to('#canvasOverlap', {
            opacity: 0,
            duration: 1, 
          })
          gsap.to('#battleCtr', {
            opacity: 1,
            bottom: '1rem',
            duration: 1, 
          })
          // 戦闘シーンアニメーション開始
          animateBattle();
        }
    });
    const LIST_ENEMY = [];
    for(let i = 1; i < PLAYER.data.lv; i++) {
      for(let enemy of DATA.enemy[i]) {
        LIST_ENEMY.push(enemy);
      }
    }
  }
  // 戦闘アニメーションへの終了
  function handleBattleEnd() {

  }

  // Player Move
  window.addEventListener('keydown', (e)=> {
    const TARGET_KEY = e.key;
    for(let key of Object.keys(KEYS)) {
      if(key != 'lastKey'&& KEYS[key].name === TARGET_KEY) {
        KEYS[key].pressed = true;
        KEYS.lastKey = TARGET_KEY;
        KEYS.pressed = true;
      }
    }
  });
  window.addEventListener('keyup', (e)=> {
    const TARGET_KEY = e.key;
    // PLAYER.update({moving: false});
    for(let key of Object.keys(KEYS)) {
      if(key != 'lastKey' && KEYS[key].name === TARGET_KEY) {
        KEYS[key].pressed = false;
        KEYS.pressed = false;
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
  // window.addEventListener('beforeunload', (e)=> {
  //   e.preventDefault();
  // });
})
.catch(error => {
  throw new Error(error);
});
