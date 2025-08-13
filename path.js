let currentTimeLimit = 0; // store only time limit for restart

// Sound effects
const startAudio = new Audio("https://cdn.discordapp.com/attachments/946377425246355488/1324930314241577003/startgame_ZcF1jnRU.mp3?ex=689d4c82&amp;is=689bfb02&amp;hm=cfd62ffdec322373113bc38dab44df3904a6112dbd7545fb408d7219dfd1d9c2&amp;");
const successAudio = new Audio("https://cdn.discordapp.com/attachments/946377425246355488/1324932109520867397/complete_Cfdf1yoy.mp3?ex=689d4e2e&amp;is=689bfcae&amp;hm=8c52404349ce313f112093adab9a9ba65cf6318bbba3c131cf649b304e10fb7f&amp;");
const failAudio = new Audio("https://cdn.discordapp.com/attachments/946377425246355488/1324932109877379102/failed_xU2uSMHP.mp3?ex=689d4e2f&amp;is=689bfcaf&amp;hm=b4a013709676af2db8e617e2bd9671900363ee41d490caabb8fd8117cf0a73ec&amp;");

let canMove = false;  // Flag to prevent movement during start screen & memorization phase

const playerPos = {
    x: 1,
    y: 1,
    lastMove: null,
    up() {
        this.y++;
        this.lastMove = "up";
        return this
    },
    down() {
        this.y--;
        this.lastMove = "down";
        return this
    },
    left() {
        this.x--;
        this.lastMove = "left";
        return this
    },
    right() {
        this.x++
        this.lastMove = "right";
        return this
    },
    updatePos() {
        $(".player").removeClass("player");
        $(".off-path-player").removeClass("off-path-player").html("");

        const currentSquare = $(`[data-pathx="${this.x}"][data-pathy="${this.y}"]`);
        if (currentSquare.hasClass("path-square") || currentSquare.hasClass("hidden-path")) {
            currentSquare.addClass("player");
            this.onPath = true;
            if (this.y == currentGridSize) {
                endPathGame(true);
            }
        } else {
            currentSquare.addClass("off-path-player").html(oppositeArrowIcons[this.lastMove]);
            this.onPath = false;
            this.errorsMade++;
            if (this.errorsMade >= pathLives) {
                endPathGame(false, "lives");
            }
        }
    },
    onPath: true,
    errorsMade: 0,
};

const oppositeArrowIcons = {
    up: '<i class="fa-solid fa-down-long"></i>',
    down: '<i class="fa-solid fa-up-long"></i>',
    left: '<i class="fa-solid fa-right-long"></i>',
    right: '<i class="fa-solid fa-left-long"></i>',
}

let currentGridSize, pathLives;

const maxGridSize = 31;

function startPathGame(settings) {
  activeGame = "path";
  if (settings.gridSize > maxGridSize) settings.gridSize = maxGridSize;
  pathLives = settings.lives;
  currentTimeLimit = settings.timeLimit; // store for restart
  createPathGrid(settings.gridSize);
  displayScreen("path", "start");
  startAudio.play();
  $("#path-timer-bar-inner").css("width", "100%");

  // Generate path (both visual & hidden markers)
  generatePath(settings.gridSize, 3);

  // Prevent movement initially (start screen + memorization)
  canMove = false;

  // Step 1: Wait on start screen for 4 seconds
  setTimeout(() => {
    if (activeGame !== "path") return;
    
    hideScreen();
    $("#path-container").show();

    // Step 2: Memorization phase for 5 seconds (still can't move)
    setTimeout(() => {
      // Hide visual path but keep hidden markers
      $(".path-grid-square").removeClass("path-square");

      // Place player at path start
      playerPos.x = Math.ceil(settings.gridSize / 2);
      playerPos.y = 1;
      playerPos.updatePos();

      // Now enable movement
      canMove = true;

      // Start timer animation
      $("#path-timer-bar-inner").animate({ width: "0%" }, {
        duration: settings.timeLimit,
        complete: () => endPathGame(false, "time")
      });

    }, 5000); // memorize phase ends after 5 seconds

  }, 4000); // start screen ends after 4 seconds
}

function endPathGame(win, reason) {
  if (activeGame != "path") return;
  $("#path-timer-bar-inner").stop();

  canMove = false;  // Disable movement after game ends

  if (win) {
    successAudio.play();
    displayScreen("path", "success");
    setTimeout(() => {
      startPathGame({ gridSize: currentGridSize, lives: pathLives, timeLimit: currentTimeLimit });
    }, 1000);
  } else {
    failAudio.play();
    if (reason == "time") {
      displayScreen("path", "failTime");
    } else if (reason == "lives") {
      displayScreen("path", "failError");
    }
    endTimeout = setTimeout(() => {
      $("#path-container").fadeOut(500, function() { hideScreen(); });
      $.post(`https://${scriptName}/endGame`, JSON.stringify({ success: win }));
    }, 4000);
  }

  activeGame = null;
  playerPos.lastMove = null;
  playerPos.onPath = true;
  playerPos.errorsMade = 0;
}

function resetPath() {
  hideScreen();
  $("#path-container").hide();
  $("#path-timer-bar-inner").stop();
  playerPos.lastMove = null;
  playerPos.onPath = true;
  playerPos.errorsMade = 0;

  canMove = false;  // Reset movement flag on reset
}

function createPathGrid(gridSize) {
  let squares = gridSize * gridSize;
  let addSquare = "";
  let gridTemplate = "";
  let xPos = 1;
  let yPos = gridSize;
  playerPos.x = Math.ceil(gridSize / 2);
  playerPos.y = 1;
  currentGridSize = gridSize;
  $("#path-grid").empty();
  for (let i = 0; i < squares; i++) {
    addSquare += `<div class='path-grid-square' data-pathx='${xPos}' data-pathy='${yPos}'></div>`;
    xPos++;
    if ((i + 1) % gridSize == 0) {
      gridTemplate += `1fr `;
      yPos--;
      xPos = 1;
    }
  }
  $("#path-grid").append(addSquare);
  $("#path-grid").css({ "grid-template-columns": gridTemplate, "grid-template-rows": gridTemplate });
}

function generatePath(gridSize, maxMove) {
  const currentCoords = {
    x: playerPos.x,
    y: playerPos.y,
    up() { this.y++; },
    down() { this.y--; },
    left() { this.x--; },
    right() { this.x++; },
  };
  $(`[data-pathx="${currentCoords.x}"][data-pathy="${currentCoords.y}"]`).addClass("path-square hidden-path");

  let possibleDirections = ["up", "left", "right"];
  let availableDirection = null;
  let lastDirection = null;
  while (currentCoords.y < gridSize) {
    const randomDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
    const moveAmt = Math.floor(Math.random() * maxMove) + 1;

    if (randomDirection == "left" && (currentCoords.x - moveAmt) <= 0) {
      if (possibleDirections.length == 1) possibleDirections = ["up"];
      continue;
    }
    if (randomDirection == "right" && (currentCoords.x + moveAmt) >= gridSize) {
      if (possibleDirections.length == 1) possibleDirections = ["up"];
      continue;
    }

    for (let i = 0; i < moveAmt; i++) {
      currentCoords[randomDirection]();
      $(`[data-pathx="${currentCoords.x}"][data-pathy="${currentCoords.y}"]`).addClass("path-square hidden-path");
    }

    if (randomDirection == "up" && moveAmt == 1) {
      availableDirection = lastDirection;
    } else {
      availableDirection = null;
    }
    lastDirection = randomDirection;

    if (randomDirection == "left" || randomDirection == "right") {
      possibleDirections = ["up"];
    } else {
      availableDirection ? possibleDirections = [availableDirection] : possibleDirections = ["left", "right"];
    }
  }
  playerPos.updatePos();
}

$(document).keydown(function(e) {
  e = e || window.event;
  if (activeGame != "path") return;

  if (!canMove) return; // Prevent movement during start screen & memorization

  if (e.keyCode == '38' || e.keyCode == '87') { // up
    if (playerPos.y != currentGridSize) {
      if (playerPos.onPath) {
        playerPos.up().updatePos();
      } else if (playerPos.lastMove == "down") {
        playerPos.up().updatePos();
      }
    }
  } else if (e.keyCode == '40' || e.keyCode == '83') { // down
    if (playerPos.y != 1) {
      if (playerPos.onPath) {
        playerPos.down().updatePos();
      } else if (playerPos.lastMove == "up") {
        playerPos.down().updatePos();
      }
    }
  } else if (e.keyCode == '37' || e.keyCode == '65') { // left
    if (playerPos.x != 1) {
      if (playerPos.onPath) {
        playerPos.left().updatePos();
      } else if (playerPos.lastMove == "right") {
        playerPos.left().updatePos();
      }
    }
  } else if (e.keyCode == '39' || e.keyCode == '68') { // right
    if (playerPos.x != currentGridSize) {
      if (playerPos.onPath) {
        playerPos.right().updatePos();
      } else if (playerPos.lastMove == "left") {
        playerPos.right().updatePos();
      }
    }
  }
});
