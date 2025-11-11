import './style.css';

const heroes = [
  {
    id: 'guardian',
    name: '빛의 수호자',
    emoji: '🛡️',
    description: '느리지만 강력한 일격으로 몬스터를 처치합니다.',
    damage: 26,
    attackSpeed: 800,
    range: 170
  },
  {
    id: 'ranger',
    name: '궤도 궁수',
    emoji: '🏹',
    description: '빠른 연사로 가장자리를 도는 몬스터를 견제합니다.',
    damage: 12,
    attackSpeed: 420,
    range: 210
  },
  {
    id: 'mage',
    name: '중력 마법사',
    emoji: '🪄',
    description: '넓은 범위의 마법으로 몬스터의 체력을 깎습니다.',
    damage: 18,
    attackSpeed: 600,
    range: 240
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const rosterEl = document.querySelector('#character-roster');
  const selectedHeroLabel = document.querySelector('#selected-hero');
  const centerZone = document.querySelector('#center-zone');
  const heroSlot = document.querySelector('#placed-hero');
  const monsterLayer = document.querySelector('#monster-layer');
  const waveEl = document.querySelector('#wave');
  const defeatedEl = document.querySelector('#defeated');

  let selectedHero = null;
  let activeHero = null;
  let heroAttackTimer = 0;
  const monsters = [];

  let defeatedCount = 0;
  let totalSpawned = 0;
  let spawnDelay = 2000;
  let spawnTimer = 0;

  const board = document.querySelector('#game-board');

  function updateSelectedHeroLabel() {
    selectedHeroLabel.textContent = selectedHero ? selectedHero.name : '없음';
  }

  function clearActiveState() {
    rosterEl.querySelectorAll('.character-card').forEach((card) =>
      card.classList.remove('active')
    );
  }

  heroes.forEach((hero) => {
    const button = document.createElement('button');
    button.className = 'character-card';
    button.type = 'button';
    button.innerHTML = `
      <span class="emoji">${hero.emoji}</span>
      <span class="name">${hero.name}</span>
      <span class="stats">공격력 ${hero.damage} · 사거리 ${hero.range} · 공격속도 ${hero.attackSpeed}ms</span>
      <span class="stats">${hero.description}</span>
    `;

    button.addEventListener('click', () => {
      selectedHero = hero;
      updateSelectedHeroLabel();
      clearActiveState();
      button.classList.add('active');
      centerZone.classList.add('active');
    });

    rosterEl.appendChild(button);
  });

  updateSelectedHeroLabel();

  function placeHero(hero) {
    activeHero = {
      ...hero,
      x: board.offsetWidth / 2,
      y: board.offsetHeight / 2
    };
    heroSlot.innerHTML = `
      <span class="emoji">${hero.emoji}</span>
      <span class="hero-label">${hero.name}</span>
    `;
    heroSlot.hidden = false;
    centerZone.classList.add('occupied');
    heroAttackTimer = 0;
  }

  centerZone.addEventListener('click', () => {
    if (!selectedHero) return;
    placeHero(selectedHero);
    centerZone.classList.remove('active');
  });

  function spawnMonster() {
    const rect = board.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2 - 40;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 0.35;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const baseHp = 40 + Math.floor(totalSpawned / 4) * 10;
    const monster = {
      angle,
      speed,
      direction,
      radius,
      maxHp: baseHp,
      hp: baseHp,
      x: 0,
      y: 0
    };

    const element = document.createElement('div');
    element.className = 'monster';
    element.innerHTML = `
      <div class="hp-bar">
        <div class="hp" style="width: 100%"></div>
      </div>
      👾
    `;
    monster.element = element;
    monster.hpEl = element.querySelector('.hp');
    monsterLayer.appendChild(element);
    monsters.push(monster);
    totalSpawned += 1;

    const wave = 1 + Math.floor(totalSpawned / 8);
    waveEl.textContent = wave.toString();
    spawnDelay = Math.max(850, 2000 - wave * 120);
  }

  function removeMonster(monster) {
    monster.element.remove();
    const index = monsters.indexOf(monster);
    if (index >= 0) {
      monsters.splice(index, 1);
    }
  }

  function triggerHeroAttackEffect() {
    heroSlot.classList.add('attack');
    const pulse = document.createElement('span');
    pulse.className = 'attack-wave';
    heroSlot.appendChild(pulse);
    setTimeout(() => {
      heroSlot.classList.remove('attack');
      pulse.remove();
    }, 260);
  }

  function updateMonsters(delta) {
    const centerX = board.offsetWidth / 2;
    const centerY = board.offsetHeight / 2;

    monsters.forEach((monster) => {
      monster.angle += monster.direction * monster.speed * (delta / 1000);
      monster.x = centerX + Math.cos(monster.angle) * monster.radius;
      monster.y = centerY + Math.sin(monster.angle) * monster.radius;

      monster.element.style.transform = `translate(${monster.x - 24}px, ${monster.y - 24}px)`;
    });
  }

  function heroAttack(timestamp) {
    if (!activeHero || monsters.length === 0) return;

    if (timestamp - heroAttackTimer < activeHero.attackSpeed) {
      return;
    }

    const heroX = activeHero.x;
    const heroY = activeHero.y;

    let target = null;
    let closestDistance = Infinity;
    monsters.forEach((monster) => {
      const dx = monster.x - heroX;
      const dy = monster.y - heroY;
      const distance = Math.hypot(dx, dy);
      if (distance <= activeHero.range && distance < closestDistance) {
        closestDistance = distance;
        target = monster;
      }
    });

    if (!target) return;

    target.hp = Math.max(0, target.hp - activeHero.damage);
    target.hpEl.style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
    heroAttackTimer = timestamp;
    triggerHeroAttackEffect();

    if (target.hp <= 0) {
      removeMonster(target);
      defeatedCount += 1;
      defeatedEl.textContent = defeatedCount.toString();
    }
  }

  let lastTimestamp = 0;
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    spawnTimer += delta;
    if (spawnTimer >= spawnDelay) {
      spawnMonster();
      spawnTimer = 0;
    }

    updateMonsters(delta);
    heroAttack(timestamp);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  window.addEventListener('resize', () => {
    if (activeHero) {
      activeHero.x = board.offsetWidth / 2;
      activeHero.y = board.offsetHeight / 2;
    }

    const rect = board.getBoundingClientRect();
    const maxRadius = Math.min(rect.width, rect.height) / 2 - 40;
    monsters.forEach((monster) => {
      monster.radius = Math.min(monster.radius, maxRadius);
    });
  });
});
