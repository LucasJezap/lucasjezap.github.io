// globalne stałe
// wszystkie nazwy mówią za siebie
var HEIGHT_OF_PLATFORM = 20;
var CANNON_SIZE = 10;
var TARGET_SIZE = 10;
var TARGET_DISTANCE = 100;
var GRAVITY = 200;
var BALL_RADIUS = 2;
var BALL_SPEED = 200;
var BALL_WEIGHT = 100;
var TARGET_WEIGHT = 1;
var SKY_COLOR = 0x6092FF;
var SHOOT_DELAY = 1000;
var SPLASH_POSITION_RANDOMNESS = 4;
var SPLASH_PARABOLA_FACTOR = 2.5, SPLASH_Y_FACTOR = 2, SPLASH_X_FACTOR = 4;
var SPLASH_NUM_OF_PARTICLES = 20;

// definicja poziomów
// zawartość to pudełka widziane z lotu ptaka (liczba to wysokość)
var LEVELS = [
    [
        '1'
    ],
    [
        'f'
    ],
    [
        '5 5 5'
    ],
    [
        '3   3   3',
        '  3   3',
        '    3'
    ],
    [
        '11111',
        '12221',
        '12321',
        '12221',
        '11111'
    ],
    [
        '1234567654321'
    ]
];


// zmienne globalne
// nazwy dobrze opisują ich działanie
var camera, scene, renderer;

var mousePosition = { x: 0.5, y: 0.5 };

var cannon, cannonDirection = new THREE.Vector3(), lastShotTime;

var levelIndex, levelStartTime, alreadyWon, gameStarted;

var numTargets = numBallsFired = totalBallsFired = totalTargets = 0;

var woodTexture, textMaterial, targetPlatformMaterial, targetGeometry, targetMaterial, cannonTexture, ballTexture,
    ballGeometry, ballMaterial, cannonSound;

var audio;

var oceanTexture, oceanHeightMapScene, oceanHeightMap, oceanHeightMapCamera;

var uniformsNoise = {
    time: { type: "f", value: 1.0 },
    scale: { type: "v2", value: new THREE.Vector2(1.5, 1.5) },
    offset: { type: "v2", value: new THREE.Vector2(0, 0) }
};


// interpolacja
function interpolate(low, high, interpolationFactor) {
    return low + (high - low) * interpolationFactor;
}

// obliczanie czasu
function secondsSince(time) {
    // ilość sekund od czasu time
    return (window.performance.now() - time) / 1000;
}

// usuwanie obiektów ze sceny
function removeObjects(condition) {
    var objectsToRemove = scene.children.filter(condition);
    // usuwamy wszystkie obiekty spełniające warunek
    objectsToRemove.forEach(function (object) {
        scene.remove(object);
    });
}

// Tworzenie kilku kopii dźwięku
function AudioPool(url, volume, numCopies) {
    this.pool = [];
    this.poolIndex = 0;
    this.poolSize = numCopies;

    // tworzymy n kopii
    for (var i = 0; i < numCopies; i++) {
        var audio = new Audio(url);
        audio.volume = volume;
        audio.preload = 'auto';

        this.pool.push(audio);
    }
}

// funkcja prototypowa odtwarzająca muzykę
AudioPool.prototype.play = function () {
    this.pool[this.poolIndex].play();
    this.poolIndex = (this.poolIndex + 1) % this.poolSize;
}


// Dodanie oceanu
function addOceanPlane() {

    // Stworzenie materiału
    // shadery znajdują się w pliku index.html
    var waveMaterial = new THREE.ShaderMaterial({
        uniforms: uniformsNoise,
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShaderNoise').textContent,
        lights: false,
        fog: true
    });

    // mapa wysokości
    oceanHeightMapScene = new THREE.Scene();

    var plane = new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight);
    var targetMesh = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    targetMesh.position.z = -500;
    targetMesh.material = waveMaterial;
    oceanHeightMapScene.add(targetMesh);

    oceanHeightMapCamera = new THREE.OrthographicCamera(window.innerWidth / - 2, window.innerWidth / 2,
        window.innerHeight / 2, window.innerHeight / - 2, -10000, 10000);
    oceanHeightMapCamera.position.z = 100;
    oceanHeightMapScene.add(oceanHeightMapCamera);

    oceanHeightMap = new THREE.WebGLRenderTarget(256, 256,
        { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat });
    oceanHeightMap.generateMipmaps = false;
    renderer.render(oceanHeightMapScene, oceanHeightMapCamera, oceanHeightMap, true);
    
    // tworzymy ocean
    var oceanGeometry = new THREE.PlaneBufferGeometry(2000, 2000, 256, 256);
    var oceanMaterial = new THREE.MeshPhongMaterial({ map: oceanTexture, displacementMap: oceanHeightMap, displacementScale: HEIGHT_OF_PLATFORM });
    var ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1;
    ocean.receiveShadow = true;

    scene.add(ocean);
}

// dodanie działa wystrzeliwującego piłki
function addCannon() {
    // platforma
    var platformGeometry = new THREE.BoxGeometry(20, HEIGHT_OF_PLATFORM, 20);
    var platformMaterial = new THREE.MeshLambertMaterial({ map: woodTexture });
    var platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = HEIGHT_OF_PLATFORM / 2;
    platform.receiveShadow = true;

    scene.add(platform);

    // działko - kula + walec
    cannon = new THREE.Object3D();

    // kula
    cannonTexture = THREE.ImageUtils.loadTexture('./resources/cannon.jpg');
    var sphere = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), new THREE.MeshPhongMaterial({ map: cannonTexture }));
    sphere.castShadow = true;

    cannon.add(sphere);

    // walec
    var cylinderGeometry = new THREE.CylinderGeometry(2, 3, CANNON_SIZE, 16);
    var cylinderMaterial = new THREE.MeshPhongMaterial({ map: cannonTexture });
    var cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.y = 5;
    cylinder.castShadow = true;

    cannon.add(cylinder);

    // ustawiamy działo
    cannon.rotation.x = Math.PI / 4;
    cannon.position.y = HEIGHT_OF_PLATFORM + 2;
    cannon.position.z = -5;
    cannon.castShadow = true;

    scene.add(cannon);
}

// stworzenie pudełka
function createTarget() {
    var target = new Physijs.BoxMesh(targetGeometry, targetMaterial, TARGET_WEIGHT);
    target.isTarget = true;
    target.removeIfUnderwater = true;
    target.castShadow = true;
    target.splashes = true; // chcemy efekt chlapania wody

    return target;
}

// Dodanie pudełek do sceny
function addTargets(targetConfiguration) {
    // obliczenia wstępne
    var numRows = targetConfiguration.length;
    var rowLengths = targetConfiguration.map(function (row) { return row.length; });
    var numColumns = Math.max.apply(null, rowLengths);

    var width = numColumns * TARGET_SIZE;
    var depth = numRows * TARGET_SIZE;
    var leftSide = -(width / 2);
    var backSide = TARGET_DISTANCE + depth / 2;

    // stworzenie odpowiedniej platformy na pudełka
    var platformGeometry = new THREE.BoxGeometry(width + TARGET_SIZE * 2, HEIGHT_OF_PLATFORM, depth + TARGET_SIZE * 2);

    // wyłączenie grawitacji platformy
    var targetPlatform = new Physijs.BoxMesh(platformGeometry, targetPlatformMaterial, 0);
    targetPlatform.position.z = TARGET_DISTANCE;
    targetPlatform.position.y = HEIGHT_OF_PLATFORM / 2;
    targetPlatform.removeBeforeLevel = true;
    targetPlatform.receiveShadow = true;

    scene.add(targetPlatform);

    var zero = new THREE.Vector3(0, 0, 0);

    // dodanie pudełek
    numTargets = 0;
    for (var row = 0; row < numRows; row++) {
        // obliczamy pozycje każdego pudełka (x,y,z)
        var z = backSide - row * TARGET_SIZE - TARGET_SIZE / 2;

        for (var column = 0; column < numColumns; column++) {
            var x = leftSide + column * TARGET_SIZE + TARGET_SIZE / 2;

            var numBlocks = parseInt(targetConfiguration[row][column], 16) || 0;

            for (var i = 0; i < numBlocks; i++) {
                var y = HEIGHT_OF_PLATFORM + TARGET_SIZE / 2 + i * TARGET_SIZE;

                var target = createTarget();
                target.position.x = x;
                target.position.y = y;
                target.position.z = z;

                scene.add(target);

                // "Zamrożenie" pudełek - żeby stały stabilnie
                target.setAngularFactor(zero);
                target.setAngularVelocity(zero);
                target.setLinearFactor(zero);
                target.setLinearVelocity(zero);

                numTargets += 1;
            }
        }
    }
}

// "odmrożenie" pudełek - żeby można było je zestrzelić
function unfreezeTargets() {
    var one = new THREE.Vector3(1, 1, 1);

    scene.children.forEach(function (object) {
        // tylko odpowiednie obiekty
        if (object.isTarget === true) {
            object.setAngularFactor(one);
            object.setLinearFactor(one);
        }
    });
}

// dodanie piłki do sceny
function createBall() {
    var ball = new Physijs.SphereMesh(ballGeometry, ballMaterial, BALL_WEIGHT);
    ball.castShadow = true;
    ball.removeIfUnderwater = true;
    ball.removeBeforeLevel = true;
    ball.splashes = true;  // chcemy efekt chlapania wody

    return ball;
}

// strzał piłką
function shootBall() {
    // odmrażamy pudełka
    unfreezeTargets();

    // tworzymy nową piłkę
    var ball = createBall();
    ball.position.copy(cannon.position);

    scene.add(ball);

    // strzelanie w kierunku wycelowanym przez działo
    ball.setLinearVelocity(cannonDirection.clone().multiplyScalar(BALL_SPEED));

    // odgłos kopania piłki
    cannonSound.play();

    numBallsFired += 1;
}

// chlapanie wody po wpadnięciu obiektu
function addSplash(position, velocity) {
    // pomocniczna funkcja
    var random = function () {
        return Math.random() * SPLASH_POSITION_RANDOMNESS - SPLASH_POSITION_RANDOMNESS / 2;
    }

    // tworzymy odpowiednią ilość plusków wody
    for (var i = 0; i < SPLASH_NUM_OF_PARTICLES; i++) {
        var sprite = new THREE.Sprite(spriteMaterial);
        sprite.isSplashSprite = true;
        sprite.removeIfUnderwater = true;

        sprite.startTime = window.performance.now();
        sprite.initialPosition = position.clone();
        sprite.initialPosition.y = 0;
        sprite.initialPosition.add(new THREE.Vector3(random(), random(), random()));
        sprite.position.copy(sprite.initialPosition);
        sprite.angle = Math.random() * Math.PI * 2;
        sprite.splashIntensity = Math.abs(velocity.y) / 100;
        sprite.splashIntensity *= Math.random() + 0.1;

        scene.add(sprite);
    }
}

// wczytanie tekstur i nie tylko
function loadResources() {
    // platforma
    woodTexture = THREE.ImageUtils.loadTexture('./resources/wood.jpg');
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;

    // ocean
    oceanTexture = THREE.ImageUtils.loadTexture('./resources/ocean.png');
    oceanTexture.wrapS = oceanTexture.wrapT = THREE.RepeatWrapping;
    oceanTexture.repeat.set(10, 10);

    // inne, często używane obiekty
    ballTexture = THREE.ImageUtils.loadTexture('./resources/ball.jpg');
    ballGeometry = new THREE.SphereGeometry(BALL_RADIUS);
    ballMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({ map: ballTexture, overdraw: 0.5 }));
    targetPlatformMaterial = Physijs.createMaterial(new THREE.MeshLambertMaterial({ map: woodTexture }), .95, .95);
    targetGeometry = new THREE.BoxGeometry(TARGET_SIZE, TARGET_SIZE, TARGET_SIZE);
    var brickTexture = THREE.ImageUtils.loadTexture('./resources/brick.jpg');
    targetMaterial = Physijs.createMaterial(new THREE.MeshLambertMaterial({ map: brickTexture }));
    textMaterial = new THREE.MeshPhongMaterial({ color: 'red' });
    textMaterial.transparent = true;
    spriteMaterial = new THREE.SpriteMaterial({ map: THREE.ImageUtils.loadTexture('./resources/splash-sprite.png') });

    // dźwięk piłki
    cannonSound = new AudioPool('./resources/ball.mp3', 0.5, 3);
}

// inicjalizacja sceny
function initScene() {
    // scena
    scene = new Physijs.Scene();
    scene.fog = new THREE.Fog(SKY_COLOR, 1, 1000);
    scene.setGravity(new THREE.Vector3(0, -GRAVITY, 0));
    scene.addEventListener('update', function () {
        scene.simulate();
    });

    // oświetlenie
    var light = new THREE.DirectionalLight('white', 1.3);
    light.position.set(50, 100, -50);
    light.castShadow = true;
    light.shadowCameraLeft = light.shadowCameraBottom = -200;
    light.shadowCameraRight = light.shadowCameraTop = 200;
    light.shadowMapWidth = light.shadowMapHeight = 1024;
    scene.add(light);

    // kamera
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);

    // muzyka
    audio = new Audio('resources/song.mp3');
    audio.volume = 0.1;
    document.documentElement.onclick = function() {
        if (audio.paused)
            audio.play();
    }

    // dodajemy morze i armate
    addOceanPlane();
    addCannon();
}

// dodanie podstawowej funkcjonalności
function initEvents() {
    // poruszanie myszką
    document.addEventListener('mousemove', function (event) {
        mousePosition.x = event.pageX / window.innerWidth;
        mousePosition.y = event.pageY / window.innerHeight;
    });

    // strzelanie piłką (z określonym czasem odnowienia)
    lastShotTime = -SHOOT_DELAY;
    renderer.domElement.addEventListener('mousedown', function (event) {
        if (window.performance.now() - lastShotTime > SHOOT_DELAY) {
            shootBall();
            lastShotTime = window.performance.now();
        }
    });

    // Wyłączenie komunikatów
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('dialog-confirm-button')) {
            event.target.parentNode.style.display = 'none';
        }
    });

    // Rozpoczęcie gry
    gameStarted = false;
    document.getElementById('start-game-button').addEventListener('click', function () {
        gameStarted = true;
        levelIndex = -1;
        startNextLevel();
    });

    // Przechodzenie do kolejnego poziomu
    document.getElementById('next-level-button').addEventListener('click', startNextLevel);
}

// funkcja inicjalizująca 
function init(containerElement) {
    // ładujemy tekstury
    loadResources();

    // renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(SKY_COLOR, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerElement.appendChild(renderer.domElement);

    // inicjalizacja podstawowych elementów
    initScene();
    initEvents();

    document.getElementById('game-start-dialog').style.display = 'block';

    // rozpoczynamy grę
    scene.simulate();
    render();
}

// wczytywanie nowego poziomu
function startNextLevel() {
    // usunięcie poprzedniego poziomu
    removeObjects(function (object) { return object.removeBeforeLevel === true; });

    levelIndex += 1;
    levelStartTime = window.performance.now();

    // sprawdzanie czy gra zakończona
    if (levelIndex >= LEVELS.length) {
        gameWon();

        alreadyWon = true;
    } else {
        // Dodanie pudełek
        addTargets(LEVELS[levelIndex]);

        // Komunikat
        var textGeometry = new THREE.TextGeometry('Poziom ' + (levelIndex + 1), {
            size: 10,
            height: 2,
            font: 'Woodgod',
            bevelEnabled: true,
            bevelThickness: 0.3,
            bevelSize: 0.3
        });
        var text = new THREE.Mesh(textGeometry, textMaterial);

        text.position.set(20, 30, 40);
        text.rotation.y = Math.PI;
        text.removeBeforeLevel = true;

        scene.add(text);

        numBallsFired = 0;
        alreadyWon = false;
    }
}

// komunikat o przejściu poziomu
function levelWon() {
    // aktualizacja najlepszego wyniku
    var scoreKey = 'best-score-' + levelIndex;
    if (localStorage[scoreKey] === undefined)
        localStorage[scoreKey] = numBallsFired;
    else
        localStorage[scoreKey] = Math.min(localStorage[scoreKey], numBallsFired);

    // aktualizacja łącznego wyniku
    totalBallsFired += numBallsFired;
    totalTargets += numTargets;

    // przygotowanie komunikatu do wyświetlenia
    document.getElementById('num-targets').textContent = numTargets.toString();
    document.getElementById('num-balls').textContent = numBallsFired.toString();
    document.getElementById('best-num-balls').textContent = localStorage['best-score-' + levelIndex];
    document.getElementById('level-finished-dialog').style.display = 'block';
}

// komunikat o wygraniu gry
function gameWon() {
    // aktualizacja najlepszego łącznego wyniku
    if (localStorage['best-score-total'] === undefined)
        localStorage['best-score-total'] = totalBallsFired;
    else
        localStorage['best-score-total'] = Math.min(localStorage['best-score-total'], totalBallsFired);

    // przygotowanie komunikatu do wyświetlenia
    document.getElementById('total-targets').textContent = totalTargets;
    document.getElementById('total-balls').textContent = totalBallsFired;
    document.getElementById('total-best-num-balls').textContent = localStorage['best-score-total'];
    document.getElementById('win-dialog').style.display = 'block';

    // zrzucanie pudełek z nieba po przejściu gry
    setInterval(dropRandomTarget, 1000);
    scene.setGravity(new THREE.Vector3(0, -10, 0));
}

// zrzucanie pudełek z nieba (po zakończeniu gry)
function dropRandomTarget() {
    var target = createTarget();
    target.position.x = -60 + Math.random() * 120;
    target.position.y = 100;
    target.position.z = 30 + Math.random() * 200;

    scene.add(target);
}

// manipulacja działem
function updateCannon() {
    // przesuwanie działa
    cannon.rotation.z = interpolate(-Math.PI / 4, Math.PI / 4, mousePosition.x);
    cannon.rotation.x = interpolate(Math.PI / 8, Math.PI / 2, mousePosition.y);
    cannonDirection.set(0, 1, 0);
    cannonDirection.applyQuaternion(cannon.quaternion);

    // odrzut działa
    var recoilLength = SHOOT_DELAY;
    var t = (window.performance.now() - lastShotTime) / recoilLength;
    if (t <= 0.1)
        recoilAmount = interpolate(0, 5, t / 0.1);
    else
        recoilAmount = interpolate(5, 0, (t - 0.1) / 0.9);
    recoilAmount = Math.max(recoilAmount, 0);
    var recoil = cannonDirection.clone().multiplyScalar(-recoilAmount);
    recoil.y = 0;
    cannon.position.set(0, HEIGHT_OF_PLATFORM + 2, -5).add(recoil);

    // przesuwanie kamery
    var offset = cannonDirection.clone().multiplyScalar(-20);
    camera.position.copy(cannon.position.clone().add(offset));
    camera.position.y = cannon.position.y + 10;

    // podążanie kamery za działem
    camera.lookAt(cannon.position.clone().add(cannonDirection.clone().multiplyScalar(30)));
}

// przesuwanie wody i fal 
function updateOcean() {
    var t = window.performance.now() / 1000;
    uniformsNoise.time.value = t * 0.03;
    uniformsNoise.offset.value.x = t * 0.03;
    oceanTexture.offset.copy(new THREE.Vector2(0.01, 0.02).multiplyScalar(t));
    renderer.render(oceanHeightMapScene, oceanHeightMapCamera, oceanHeightMap, true);
}

// tworzenie efektu chlapania wody, gdy obiekt do niej wpadnie
function updateSplashes() {
    // sprawdzanie czy przedmiot wpadł do wody
    scene.children.forEach(function (object) {
        if (object.splashes === true && !object.alreadySplashed) {
            if (!object.geometry.boundingBox)
                object.geometry.computeBoundingBox();

            if (object.position.y + object.geometry.boundingBox.min.y < 0) {
                object.alreadySplashed = true;
                addSplash(object.position, object.getLinearVelocity());
            }
        }
    });

    // przesuwanie cząstek wody po paraboli
    scene.children.forEach(function (object) {
        // tylko obiektów splashsprite
        if (object.isSplashSprite === true) {
            var sprite = object;

            // przesuwanie zależnie od upłyniętego czasu
            var t = secondsSince(sprite.startTime) * 10;
            sprite.position.x = sprite.splashIntensity * SPLASH_X_FACTOR * t;
            sprite.position.y = sprite.splashIntensity * SPLASH_Y_FACTOR *
                (-Math.pow(t - SPLASH_PARABOLA_FACTOR, 2) + Math.pow(SPLASH_PARABOLA_FACTOR, 2));
            sprite.position.z = 0;

            sprite.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), sprite.angle);
            sprite.position.add(sprite.initialPosition);
        }
    });
}

// sprawdzanie czy wszystkie pudełka spadły
function checkForWinCondition() {
    // jeśli już wygrana
    if (alreadyWon)
        return;

    // czy jakiekolwiek pudełko zostało
    var someTargetsRemaining = scene.children.some(function (object) {
        return object.isTarget === true;
    });
    if (!someTargetsRemaining) {
        alreadyWon = true;

        // kolejny poziom
        levelWon();
    }
}

// usuwanie pudełek, które spadły 
// zwykłe sprawdzanie czy są pod wodą
function removeUnderwaterObjects() {
    removeObjects(function (object) {
        return object.removeIfUnderwater === true && object.position.y < -100;
    });
}

function render() {
    // aktualizacja podstawowych rzeczy
    updateCannon();

    updateOcean();

    updateSplashes();

    removeUnderwaterObjects();

    // Wygaszanie tekstu po rozpoczęciu poziomu
    textMaterial.opacity = 2 - secondsSince(levelStartTime);

    // sprawdzanie czy wszystko zostało zbite
    if (gameStarted) {
        checkForWinCondition();
    }

    requestAnimationFrame(render);
    renderer.render(scene, camera);
}
