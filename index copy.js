import { fetchJsonData } from './fetchData.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';
import { Log, UICtrManager, UICount, Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, KeysEvent, FullMsg, AverageEncounter } from './classes.js';
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from './data/boundaries.js';
import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "./types.js";
import { gsap } from './node_modules/gsap/index.js';

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
// const FULL_MSG = document.getElementById('fullMsg');

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
  const TRANSITION_TIME = 1000 //millisecond
  // Canvas
  const CANVAS = document.getElementById('canvas');
  const C = CANVAS.getContext('2d');
  CANVAS.width = CANVAS_WIDTH;
  CANVAS.height = CANVAS_HEIGHT;
  C.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // map
  const DISPLAY_LV = new UICount({elemID:'lv', countUpEvent: EVENT.levelUp, num: 1});
  const DISPLAY_HP = new UICount({elemID: 'hp', countUpEvent: EVENT.loseHp, countDownEvent: EVENT.recoverHp});
  const DISPLAY_STEP = new UICount({elemID: 'step', countUpEvent: EVENT.step});
  const DISPLAY_BEAT = new UICount({elemID: 'beat', countUpEvent: EVENT.beat});
  const DISPLAY_AVERAGE = new AverageEncounter({elemID: 'averageEncounter'});
  const ENCOUNTER_LOG = new Log({elemID: 'logCtr', className: 'playerInfo--log', event: EVENT.battleEnd, dataKey: 'enemy'});
  const UI_MANAGER = new UICtrManager({overlapID: 'overlap', mapCtrID: 'mapCtr', battleCtrID: 'battleCtr', transitionTime: TRANSITION_TIME, space: SPACE});

  // battle
  const BATTLE_DIALOG = new Log({elemID: 'battleDialogCtr', className: 'battle-dialog', event: EVENT.battleDialog, clearEvent: EVENT.battleEnd});

  const CTRL_BTN = {};
  for(let button of LIST_PLAYER_MOVE_BTN) {
    CTRL_BTN[button.id] = button;
  }
  const FULL_MSG = new FullMsg({elemCtrID: 'fullMsgCtr', elemID: 'fullMsg', transitionTime: TRANSITION_TIME})
  const KEY_EVENT = new KeysEvent({ctrlBtn: CTRL_BTN});
  const MANAGER = new GameManager({canvas: CANVAS, canvasContent: C, fps: FPS, offSet: OFFSET, data: DATA, transitionTime: TRANSITION_TIME, keyEvent:KEY_EVENT, pathToImg: PATH_TO_CHAR_IMG});
  MANAGER.startMapAnimation();
  // MANAGER.startBattleAnimation();

})
// .catch(error => {
//   throw new Error(error);
// });



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