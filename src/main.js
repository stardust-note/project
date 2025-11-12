const heroes = [
  {
    id: 'guardian',
    name: '빛의 수호자',
    emoji: '🛡️',
    description: '느리지만 강력한 일격으로 몬스터를 처치합니다.',
    damage: 26,
    attackSpeed: 800,
    range: 170,
    cost: 5
  },
  {
    id: 'ranger',
    name: '궤도 궁수',
    emoji: '🏹',
    description: '빠른 연사로 가장자리를 도는 몬스터를 견제합니다.',
    damage: 12,
    attackSpeed: 420,
    range: 210,
    cost: 10
  },
  {
    id: 'mage',
    name: '중력 마법사',
    emoji: '🪄',
    description: '넓은 범위의 마법으로 몬스터의 체력을 깎습니다.',
    damage: 18,
    attackSpeed: 600,
    range: 240,
    cost: 15
  }
];

document.addEventListener('DOMContentLoaded', () => {
  const rosterEl = document.querySelector('#character-roster');
  const selectedHeroLabel = document.querySelector('#selected-hero');
  const centerZone = document.querySelector('#center-zone');
  const heroFormation = document.querySelector('#hero-formation');
  const monsterLayer = document.querySelector('#monster-layer');
  const waveEl = document.querySelector('#wave');
  const defeatedEl = document.querySelector('#defeated');
  const coinsEl = document.querySelector('#coins');
  const messageEl = document.querySelector('#game-message');
  const board = document.querySelector('#game-board');

  let selectedHero = null;
  const activeHeroes = [];
  const monsters = [];
  const heroButtons = new Map();

  let heroPositionsDirty = true;
  let messageTimeout = null;

  let coins = 0;
  let defeatedCount = 0;
  let totalSpawned = 0;
  let spawnDelay = 1200;
  let spawnTimer = 0;

  const maxMonsters = 200;
  let currentWave = 1;
  let monstersPerWave = calculateMonstersForWave(currentWave);
  let spawnedInWave = 0;
  let gameEnded = false;

  function calculateMonstersForWave(wave) {
    const base = 10 + (wave - 1) * 6;
    const remaining = maxMonsters - totalSpawned;
    return Math.max(0, Math.min(base, remaining));
  }

  function updateSelectedHeroLabel() {
    selectedHeroLabel.textContent = selectedHero ? selectedHero.name : '없음';
  }

  function clearActiveState() {
    rosterEl.querySelectorAll('.character-card').forEach((card) =>
      card.classList.remove('active')
    );
  }

  function updateHeroCardStates() {
    heroButtons.forEach((button, heroId) => {
      const hero = heroes.find((item) => item.id === heroId);
      if (!hero) return;
      if (coins < hero.cost) {
        button.classList.add('locked');
        button.setAttribute('aria-disabled', 'true');
      } else {
        button.classList.remove('locked');
        button.removeAttribute('aria-disabled');
      }
    });
  }

  function adjustCoins(delta) {
    coins = Math.max(0, coins + delta);
    coinsEl.textContent = coins.toString();
    updateHeroCardStates();
  }

  function showMessage(text, { persistent = false } = {}) {
    if (!messageEl) return;
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }

    messageEl.textContent = text;
    messageEl.hidden = false;

    if (!persistent) {
      messageTimeout = window.setTimeout(() => {
        messageEl.hidden = true;
        messageTimeout = null;
      }, 1600);
    }
  }

  heroes.forEach((hero) => {
    const button = document.createElement('button');
    button.className = 'character-card';
    button.type = 'button';
    button.dataset.heroId = hero.id;
    button.innerHTML = `
      <span class="emoji">${hero.emoji}</span>
      <span class="name">${hero.name}</span>
      <span class="cost">💰 ${hero.cost}원</span>
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

    heroButtons.set(hero.id, button);
    rosterEl.appendChild(button);
  });

  updateSelectedHeroLabel();
  updateHeroCardStates();
  showMessage('1 웨이브 시작!');

  function syncHeroPositions() {
    if (activeHeroes.length === 0) return;

    const boardRect = board.getBoundingClientRect();
    activeHeroes.forEach((hero) => {
      const rect = hero.element.getBoundingClientRect();
      hero.x = rect.left + rect.width / 2 - boardRect.left;
      hero.y = rect.top + rect.height / 2 - boardRect.top;
    });
  }

  function triggerHeroAttackEffect(element) {
    element.classList.add('attack');
    const pulse = document.createElement('span');
    pulse.className = 'attack-wave';
    element.appendChild(pulse);
    window.setTimeout(() => {
      element.classList.remove('attack');
      pulse.remove();
    }, 260);
  }

  function placeHero(hero) {
    const token = document.createElement('div');
    token.className = 'hero-token';
    token.innerHTML = `
      <span class="emoji">${hero.emoji}</span>
      <span class="hero-label">${hero.name}</span>
    `;

    heroFormation.appendChild(token);

    const heroInstance = {
      ...hero,
      element: token,
      attackTimer: 0,
      x: 0,
      y: 0
    };

    activeHeroes.push(heroInstance);
    adjustCoins(-hero.cost);
    centerZone.classList.add('occupied');
    centerZone.classList.remove('empty');
    centerZone.classList.remove('active');

    heroPositionsDirty = true;
    window.requestAnimationFrame(() => {
      heroPositionsDirty = true;
    });
  }

  centerZone.addEventListener('click', (event) => {
    if (event.target.closest('.hero-token')) {
      return;
    }

    if (!selectedHero) {
      showMessage('배치할 유닛을 먼저 선택하세요.');
      return;
    }

    if (coins < selectedHero.cost) {
      showMessage('골드가 부족합니다!');
      return;
    }

    placeHero(selectedHero);
  });

  function spawnMonster() {
    if (spawnedInWave >= monstersPerWave || totalSpawned >= maxMonsters) return;

    const rect = board.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2 - 40;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.7 + Math.random() * 0.4 + currentWave * 0.03;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const baseHp = 40 + currentWave * 14 + Math.floor(totalSpawned / 6) * 6;
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

    spawnedInWave += 1;
    totalSpawned += 1;
  }

  function removeMonster(monster) {
    monster.element.remove();
    const index = monsters.indexOf(monster);
    if (index >= 0) {
      monsters.splice(index, 1);
    }
  }

  function handleMonsterDefeat(monster) {
    removeMonster(monster);
    defeatedCount += 1;
    defeatedEl.textContent = defeatedCount.toString();
    adjustCoins(1);
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
    if (activeHeroes.length === 0 || monsters.length === 0) return;

    activeHeroes.forEach((hero) => {
      if (timestamp - hero.attackTimer < hero.attackSpeed) {
        return;
      }

      let target = null;
      let closestDistance = Infinity;

      monsters.forEach((monster) => {
        const dx = monster.x - hero.x;
        const dy = monster.y - hero.y;
        const distance = Math.hypot(dx, dy);
        if (distance <= hero.range && distance < closestDistance) {
          closestDistance = distance;
          target = monster;
        }
      });

      if (!target) return;

      target.hp = Math.max(0, target.hp - hero.damage);
      target.hpEl.style.width = `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
      hero.attackTimer = timestamp;
      triggerHeroAttackEffect(hero.element);

      if (target.hp <= 0) {
        handleMonsterDefeat(target);
      }
    });
  }

  function startNextWave() {
    currentWave += 1;
    waveEl.textContent = currentWave.toString();
    spawnedInWave = 0;
    monstersPerWave = calculateMonstersForWave(currentWave);
    spawnDelay = Math.max(450, 1200 - currentWave * 70);
    spawnTimer = 0;

    if (monstersPerWave > 0) {
      showMessage(`${currentWave} 웨이브 시작!`);
    } else {
      endGame();
    }
  }

  function endGame() {
    if (gameEnded) return;
    gameEnded = true;
    showMessage('200마리의 몬스터가 나타났습니다! 전투 종료!', { persistent: true });
  }

  let lastTimestamp = 0;
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (heroPositionsDirty) {
      syncHeroPositions();
      heroPositionsDirty = false;
    }

    if (!gameEnded) {
      spawnTimer += delta;
      if (
        spawnTimer >= spawnDelay &&
        spawnedInWave < monstersPerWave &&
        totalSpawned < maxMonsters
      ) {
        spawnMonster();
        spawnTimer = 0;
      }

      if (spawnedInWave >= monstersPerWave && monsters.length === 0) {
        if (totalSpawned >= maxMonsters) {
          endGame();
        } else {
          startNextWave();
        }
      }
    } else if (monsters.length === 0) {
      messageEl.hidden = false;
    }

    updateMonsters(delta);
    heroAttack(timestamp);

    window.requestAnimationFrame(gameLoop);
  }

  window.requestAnimationFrame(gameLoop);

  window.addEventListener('resize', () => {
    heroPositionsDirty = true;

    const rect = board.getBoundingClientRect();
    const maxRadius = Math.min(rect.width, rect.height) / 2 - 40;
    monsters.forEach((monster) => {
      monster.radius = Math.min(monster.radius, maxRadius);
    });
  });
});
