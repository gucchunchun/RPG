import { fetchJsonData } from './fetchData.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';
import { UIManager, MapUIManager , TitleUIManager, BattleUIManager, Log, UICount, Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, KeysEvent, AverageEncounter } from './classes.js';
import { CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "./types.js";
import { gsap } from './node_modules/gsap/index.js';

// グローバル設定
const FPS = 30; // 1フレームあたり 1000/30 millisecond
const TRANSITION_TIME = 1000 //millisecond
const OFFSET = {
  x: -1880,
  y: -350,
}
const PATH_TO_CHAR_IMG = './img/character/';
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 576;
const SPACE = 8;
const PREV_DATA = JSON.parse(localStorage.getItem("prevData"));
const UI_DATABASE = {
  game: {
    ctrId: 'gameCtr',
  },
  title: {
    ctrId: 'titleCtr',
    prevData: PREV_DATA, 
  },
  map: {
    ctrId: 'mapCtr',
    sideCtrId: 'mapSideCtr', 
    lvId: 'lv', 
    hpId: 'hp', 
    stepId: 'step', 
    beatId: 'beat', 
    avgEncId: 'avgEnc', 
    encLogCtrId: 'encLogCtr'
  },
  battle: {
    ctrId: 'battleCtr', 
    bottomCtrId: 'battleBottomCtr',
    fightOptId: 'fight', 
    runOptId: 'run', 
    itemWinId: 'battleItemWin', 
    // dialog
    cocktailId: 'cocktail', 
    itemCtrId: 'battleItemCtr', 
    itemSetBtnId: 'itemSetBtn', 
  }
}

fetchJsonData('./data/gameData.json')
.then(json=>{
  // ゲームデータ
  const DATA = json.data;

  // キャンバス
  const CANVAS = document.getElementById('canvas');
  const C = CANVAS.getContext('2d');
  CANVAS.width = CANVAS_WIDTH;
  CANVAS.height = CANVAS_HEIGHT;
  C.fillRect(0, 0, CANVAS.width, CANVAS.height);

  // UI マネージャー
  const UI_MANAGER = new UIManager({UIDatabase: UI_DATABASE, gameDataBase: DATA, transTime: TRANSITION_TIME, styleSpace: SPACE})

  const BATTLE_DIALOG = new Log({elemId: 'battleDialogCtr', className: 'battle-dialog', event: EVENT.battleDialog, clearEvent: EVENT.battleEnd});

  // プレイヤーコントロールボタン=>クラス内で作成できるようにする
  const LIST_PLAYER_MOVE_BTN = document.getElementsByClassName('player-ctrl');
  const CTRL_BTN = {};
  for(let button of LIST_PLAYER_MOVE_BTN) {
    CTRL_BTN[button.id] = button;
  }
  // const FULL_MSG = new FullMsg({elemCtrId: 'fullMsgCtr', elemId: 'fullMsg', transTime: TRANSITION_TIME})
  const KEY_EVENT = new KeysEvent({ctrlBtn: CTRL_BTN});
  const MANAGER = new GameManager({canvas: CANVAS, canvasContent: C, fps: FPS, offSet: OFFSET, data: DATA, transTime: TRANSITION_TIME, keyEvent:KEY_EVENT, pathToImg: PATH_TO_CHAR_IMG});
  
  // ゲームスタート
  MANAGER.startTitleAnimation();

  // Prevent Reload
  // window.addEventListener('beforeunload', (e)=> {
  //   e.preventDefault();
  //   console.log(MANAGER.player.data)
  //   localStorage.setItem("prevData", JSON.stringify(MANAGER.player.data));
  // });

})
// .catch(error => {
//   throw new Error(error);
// });
