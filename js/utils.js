import { Boundary } from '../class/drawerClass.js';

function areRectsColliding({rect1, rect2}) {
  const ARE_COLLIDING = (rect2.position.x <= rect1.position.x + rect1.width && 
  rect1.position.x <= rect2.position.x + rect2.width &&
  rect2.position.y <= rect1.position.y + rect1.height &&
  rect1.position.y <= rect2.position.y + rect2.height);
  return ARE_COLLIDING;
}
function makeMap({array, canvas, canvasContent, offset}) {
  const ARRAY_MAP = [];
  // 70 = タイルのカラム数
  for(let i = 0; i < array.length; i += 70) {
    ARRAY_MAP.push(array.slice(i, i + 70));
  }
  const MAP = [];
  ARRAY_MAP.forEach((row, rowIndex)=>{
    row.forEach((symbol, colIndex)=>{
      if(symbol != 0) {
        MAP.push(new Boundary({
          canvas: canvas,
          canvasContent: canvasContent,
          position: {
            x: colIndex * Boundary.WIDTH + offset.x,
            y: rowIndex * Boundary.HEIGHT + offset.y
          }
        }))
      }
    })
  })
  return MAP;
}
function isTrueWithProbability(ratio) {
  const RANDOM_NUM = Math.random();
  if(RANDOM_NUM <= ratio) return true;
  return false;
}
function randomChoiceFromArray(array) {
  const CHOSEN_INDEX = Math.round(Math.random() * (array.length - 1));
  const CHOSEN_ELEMENT = array[CHOSEN_INDEX];
  return CHOSEN_ELEMENT;
}
function addOption({parent, childList, multiAnswer, name, classList, optionDatabase}) {
  const NODE_LIST = [];
  let type = 'radio';
  if(multiAnswer) {
    type = 'checkbox';
  }
  for(let child of childList) {
    const LABEL = document.createElement('label');
    if(classList) {
      LABEL.className = classList.join(' ');
    }
    LABEL.classList.add('option__label');
    const SPAN = document.createElement('span');
    SPAN.innerHTML = optionDatabase? optionDatabase[child].name : child;
    LABEL.appendChild(SPAN);
    const INPUT = document.createElement('input');
    INPUT.id = child;
    INPUT.name = name;
    INPUT.type= type;
    INPUT.value = child;
    INPUT.classList.add('option__input');
    LABEL.appendChild(INPUT);
    parent.appendChild(LABEL);
    NODE_LIST.push(INPUT);
  }
  return NODE_LIST;
}
function getCheckedValue(inputList) {
  const VALUE = [];
  for(let input of inputList) {
    if(input.checked) VALUE.push(input.value);
  }
  return VALUE;
}
function removeChecked(inputList) {
  for(let input of inputList) {
    if(input.checked) input.checked = false;
  }
}
function containsSame({list1, list2}) {
  if(list1.length !== list2.length) return false;
  const SORTED_LIST1 = list1.slice().sort();
  const SORTED_LIST2 = list2.slice().sort();
  for(let i = 0; i < SORTED_LIST1.length; i++) {
    if(SORTED_LIST1[i] !== SORTED_LIST2[i]) return false;
  }
  return true;
}
function addBattleDialog(battleDialogCtr, text) {
  const P = document.createElement('p');
  P.innerHTML = text;
  P.className = 'battle-dialog';
  battleDialogCtr.appendChild(P);
  scrollToBottom(battleDialogCtr)
}
function scrollToBottom(elem) {
  const SCROLL_HEIGHT = elem.scrollHeight;
  const HEIGHT = elem.offsetHeight;
  elem.scrollTo({
    top: SCROLL_HEIGHT - HEIGHT,
  });
}
function isNumCloseToTargetNum(num, targetNum, criteria) {
  if(isNaN(num) || isNaN(targetNum) || isNaN(criteria)) throw new Error('Arguments should be Numbers');
  if(targetNum - criteria <= num && num < targetNum + criteria) return true;
  return false;
}
export { isNumCloseToTargetNum, areRectsColliding, makeMap, isTrueWithProbability, randomChoiceFromArray, addOption, getCheckedValue, containsSame, removeChecked, addBattleDialog, scrollToBottom };
