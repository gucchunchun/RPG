import { Sprite, Player } from './classes.js';

const DisplayBattleMsg = document.getElementById('displayBattleMsg');

const ENEMY_POSITION = {
  x: 0,
  y: 0
}
const PLAYER_POSITION = {
  x: 0,
  y: 0
}
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

function animateBattle(player) {
  window.requestAnimationFrame(animateBattle);
  BG_BATTLE.draw();

}

export { animateBattle };