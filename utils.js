import { Boundary } from './classes.js';

function rectCollision({rect1, rect2}) {
  const RESULT = (rect2.position.x <= rect1.position.x + rect1.width && 
  rect1.position.x <= rect2.position.x + rect2.width &&
  rect2.position.y <= rect1.position.y + rect1.height &&
  rect1.position.y <= rect2.position.y + rect2.height);
  return RESULT;
}
function makeMap(array, canvas, canvasContent, offset) {
  const ARRAY_MAP = [];
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
function trueWithRatio(ratio) {
  const RANDOM_NUM = Math.random();
  if (RANDOM_NUM < ratio) {
      return true; 
  } else {
      return false; 
  }
}
function choiceRandom(array) {
  const INDEX = Math.round(Math.random() * (array.length - 1));
  const RESULT = array[INDEX];
  return RESULT;
}

export { rectCollision, makeMap, trueWithRatio, choiceRandom };
