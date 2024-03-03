import { fetchJsonData } from './fetchData.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';
import { Boundary, Sprite, Character, Player, CharacterBattle } from './classes.js';
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from './data/boundaries.js';
import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE } from "./types.js";

// グローバル設定
const FPS = 30; // 1フレームあたり 1000/30 millisecond
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
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 576;
const BATTLE_CTR_HEIGHT = Math.round(CANVAS_HEIGHT * 0.3);
const SPACE = 8;

// 通常時HTML要素
const LIST_PLAYER_MOVE_BTN = document.getElementsByClassName('player-ctrl');
const LV = document.getElementById('lv');
const STEP = document.getElementById('step');
const BEAT = document.getElementById('beat');
const AVERAGE_ENCOUNTER = document.getElementById('averageEncounter');
const LOG_CTR = document.getElementById('logCtr');
const FULL_MSG = document.getElementById('fullMsg');

// 通常時固定ファンクション
function updateEnemyLog(playerData, enemyData) {
  BEAT.innerHTML = playerData.beat;
  const STEP_NUM = playerData.step;
  const ENEMY_NUM = playerData.enemy.length;
  AVERAGE_ENCOUNTER.innerHTML = ENEMY_NUM? Math.round(STEP_NUM / ENEMY_NUM * 10) / 10
                                            : '???';
  if(!enemyData) return;
  const P = document.createElement('p');
  const SPAN = document.createElement('span');
  P.className = 'playerInfo--log';
  P.innerHTML = `${enemyData.name}`;
  // SPAN.innerHTML = `ランク${enemyData.rank}`;
  // P.appendChild(SPAN);
  LOG_CTR.appendChild(P);
  scrollToBottom(LOG_CTR);
}
function updateLv(playerData) {
  LV.innerHTML = playerData.lv;
}
function updateStep(playerData) {
  STEP.innerHTML = playerData.step;
}
function showMsg(msg) {
  FULL_MSG.innerHTML = msg;
  gsap.timeline()
  .to('#fullMsgCtr', {
    opacity: 1
    }
  )
  .to('#fullMsgCtr', {
    opacity: 0,
    },
    '+=1'
  )
}

// 戦闘時HTML要素
const BATTLE_ACTION_FIGHT = document.getElementById('fight');
const BATTLE_ACTION_RUN = document.getElementById('run');
const BATTLE_FIGHT_CTR = document.getElementById('battleFightCtr');
const BATTLE_DIALOG_CTR = document.getElementById('battleDialogCtr');
const COCKTAIL_NAME = document.getElementById('cocktailName');
const BATTLE_ITEM_CTR = document.getElementById('BattleItemCtr');
const SET_BATTLE_ITEM_BTN = document.getElementById('setBattleItemBtn');

fetchJsonData('./data/gameData.json')
.then(json=>{
  const DATA = json.data;
  const PLAYERS_DATA = DATA.player;
  const ENEMIES_DATA = DATA.enemy;
  const ITEMS_DATA = DATA.item;
  let lastItem;

  // Canvas
  const CANVAS = document.getElementById('canvas');
  const C = CANVAS.getContext('2d');
  CANVAS.width = CANVAS_WIDTH;
  CANVAS.height = CANVAS_HEIGHT;
  C.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // 衝突検出用マップ
  const COLLISION_MAP = makeMap({array: COLLISION, canvas: CANVAS, canvasContent: C, offset: OFFSET});
  const PATH_MAP = makeMap({array: PATH, canvas: CANVAS, canvasContent: C, offset: OFFSET});
  const FOREST_MAP = makeMap({array: FOREST, canvas: CANVAS, canvasContent: C, offset: OFFSET});
  const ITEM_MAP = makeMap({array: ITEM, canvas: CANVAS, canvasContent: C, offset: OFFSET});
  const WATER_MAP = makeMap({array: WATER, canvas: CANVAS, canvasContent: C, offset: OFFSET});
  const NAP_MAP = makeMap({array: NAP, canvas: CANVAS, canvasContent: C, offset: OFFSET});

  // 固定背景
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
    moving: true,
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
  
  // プレイヤー決定＊
  const PLAYER_DATA = PLAYERS_DATA.male;
  const PLAYER_SPRITES = {};
  for(let key of Object.keys(PLAYER_DATA.image)) {
    const IMAGE = new Image();
    IMAGE.src = PATH_TO_CHAR_IMG + PLAYER_DATA.image[key];
    PLAYER_SPRITES[key] = IMAGE;
  }
  const PLAYER = new Player({
    canvas: CANVAS,
    canvasContent: C,
    position: {x:0,y:0},
    image: PLAYER_SPRITES.down,
    sprite: PLAYER_SPRITES,
    data: PLAYER_DATA,
    pathToImg: PATH_TO_CHAR_IMG,
  });

  //show player info
  updateStep(PLAYER_DATA);
  updateLv(PLAYER_DATA);
  updateEnemyLog(PLAYER_DATA);

  // プレイヤーの動きに合わせて移動させるもののリスト
  const LIST_MOVABLE = [BG, FOREGROUND_OBJECT, ...COLLISION_MAP, ...PATH_MAP, ...ITEM_MAP, ...WATER_MAP, ...NAP_MAP, ...FOREST_MAP]

  // 基本ゲームループ
  let previous = new Date().getTime();
  function animate() {
    const ANIMATION_ID = window.requestAnimationFrame(animate);
    const CURRENT = new Date().getTime();
    const ELAPSED = CURRENT - previous;
    // ゲームループのスピード調整
    if(!(FRAME_INTERVAL <= ELAPSED)){
      return;
    }
    previous = CURRENT - (ELAPSED % FRAME_INTERVAL);

    // アップデート
    //  プレイヤー歩行：1歩 ＝ 24px/一歩分足が動くアニメーション
    let stepped = false;
    //  一歩のアニメーションが終了していない場合
    if(PLAYER.moving && 0 < PLAYER.moved && PLAYER.moved < PLAYER.stepMove) {
      const NEXT_MOVE = PLAYER.getNextStepDirection();
      let colliding = false;
      for(let i = 0; i < COLLISION_MAP.length; i++) {
        const BOUNDARY = COLLISION_MAP[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_MOVE.y) * 10)/10;
        if(PLAYER.isColliding({...BOUNDARY, position: {x: X, y: Y}})) {
          colliding = true;
        }
      }
      if(!colliding) {
        LIST_MOVABLE.forEach((movable)=>{
          movable.updatePositionBy({x: -NEXT_MOVE.x, y: -NEXT_MOVE.y});
        });

        PLAYER.move();
        if(PLAYER.stepMove <= PLAYER.moved) {
          stepped = true;
          PLAYER.step();
        }
      }else {
        PLAYER.stop();
      }
    }
    //  歩行アニメーションの開始
    else if(KEYS.pressed) {
      if(KEYS.down.pressed && KEYS.lastKey == KEYS.down.name) {
        PLAYER.changeStateTo(CHARACTER_STATE.down);
      }else if(KEYS.up.pressed && KEYS.lastKey == KEYS.up.name) {
        PLAYER.changeStateTo(CHARACTER_STATE.up);
      }else if(KEYS.left.pressed && KEYS.lastKey == KEYS.left.name) {
        PLAYER.changeStateTo(CHARACTER_STATE.left);
      }else if(KEYS.right.pressed && KEYS.lastKey == KEYS.right.name) {
        PLAYER.changeStateTo(CHARACTER_STATE.right);
      };
      let colliding = false;
      const NEXT_MOVE = PLAYER.getNextStepDirection();
      for(let i = 0; i < COLLISION_MAP.length; i++) {
        const BOUNDARY = COLLISION_MAP[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_MOVE.y) * 10)/10;
        if(PLAYER.isColliding({...BOUNDARY, position: {x: X, y: Y}})) {
          colliding = true;
          break;
        }else {
          continue;
        }
      }
      if(!colliding) {
        LIST_MOVABLE.forEach((movable)=>{
          movable.updatePositionBy({x: -NEXT_MOVE.x, y: -NEXT_MOVE.y});
        });
        PLAYER.move();
      }else {
        PLAYER.stop();
      }
    }
    //  キーボード/ボタンが押されていない場合＝プレイヤー停止
    else {
      PLAYER.stop();
    }

    let onPath = false;
    let onForest = false;
    //  プレイヤーが道を歩いている場合：1歩 ＝ 4px * 6frames 早歩き
    for(let i = 0; i < PATH_MAP.length; i++) {
      const BOUNDARY = PATH_MAP[i];
      if(PLAYER.isColliding(BOUNDARY)) {
        onPath = true;
        PLAYER.changeVelocity(4);
        break;
      }
    }
    //  プレイヤーが森を歩いている場合：1歩 ＝ 1px * 12frames　ゆっくり
    for(let i = 0; i < FOREST_MAP.length; i++) {
      const BOUNDARY = FOREST_MAP[i];
      if(PLAYER.isColliding(BOUNDARY)) {
        onForest = true;
        PLAYER.changeVelocity(1);
        break;
      }
    }
    //  プレイヤーが草原を歩いている場合：1歩 ＝ 2.4px * 5frames　デフォルト
    if(!onPath && !onForest) {
      PLAYER.changeVelocity(2.4);
    }

    // アイテム
    // if(ITEM.time < ITEM.prevTime - CURRENT) {

    // }
    for(let i = 0; i < ITEM_MAP.length; i++) {
      const BOUNDARY = ITEM_MAP[i];
      if(lastItem - 4 <= i && i < lastItem + 4) {
        continue;
      }
      if(PLAYER.isColliding(BOUNDARY)) {
        const LIST_ITEM = [];
        for(let key in ITEMS_DATA) {
          if(ITEMS_DATA[key].lv !== 0 &&  ITEMS_DATA[key].lv <= PLAYER.data.lv) {
            LIST_ITEM.push(key);
          }
        }
        const ITEM = choiceRandom(LIST_ITEM);
        if(PLAYER.addItem(ITEM)) {
          showMsg(`${ITEM}をゲットした`);
          lastItem = i;
        };
        break;
      }
    }

    // 　一歩歩くごとに敵とのエンカウントを確率に合わせて決める
    if(stepped) {
      updateStep(PLAYER.data);
      if(PLAYER.levelUp()) {
        console.log('levelUp');
        PLAYER.stop();
        updateLv(PLAYER.data);
      }else if(!onPath){
        const RATIO = onForest? PLAYER.data.rateEncounter*2: PLAYER.data.rateEncounter;
        if(trueWithRatio(RATIO)) {
          console.log('battle');
          PLAYER.stop();
          for(let key in KEYS) {
            if(key === 'pressed') {
              KEYS[key] = false;
            }else if(key !== 'lastKey') {
              KEYS[key].pressed = false;
            }
          }
          // 通常アニメーション停止
          window.cancelAnimationFrame(ANIMATION_ID);
          // 戦闘アニメーションへの変遷、開始
          handleBattleStart();
          }
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
  // 通常シーン要素イベント
  window.addEventListener('keydown', (e)=> {
      const TARGET_KEY = e.key;
      for(let key in KEYS) {
        if(key !== 'lastKey'&& key !== 'pressed' && KEYS[key].name === TARGET_KEY) {
          KEYS[key].pressed = true;
          KEYS.lastKey = TARGET_KEY;
          KEYS.pressed = true;
        }
      }
  });
  window.addEventListener('keyup', (e)=> {
      const TARGET_KEY = e.key;
      for(let key in KEYS) {
        if(key !== 'lastKey' && key !== 'pressed' && KEYS[key].name === TARGET_KEY) {
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

  animate();
  

  // 戦闘時固定物
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

  const PLAYER_BATTLE = new CharacterBattle({
    canvas: CANVAS,
    canvasContent: C,
    image: PLAYER_SPRITES.up,
    data: PLAYER_DATA,
    pathToImg: PATH_TO_CHAR_IMG,
    bottom: BATTLE_CTR_HEIGHT + SPACE
  });
  const TMP_ENEMY = new Image();
  const ENEMY_BATTLE = new CharacterBattle({
    canvas: CANVAS,
    canvasContent: C,
    image: TMP_ENEMY,
    isPlayer: false,
    pathToImg: PATH_TO_CHAR_IMG,
    bottom: BATTLE_CTR_HEIGHT + SPACE
  });
  TMP_ENEMY.src = `${PATH_TO_CHAR_IMG}skeletonFront.png`;


  // 戦闘時ファンクション
  function resetBattleCtr() {
    COCKTAIL_NAME.innerHTML = '';
    BATTLE_ITEM_CTR.innerHTML = '';
    BATTLE_DIALOG_CTR.innerHTML = '';
    BATTLE_ACTION_FIGHT.disabled = true;
    BATTLE_ACTION_RUN.disabled = true;
    PLAYER_BATTLE.succeedRun = false;
    SET_BATTLE_ITEM_BTN.removeEventListener('click', handleSetItemBtnClick);
  }
  function closeBattleItemCtr() {
    BATTLE_FIGHT_CTR.classList.remove('active');
    removeChecked(BATTLE_FIGHT_CTR.getElementsByTagName('input'));
    // removeChecked(INPUT_LIST);
    BATTLE_ACTION_FIGHT.checked = false;
    window.removeEventListener('click', handleWindowClick);
  }
  function handleWindowClick(e) {
    // fightコンテナ以外のクリックで、コンテナを閉じる
    if(e.target === BATTLE_FIGHT_CTR || e.target === BATTLE_ACTION_FIGHT || BATTLE_FIGHT_CTR.contains(e.target)) return;
    closeBattleItemCtr();
  }
  function handleActionRunClick() {
    BATTLE_ACTION_RUN.removeEventListener('click', handleActionRunClick);
    addBattleDialog(BATTLE_DIALOG_CTR, '・・・');
    setTimeout(
      ()=>{
        BATTLE_ACTION_RUN.checked = false;
        if(PLAYER_BATTLE.run()) {
          addBattleDialog(BATTLE_DIALOG_CTR, '逃げることができた');
        }else {
          BATTLE_ACTION_RUN.disabled = true;
          addBattleDialog(BATTLE_DIALOG_CTR, '逃げきれなかった');
        }
      }
      ,1000)
  }
  let handleSetItemBtnClick;
  // 戦闘時要素固定イベント
  BATTLE_ACTION_FIGHT.addEventListener('click', ()=>{
    BATTLE_FIGHT_CTR.classList.add('active');
    window.addEventListener('click', handleWindowClick);
  });

  // 戦闘時ゲームループ
  function animateBattle() {
    const ANIMATION_ID = window.requestAnimationFrame(animateBattle);
    const CURRENT = new Date().getTime();
    const ELAPSED = CURRENT - previous;
    // ゲームループのスピード調整
    if(!(FRAME_INTERVAL <= ELAPSED)){
      return;
    }
    previous = CURRENT - (ELAPSED % FRAME_INTERVAL);

    // Update
    // HP === 0 かどうかで勝敗
    if(PLAYER_BATTLE.succeedRun) {
      window.cancelAnimationFrame(ANIMATION_ID);
      if(!PLAYER_BATTLE.updateRecords({won: false, enemy: ENEMY_BATTLE})) {
        throw new Error('Err at updateRecords method');
      }
      setTimeout(handleBattleEnd, 1000);
    }
    if(PLAYER_BATTLE.data.hp === 0) {
      window.cancelAnimationFrame(ANIMATION_ID);
      addBattleDialog(BATTLE_DIALOG_CTR, '勇者は死んでしまった');
      // ゲームオーバー展開
      setTimeout(handleBattleEnd, 1000);
    }
    if(ENEMY_BATTLE.data.hp === 0) {
      window.cancelAnimationFrame(ANIMATION_ID);
      addBattleDialog(BATTLE_DIALOG_CTR, '敵は美味しいお酒に酔って眠ってしまった');
      if(!PLAYER_BATTLE.updateRecords({won: true, enemy: ENEMY_BATTLE})) {
        throw new Error('Err at updateRecords method');
      }
      setTimeout(handleBattleEnd, 1000);
    }

    // Render
    BG_BATTLE.draw();
    PLAYER_BATTLE.draw();
    ENEMY_BATTLE.draw();
  }

  // 戦闘アニメーションの開始
  function handleBattleStart() {
    resetBattleCtr();
    PLAYER_BATTLE.updateData(PLAYER.data);
    const LIST_ENEMY = [];
    for(let i = 1; i <= PLAYER_BATTLE.data.lv; i++) {
      for(let enemy of ENEMIES_DATA[i]) {
        LIST_ENEMY.push(enemy);
      }
    }
    const ENEMY_DATA = choiceRandom(LIST_ENEMY);
    ENEMY_BATTLE.updateData(ENEMY_DATA);
    const COCKTAIL = ENEMY_DATA.cocktail.name;
    COCKTAIL_NAME.innerHTML = COCKTAIL;
    const INPUT_LIST = addOption({parent: BATTLE_ITEM_CTR, childList: PLAYER_BATTLE.data.item, multiAnswer: true, name: 'battle-item', classList: ['battle-item'], itemData: ITEMS_DATA});

    // 戦闘時イベント
    handleSetItemBtnClick = () => {
      const CHECKED_VALUE = getCheckedValue(INPUT_LIST);
      const CHECKED_VALUE_NAME = CHECKED_VALUE.map(value=>ITEMS_DATA[value].name);
      addBattleDialog(BATTLE_DIALOG_CTR, '・・・');
      addBattleDialog(BATTLE_DIALOG_CTR, `${CHECKED_VALUE_NAME.join('、')}を混ぜた`);
      closeBattleItemCtr();
      setTimeout(() => {
        const WON = containsSame({list1: CHECKED_VALUE, list2: ENEMY_DATA.cocktail.ingredient});
        const MSG = WON ? `${ENEMY_BATTLE.data.name}>こっこれは${COCKTAIL}!美味しそう`
                        : `${ENEMY_BATTLE.data.name}>こんなマズイもん飲めない！
                            <br>攻撃を受けHPが1減った`;

        if(WON) {
          ENEMY_BATTLE.loseHp();
        }else {
          PLAYER_BATTLE.loseHp();
        }
        addBattleDialog(BATTLE_DIALOG_CTR, MSG);
      },
      1000);
    }
    
    // 画面変遷アニメーション
    gsap.to('#mapCtr', {
      right: "-20%",
      opacity: 0, 
    });
    gsap.fromTo('#overlap', 
      {scale:0, opacity: 0.5}, 
      {
        scale:8, 
        opacity: 1, 
        duration: 2, 
        ease: "expoScale(0, 8, power1.inOut)",
        onComplete() {
          gsap.to('#overlap', {
            opacity: 0,
            duration: 1, 
          })
          gsap.to('#battleCtr', {
            opacity: 1,
            bottom: `${SPACE}px`,
            duration: 1, 
            onComplete() {
              addBattleDialog(BATTLE_DIALOG_CTR, `${ENEMY_DATA.name}が現れた`);
              addBattleDialog(BATTLE_DIALOG_CTR, `${COCKTAIL}を飲みたそうにしている`);  
              SET_BATTLE_ITEM_BTN.addEventListener('click', handleSetItemBtnClick);
              BATTLE_ACTION_RUN.addEventListener('click', handleActionRunClick);
              BATTLE_ACTION_FIGHT.disabled = false;
              BATTLE_ACTION_RUN.disabled = false;
            }
          })
          // 戦闘シーンアニメーション開始
          previous = new Date().getTime();
          animateBattle();
        }
    });
  }
  // 戦闘アニメーションへの終了
  function handleBattleEnd() {
    const NEW_PLAYER_DATA = PLAYER_BATTLE.data;
    PLAYER.updateData(NEW_PLAYER_DATA);
    updateEnemyLog(NEW_PLAYER_DATA, ENEMY_BATTLE.data);
    updateStep(NEW_PLAYER_DATA);
    // 画面変遷アニメーション
    gsap.to('#battleCtr', {
      opacity: 0,
      bottom: '',
      duration: 1, 
    });
    gsap.fromTo('#overlap', 
      {scale:0, opacity: 0.5}, 
      {
        scale:8, 
        opacity: 1, 
        duration: 2, 
        ease: "expoScale(0, 8, power1.inOut)",
        onComplete() {
          gsap.to('#overlap', {
            opacity: 0,
            duration: 1, 
          })
          gsap.to('#mapCtr', {
            opacity: 1,
            right: 0,
            duration: 1, 
            onComplete() {
              if(PLAYER.levelUp()) {
                console.log('Level Up')
                updateLv(PLAYER.data)
              }
            }
          })
          // 通常シーン開始
          previous = new Date().getTime();
          animate();
        }
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



  // test
  // gsap.set('#playerCtr', {
  //   left: "100%",
  //   opacity: 0, 
  // });
  // gsap.set('#battleCtr', {
  //   opacity: 1,
  //   bottom: `${SPACE}px`,
  //   duration: 1, 
  // })
  // handleBattleStart();
  // animateBattle();