import { fetchJsonData } from './fetchData.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';
import { UITitleManager, UIBattleManager, Log, UICtrManager, UICount, Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, KeysEvent, FullMsg, AverageEncounter } from './classes.js';
import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "./types.js";
import { gsap } from './node_modules/gsap/index.js';

// グローバル設定
const FPS = 30; // 1フレームあたり 1000/30 millisecond
const TRANSITION_TIME = 1000 //millisecond
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
const SPACE = 8;

fetchJsonData('./data/gameData.json')
.then(json=>{
  // ゲームデータ
  const DATA = json.data;
  const PREV_DATA = JSON.parse(localStorage.getItem("prevData"));

  // キャンバス
  const CANVAS = document.getElementById('canvas');
  const C = CANVAS.getContext('2d');
  CANVAS.width = CANVAS_WIDTH;
  CANVAS.height = CANVAS_HEIGHT;
  C.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // タイトル、プレイヤー選択画面
  const TITLE_UI_MANAGER = new UITitleManager({ctrId: 'titleCtr', prevData: PREV_DATA, playersData: DATA.player, transitionTime: TRANSITION_TIME});

  // マップシーン
  const DISPLAY_LV = new UICount({elemID:'lv', countUpEvent: EVENT.levelUp, num: 1});
  const DISPLAY_HP = new UICount({elemID: 'hp', countUpEvent: EVENT.recoverHp, countDownEvent: EVENT.loseHp});
  const DISPLAY_STEP = new UICount({elemID: 'step', countUpEvent: EVENT.step});
  const DISPLAY_BEAT = new UICount({elemID: 'beat'});
  const DISPLAY_AVERAGE = new AverageEncounter({elemID: 'averageEncounter'});
  const ENCOUNTER_LOG = new Log({elemID: 'logCtr', className: 'playerInfo--log', dataKey: 'enemy', showKey: ['data', 'name']});
  const UI_MANAGER = new UICtrManager({overlapID: 'overlap', mapCtrID: 'mapCtr', battleCtrID: 'battleCtr', transitionTime: TRANSITION_TIME, space: SPACE});

  // バトルシーン
  const BATTLE_UI = new UIBattleManager({fightOptId: 'fight', 
    runOptId: 'run', itemWinId: 'battleItemWin', 
    cocktailId: 'cocktail', itemCtrId: 'battleItemCtr', 
    itemSetBtnId: 'itemSetBtn', itemsData: DATA.item, 
    transitionTime: TRANSITION_TIME});
  const BATTLE_DIALOG = new Log({elemID: 'battleDialogCtr', className: 'battle-dialog', event: EVENT.battleDialog, clearEvent: EVENT.battleEnd});

  // プレイヤーコントロールボタン=>クラス内で作成できるようにする
  const LIST_PLAYER_MOVE_BTN = document.getElementsByClassName('player-ctrl');
  const CTRL_BTN = {};
  for(let button of LIST_PLAYER_MOVE_BTN) {
    CTRL_BTN[button.id] = button;
  }
  const FULL_MSG = new FullMsg({elemCtrID: 'fullMsgCtr', elemID: 'fullMsg', transitionTime: TRANSITION_TIME})
  const KEY_EVENT = new KeysEvent({ctrlBtn: CTRL_BTN});
  const MANAGER = new GameManager({canvas: CANVAS, canvasContent: C, fps: FPS, offSet: OFFSET, data: DATA, transitionTime: TRANSITION_TIME, keyEvent:KEY_EVENT, pathToImg: PATH_TO_CHAR_IMG});
  
  // ゲームスタート
  MANAGER.startTitleAnimation();

  //  Save data
  let isSaved = false;

  // Prevent Reload
  window.addEventListener('beforeunload', (e)=> {
    e.preventDefault();
    console.log(MANAGER.player.data)
    localStorage.setItem("prevData", JSON.stringify(MANAGER.player.data));
  });

})
// .catch(error => {
//   throw new Error(error);
// });
