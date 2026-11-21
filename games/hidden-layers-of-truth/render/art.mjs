export const cast = {
  sami: ['سامي', '#345d66', '#b77c5b', '#22252a', 'إنت في الحكاية', '#9ad2d6'],
  lina: ['لينا', '#715b50', '#c4835e', '#291e27', 'تتثبّت في الحسابات', '#f1bf89'],
  adam: ['آدم', '#53674b', '#b8815a', '#252d2b', 'صاحبك في الجمعيّة', '#bfd397'],
  youssef: ['يوسف', '#435075', '#a87151', '#2e2827', 'من فريق الجمعيّة', '#bac9ff'],
  maryam: ['مريم', '#895e71', '#ce9672', '#422c40', 'أخت سامي', '#f0b2cb'],
  amina: ['أمينة', '#537b74', '#9f654b', '#302b32', 'متطوّعة في الجمعيّة', '#8cddc1'],
  hala: ['هالة', '#895e71', '#a66a50', '#40272a', 'كانت في الاجتماع', '#f3c0aa'],
  moncef: ['منصف', '#575e66', '#c08054', '#312c29', 'كان في الاجتماع', '#c9d1da'],
};

const W = 480;
const H = 224;

function painter(ctx) {
  function box(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
  function poly(points, color) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function glow(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    box(x - radius, y - radius, radius * 2, radius * 2, gradient);
  }
  function noise(x, y, w, h, count, color, seed = 19) {
    for (let i = 0; i < count; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const px = seed % w;
      const py = (seed >>> 12) % h;
      box(x + px, y + py, (seed % 3) + 1, 1, color);
    }
  }
  return { box, poly, glow, noise };
}

function skyline({box, poly, noise}, x, y, w, h, warm = false) {
  box(x, y, w, h, warm ? '#384b55' : '#243843');
  noise(x, y, w, h, 170, '#b8bbc51c');
  const units = Math.floor(w / 19);
  for (let i = 0; i < units; i++) {
    const bx = x + i * 19;
    const bh = Math.floor(h * (0.27 + (i * 7 % 9) / 22));
    const by = y + h - bh;
    box(bx, by, 16 + i % 3, bh, ['#1a2935', '#20313a', '#33414a'][i % 3]);
    box(bx + 1, by - 2, 16, 3, '#4e5359');
    if (i % 3 === 1) {
      box(bx + 6, by - 11, 1, 9, '#5d6165');
      poly([[bx, by-7],[bx+11,by-8],[bx+12,by-6]], '#515762');
    }
    for (let wy = by + 6; wy < y + h - 3; wy += 9) {
      box(bx + 3, wy, 4, 3, (wy + i) % 4 ? '#101b24' : '#d59555');
      box(bx + 11, wy, 4, 3, (wy + i) % 5 ? '#19232c' : '#e4a965');
    }
  }
}

function windowFrame(p, x, y, w, h, warm) {
  const {box, noise} = p;
  box(x-8, y-8, w+16, h+16, warm ? '#5b5149' : '#1b2a32');
  skyline(p, x, y, w, h, warm);
  noise(x, y, w, h, 200, '#a5cbc62e');
  box(x+w/2-2, y, 4, h, '#161f26');
  box(x, y+h/2, w, 3, '#17232c');
  box(x-10, y+h, w+20, 5, warm ? '#827365' : '#3e4d51');
}

function floor({box, poly, noise}, y, base, seam) {
  box(0, y, W, H-y, base);
  for (let i=-2; i<12; i++) poly([[i*49,y],[i*49+1,y],[(i-3)*80,H],[(i-3)*80-2,H]], seam);
  for (const row of [6, 17, 31, 52]) if (y+row < H) box(0,y+row,W,1,seam);
  noise(0,y,W,H-y,400,'#9d887817');
}

function plant(p,x,y) {
  const {box, poly} = p;
  poly([[x-9,y-15],[x+11,y-15],[x+7,y],[x-5,y]], '#9a674d');
  box(x-10,y-16,22,3,'#c38c64');
  box(x,y-41,2,27,'#576b50');
  for (let i=0;i<4;i++) {
    const sign = i%2 ? 1 : -1;
    const py = y-21-i*6;
    poly([[x,py],[x+sign*4,py-10],[x+sign*(13+i),py-13],[x+sign*9,py-4]], i%2 ? '#637457' : '#465b4e');
  }
}

function desk({box, poly, noise}, x, y, w) {
  poly([[x+9,y-15],[x+w-10,y-15],[x+w,y],[x,y]], '#695247');
  box(x,y,w,5,'#392d2c');
  box(x+8,y+5,6,42,'#2a292c');
  box(x+w-14,y+5,6,42,'#302b2a');
  noise(x+10,y-13,w-20,10,60,'#c2946b2b');
}

function tiledWall(p, y, color) {
  const {box, noise} = p;
  box(0,0,W,y,color);
  noise(0,0,W,y,700,'#cfbda51c');
  box(0,y-26,W,2,'#c2a08735');
  for (let x=0;x<W;x+=11) {
    box(x,y-20,1,16,'#2b333985');
    box(x+4,y-17,3,8,'#d4a77132');
  }
  box(0,y-3,W,3,'#242d35');
}

function room(p) {
  const {box, poly, glow, noise} = p;
  tiledWall(p,155,'#28383e');
  floor(p,155,'#28343b','#1d272f');
  windowFrame(p,275,22,135,91,false);
  box(261,13,165,2,'#6e6c63');
  poly([[264,15],[282,15],[288,107],[263,124]],'#3f4e52');
  poly([[407,15],[424,15],[429,126],[403,113]],'#3c4a4d');
  noise(275,22,135,91,150,'#a1c4be20');
  box(26,42,149,4,'#665f55');
  for (let x=31;x<168;x+=13) box(x,29-x%7,10,13+x%7,['#535b5e','#785950','#837354'][x%3]);
  box(211,101,32,42,'#232b2d');
  box(215,105,24,33,'#5f665a');
  box(219,111,15,13,'#8d8a64');
  desk(p,57,155,194);
  box(144,114,53,32,'#181f25');
  box(148,118,45,24,'#547977');
  for(let i=0;i<4;i++) box(152,122+i*4,33-i*4,1,'#a0bca4');
  box(139,146,64,3,'#a69d80');
  box(87,141,13,7,'#161e25');
  box(89,142,9,4,'#9bbab2');
  box(225,138,12,9,'#c2ab85');
  box(226,139,8,1,'#585c5a');
  // Keys next to the phone.
  box(103,144,5,3,'#bfa36f');
  box(107,145,7,1,'#d4b783');
  box(112,146,2,1,'#bfa36f');
  box(58,102,3,44,'#6a5b4d');
  poly([[51,91],[67,91],[72,106],[45,106]],'#c69562');
  glow(59,107,87,'#f9ba6242');
  plant(p,449,168);
  poly([[271,179],[403,179],[438,218],[251,218]],'#434c50');
  poly([[272,183],[399,183],[426,212],[260,212]],'#70594f');
  for(let x=274;x<411;x+=10) box(x,194,7,3,'#d49d6b59');
}

function office(p) {
  const {box, poly, glow, noise} = p;
  tiledWall(p,153,'#4e554f');
  floor(p,153,'#3c4448','#2b353a');
  windowFrame(p,29,22,104,80,true);
  glow(81,78,125,'#cfaa7040');
  box(295,22,99,63,'#302d2a');
  box(299,26,91,55,'#857254');
  for (let i=0;i<6;i++) {
    const x=303+(i%3)*26, y=30+Math.floor(i/3)*22;
    box(x,y,19+i%3,16,'#c3b49a');
    box(x+2,y+5,13,1,'#6b6757');
    box(x+2,y+9,10,1,'#81796a');
  }
  box(188,16,65,113,'#242e35');
  box(193,21,56,108,'#323e42');
  box(197,27,48,94,'#51605c');
  box(235,80,6,2,'#c29059');
  box(416,78,45,70,'#393536');
  box(420,80,36,22,'#77796e');
  for(let y=108;y<145;y+=12) box(418,y,38,2,'#878172');
  desk(p,53,153,158);
  poly([[85,144],[111,144],[116,151],[86,151]],'#e0caa9');
  box(150,134,38,13,'#8f9488');
  box(155,130,26,7,'#aaa99b');
  box(159,144,24,2,'#303f41');
  for(let x=305;x<391;x+=32) {
    box(x,141,25,21,'#2e3b40');
    box(x+2,143,21,6,'#546165');
    box(x+1,159,4,23,'#252e35');
    box(x+19,159,4,23,'#252e35');
  }
  plant(p,17,147);
  noise(1,1,478,140,350,'#f4d4a51b');
}

function street(p, opening = false) {
  const {box, poly, glow, noise} = p;
  skyline(p,0,0,W,148);
  floor(p,148,'#25333d','#182631');
  poly([[0,64],[96,36],[181,79],[181,172],[0,191]],'#454849');
  poly([[0,82],[97,49],[164,86],[164,163],[0,176]],'#655b52');
  for(let x=9;x<157;x+=31) {
    box(x,96-x%9,18,38,'#272e34');
    box(x+3,100-x%9,11,25,x%2 ? '#72604c' : '#343a3b');
  }
  poly([[279,64],[480,24],[480,171],[279,158]],'#564843');
  box(310,69,170,78,'#242a30');
  for(let y=74;y<146;y+=5) box(316,y,164,1,'#545658');
  poly([[291,64],[480,42],[480,65],[284,84]],'#977457');
  for(let x=296;x<480;x+=23) poly([[x,63-(x-296)/9],[x+12,62-(x-296)/9],[x+8,79-(x-296)/9],[x-8,81-(x-296)/9]],'#674f44');
  box(245,70,4,95,'#131b20');
  box(239,70,17,5,'#ddad71');
  glow(246,79,85,'#ff9d3855');
  glow(402,125,130,'#f1a65738');
  noise(0,169,W,54,500,'#d4a57335');
  for(let i=0;i<14;i++) box(165-i*4,169+i*4,12+i%3*4,1,'#d8ad7845');
  if (opening) {
    // A pool of streetlight broken up by the wet paving.
    poly([[243,158],[252,158],[281,224],[204,224]], '#d1975331');
    for (let row = 0; row < 16; row++) {
      const width = 6 + row * 3;
      const x = 247 - width / 2 + (row * 7 % 9) - 4;
      box(x, 159 + row * 4, width, row % 3 === 0 ? 2 : 1, row % 2 ? '#ffc17862' : '#8bb9be45');
    }
    box(306,73,76,12,'#372d2c');
    box(308,73,72,1,'#c48f61');
    for (let x = 313; x < 376; x += 6) box(x,77,2,4,'#eab377');
    glow(339,77,44,'#f4a55e37');
    poly([[0,34],[98,51],[199,56],[199,57],[97,52],[0,35]],'#151b235e');
  }
}

function cafe(p) {
  const {box, poly, glow, noise} = p;
  tiledWall(p,152,'#665347');
  floor(p,152,'#493c37','#393239');
  windowFrame(p,31,29,136,86,false);
  for(let y=39;y<116;y+=19) box(31,y,136,2,'#292b33');
  box(209,102,271,44,'#47352f');
  box(205,101,275,4,'#a37458');
  box(304,53,148,5,'#533b35');
  for(let x=309;x<443;x+=17) {
    box(x,41-x%5,10,12+x%5,'#765c42');
    box(x+1,45-x%5,7,4,'#b69d76');
  }
  box(390,80,54,23,'#786c57');
  box(397,85,13,7,'#22262a');
  box(430,85,7,4,'#cf8c57');
  for(const x of [95,244,402]) {
    box(x,0,2,30,'#292528');
    poly([[x-3,29],[x+5,29],[x+14,44],[x-11,44]],'#985b3f');
    box(x-10,44,23,3,'#f4b26d');
    glow(x+1,48,97,'#ffb56158');
  }
  for(const [x,y,w] of [[49,173,82],[174,156,85],[316,157,122]]) {
    desk(p,x,y,w);
    box(x+w/2,y-19,10,6,'#d7bca0');
    box(x+w/2+8,y-18,4,3,'#b9a38e');
    box(x+w/2-1,y-13,14,1,'#a99782');
  }
  noise(0,40,480,136,460,'#ffd09b23');
}

const gestures = {
  sami: [0, 1, 3, 3, 1, 0, 0, 0],
  lina: [0, 2, 6, 5, 3, 2, 0, 0],
  adam: [0, 0, 1, 2, 2, 0, 0, 0],
  youssef: [0, 3, 6, 7, 4, 2, 1, 0],
  maryam: [0, 1, 3, 4, 3, 1, 0, 0],
};

function sprite(ctx, name, x, y, face, muted, motion, stride, sipping) {
  const [,shirt,skin,hair] = cast[name];
  ctx.save();
  ctx.globalAlpha = muted ? 0.78 : 1;
  ctx.translate(x,y);
  ctx.scale(face,1);
  const {box,poly} = painter(ctx);
  box(-13,0,26,3,'#15171d58');
  poly([[-8,-20],[-2,-20],[-1 + stride,-2],[-7 + stride,-2]],'#1a242c');
  poly([[3,-20],[9,-20],[9 - stride,-2],[3 - stride,-2]],'#222d33');
  box(-10 + stride,-3,9,4,'#10191e');
  box(3 - stride,-3,11,4,'#131c20');

  const pose = motion > 0 ? Math.floor(motion / 2) % 8 : 0;
  const bob = pose >= 2 && pose <= 5 ? -1 : 0;
  ctx.translate(0,bob);
  poly([[-8,-38],[7,-38],[12,-30],[12,-15],[-11,-15],[-12,-30]],shirt);
  box(-10,-30,2,13,'#ffffff20');
  const hand = (gestures[name] ?? gestures.sami)[pose];
  if (sipping) {
    poly([[10,-29],[13,-27],[16,-36],[11,-39],[8,-33]],skin);
    box(9,-42,8,6,'#e9d3ad');
    box(16,-41,3,3,'#bd9070');
  } else if (hand) {
    poly([[8,-26],[11,-27],[13 + hand,-25 - hand],[12 + hand,-22 - hand],[10,-22]],skin);
  } else {
    box(8,-25,4,11,skin);
  }

  box(-5,-51,13,14,skin);
  box(-7,-48,3,8,skin);
  box(-6,-53,13,6,hair);
  box(-7,-51,4,9,hair);
  if (name==='maryam' || name==='lina' || name==='amina') box(-7,-47,4,12,hair);
  if (name==='youssef') box(3,-43,5,4,hair);
  if (name==='adam') box(4,-47,5,1,'#263136');
  box(5,-47,2,2,'#13181e');
  if (motion % 3 === 1) box(5,-41,3,2,'#673c38');
  else box(5,-40,3,1,'#673c3866');
  ctx.restore();
}

const scenes = {room, office, street, cafe};
const sceneLayers = new Map();

function sceneLayer(canvas, key, paint) {
  if (sceneLayers.has(key)) return sceneLayers.get(key);
  const layer = canvas.ownerDocument.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const ctx = layer.getContext('2d');
  paint(painter(ctx), ctx);
  sceneLayers.set(key, layer);
  return layer;
}

function sceneDetails(ctx, place, sceneId, time, interaction) {
  const {box, glow} = painter(ctx);
  if (place === 'room') {
    glow(341,68,97,interaction === 'window' ? '#72c9f250' : '#72c9f224');
    for (let i = 0; i < 22; i++) {
      const y = 26 + ((i * 37 + Math.floor(time / 23)) % 81);
      box(278 + (i * 31) % 124, y, 1, 3 + i % 4, '#badbf470');
    }
  }
  if (place === 'room' && sceneId === 'intro' && time < 3400) {
    if (Math.floor(time / 390) % 2 === 0) {
      glow(93,144,24,'#9cdac06e');
      box(89,142,9,4,'#cae7cc');
    }
  }
  if (place === 'cafe' && sceneId !== 'adam-story') {
    for (const [index, x] of [216,377].entries()) {
      if (!index && interaction === 'cup' && time > 210 && time < 850) continue;
      const rise = (Math.floor(time / 130) + index * 3) % 9;
      box(x + (rise % 3) - 1, 133 - rise * 2, 3, 2, '#e9c9a066');
      box(x + (rise % 3) + 2, 131 - rise * 2, 2, 1, '#e9c9a038');
    }
  }
  if (place === 'street') {
    const glint = Math.floor(time / 180) % 12;
    box(237 + glint,161 + glint * 4,7 + glint,1,'#e9bc795c');
  }
  if (place === 'office') {
    if (sceneId === 'morning') {
      const offset = Math.round(Math.max(0, 1 - time / 650) * 14);
      box(360 + offset,149,3,21,'#ac7956');
      box(360 + offset,161,14,3,'#cd9866');
      box(371 + offset,164,2,9,'#917058');
    }
    for (const [x,y] of [[373,173], [396,175], [390,161]]) {
      box(x,y,20,12,'#a8784c');
      box(x,y,20,2,'#c09160');
      box(x+8,y,3,12,'#dcba82');
    }
  }
}

export function drawScene(canvas, place, sceneId, speaker, samiX = place === 'room' ? 249 : 145, motion = 0, stride = 0, sceneTime = 0, interaction) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const opening = sceneId === 'splash';
  const background = sceneLayer(canvas, opening ? 'opening' : place, p => scenes[place](p, opening));
  const atmosphere = sceneLayer(canvas, 'atmosphere', (p, layer) => {
    p.noise(0,0,W,H,2000,'#d5cfba0c');
    const shade = layer.createRadialGradient(W/2,H/2,66,W/2,H/2,260);
    shade.addColorStop(0,'#fff1d208');
    shade.addColorStop(1,'#080f1ba8');
    p.box(0,0,W,H,shade);
  });
  ctx.drawImage(background, 0, 0);
  sceneDetails(ctx, place, sceneId, sceneTime, interaction);

  const featured = {
    room: sceneId === 'home' || sceneId === 'mirror' || speaker === 'maryam' ? [['maryam',307,169,-1]] : [],
    office: [['lina',237,170,1],['adam',270,173,-1],['youssef',321,177,-1],['hala',415,175,-1],['moncef',448,177,-1]],
    street: opening ? [] : [['amina',212,170,-1]],
    cafe: [['adam',351,159,-1]],
  };
  let people = sceneId === 'adam-story'
    ? [['adam',204,167,1], ['youssef',258,167,-1]]
    : [...featured[place], ['sami',samiX,189,1]];
  if (place === 'office') {
    // Witness movement reflects what Sami chose to say in the meeting.
    const walking = sceneId === 'morning' || sceneId === 'wait';
    const distance = Math.round(Math.min(sceneTime / 1400, 1) * 42);
    people = people.map(([name, x, y, face]) => {
      if (name !== 'hala' && name !== 'moncef') return [name, x, y, face];
      if (sceneId === 'wait') return [name, x + distance, y, 1];
      if (sceneId === 'morning') return [name, x - distance, y, -1];
      if (sceneId === 'challenge') return [name, x - 13, y + 4, -1];
      if (sceneId === 'clarify') return [name, x - 22, y + 4, -1];
      return [name, x, y, face];
    });
    if (walking) people = people.filter(([, x]) => x < W + 14);
  }
  const active = people.find(person => person[0] === speaker);
  for (const [name, x, y, face] of people) {
    const witnessWalking = ['hala', 'moncef'].includes(name) && ['morning', 'wait'].includes(sceneId) && sceneTime < 1400;
    const sipping = name === 'sami' && interaction === 'cup' && sceneTime > 210 && sceneTime < 850;
    sprite(ctx, name, x, y, face, active && name !== speaker, name === speaker ? motion : 0,
      name === 'sami' ? stride : witnessWalking ? Math.round(Math.sin(sceneTime / 60) * 4) : 0, sipping);
  }
  ctx.drawImage(atmosphere, 0, 0);
  if (active) {
    const [name,x,y] = active;
    const p = painter(ctx);
    p.poly([[x,y-59],[x-5,y-65],[x-5,y-71],[x+5,y-71],[x+5,y-65]], '#111c24');
    p.poly([[x,y-61],[x-3,y-66],[x-3,y-69],[x+3,y-69],[x+3,y-66]], cast[name][5]);
  }
}

export function drawPortrait(canvas, speaker, mood, motion = 0) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const [,shirt,skin,hair] = cast[speaker];
  const {box,poly,glow,noise} = painter(ctx);
  box(0,0,48,48,'#152930');
  glow(16,17,34,'#af84644d');
  poly([[3,48],[5,39],[16,33],[32,33],[42,40],[45,48]],shirt);
  box(20,27,10,10,skin);
  poly([[14,10],[34,10],[37,19],[34,29],[26,33],[20,30],[15,25]],skin);
  box(14,13,4,13,'#28202048');
  poly([[11,13],[15,6],[31,5],[37,9],[38,15],[30,13],[20,15],[16,23],[12,22]],hair);
  if (['maryam','lina','amina','hala'].includes(speaker)) box(12,14,5,17,hair);
  if (speaker==='adam') {
    box(20,17,7,2,'#213035');
    box(28,17,8,2,'#213035');
    box(20,19,1,4,'#213035');
    box(34,19,1,3,'#213035');
  }
  if (speaker==='lina') box(16,25,2,4,'#efbe88');
  if (speaker==='maryam') poly([[9,27],[15,30],[20,39],[33,35],[33,39],[17,43],[9,36]],'#b983a0');
  if (speaker==='youssef') poly([[16,25],[22,28],[33,25],[35,27],[28,33],[21,32]],hair);
  const blink = motion > 0 && motion % 17 === 0;
  box(22,19,3,blink ? 1 : 2,'#231e21');
  box(31,18,3,blink ? 1 : 2,'#231e21');
  if (mood==='tense') {
    box(21,16,3,1,hair);
    box(25,17,2,1,hair);
  }
  if (mood==='sad') {
    box(22,17,2,1,hair);
    box(24,16,2,1,hair);
  }
  box(28,26,4,motion % 3 === 1 ? 3 : 1,mood==='warm' ? '#e3b69a' : '#734a46');
  if (mood==='warm') box(32,25,2,1,'#e3b69a');
  noise(0,0,48,48,165,'#faf0dc16');
}
