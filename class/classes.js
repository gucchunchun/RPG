import { KEYS_INTERFACE, UI_MGR_INTERFACE, CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "../types.js";
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from '../data/boundaries.js';
import { rectCollision, makeMap, trueWithRatio, choiceRandom, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom } from '../utils.js';
import { gsap } from '../node_modules/gsap/index.js';
import { Boundary, Sprite, Character, Player, CharacterBattle, Hp} from './drawerClass.js';
import { EventBus } from './eventBus.js';

// UIとゲームを別にするためのイベントハンドラー
const EVENT_BUS = new EventBus();

// UI
class UI {
  constructor(elemId) {
    this.elemId = elemId;
    this.elem = document.getElementById(elemId);
  }
}
class UICount extends UI {
  constructor({elemId, countUpEvent, countDownEvent, num}) {
    super(elemId);
    this.num = num? num: 0;
    if(countUpEvent) {
      EVENT_BUS.subscribe(countUpEvent, this.countUp.bind(this));
    }
    if(countDownEvent) {
      EVENT_BUS.subscribe(countDownEvent, this.countUp.bind(this));
    }
    EVENT_BUS.subscribe(EVENT.playerSelect, this.setNum.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.setNum.bind(this));
    this.elem.innerHTML = this.num;
  }
  _showNum() {
    this.elem.innerHTML = this.num;
  }
  countUp({amount}) {
    if(amount) {
      this.num += amount;
    }else {
      this.num++;
    }
    this._showNum();
  }
  countDown({amount}) {
    if(amount) {
      this.num -= amount;
    }else {
      this.num--;
    }
    this._showNum();
  }
  setNum({playerData}) {
    if(!Object.keys(playerData).includes(this.elemId)) {
      console.log(`check ID name ${this.elemId}`);
      return false;
    }
    this.num = playerData[this.elemId];
    console.log()
    this._showNum();
    return true;
  }
}
class Log extends UI {
  constructor({elemId, className, event, dataKey, showKey, clearEvent}) {
    super(elemId);
    this.className = className;
    this.event = event;
    this.dataKey = dataKey;
    this.showKey = showKey;
    this.logList = [];
    if(event) {
      EVENT_BUS.subscribe(this.event, this.addLog.bind(this));
    }
    if(dataKey) {
      EVENT_BUS.subscribe(EVENT.playerSelect, this.setLog.bind(this));
      EVENT_BUS.subscribe(EVENT.battleEnd, this.setLog.bind(this));
    }
    if(clearEvent) {
      EVENT_BUS.subscribe(clearEvent, this.clearLog.bind(this));
    }
  }
  addLog({log, delay}) {
    if(!log) return;
    const P = document.createElement('p');
    P.className = this.className;
    P.innerHTML = log;
    if(delay) {
      setTimeout(()=>{
        this.elem.append(P);
        scrollToBottom(this.elem);
      }, delay)
      return;
    }
    this.elem.append(P);
    this.logList.push(log);
    scrollToBottom(this.elem);
  }
  setLog({playerData}) {
    const NEW_LOGS = playerData[this.dataKey].filter((log, i )=>(this.logList.length - 1) < i);
    for(let log of NEW_LOGS) {
      for(let key of this.showKey) {
        log = log[key]
      }
      this.addLog({log: log});
    }
    scrollToBottom(this.elem);
  }
  clearLog() {
    this.elem.innerHTML = '';
  }
}
class AverageEncounter extends UI {
  constructor({elemId, step, encounter}) {
    super(elemId);
    this.step = step || 0;
    this.encounter = encounter || 0;
    EVENT_BUS.subscribe(EVENT.step, this.stepped.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.setNum.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSelect, this.setNum.bind(this));
  }
  _show() {
    if(this.encounter === 0) {
      this.elem.innerHTML = '???';
      return;
    }
    const AVERAGE = Math.round(this.step / this.encounter * 10)/10;
    this.elem.innerHTML = AVERAGE;
  }
  stepped() {
    this.step++;
    this._show();
  }
  encountered() {
    this.encounter++;
    this._show();
  }
  setNum({playerData}) {
    this.step = playerData.step;
    this.encounter = playerData.enemy.length;
    this._show();
  }
}
class Keys {
  static KEYS = {
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
    }
  }
  constructor({downKeyId, upKeyId, leftKeyId, rightKeyId}) {
    this.keys = Keys.KEYS;
    this.lastKey;
    this.ctrlBtn =  {
      down: new UI(downKeyId),
      up: new UI(upKeyId),
      left: new UI(leftKeyId),
      right: new UI(rightKeyId)
    }
    this.init();
  }
  init() {
    window.addEventListener('keydown', (e) => {
      const TARGET_KEY = e.key;
      for(let direction in this.keys) {
        const KEY = this.keys[direction];
        if(KEY.name === TARGET_KEY) {
          KEY.pressed = true;
          this.lastKey = TARGET_KEY;
        }
      }
    })
    window.addEventListener('keyup', (e)=> {
      const TARGET_KEY = e.key;
      for(let direction in this.keys) {
        const KEY = this.keys[direction];
        if(KEY.name === TARGET_KEY) {
          KEY.pressed = false;
          if(this.lastKey === TARGET_KEY) {
            this.lastKey = undefined;
          }
        }
      }
    });

    for(let direction in this.ctrlBtn) {
      this.ctrlBtn[direction].elem.addEventListener('mousedown', (e)=> {
        const START_EVENT = new KeyboardEvent('keydown', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(START_EVENT);
      });
      this.ctrlBtn[direction].elem.addEventListener('mouseup', (e)=> {
        const END_EVENT = new KeyboardEvent('keyup', {
          key: this.keys[direction].name,
        });
        window.dispatchEvent(END_EVENT);
      });
    }
  }
  setKeys({down, up, left, right}) {
    this.keys[down].name = down? down: this.keys[down].name;
    this.keys[up].name = up? up: this.keys[up].name;
    this.keys[left].name = left? left: this.keys[left].name;
    this.keys[right].name = right? right: this.keys[right].name;
  }
}
class ItemCtr {
  constructor({elemId, itemDatabase}) {
    this.itemCtr = new UI(elemId);
    this.itemDatabase = itemDatabase;
    this.itemList = [];

    EVENT_BUS.subscribe(EVENT.playerSelect, this.makeItemList.bind(this));
    EVENT_BUS.subscribe(EVENT.getItem, this.addItem.bind(this));
  }
  makeItemList({playerData}) {
    console.log(playerData.item)
    this.itemList = addOption({parent: this.itemCtr.elem, childList: playerData.item, 
      multiAnswer: true, name: 'battleItem',
      classList: ['item'], itemDatabase: this.itemDatabase })
  }
  addItem({itemKey}) {
    this.itemList.push(addOption({parent: this.itemCtr.elem, childList: [itemKey], 
      multiAnswer: true, name: 'battleItem', classList: ['item'], itemDatabase : this.itemDatabase })[0]);
  }
  getCheckedItemName() {
    const SELECTED = this.itemList.filter(item=>item.checked).map(item=>item.value);
    return SELECTED;
  }
  resetChecked() {
    for(let item of this.itemList) {
      if(item.checked) item.checked = false;
    }
  }
}

class Overlap {
  static OVERLAP_CLASS = 'overlap';
  static OVERLAP_MSG_CLASS = 'overlap-msg';
  constructor({gameCtrUI, transTime}) {
    this.gameCtrUI = gameCtrUI;
    this.transTime = transTime; //millisecond
    this.overlap;
    this.overlapMsg;
    this.init();
  }

  init() {
    const OVERLAP = document.createElement('div');
    OVERLAP.className = Overlap.OVERLAP_CLASS;
    const OVERLAP_MSG = document.createElement('p');
    OVERLAP_MSG.className = Overlap.OVERLAP_MSG_CLASS;
    OVERLAP.appendChild(OVERLAP_MSG);
    this.gameCtrUI.elem.appendChild(OVERLAP);
    this.overlap = OVERLAP;
    this.overlapMsg = OVERLAP_MSG;
  }
  circle() {
    if(!gsap) {
      console.log('Install GSAP'); 
      return;
    }
    gsap.timeline()
    .fromTo(this.overlap, 
      {
        scale: 0, 
        opacity: 0, 
      },
      {
        scale: 1, 
        opacity: 1, 
        duration: this.transTime / 1000, 
      }
    )
    .to(this.overlap, 
      {
        scale: 1, 
        opacity: 0, 
        duration: this.transTime / 1000, 
      }
    )
  }
  down() {
    if(!gsap) {
      console.log('Install GSAP'); 
      return;
    }
    gsap.timeline()
    .fromTo(this.overlap, 
    {
      borderRadius: 0,
      scale: 1, 
      opacity: 1, 
      top: `${this.overlap.height / 2}px`,
    },
    {
      scale: 1, 
      opacity: 1, 
      top: '50%',
      duration: this.transTime / 2 / 1000, 
    })
    .to(this.overlap, 
    {
      borderRadius: '50%',
      scale: 1, 
      opacity: 0, 
      duration: this.transTime / 1000, 
    }, 
    `>${this.transTime / 2 / 1000}`
    );
  }
  addMsg(msg) {
    this.overlapMsg.innerHTML = msg;

  }
  showMsg(msg) {
    this.addMsg(msg);
    gsap.timeline()
    .fromTo(this.overlap, 
      {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        scale: 1, 
        opacity: 0, 
      },
      {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        scale: 1, 
        opacity: 1, 
        duration: this.transTime / 2 / 1000, 
      }
    )
    .to(this.overlap, 
      {
        backgroundColor: 'rgba(0, 0, 0, 1)',
        scale: 1, 
        opacity: 0, 
        duration: this.transTime / 1000, 
      }, 
      `>${this.transTime / 2 / 1000}`
    );
    setTimeout(() => {
      this.addMsg('');
    }, this.transTime * 2)
  }
}


class UICtr {
  constructor({ctrId, transTime, styleSpace}) {
    this.ctrUI = new UI(ctrId);
    this.transTime = transTime;
    this.styleSpace = styleSpace;
  }
  _openCtr() {
    gsap.set(this.ctrUI.elem,
      {
        display: ''
      }
    )
  }
  _closeCtr() {
    gsap.set(this.ctrUI.elem,
      {
        display: 'none'
      }
    )
  }
}
// タイトル画面UI
// クローズするタイミング
class TitleUICtr extends UICtr {
  static BTN_CLASS = 'title-page__btn';
  static PLAYER_SEX_OPT = 'player-sex-opt';
  constructor({ctrId, titlePageCtrId, titlePageBtnCtrId, startNewGameBtnId, playerSelectCtrId, playerSexOptCtrId, playerNameId, nameErrMsgId, playerSetBtnId, prevData, playerDatabase, transTime, styleSpace}) {
    super({ctrId, transTime, styleSpace});
    this.titlePageCtrUI = new UI(titlePageCtrId);
    this.titlePageBtnCtrUI = new UI(titlePageBtnCtrId);
    this.startNewGameBtnUI = new UI(startNewGameBtnId);
    this.playerSelectCtrUI = new UI(playerSelectCtrId);
    this.playerSexOptCtrUI = new UI(playerSexOptCtrId);
    this.playerNameUI = new UI(playerNameId);
    this.nameErrMsgUI = new UI(nameErrMsgId);
    this.playerSetBtnUI = new UI(playerSetBtnId);
    this.prevData = prevData;
    this.playerDatabase = playerDatabase;
    this.continueBtn;
    this.name;
    this.init();
    // キャラクター選択肢
    const PLAYER_SEX_OPT_LIST = addOption({parent: this.playerSexOptCtrUI.elem, childList: Object.keys(this.playerDatabase),
      multiAnswer: false, name: 'playerSelect', classList: [TitleUICtr.PLAYER_SEX_OPT], 
      itemDatabase: this.playerDatabase});
    // イベント追加
    this.startNewGameBtnUI.elem.addEventListener('click', this.handleStartBtnClick.bind(this));
    for(let opt of PLAYER_SEX_OPT_LIST) {
      opt.addEventListener('click', this.handleSexSelect.bind(this));
    }
    this.playerNameUI.elem.addEventListener('blur', this.handleInputName.bind(this));
    this.playerSetBtnUI.elem.addEventListener('click', this.handlePlayerSetBtnClick.bind(this));
  }
  init() {
    // 過去のデータの有無でコンテニューボタンを設置(撤去)
    if(this.prevData && this.prevData.hp !== 0) {
      if(!this.continueBtn) {
        const CONTINUE_BTN = document.createElement('button');
        CONTINUE_BTN.className = TitleUICtr.BTN_CLASS;
        CONTINUE_BTN.addEventListener('click', this.handleContinueBtnClick.bind(this));
        this.titlePageBtnCtrUI.elem.append(CONTINUE_BTN);
        this.continueBtn = CONTINUE_BTN;
      }
      this.continueBtn.innerHTML = `${this.prevData.name}としてゲームを始める`;
    }else if(this.continueBtn) {
      this.titlePageBtnCtrUI.elem.removeChild(this.continueBtn);
    }

    // リセット
    this._openTitlePage();
    gsap.set(this.playerSelectCtrUI.elem, 
      {
        display: 'none'
      }
    )
    this._disablePlayerSetBtn();
    this.playerNameUI.elem.innerHTML = '';
    this._setNameErrMsg('');
  }
  handleStartBtnClick() {
    EVENT_BUS.publish(EVENT.newGameStart);
    this._closeTittlePage();
    this._openPlayerSelectScreen();
  }
  handleContinueBtnClick() {
    this._closeTittlePage();
    this._closeCtr();
    EVENT_BUS.publish(EVENT.playerSelect, {playerData: this.prevData});
  }
  handleSexSelect(e) {
    const SELECTED_KEY =  e.target.value;
    EVENT_BUS.publish(EVENT.playerSetSex, {key: SELECTED_KEY})
  }
  handleInputName(e) {
    const VALUE = e.target.value;
    const VALUE_LEN = VALUE.length;
    if(VALUE_LEN === 0 || 10 < VALUE_LEN) {
      this._setNameErrMsg('１〜１０字にしてください');
      this._disablePlayerSetBtn();
      return
    }
    if(/\s/.test(VALUE)) {
      this._setNameErrMsg('スペースは使用できません');
      this._disablePlayerSetBtn();
      return
    }
    this._setNameErrMsg('');
    this.name = VALUE;
    this._ablePlayerSetBtn();
  }
  handlePlayerSetBtnClick() {
    this._closePlayerSelectScreen();
    this._closeCtr();
    EVENT_BUS.publish(EVENT.playerSetName, {name: this.name});
  }
  _openTitlePage() {
    gsap.set(this.titlePageCtrUI.elem, 
      {
        display: '',
        opacity: 1
      }
    )
  }
  _closeTittlePage() {
    gsap.timeline()
    .to(this.titlePageCtrUI.elem, 
      {
        display: '',
        opacity: 1,
      }
    )
    .to(this.titlePageCtrUI.elem, 
      {
        display: '',
        opacity: 0,
        duration: this.transTime / 1000
      }
    , 0)
    .set(this.titlePageCtrUI.elem, 
      {
        display: 'none',
        opacity: 0,
      }
    , `+=${this.transTime / 1000}`)
  }
  _openPlayerSelectScreen() {
    gsap.timeline()
    .set(this.playerSelectCtrUI.elem, 
      {
        display: '',
        opacity: 0,
      }
    )
    .to(this.playerSelectCtrUI.elem, 
      {
        display: '',
        opacity: 1,
        duration: this.transTime / 1000
      }
    , `+=${this.transTime / 1000}`)
  }
  _closePlayerSelectScreen() {
    gsap.timeline()
    .set(this.playerSelectCtrUI.elem, 
      {
        display: '',
        opacity: 1,
      }
    )
    .to(this.playerSelectCtrUI.elem, 
      {
        display: '',
        opacity: 0,
        duration: this.transTime / 1000
      }
    , 0)
    .to(this.playerSelectCtrUI.elem, 
      {
        display: 'none',
        opacity: 0,
      }
    , `+=${this.transTime / 1000}`)
  }
  _ablePlayerSetBtn() {
    this.playerSetBtnUI.elem.disabled = false;
  }
  _disablePlayerSetBtn() {
    this.playerSetBtnUI.elem.disabled = true;
  }
  _setNameErrMsg(msg) {
    this.nameErrMsgUI.elem.innerHTML = msg;
  }
}
// マップ画面UI
class MapUICtr extends UICtr {
  static ENC_LOG_CLASS = 'playerInfo--log';
  constructor({ctrId, sideCtrId, lvId, hpId, stepId, beatId, avgEncId, encLogCtrId, transTime, styleSpace}) {
    super({ctrId, transTime, styleSpace});
    this.sideCtrUI = new UI(sideCtrId);
    this.lvMgr = new UICount({elemId: lvId, countUpEvent: EVENT.levelUp, num: 1});
    this.hpMgr = new UICount({elemId: hpId, countUpEvent: EVENT.recoverHp, countDownEvent: EVENT.loseHp});
    this.stepMgr = new UICount({elemId: stepId, countUpEvent: EVENT.step});
    this.beatMgr = new UICount({elemId: beatId});
    this.avgEncMgr = new AverageEncounter({elemId: avgEncId});
    this.encLogMgr = new Log({elemId: encLogCtrId, className: MapUICtr.ENC_LOG_CLASS, dataKey: 'enemy', showKey: ['data', 'name']});
    this.init();
  }
  init() {
    this._closeCtr();
    this._closeSideCtr();
  }
  mapStart() {
    this._openCtr();
    this._openSideCtr();
  }
  mapEnd() {
    this._closeSideCtr();
    setTimeout(()=>{
      this._closeCtr();
    }, this.transTime)
  }
  _openSideCtr() {
    gsap.fromTo(this.sideCtrUI.elem, 
      {
        right: `-${this.sideCtrUI.elem.clientWidth}px`,
        opacity: 0, 
      },
      {
        right: '',
        opacity: 1,
        duration: this.transTime / 1000
      }
    );
  }
  _closeSideCtr() {
    gsap.to(this.sideCtrUI.elem, 
      {
        right: `-${this.sideCtrUI.elem.clientWidth}px`,
        opacity: 0, 
        duration: this.transTime / 1000
      }
    );
  }
}
// バトル画面UI
class BattleUICtr extends UICtr {
  constructor({ctrId, bottomCtrId, fightOptId, runOptId, itemWinId, cocktailId, itemCtrId, itemSetBtnId, itemDatabase, transTime, styleSpace}) {
    super({ctrId, transTime, styleSpace});
    this.bottomCtrUI = new UI(bottomCtrId);
    this.fightOptUI = new UI(fightOptId);
    this.runOptUI = new UI(runOptId);
    this.itemWinUI = new UI(itemWinId);
    this.cocktailUI = new UI(cocktailId);
    this.itemCtr = new ItemCtr({elemId:itemCtrId, itemDatabase: itemDatabase});
    this.itemSetBtnUI = new UI(itemSetBtnId);

    this._openItemWindowFunc = this._openItemWindow.bind(this); 
    this._closeItemWindowFunc = this._closeItemWindow.bind(this); 
    this.runFunc = this.run.bind(this);

    this.fightOptUI.elem.addEventListener('click', this._openItemWindowFunc);
    this.runOptUI.elem.addEventListener('click', this.runFunc);
    this.itemSetBtnUI.elem.addEventListener('click', this.handleItemSetBtnClick.bind(this));

    EVENT_BUS.subscribe(EVENT.failToRun, this.disableRun.bind(this));
    EVENT_BUS.subscribe(EVENT.battleReady, this.handleBattleReady.bind(this));
    this.init();
  }
  init() {
    this._closeCtr();
    this._closeItemWindow();

    this.fightOptUI.elem.checked = false;
    this.runOptUI.elem.checked = false;
    this.runOptUI.elem.disabled = false;
  }
  handleBattleReady({cocktail}) {
    this.cocktailUI.elem.innerHTML = cocktail;
  }
  handleItemSetBtnClick() {
    const CHECKED_LIST = this.itemCtr.getCheckedItemName();
    this._closeItemWindow();
    EVENT_BUS.publish(EVENT.setItem, {itemList: CHECKED_LIST});
  }
  run() {
    EVENT_BUS.publish(EVENT.run, {});
  }
  disableRun() {
    this.runOptUI.elem.disabled = true;
  }
  battleStart() {
    this.ctrUI.elem.style.display = 'flex';
    this._openBottomCtr();
  }
  battleEnd() {
    this._closeBottomCtr();
    setTimeout(()=> {
      this._closeCtr();
      this.init();
    }, this.transTime)
  }
  _openBottomCtr() {
    gsap.fromTo(this.bottomCtrUI.elem,
      {
        bottom: `-${this.bottomCtrUI.elem.clientHeight}px`,
      },
      {
        bottom: `${this.styleSpace}px`,
        duration: this.transTime / 1000
      }
    )
  }
  _closeBottomCtr() {
    gsap.to(this.bottomCtrUI.elem,
      {
        bottom: `-${this.bottomCtrUI.elem.clientHeight}px`,
        duration: this.transTime / 1000
      }
    )
  }
  _openItemWindow(e) {
    if(e) {
      // イベントのバブリングを防ぐ
      e.stopPropagation();
      if(e.target !== this.fightOptUI.elem) return;
    }
    gsap.fromTo(`#${this.itemWinUI.elemId}`, 
    {
      display: 'none',
    },
    {
      display: '',
    })
    window.addEventListener('click', this._closeItemWindowFunc);
    this.fightOptUI.elem.removeEventListener('click', this._openItemWindowFunc);
  }
  _closeItemWindow(e) {
    if(e) {
      e.stopPropagation();
      if(this.itemWinUI.elem.contains(e.target)
      || this.fightOptUI.elem.closest('label').contains(e.target)) return;
    }
    gsap.to(`#${this.itemWinUI.elemId}`, 
    {
      display: 'none',
    })
    this.fightOptUI.elem.checked = false;
    window.removeEventListener('click', this._closeItemWindowFunc);
    this.fightOptUI.elem.addEventListener('click', this._openItemWindowFunc);
    this.itemCtr.resetChecked();
  }
}
// 全体
class UIManager {
  constructor({
    UIDatabase = UI_MGR_INTERFACE,
    gameDatabase = null,
    transTime = 0,
    styleSpace = 0
  }) {
    this.gameCtrUI = new UI(UIDatabase.game.ctrId);
    this.titleMgr = new TitleUICtr({...UIDatabase.title, playerDatabase: gameDatabase.player, transTime: transTime, styleSpace: styleSpace});
    this.mapMgr = new MapUICtr({...UIDatabase.map, transTime: transTime, styleSpace: styleSpace});
    this.battleMgr = new BattleUICtr({...UIDatabase.battle, itemDatabase: gameDatabase.item, transTime: transTime, styleSpace: styleSpace});
    this.overlap = new Overlap({gameCtrUI: this.gameCtrUI, transTime: transTime});
    this.gameDatabase = gameDatabase;
    this.transTime = transTime;
    this.styleSpace = styleSpace;
    this.init();
  }

  init() {
    // コンテナ
    EVENT_BUS.subscribe(EVENT.mapStart, this.mapStart.bind(this));
    EVENT_BUS.subscribe(EVENT.mapEnd, this.mapEnd.bind(this));
    EVENT_BUS.subscribe(EVENT.battleStart, this.battleStart.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.battleEnd.bind(this));

    // オーバーラップメッセージ
    EVENT_BUS.subscribe(EVENT.getItem, this.getItem.bind(this));
    EVENT_BUS.subscribe(EVENT.recoverHp, this.recoverHp.bind(this));
    EVENT_BUS.subscribe(EVENT.loseHp, this.loseHp.bind(this));
    EVENT_BUS.subscribe(EVENT.levelUp, this.levelUp.bind(this));
  }

  mapStart() {
    this.mapMgr.mapStart();
  }
  mapEnd() {
    this.overlap.circle();
    this.mapMgr.mapEnd();
  }
  battleStart() {
    this.battleMgr.battleStart();
  }
  battleEnd() {
    this.overlap.circle();
    this.battleMgr.battleEnd();
  }
  getItem({itemKey}) {
    if(!itemKey) {
      console.log('Error at getItem Event: itemKey is not found');
      return;
    }
    const MSG = `${this.gameDatabase.item[itemKey].name}をゲットした`;
    this.overlap.showMsg(MSG);
  }
  recoverHp({amount, reason}) {
    if(!amount || !reason) {
      console.log('Error at recoverHp Event: amount or reason is not found');
      return;
    }
    const MSG = `${reason}HPを${amount}回復した`;
    this.overlap.showMsg(MSG);
  }
  loseHp({amount, reason}) {
    if(!amount || !reason) {
      console.log('Error at loseHp Event: amount or reason is not found');
      return;
    }
    const MSG = `${reason}HPを${amount}失った`;
    this.overlap.showMsg(MSG);
  }
  levelUp({lv}) {
    if(!lv) {
      console.log('Error at levelUp Event: lv is not found');
      return;
    }
    const MSG = `レベル${lv}になった`;
    this.overlap.showMsg(MSG);
  }
}

// アニメーションマネージャー
class GameManager {
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, transTime, pathToImg, keysId = KEYS_INTERFACE}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.gameDatabase = gameDatabase;
    this.transTime = transTime;
    this.pathToImg = pathToImg;
    this.keys = new Keys({...keysId});
    this.player;
    this.titleAnimation = new TittleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, gameDatabase: this.gameDatabase, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.battleAnimation = new BattleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, gameDatabase: this.gameDatabase, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.mapAnimation;

    EVENT_BUS.subscribe(EVENT.getItem, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.recoverHp, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.loseHp, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.drinkWater, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.takeNap, this.showFullMsg.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.handleEndBattle.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));
  }
  handlePlayerSelect({playerData}) {
    const PLAYER_SPRITES = {};
    for(let key of Object.keys(playerData.image)) {
      const IMAGE = new Image();
      IMAGE.src = this.pathToImg + playerData.image[key];
      PLAYER_SPRITES[key] = IMAGE;
    } 
    this.player = new Player({canvas:this.canvas, canvasContent: this.c, position: {x:0,y:0}, image:PLAYER_SPRITES.down , data: playerData, pathToImg: this.pathToImg, sprite:PLAYER_SPRITES});
    this.mapAnimation = new MapAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, gameDatabase: this.gameDatabase, player: this.player, keyEvent: this.keys, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.endTitleAnimation();
    this.startMapAnimation();
  }
  startTitleAnimation() {
    this.titleAnimation.animate();
  }
  endTitleAnimation() {
    this.titleAnimation.stopCurrAnimation();
  }
  startMapAnimation() {
    this.mapAnimation.animate();
    EVENT_BUS.publish(EVENT.mapStart, {});
    if(this.player.levelUp()) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.levelUp, {lv: this.player.data.lv});
      }, this.transTime)
    }
  }
  stopMapAnimation() {
    this.mapAnimation.stopCurrAnimation();
    EVENT_BUS.publish(EVENT.mapEnd, {});
  }
  startBattleAnimation() {
    this.battleAnimation.animate(this.player.data);
    EVENT_BUS.publish(EVENT.battleStart, {});
  }
  stopBattleAnimation() {
    this.battleAnimation.stopCurrAnimation();
  }
  handleEncounter() {
    this.stopMapAnimation();
    setTimeout(this.startBattleAnimation.bind(this), this.transTime)
  }
  handleEndBattle({playerData}) {
    if(!this.player.updateData(playerData)) {
      console.log('error at handleEndBattle in GameManager');
      return;
    };
    this.stopBattleAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.transTime)
  }
  showFullMsg() {
    this.mapAnimation.stopCurrAnimation();
    setTimeout(this.startMapAnimation.bind(this), this.transTime);
  }
}

// 各アニメーション
class Animation {
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keys, pathToImg, transTime}) {
    this.canvas = canvas;
    this.c = canvasContent;
    this.fps = fps;
    this.frameInterval = 1000 / this.fps;
    this.offSet = offSet;
    this.gameDatabase = gameDatabase;
    this.keys = keys;
    this.pathToImg = pathToImg;
    this.transTime = transTime;
    
    this.animationId;
    this.preTime = 0;
    this.currTime = 0;
    this.lag = 0;
  } 
  getLagTime() {
    // ゲームループのスピード調整
    // 前回の処理にによって生まれたラグを計算する。
    this.currTime = new Date().getTime();
    const ELAPSED_TIME = this.currTime - this.preTime;
    this.preTime = this.currTime;
    this.lag += ELAPSED_TIME;
  }
  animate() {
    this.preTime = new Date().getTime();
    this._animate();
  } 
  _animate() {
    this.animationId = window.requestAnimationFrame(this._animate.bind(this));
    this.getLagTime();
    while(this.frameInterval <= this.lag) {
      this._update();
      this.lag -= this.frameInterval;
    }

    this._render();
  }
  _update() {

  }
  _render() {

  }
  stopCurrAnimation() {
    window.cancelAnimationFrame(this.animationId);
  }
}
class TittleAnimation extends Animation {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, player, keyEvent, keys, pathToImg, transTime}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, player, keyEvent, keys, pathToImg, transTime});
    this.bg;
    this.player;
    this.playerSelectPage = false;
    this.positionXDiff;
    this.positionYDiff;
    this.drawWidthDiff;
    this.drawHeightDiff;

    EVENT_BUS.subscribe(EVENT.newGameStart, ()=>{
      this.playerSelectPage = true
    })
    EVENT_BUS.subscribe(EVENT.playerSetSex, this.setSex.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSetName, this.setName.bind(this));
    this.init();
  }
  setSex({key}) {
    const NEW_PLAYER_DATA = {...this.gameDatabase.player[key]};
    if(this.player.data.image.down === NEW_PLAYER_DATA.image.down) return;
    this.player.updateData(NEW_PLAYER_DATA);
  }
  setName({name}) {
    if(!this.player.editData({key: 'name', newValue: name})) {
      throw new Error('Error at editData in Character class');
    }
    EVENT_BUS.publish(EVENT.playerSelect, {playerData: this.player.data})
  }
  init() {
    // 固定背景の作成
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: 0,
        y: 0
      },
      image: IMG_BG,
      frames: {max: TittleAnimation.BG_FRAME},
      moving: TittleAnimation.BG_MOVING,
    });
    IMG_BG.src = TittleAnimation.BG_SRC;
    this.bg.updateDrawSize({width: this.canvas.width, height: this.canvas.height});
    this.positionXDiff = this.offSet.x - this.bg.position.x;
    this.positionYDiff = this.offSet.y - this.bg.position.y;
    this.drawWidthDiff = IMG_BG.width / TittleAnimation.BG_FRAME - this.canvas.width;
    this.drawHeightDiff = IMG_BG.height - this.canvas.height;
    const PLAYER_IMG = new Image();
    this.player = new Player({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x:0,
        y:0,
      },
      image: PLAYER_IMG,
      moving: true,
      movementDelay: 10,
      data: {...this.gameDatabase.player.male},
      pathToImg: this.pathToImg,
    })
    PLAYER_IMG.src = this.pathToImg + this.gameDatabase.player.male.image.down;
    console.log(this.player);
  }
  _update() {
    while(!this.drawWidthDiff || !this.drawHeightDiff) {
      this.drawWidthDiff = this.bg.width  - this.canvas.width;
      this.drawHeightDiff = this.bg.height - this.canvas.height;
    }
    const FRAME = Math.round(this.transTime / this.frameInterval * 10) / 10;

    let drawWidth = this.bg.drawWidth;
    let drawHeight = this.bg.drawHeight;
    let positionX = this.bg.position.x;
    let positionY = this.bg.position.y;

    if(this.playerSelectPage) {
      if(drawWidth !== this.bg.width) {
        drawWidth = Math.round(drawWidth +  Math.round(this.drawWidthDiff / FRAME * 10) / 10);
        if(this.bg.width < drawWidth) drawWidth = this.bg.width;
        drawHeight = Math.round( this.bg.height * drawWidth / this.bg.width * 10) / 10;
        if(this.bg.height < drawHeight) drawHeight = this.bg.height;
        this.bg.updateDrawSize({width: drawWidth, height: drawHeight});
      }
      if(positionX !== this.offSet.x) {
        positionX = Math.round( (drawWidth - this.canvas.width) * this.offSet.x  / (this.bg.width - this.canvas.width) * 10) / 10;
        if(positionX < this.offSet.x) positionX = this.offSet.x;
        positionY = Math.round( (drawHeight - this.canvas.height) * this.offSet.y  / (this.bg.height - this.canvas.height) * 10) / 10;
        if(positionY < this.offSet.y) positionY = this.offSet.y;
        this.bg.updatePosition({x: positionX, y: positionY});
      }
    }
  }
  _render() {
    this.bg.draw();
    if(!this.playerSelectPage || this.bg.drawWidth !== this.bg.width || this.bg.position.x !== this.offSet.x) return;
    this.player.draw();
  } 
  
}
class MapAnimation extends Animation {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  static FG_SRC = './img/map/map--foreground.png';
  static MAP_EVENT_INTERVAL = 3000;
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime, player}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
    this.player = player;
    this.listMovable = [];
    this.itemList = [];
    this.action = {
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
    this.item = {
      lastIndex: undefined,
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
    this.water = {
      lastIndex: undefined,
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
    this.nap = {
      lastIndex: undefined,
      lastTime: 0,
      interval: MapAnimation.MAP_EVENT_INTERVAL
    }
    // 衝突検出用マップ
    this.boundaryMap;
    this.pathMap;
    this.forestMap;
    this.itemMap;
    this.waterMap;
    this.napMap;
    // 固定背景
    this.bg;
    this.bgMoving = MapAnimation.BG_MOVING;
    this.fg;
    this.init();

    EVENT_BUS.subscribe(EVENT.levelUp, this.makeListItem.bind(this));
  }
  makeListItem({lv}) {
    if(!lv) throw new Error('Error at levelUp Event: lv is not found');
    // keyで管理
    const ITEM_DATABASE = this.gameDatabase.item;
    for(let key in ITEM_DATABASE) {
      if(ITEM_DATABASE[key].lv === lv) {
        this.itemList.push(key);
      }
    }
  }
  init() {
    // 衝突検出用マップの作成
    this.boundaryMap = makeMap({array: COLLISION, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.pathMap = makeMap({array: PATH, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.forestMap = makeMap({array: FOREST, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.itemMap = makeMap({array: ITEM, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.waterMap = makeMap({array: WATER, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.napMap = makeMap({array: NAP, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});

    // 固定背景の作成
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: this.offSet.x,
        y: this.offSet.y,
      },
      image: IMG_BG,
      frames: {max: MapAnimation.BG_FRAME},
      moving: this.bgMoving,
    });
    IMG_BG.src = MapAnimation.BG_SRC;
    const IMG_FG_OBJ = new Image();
    this.fg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: this.offSet.x,
        y: this.offSet.y,
      },
      image: IMG_FG_OBJ
    });
    IMG_FG_OBJ.src = MapAnimation.FG_SRC;

    this.makeListItem({lv: this.player.data.lv})

    // プレイヤーの動きに合わせて動かす物
    this.listMovable = [this.bg, this.fg, ...this.boundaryMap, ...this.pathMap, ...this.forestMap, ...this.itemMap, ...this.waterMap, ...this.napMap];
  }
  _update() {
    // アニメーションのアップデート
    let stepped = false;
    // プレイヤーが一歩歩き終わっていない時：
    if(this.player.moving && 0 < this.player.moved && this.player.moved < this.player.stepMove) {
      const NEXT_MOVE = this.player.getNextStepDirection();
      let colliding = false;
      for(let i = 0; i < this.boundaryMap.length; i++) {
        const BOUNDARY = this.boundaryMap[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_MOVE.y) * 10)/10;
        if(this.player.isColliding({...BOUNDARY, position: {x: X, y: Y}})) {
          colliding = true;
          break;
        }
      }
      // 歩ける範囲にいない場合：
      if(colliding) {
        this.player.stop();
      }
      // 歩ける場合：
      else {
        this.listMovable.forEach((movable) => {
          movable.updatePositionBy({x: -NEXT_MOVE.x, y: -NEXT_MOVE.y});
        })
        this.player.move();
        // 一歩の距離以上を歩いていたら
        if(this.player.stepMove <= this.player.moved) {
          stepped = true;
          this.player.step();
        }
      }
    }
    //  歩行を開始する時：
    else if(this.keys.lastKey) {
      switch(this.keys.lastKey) {
        case Keys.KEYS.down.name:
          this.player.changeStateTo(CHARACTER_STATE.down);
          break;
        case Keys.KEYS.up.name:
          this.player.changeStateTo(CHARACTER_STATE.up);
          break;
        case Keys.KEYS.left.name:
          this.player.changeStateTo(CHARACTER_STATE.left);
          break;
        case Keys.KEYS.right.name:
          this.player.changeStateTo(CHARACTER_STATE.right);
          break;
      }
      let colliding = false;
      const NEXT_MOVE = this.player.getNextStepDirection();
      for(let i = 0; i < this.boundaryMap.length; i++) {
        const BOUNDARY = this.boundaryMap[i];
        const X = Math.round((BOUNDARY.position.x - NEXT_MOVE.x) * 10)/10;
        const Y = Math.round((BOUNDARY.position.y - NEXT_MOVE.y) * 10)/10;
        if(this.player.isColliding({...BOUNDARY, position: {x: X, y: Y}})) {
          colliding = true;
          break;
        }
      }
      // 歩ける範囲にいない場合：
      if(colliding) {
        this.player.stop();
      }
      // 歩ける場合：
      else {
        this.listMovable.forEach((movable) => {
          movable.updatePositionBy({x: -NEXT_MOVE.x, y: -NEXT_MOVE.y});
        })
        this.player.move();
      }
    }
    //  キーボード/ボタンが押されていない場合＝プレイヤー停止
    else {
      this.player.stop();
    }

    let onPath = false;
    let onForest = false;
    //  プレイヤーが道を歩いている場合：1歩 ＝ 4px * 6frames 早歩き
    for(let i = 0; i < this.pathMap.length; i++) {
      const BOUNDARY = this.pathMap[i];
      if(this.player.isColliding(BOUNDARY)) {
        onPath = true;
        this.player.changeVelocity(4);
        break;
      }
    }
    if(!onPath) {
    //  プレイヤーが森を歩いている場合：1歩 ＝ 1px * 12frames　ゆっくり
    for(let i = 0; i < this.forestMap.length; i++) {
      const BOUNDARY = this.forestMap[i];
      if(this.player.isColliding(BOUNDARY)) {
        onForest = true;
        this.player.changeVelocity(1);
        break;
      }
    }
    //  プレイヤーが草原を歩いている場合：1歩 ＝ 2.4px * 5frames　デフォルト
    if(!onForest) {
      this.player.changeVelocity(2.4);
    }
    }

    // アイテムゲット
    if(this.item.lastTime === 0 || this.item.interval <= (this.currTime - this.item.lastTime)) {
      for(let i = 0; i < this.itemMap.length; i++) {
        const BOUNDARY = this.itemMap[i];
        if(this.player.isColliding(BOUNDARY)) {
          // 連続したアイテムゲットを防ぐ
          if(this.item.lastIndex - 2 <= i && i < this.item.lastIndex + 2) {
            break;
          }

          const ITEM_KEY = choiceRandom(this.itemList);
          if(this.player.addItem(ITEM_KEY)) {
            this.item.lastTime = this.currTime;
            this.action.lastTime = this.currTime;
            this.item.lastIndex = i;
            EVENT_BUS.publish(EVENT.getItem, { itemKey: ITEM_KEY });
            return;
          };
        }
      }
    }
    // HP回復イベント（HPがmaxじゃない時）
    if(this.player.data.hp !== this.player.data.maxHp) {
      // 水
      if(this.water.lastTime === 0 || this.water.interval <= (this.currTime - this.water.lastTime)) {
        for(let i = 0; i < this.waterMap.length; i++) {
          const BOUNDARY = this.waterMap[i];
          if(this.player.isColliding(BOUNDARY)) {
            // 連続をを防ぐ
            if(this.water.lastIndex - 1 <= i && i < this.water.lastIndex + 1) {
              break;
            }
            const RESULT = this.player.recoverHp();
            if(RESULT) {
              this.water.lastTime = this.currTime;
              this.action.lastTime = this.currTime;
              this.water.lastIndex = i;
              EVENT_BUS.publish(EVENT.recoverHp, { amount: RESULT.amount, reason: '水を飲んで' });
              return;
            };
          }
        }
      }
      // お昼寝
      if(this.nap.lastTime === 0 || this.nap.interval <= (this.currTime - this.nap.lastTime)) {
        for(let i = 0; i < this.napMap.length; i++) {
          const BOUNDARY = this.napMap[i];
          if(this.player.isColliding(BOUNDARY)) {
            // 連続をを防ぐ
            if(this.nap.lastIndex - 1 <= i && i < this.nap.lastIndex + 1) {
              break;
            }
            const RESULT = this.player.recoverHp(2);
            if(RESULT) {
              this.nap.lastTime = this.currTime;
              this.nap.lastIndex = i;
              console.log(RESULT.amount)
              EVENT_BUS.publish(EVENT.recoverHp, { amount: RESULT.amount, reason: 'お昼寝をして' });
              return;
            };
          }
        }
      }
    }

    if(stepped) {
      EVENT_BUS.publish(EVENT.step, {});
      if(this.player.levelUp()) {
        setTimeout(()=>{
          EVENT_BUS.publish(EVENT.levelUp, {lv: this.player.data.lv});
        }, this.transTime)
        return;
      }
      if(onPath) return;
      if(this.action.lastTime !== 0 && (this.currTime - this.item.lastTime) < this.item.interval) return;
      const RATIO = onForest? this.player.data.rateEncounter*2: this.player.data.rateEncounter;
      if(trueWithRatio(RATIO)) {
        console.log('battle');
        this.player.stop();
        this.keys.lastKey = undefined;
        // 通常アニメーション停止
        // this.stopCurrAnimation();
        EVENT_BUS.publish(EVENT.encounter, {});
      }
    }
  }
  _render() {
    this.bg.draw();
    this.boundaryMap.forEach(boundary=>{
      boundary.draw();
    })
    this.pathMap.forEach(boundary=>{
      boundary.draw();
    })
    this.forestMap.forEach(boundary=>{
      boundary.draw();
    })
    this.itemMap.forEach(boundary=>{
      boundary.draw();
    })
    this.waterMap.forEach(boundary=>{
      boundary.draw();
    })
    this.napMap.forEach(boundary=>{
      boundary.draw();
    })
    this.player.draw();
    this.fg.draw();
  }
}
class BattleAnimation extends Animation {
  static BG_SRC = './img/battle/bg_battle.png';
  static BG_FRAME = 1;
  static BG_MOVING = false;
  static PLAYER_IMG_SRC = 'mainMBack.png';
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
    this.bg;
    this.player;
    this.enemy;
    this.enemyList = [];
    this.init();
    EVENT_BUS.subscribe(EVENT.playerSelect, this.addEnemyList.bind(this));
    EVENT_BUS.subscribe(EVENT.levelUp, this.addEnemyList.bind(this));
    EVENT_BUS.subscribe(EVENT.run, this.run.bind(this));
    EVENT_BUS.subscribe(EVENT.setItem, this.setItem.bind(this))
  }
  addEnemyList({lv, playerData}) {
    if(lv) {
      // enemyDataで管理
      for(let enemy of this.gameDatabase.enemy[lv]) {
        this.enemyList.push(enemy);
      }
      return;
    }
    if(playerData) {
      for(let enemy of this.gameDatabase.enemy[playerData.lv]) {
        this.enemyList.push(enemy);
      }
      return;
    }
    throw new Error('Error at playerSelect / levelUp Event: lv or playerData not found')
  }
  init() {
    // 固定背景
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: 0,
        y: 0,
      },
      image: IMG_BG,
      frames: {max: BattleAnimation.BG_FRAME},
      moving: BattleAnimation.BG_MOVING
    });
    IMG_BG.src = BattleAnimation.BG_SRC;

    // プレイヤー
    const IMG_PLAYER = new Image();
    this.player = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_PLAYER,
      data: PLAYER_DATA_TYPE,
      pathToImg: this.pathToImg,
      bottom: Math.round(this.canvas.height * 0.3 * 10) / 10
    });
    IMG_PLAYER.src = this.pathToImg + BattleAnimation.PLAYER_IMG_SRC;
  }
  animate(playerData) {
    this.player.updateData(playerData);

    const ENEMY_DATA = {...choiceRandom(this.enemyList)};
    // 敵
    const IMG_ENEMY = new Image();
    this.enemy = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_ENEMY,
      data: ENEMY_DATA,
      isPlayer: false,
      pathToImg: this.pathToImg,
    });
    IMG_ENEMY.src = this.pathToImg + ENEMY_DATA.image.down;
    const COCKTAIL = ENEMY_DATA.cocktail.name;
    EVENT_BUS.publish(EVENT.battleReady, {cocktail: COCKTAIL})
    EVENT_BUS.publish(EVENT.battleDialog, {log: `${ENEMY_DATA.name}が現れた`, delay: 1000});
    EVENT_BUS.publish(EVENT.battleDialog, {log: `${COCKTAIL}を飲みたそうにしている`, delay: 1500});
    super.animate();
  }
  _update() {
    // console.log('update')
  }
  _render() {
    this.bg.draw();
    this.enemy.draw();
    this.player.draw();
  }
  dotsDialog() {
    EVENT_BUS.publish(EVENT.battleDialog, {log: '・・・'});
  }
  run() {
    this.dotsDialog();
    if(this.player.run()) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: '逃げ切ることができた！'});
        this.player.updateRecords({won: false, enemy: this.enemy})
        setTimeout(() => {
          EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data, enemy: this.enemy, log: this.enemy.data.name, beat: false});
        }, this.transTime)
      }, this.transTime)
    }else {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: '逃げ切れなかった...'});
        EVENT_BUS.publish(EVENT.failToRun, {});
      }, this.transTime)
    }
  }
  setItem({itemList}) {
    this.dotsDialog();
    EVENT_BUS.publish(EVENT.battleDialog, {log: `${itemList.map(item=>this.gameDatabase.item[item].name).join('、')}を混ぜた`});
    if(containsSame({list1: itemList, list2: this.enemy.data.cocktail.ingredient})) {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, {log: `${this.enemy.data.name}>こっこれは${this.enemy.data.cocktail.name}!美味しそう`});
        this.enemy.loseHp();
        this.player.updateRecords({won: true, enemy: this.enemy})
        setTimeout(()=> {
          EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data, enemy: this.enemy, log: this.enemy.data.name, beat: true});
        }, this.transTime)
      }, this.transTime)
    }else {
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleDialog, 
          {log: `${this.enemy.data.name}>こんなマズイもん飲めない！<br>攻撃を受けHPが1減った`});
        if(this.player.loseHp().hp === 0) {
          // game over
          console.log('game over');
        }
      }, this.transTime)
    }

  }
}

export {UIManager, MapUICtr, TitleUICtr, BattleUICtr, Log, AverageEncounter, UICount,Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, Keys, UI};