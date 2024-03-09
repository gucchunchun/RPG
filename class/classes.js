import { KEYS_INTERFACE, UI_MGR_INTERFACE, CHARACTER_STATE, PLAYER_DATA_TYPE, ENEMY_DATA_TYPE, EVENT } from "../types.js";
import { COLLISION, PATH, FOREST, ITEM, WATER, NAP} from '../data/boundaries.js';
import { makeMap, trueWithRatio, choiceRandom, addOption, containsSame, scrollToBottom } from '../utils.js';
import { Boundary, Sprite, Character, Player, CharacterBattle } from './drawerClass.js';
import { EventBus } from './eventBus.js';
import { gsap } from '../node_modules/gsap/index.js';

// UIとゲームフローを分けるため
const EVENT_BUS = new EventBus();

// UI
class UI {
  constructor(elemId) {
    this.elemId = elemId;
    this.elem = document.getElementById(elemId);
  }
  setValue(value) {
    this.elem.innerHTML = value;
  }
}
class UICount extends UI {
  constructor(elemId, initNum) {
    super(elemId);
    this.num = initNum || 0;
    this.setValue(this.num);
  }
  setValue(value) {
    this.num = value;
    super.setValue(value);
  }
  countUp(amount) {
    this.setValue(amount? this.num + amount: this.num + 1);
  }
}
class AverageEncounter extends UI {
  constructor(elemId, step, encounter) {
    super(elemId);
    this.step = step || 0;
    this.encounter = encounter || 0;
  }
  _calculate() {
    if(this.encounter === 0) {
      return '???';
    }
    const AVERAGE = Math.round(this.step / this.encounter * 10)/10;
    this.elem.innerHTML = AVERAGE;
    return AVERAGE;
  }
  countUpStep() {
    this.step++;
    this.setValue(this._calculate());
  }
  countUpEncounter() {
    this.encounter++;
    this.setValue(this._calculate());
  }
  setStepEncounter(step, encounter) {
    this.step = step || this.step;
    this.encounter = encounter || this.encounter;
    this.setValue(this._calculate());
  }
}
class Log extends UI {
  constructor(elemId, className) {
    super(elemId);
    this.className = className;
  }
  addLog(log) {
    const P = document.createElement('p');
    P.className = this.className;
    P.innerHTML = log;
    this.elem.append(P);
    scrollToBottom(this.elem);
  }
  setLog(logList) {
    for(let log of logList) {
      this.addLog(log);
    }
    scrollToBottom(this.elem);
  }
  clearLog() {
    this.elem.innerHTML = '';
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
  constructor(elemId, itemDatabase) {
    this.itemCtr = new UI(elemId);
    this.itemDatabase = itemDatabase;
    this.itemList = [];
  }
  makeItemList(playerData) {
    this.itemList = addOption({parent: this.itemCtr.elem, childList: playerData.item, 
      multiAnswer: true, name: 'battleItem',
      classList: ['item'], itemDatabase: this.itemDatabase })
  }
  addItem(itemKey) {
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
  constructor(gameCtrUI, transTime) {
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
  constructor({ctrId, gameDatabase, transTime, styleSpace}) {
    this.ctrUI = new UI(ctrId);
    this.gameDatabase = gameDatabase;
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
class TitleUICtr extends UICtr {
  static BTN_CLASS = 'title-page__btn';
  static PLAYER_SEX_OPT = 'character-opt';
  constructor({ctrId, gameDatabase, titlePageCtrId, titlePageBtnCtrId, startNewGameBtnId, playerSelectCtrId, characterOptCtrId, playerNameId, nameErrMsgId, playerSelectBtnId, prevData, transTime, styleSpace}) {
    super({ctrId, gameDatabase, transTime, styleSpace});
    this.titlePageCtrUI = new UI(titlePageCtrId);
    this.titlePageBtnCtrUI = new UI(titlePageBtnCtrId);
    this.startNewGameBtnUI = new UI(startNewGameBtnId);
    this.playerSelectCtrUI = new UI(playerSelectCtrId);
    this.characterOptCtrUI = new UI(characterOptCtrId);
    this.playerNameUI = new UI(playerNameId);
    this.nameErrMsgUI = new UI(nameErrMsgId);
    this.playerSelectBtnUI = new UI(playerSelectBtnId);
    this.prevData = prevData;
    this.playerData = this.gameDatabase.player.male;
    this.name;
    this.continueBtn;

    this.playerCharacterOptList = addOption({parent: this.characterOptCtrUI.elem, childList: Object.keys(this.gameDatabase.player),
      multiAnswer: false, name: 'playerSelect', classList: [TitleUICtr.PLAYER_SEX_OPT], 
      itemDatabase: this.gameDatabase.player});

    this.startNewGameBtnUI.elem.addEventListener('click', this.handleNewGameBtnClick.bind(this));
    for(let opt of this.playerCharacterOptList) {
      opt.addEventListener('click', this.handleCharacterSelect.bind(this));
    }
    this.playerNameUI.elem.addEventListener('blur', this.handlePlayerNameInput.bind(this));
    this.playerSelectBtnUI.elem.addEventListener('click', this.handlePlayerSelectBtnClick.bind(this));
    
    EVENT_BUS.subscribe(EVENT.gameStart, this.handleGameStart.bind(this));
    EVENT_BUS.subscribe(EVENT.gameOver, this.handleGameOver.bind(this));
  }
  handleGameStart() {
    this._init();
    this._openCtr();
    this._openTitlePage();
  }
  handleGameOver() {
    setTimeout(() => {
      this.handleGameStart();
    }, this.transTime)
  }
  handleNewGameBtnClick() {
    EVENT_BUS.publish(EVENT.newGame);
    this._closeTitlePage();
    this._openPlayerSelectScreen();
  }
  handleContinueBtnClick() {
    this._closeTitlePage();
    this._closeCtr();
    EVENT_BUS.publish(EVENT.playerSelect, { playerData: this.prevData });
  }
  handleCharacterSelect(e) {
    const SELECTED_KEY =  e.target.value;
    const NEW_DATA = this.gameDatabase.player[SELECTED_KEY];
    const IMAGE_DOWN = NEW_DATA.image.down;
    if(IMAGE_DOWN === this.playerData.image.down) return;
    console.log(IMAGE_DOWN)
    EVENT_BUS.publish(EVENT.characterSelect, { imgSrc: IMAGE_DOWN })
    this.playerData = NEW_DATA;
  }
  handlePlayerNameInput(e) {
    const VALUE = e.target.value;
    const VALUE_LEN = VALUE.length;
    if(VALUE_LEN === 0 || 10 < VALUE_LEN) {
      this._setNameErrMsg('１〜１０字にしてください');
      this._disablePlayerSelectBtn();
      return
    }
    if(/\s/.test(VALUE)) {
      this._setNameErrMsg('スペースは使用できません');
      this._disablePlayerSelectBtn();
      return
    }
    this._setNameErrMsg('');
    this.name = VALUE;
    this._ablePlayerSelectBtn();
  }
  handlePlayerSelectBtnClick() {
    this.playerData.name = this.name;
    EVENT_BUS.publish(EVENT.playerSelect, { playerData: this.playerData });
    this._closePlayerSelectScreen();
    this._closeCtr();
  }
  _init() {
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
    this._closeCtr();
    gsap.set(this.titlePageCtrUI.elem,
      {
        display: 'none'
      }
    )
    gsap.set(this.playerSelectCtrUI.elem,
      {
        display: 'none'
      }
    )
    this.playerNameUI.elem.innerHTML = '';
    this._setNameErrMsg('');
    this.playerCharacterOptList[0].checked = true;
  }
  _openTitlePage() {
    gsap.fromTo(this.titlePageCtrUI.elem, 
      {
        display: '',
        opacity: 0
      },
      {
        display: '',
        opacity: 1,
        duration: this.transTime / 1000
      }
    )
  }
  _closeTitlePage() {
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
  _ablePlayerSelectBtn() {
    this.playerSelectBtnUI.elem.disabled = false;
  }
  _disablePlayerSelectBtn() {
    this.playerSelectBtnUI.elem.disabled = true;
  }
  _setNameErrMsg(msg) {
    this.nameErrMsgUI.elem.innerHTML = msg;
  }
}
class MapUICtr extends UICtr {
  static ENC_LOG_CLASS = 'playerInfo--log';
  constructor({ctrId, gameDatabase, sideCtrId, lvId, hpId, stepId, beatId, avgEncId, encLogCtrId, transTime, styleSpace}) {
    super({ctrId,gameDatabase, transTime, styleSpace});
    this.sideCtrUI = new UI(sideCtrId);
    this.lvCount = new UICount(lvId, 1);
    this.hpCount= new UICount(hpId);
    this.stepCount = new UICount(stepId);
    this.beatCount = new UICount(beatId);
    this.avgEncCount = new AverageEncounter(avgEncId);
    this.encLog = new Log(encLogCtrId, MapUICtr.ENC_LOG_CLASS);

    EVENT_BUS.subscribe(EVENT.gameStart, this.handleGameStart.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));
    EVENT_BUS.subscribe(EVENT.levelUp, this.handleLevelUp.bind(this));
    EVENT_BUS.subscribe(EVENT.step, this.handleStep.bind(this));
    EVENT_BUS.subscribe(EVENT.recoverHp, this.handleRecoverHp.bind(this));
    EVENT_BUS.subscribe(EVENT.attackSuccess, this.handleAttackSuccess.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.handleBattleEnd.bind(this));
  }
  handleGameStart() {
    this._init();
  }
  handlePlayerSelect({playerData}) {
    this._updatePlayerInfo(playerData);
  }
  handleLevelUp({lv}) {
    this.lvCount.setValue(lv);
  }
  handleStep() {
    console.log('step')
    this.stepCount.countUp();
    this.avgEncCount.countUpStep();
  }
  handleRecoverHp({amount}) {
    this.hpCount.countUp(amount);
  }
  handleAttackSuccess() {
    console.log('hi')
    console.log(this.beatCount.num)
    this.beatCount.countUp();
    console.log(this.beatCount.num)
  }
  handleEncounter({enemyData}) {
    this._mapEnd();
    this.avgEncCount.countUpEncounter();
    this.encLog.addLog(enemyData.name);
  }
  handleBattleEnd({playerData}) {
    console.log(playerData);
    this._updatePlayerInfo(playerData);
    this._mapStart();
  }
  _updatePlayerInfo(playerData) {
    this._mapStart();
    this.lvCount.setValue(playerData.lv);
    this.hpCount.setValue(playerData.hp);
    this.beatCount.setValue(playerData.beat);
    const STEP = playerData.step;
    this.stepCount.setValue(STEP);
    const ENEMY_DATABASE = this.gameDatabase.enemy;
    const ENEMY_LOG = playerData.enemy;
    const ENCOUNTER = ENEMY_LOG.length;
    this.avgEncCount.setStepEncounter(STEP, ENCOUNTER);
    if(ENCOUNTER === 0) return;
    const ENEMY_LIST = ENEMY_LOG.map(enemyKey => ENEMY_DATABASE[enemyKey].name);
    this.encLog.setLog(ENEMY_LIST);
  }
  _mapStart() {
    setTimeout(() => {
      this._openCtr();
      this._openSideCtr();
    }, this.transTime)
  }
  _mapEnd() {
    this._closeSideCtr();
    setTimeout(()=>{
      this._closeCtr();
    }, this.transTime)
  }
  _init() {
    gsap.set(this.sideCtrUI.elem, 
      {
        right: `-${this.sideCtrUI.elem.clientWidth}px`,
        opacity: 0, 
      }
    );
    this._closeCtr();
  }
  _openSideCtr() {
    gsap.fromTo(this.sideCtrUI.elem, 
      {
        right: `-${this.sideCtrUI.elem.clientWidth}px`,
        opacity: 0, 
      },
      {
        right: 0,
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
class BattleUICtr extends UICtr {
  constructor({ctrId, gameDatabase, bottomCtrId, fightOptId, runOptId, dialogCtrId, itemWinId, cocktailId, itemCtrId, itemSetBtnId, transTime, styleSpace}) {
    super({ctrId, gameDatabase, transTime, styleSpace});
    this.bottomCtrUI = new UI(bottomCtrId);
    this.fightOptUI = new UI(fightOptId);
    this.runOptUI = new UI(runOptId);
    this.diaLogCtrUI = new Log(dialogCtrId);
    this.itemWinUI = new UI(itemWinId);
    this.cocktailUI = new UI(cocktailId);
    this.itemCtr = new ItemCtr(itemCtrId, gameDatabase.item);
    this.itemSetBtnUI = new UI(itemSetBtnId);
    this.enemyName;
    this.cocktailName;

    this.openItemWindow = this._openItemWindow.bind(this); 
    this.closeItemWindowFunc = this._closeItemWindow.bind(this); 
    this.handleRunOptClick = this.handleRunOptClick.bind(this);

    this.fightOptUI.elem.addEventListener('click', this.openItemWindow);
    this.runOptUI.elem.addEventListener('click', this.handleRunOptClick);

    this.itemSetBtnUI.elem.addEventListener('click', this.handleItemSetBtnClick.bind(this));

    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));
    EVENT_BUS.subscribe(EVENT.getItem, this.handleGetItem.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.runSuccess, this.handleRunSuccess.bind(this));
    EVENT_BUS.subscribe(EVENT.runFail, this.handleRunFail.bind(this));
    EVENT_BUS.subscribe(EVENT.attackSuccess, this.handleAttackSuccess.bind(this));
    EVENT_BUS.subscribe(EVENT.attackFail, this.handleAttackFail.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.handleBattleEnd.bind(this));
    this._init();
  }
  handlePlayerSelect({playerData}) {
    this.itemCtr.makeItemList(playerData);
  }
  handleGetItem({itemKey}) {
    this.itemCtr.addItem(itemKey);
  }
  handleEncounter({enemyData}){
    this._init();
    this.enemyName = enemyData.name;
    this.cocktailName = enemyData.cocktail.name;
    this._setCocktailName(this.cocktailName);
    setTimeout(() => {
      this._openCtr();
      this._openBottomCtr();
      setTimeout(() => {
        this.diaLogCtrUI.addLog(`${this.enemyName}が現れた`);
        setTimeout(()=> {
          this.diaLogCtrUI.addLog(`${this.cocktailName}を飲みたそうにしている`);
          this._ableRunBtn();
        }, this.transTime)
      }, this.transTime)
    }, this.transTime)
  }
  handleRunSuccess() {
    this.diaLogCtrUI.addLog('・・・');
    setTimeout(() => {
      this.diaLogCtrUI.addLog('逃げ切ることができた');
    }, this.transTime)
  }
  handleRunFail() {
    this.diaLogCtrUI.addLog('・・・');
    setTimeout(() => {
      this.diaLogCtrUI.addLog('逃げ切れなかった');
    }, this.transTime)
  }
  handleRunOptClick() {
    EVENT_BUS.publish(EVENT.run, {});
    this._disableRunBtn();
  }
  handleAttackSuccess() {
    this.diaLogCtrUI.addLog('・・・');
    setTimeout(() => {
      this.diaLogCtrUI.addLog(`${this.enemyName}: こっこれは${this.cocktailName}!美味しそう`);
    }, this.transTime)
  }
  handleAttackFail() {
    this.diaLogCtrUI.addLog('・・・');
    setTimeout(() => {
      this.diaLogCtrUI.addLog(`${this.enemyName}: こんなマズイもん飲めない！<br>攻撃を受けHPが1減った`);
    }, this.transTime)
  }
  handleBattleEnd() {
    this._closeBottomCtr();
    this._closeCtr();
  }
  handleItemSetBtnClick() {
    const CHECKED_LIST = this.itemCtr.getCheckedItemName();
    this._closeItemWindow();
    this.diaLogCtrUI.addLog(`${CHECKED_LIST.map(itemKey => this.gameDatabase.item[itemKey].name).join('、')}を混ぜた`);
    EVENT_BUS.publish(EVENT.setItem, {itemList: CHECKED_LIST});
  }
  _init() {
    this._closeCtr();
    this._closeItemWindow();

    this.fightOptUI.elem.checked = false;
    this.runOptUI.elem.checked = false;
    this.runOptUI.elem.disabled = false;
    this._disableRunBtn();
    this.diaLogCtrUI.clearLog();
    this.enemyName = '';
    this.cocktailName = '';
  }
  _setCocktailName(cocktailName) {
    this.cocktailUI.elem.innerHTML = cocktailName;
  }
  _ableRunBtn() {
    this.runOptUI.elem.disabled = false;
  }
  _disableRunBtn() {
    this.runOptUI.elem.disabled = true;
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
    window.addEventListener('click', this.closeItemWindowFunc);
    this.fightOptUI.elem.removeEventListener('click', this.openItemWindowFunc);
  }
  _closeItemWindow(e) {
    if(e) {
      e.stopPropagation();
      if(this.itemWinUI.elem.contains(e.target)
      || this.fightOptUI.elem.closest('label').contains(e.target)) return;
    }
    gsap.set(`#${this.itemWinUI.elemId}`, 
    {
      display: 'none',
    })
    this.fightOptUI.elem.checked = false;
    window.removeEventListener('click', this.closeItemWindowFunc);
    this.fightOptUI.elem.addEventListener('click', this.openItemWindowFunc);
    this.itemCtr.resetChecked();
  }
}
class UIManager {
  constructor({
    UIDatabase = UI_MGR_INTERFACE,
    gameDatabase = null,
    transTime = 0,
    styleSpace = 0
  }) {
    this.gameCtrUI = new UI(UIDatabase.game.ctrId);
    this.titleMgr = new TitleUICtr({...UIDatabase.title, gameDatabase: gameDatabase, transTime: transTime, styleSpace: styleSpace});
    this.mapMgr = new MapUICtr({...UIDatabase.map, gameDatabase: gameDatabase, transTime: transTime, styleSpace: styleSpace});
    this.battleMgr = new BattleUICtr({...UIDatabase.battle, gameDatabase: gameDatabase, transTime: transTime, styleSpace: styleSpace});
    this.overlap = new Overlap(this.gameCtrUI, transTime);
    this.gameDatabase = gameDatabase;
    this.transTime = transTime;
    this.styleSpace = styleSpace;

    EVENT_BUS.subscribe(EVENT.playerSelect, this.overlapScreen.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.overlapScreen.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.overlapScreen.bind(this));

    EVENT_BUS.subscribe(EVENT.getItem, this.getItem.bind(this));
    EVENT_BUS.subscribe(EVENT.recoverHp, this.recoverHp.bind(this));
    EVENT_BUS.subscribe(EVENT.levelUp, this.levelUp.bind(this));
  }
  overlapScreen() {
    this.overlap.circle();
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
  levelUp({lv}) {
    if(!lv) {
      console.log('Error at levelUp Event: lv is not found');
      return;
    }
    const MSG = `レベル${lv}になった`;
    this.overlap.showMsg(MSG);
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
    this._clearCanvas();
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
  _clearCanvas() {
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  _stopCurrAnimation() {
    window.cancelAnimationFrame(this.animationId);
  }
}
class TitleAnimation extends Animation {
  static BG_SRC = './img/map/map.png';
  static BG_FRAME = 2;
  static BG_MOVING = true;
  static PLAYER_IMG_SRC = 'mainMFront.png';
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
    const IMG_BG = new Image();
    this.bg = new Sprite({
      canvas: this.canvas,
      canvasContent: this.c,
      position: {
        x: 0,
        y: 0
      },
      image: IMG_BG,
      frames: {max: TitleAnimation.BG_FRAME},
      moving: TitleAnimation.BG_MOVING,
    });
    IMG_BG.src = TitleAnimation.BG_SRC;
    this.player;
    this.playerSelectPage = false;
    // ゲームスタート開始時との差(_updateで使用)
    this.drawWidthDiff;
    this.drawHeightDiff;
    this.positionXDiff = this.offSet.x - this.bg.position.x;
    this.positionYDiff = this.offSet.y - this.bg.position.y;

    EVENT_BUS.subscribe(EVENT.gameStart, this.handleGameStart.bind(this));
    EVENT_BUS.subscribe(EVENT.newGame, this.handleNewGame.bind(this));
    EVENT_BUS.subscribe(EVENT.characterSelect, this.handleCharacterSelect.bind(this));
    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));
    EVENT_BUS.subscribe(EVENT.gameOver, this.handleGameOver.bind(this));
  }
  handleGameStart() {
    this._init();
    this._clearCanvas();
    this.animate();
  }
  handleNewGame() {
    this.playerSelectPage = true;
  }
  handleCharacterSelect({imgSrc}) {
    this.player.updateImg(this.pathToImg + imgSrc);
  }
  handlePlayerSelect() {
    this._stopCurrAnimation();
  }
  handleGameOver() {
    setTimeout(() => {
      this._init();
      this._clearCanvas();
      this.animate();
    }, this.transTime)
  }
  _init() {
    if(!this.player){
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
        data: {...PLAYER_DATA_TYPE},
        pathToImg: this.pathToImg,
      })
      PLAYER_IMG.src = this.pathToImg + TitleAnimation.PLAYER_IMG_SRC;
    }else {
      this.player.updateImg(this.pathToImg + TitleAnimation.PLAYER_IMG_SRC);
    }
    this.playerSelectPage = false;
    this.bg.updateDrawSize({width: this.canvas.width, height: this.canvas.height});
    this.bg.updatePosition({x: 0, y: 0});
  }
  _update() {
    if(!this.playerSelectPage) return;
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
    this.enemyList = [];
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
    
    this.boundaryMap = makeMap({array: COLLISION, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.pathMap = makeMap({array: PATH, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.forestMap = makeMap({array: FOREST, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.itemMap = makeMap({array: ITEM, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.waterMap = makeMap({array: WATER, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    this.napMap = makeMap({array: NAP, canvas: this.canvas, canvasContent: this.c, offset: this.offSet});
    
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
    
    this.listMovable = [this.bg, this.fg, ...this.boundaryMap, ...this.pathMap, ...this.forestMap, ...this.itemMap, ...this.waterMap, ...this.napMap];

    EVENT_BUS.subscribe(EVENT.levelUp, this.handleLevelUp.bind(this));
    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.battleEnd, this.handleBattleEnd.bind(this));

    this._makeEnemyList(this.player.data.lv);
    this._makeItemList(this.player.data.lv);
  }
  init() {
    // reset
    this.enemyList = [];
    this.itemList = [];
    this.action.lastTime = 0;
    this.item.lastTime = 0;
    this.water.lastTime = 0;
    this.nap.lastTime = 0;
  }
  handleLevelUp({lv}) {
    this._stopAnimationFor(this.transTime);
    this._makeEnemyList(lv);
    this._makeItemList(lv);
  }
  handleRecoverHp() {
    this._stopAnimationFor(this.transTime);
  }
  handleEncounter() {
    console.log('stop map animation')
    this._stopCurrAnimation();
  }
  handleBattleEnd({playerData}) {
    if(!this.player.updateData(playerData)) throw new Error('Fail to Update Player Data at MapAnimation.handleBattleEnd')
    setTimeout(() => {
      this._mapStart();
    }, this.transTime)
  }
  _mapStart() {
    super.animate();
    if(!this.player.levelUp()) return;
    setTime(() => {
      EVENT_BUS.publish(EVENT.levelUp, {lv: this.player.data.lv});
    }, this.transTime)
  }
  _stopAnimationFor(millisecond) {
    this._stopCurrAnimation();
    setTimeout(() => {
      this.animate();
    }, millisecond)
  }
  _makeEnemyList(lv) {
      const ENEMY_DATABASE = this.gameDatabase.enemy;
      const IS_LIST_EMPTY = this.enemyList.length === 0;
      for(let key in ENEMY_DATABASE) {
        if(IS_LIST_EMPTY) {
          // ゲームスタート時
          if(ENEMY_DATABASE[key].lv <= lv) {
            this.enemyList.push(key);
          }
        }else {
          if(ENEMY_DATABASE[key].lv === lv) {
            this.enemyList.push(key);
          }
        }
      }
  }
  _makeItemList(lv) {
      const ITEM_DATABASE = this.gameDatabase.item;
      const IS_LIST_EMPTY = this.itemList.length === 0;
      for(let key in ITEM_DATABASE) {
        if(IS_LIST_EMPTY) {
          // ゲームスタート時
          if(ITEM_DATABASE[key].lv <= lv) {
            this.itemList.push(key);
          }
        }else {
          if(ITEM_DATABASE[key].lv === lv) {
            this.itemList.push(key);
          }
        }
      }
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
            // OverlapMsgの表示を待つため
            this._stopAnimationFor(this.transTime);
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
              this.player.recoverHp(RESULT.amount);
              EVENT_BUS.publish(EVENT.recoverHp, { amount: RESULT.amount, reason: '水を飲んで' });
              // OverlapMsgの表示を待つため
              this._stopAnimationFor(this.transTime);
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
              this.player.recoverHp(RESULT.amount);
              EVENT_BUS.publish(EVENT.recoverHp, { amount: RESULT.amount, reason: 'お昼寝をして' });
              // OverlapMsgの表示を待つため
              this._stopAnimationFor(this.transTime);
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
        this.action.lastTime = new Date().getTime();
        const ENEMY_KEY = choiceRandom(this.enemyList);
        this.player.data.enemy.push(ENEMY_KEY);
        console.log(this.player.data)
        EVENT_BUS.publish(EVENT.encounter, {playerData: this.player.data, enemyData: this.gameDatabase.enemy[ENEMY_KEY]});
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
  static ENEMY_IMG_SRC = 'skeletonFront.png';
  constructor({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime}) {
    super({canvas, canvasContent, fps, offSet, gameDatabase, keyEvent, keys, pathToImg, transTime});
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
    const IMG_PLAYER = new Image();
    this.player = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_PLAYER,
      data: {...PLAYER_DATA_TYPE},
      pathToImg: this.pathToImg,
      bottom: Math.round(this.canvas.height * 0.3 * 10) / 10
    });
    IMG_PLAYER.src = this.pathToImg + BattleAnimation.PLAYER_IMG_SRC;
    const IMG_ENEMY = new Image();
    this.enemy = new CharacterBattle({
      canvas: this.canvas,
      canvasContent: this.c,
      image: IMG_ENEMY,
      data: {...ENEMY_DATA_TYPE},
      isPlayer: false,
      pathToImg: this.pathToImg,
    });
    IMG_ENEMY.src = this.pathToImg + BattleAnimation.ENEMY_IMG_SRC;

    EVENT_BUS.subscribe(EVENT.encounter, this.handleEncounter.bind(this));
    EVENT_BUS.subscribe(EVENT.run, this.handleRun.bind(this));
    EVENT_BUS.subscribe(EVENT.setItem, this.handleSetItem.bind(this))
  }
  handleEncounter({playerData, enemyData}) {
    if(!this.player.updateData(playerData)) throw new Error('Fail to Update Player Data at BattleAnimation.animate');
    if(!this.enemy.updateData(enemyData)) throw new Error('Fail to Update Enemy Data at BattleAnimation.animate');
    
    setTimeout(() => {
      console.log('battle animation');
      this._clearCanvas();
      super.animate();
    }, this.transTime)
  }
  handleRun() {
    if(this.player.run()) {
      EVENT_BUS.publish(EVENT.runSuccess, {});
      setTimeout(()=>{
        EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data});
        this._stopCurrAnimation();
      }, this.transTime * 2)
    }else {
      EVENT_BUS.publish(EVENT.runFail, {});
    }
  }
  handleSetItem({itemList}) {
    if(containsSame({list1: itemList, list2: this.enemy.data.cocktail.ingredient})) {
      const BEAT  = this.player.data.beat + 1
      this.player.editData('beat', BEAT);
      EVENT_BUS.publish(EVENT.attackSuccess, {});
      setTimeout(()=>{
        this.enemy.loseHp();
        setTimeout(()=> {
          EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data});
          this._stopCurrAnimation();
        }, this.transTime * 2)
      }, this.transTime)
    }else {
      EVENT_BUS.publish(EVENT.attackFail, {});
      setTimeout(()=>{
        if(this.player.loseHp().hp === 0) {
          setTimeout(() => {
            EVENT_BUS.publish(EVENT.gameOver, {});
          }, this.transTime * 2)
        }else {
          setTimeout(() => {
            EVENT_BUS.publish(EVENT.battleEnd, {playerData: this.player.data});
            this._stopCurrAnimation();
          }, this.transTime * 2)
        }
      }, this.transTime)
    }

  }
  _update() {
    // console.log('update')
  }
  _render() {
    this.bg.draw();
    this.enemy.draw();
    this.player.draw();
  }
}

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
    this.titleAnimation = new TitleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, offSet: this.offSet, gameDatabase: this.gameDatabase, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.battleAnimation = new BattleAnimation({canvas:this.canvas, canvasContent: this.c, fps: this.fps, gameDatabase: this.gameDatabase, keys: this.keys, pathToImg: this.pathToImg, transTime: this.transTime});
    this.mapAnimation;

    EVENT_BUS.subscribe(EVENT.playerSelect, this.handlePlayerSelect.bind(this));
    EVENT_BUS.subscribe(EVENT.gameOver, this.handleGameOver.bind(this));
  }
  gameStart() {
    this._init();
    EVENT_BUS.publish(EVENT.gameStart, {});
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
    // playerSelectのイベント発火後にmapAnimationが作成されるため
    setTimeout(() => {
      this._clearCanvas();
      this.mapAnimation.animate();
    }, this.transTime)
  }
  handleGameOver() {
    this._init();
  }
  saveData() {
    localStorage.setItem("prevData", JSON.stringify(this.player.data));
  }
  stopBattleAnimation() {
    this.battleAnimation._stopCurrAnimation();
  }
  _init() {
    this.player;
    this.mapAnimation;
  }
  _clearCanvas() {
    this.c.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

export {UIManager, MapUICtr, TitleUICtr, BattleUICtr, Log, AverageEncounter, UICount,Boundary, Sprite, Character, Player, CharacterBattle, GameManager, MapAnimation, Keys, UI};