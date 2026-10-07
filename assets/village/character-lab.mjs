import {mountCharacterRenderer} from './character-renderer.mjs';

const motions=[
  ['Idle','playing','idle-breathe'],
  ['Blink','playing','blink'],
  ['Look','playing','look-around'],
  ['Stretch','playing','stretch'],
  ['Walk','walking','walk'],
  ['Run','running','run'],
  ['Reaction','reaction','surprised']
];
const ids=['character-01','character-02','character-03'];
const lab=document.getElementById('lab');
for(const id of ids){
  const row=document.createElement('section');row.className='row';
  const title=document.createElement('div');title.className='id';title.textContent=id;row.append(title);
  for(const [label,state,motion] of motions){
    const cell=document.createElement('div');cell.className='cell';
    const player=document.createElement('div');player.className='player';
    const portrait=document.createElement('span');portrait.className='portrait game-character';
    player.append(portrait);
    const caption=document.createElement('div');caption.className='label';caption.textContent=label;
    cell.append(player,caption);row.append(cell);
    mountCharacterRenderer(portrait,{characterId:id,command:{characterId:id,state,motion,facing:'right',loop:true,engineVersion:'0.2.0'},sources:[]});
  }
  lab.append(row);
}
