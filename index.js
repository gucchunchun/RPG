import { fetchJsonData } from './fetchData.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from './utils.js';
import { UIManager, Log,  GameManager } from './class/classes.js';
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
    titlePageCtrId: 'titlePageCtr', 
    titlePageBtnCtrId: 'titlePageBtnCtr',
    startNewGameBtnId: 'startNewGame',
    playerSelectCtrId: 'playerSelectCtr', 
    characterOptCtrId: 'characterOptCtr', 
    playerNameId: 'playerName',
    nameErrMsgId: 'nameErrMsg',
    playerSelectBtnId: 'playerSelectBtn',
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
    dialogCtrId: 'battleDialogCtr',
    itemWinId: 'battleItemWin', 
    cocktailId: 'cocktail', 
    itemCtrId: 'battleItemCtr', 
    itemSetBtnId: 'itemSetBtn', 
  }
}
const KEYS_ID = {
  downKeyId: 'down', 
  upKeyId: 'up', 
  leftKeyId: 'left', 
  rightKeyId: 'right'
}

const LOADING_CTR = document.getElementById('loadingCtr');
const ERROR_MSG = document.getElementById('errorMsg');
const ROOT = document.querySelector(':root');
ROOT.style.setProperty('--w--game', CANVAS_WIDTH);
ROOT.style.setProperty('--h--game', CANVAS_HEIGHT);
ROOT.style.setProperty('--space', SPACE);

let data;

const ERROR_TIMEOUT = new Promise((reject) =>
  setTimeout(() => {
    reject(new Error('reload'));
  }, 5000)
)
try {
  data = await Promise.race([fetchJsonData('./data/gameData.json'), ERROR_TIMEOUT]);
}catch(err) {
  if (err.message === 'reload') {
    alert('リロードしてください');
  }
  ERROR_MSG.innerHTML = 'エラー発生';
  throw new Error(err);
}

// ゲームデータ
const GAME_DATABASE = data.data;
// キャンバス
const CANVAS = document.getElementById('canvas');
const C = CANVAS.getContext('2d');
CANVAS.width = CANVAS_WIDTH;
CANVAS.height = CANVAS_HEIGHT;
C.fillRect(0, 0, CANVAS.width, CANVAS.height);
// UI マネージャー
const UI_MANAGER = new UIManager({UIDatabase: UI_DATABASE, gameDatabase: GAME_DATABASE, transTime: TRANSITION_TIME, styleSpace: SPACE})
const GAME_MANAGER = new GameManager({canvas: CANVAS, canvasContent: C, fps: FPS, offSet: OFFSET, gameDatabase: GAME_DATABASE, transTime: TRANSITION_TIME, pathToImg: PATH_TO_CHAR_IMG, keysId: KEYS_ID});

// ゲームスタート
GAME_MANAGER.gameStart();
LOADING_CTR.style.display = 'none';

// リロードの禁止
window.addEventListener('beforeunload', (e)=> {
  e.preventDefault();
  GAME_MANAGER.saveData();
});
