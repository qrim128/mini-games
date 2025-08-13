// browser.js — makes the minigames playable in a normal browser
(function() {
  // Detect if we're inside FiveM NUI: GetParentResourceName is injected there.
  const isNUI = typeof GetParentResourceName === "function";

  // Stub $.post for browser (FiveM uses it to talk back to Lua)
  if (!isNUI) {
    const originalPost = $.post;
        $.post = function(url, data) {
          try {
            console.log("[browser] $.post stub:", url, data);
            if (typeof url === "string" && url.toLowerCase().includes("end")) {
              const launcher = document.getElementById("launcher");
              if (launcher) launcher.style.display = "";
            }
          } catch(e){}
          // no-op to keep game flow working
      return Promise.resolve();
    };
  }

  // Simple launcher UI
  function createLauncher() {
    const el = document.createElement("div");
    el.id = "launcher";
    el.innerHTML = `
      <div class="launcher-card">
        <div class="launcher-title">Mini Games</div>
        <div class="launcher-row">
          <label>Game</label>
          <select id="gameSelect">
            <option value="path">Path</option>
            <option value="spot">Spot</option>
            <option value="math">Math</option>
          </select>
        </div>

        <div id="pathSettings" class="settings-block">
          <div class="launcher-row"><label>Grid size</label><input id="pathGrid" type="number" min="3" max="31" value="13"></div>
          <div class="launcher-row"><label>Lives</label><input id="pathLives" type="number" min="1" max="9" value="3"></div>
          <div class="launcher-row"><label>Time (ms)</label><input id="pathTime" type="number" min="1000" step="500" value="15000"></div>
        </div>

        <div id="spotSettings" class="settings-block" style="display:none">
          <div class="launcher-row"><label>Grid size</label><input id="spotGrid" type="number" min="3" max="10" value="10"></div>
          <div class="launcher-row"><label>Time (ms)</label><input id="spotTime" type="number" min="1000" step="500" value="15000"></div>
          <div class="launcher-row"><label>Required</label><input id="spotReq" type="number" min="1" max="50" value="5"></div>
          <div class="launcher-row"><label>Charset</label>
            <select id="spotCharset">
              <option value="braille">Braille</option>
              <option value="alphabet">Alphabet</option>
              <option value="numeric">Numeric</option>
              <option value="alphanumeric">Alphanumeric</option>
              <option value="greek">Greek</option>
              <option value="runes">Runes</option>
            </select>
          </div>
        </div>

        <div id="mathSettings" class="settings-block" style="display:none">
          <div class="launcher-row"><label>Time (ms)</label><input id="mathTime" type="number" min="5000" step="5000" value="300000"></div>
        </div>

        <div class="launcher-actions">
          <button id="startBtn">Start</button>
          <button id="endBtn" title="Force end (as if ESC)">End</button>
        </div>

        <div class="launcher-hint">
          Controls: Arrow Keys or WASD for Path. Click tiles for Spot. Type numbers for Math. Press ESC to cancel.
        </div>
      </div>
    `;
    document.body.appendChild(el);

    const gameSelect = el.querySelector("#gameSelect");
    const blocks = {
      path: el.querySelector("#pathSettings"),
      spot: el.querySelector("#spotSettings"),
      math: el.querySelector("#mathSettings"),
    };
    function updateBlocks(){
      Object.keys(blocks).forEach(k => blocks[k].style.display = "none");
      blocks[gameSelect.value].style.display = "";
    }
    gameSelect.addEventListener("change", updateBlocks);
    updateBlocks();

    el.querySelector("#startBtn").addEventListener("click", () => {
      const game = gameSelect.value;
      let settings;
      if (game === "path") {
        settings = {
          gridSize: parseInt(document.getElementById("pathGrid").value, 10) || 13,
          lives: parseInt(document.getElementById("pathLives").value, 10) || 3,
          timeLimit: parseInt(document.getElementById("pathTime").value, 10) || 15000
        };
      } else if (game === "spot") {
        settings = {
          gridSize: parseInt(document.getElementById("spotGrid").value, 10) || 10,
          timeLimit: parseInt(document.getElementById("spotTime").value, 10) || 15000,
          charSet: document.getElementById("spotCharset").value || "braille",
          required: parseInt(document.getElementById("spotReq").value, 10) || 5
        };
      } else {
        settings = {
          timeLimit: parseInt(document.getElementById("mathTime").value, 10) || 300000
        };
      }
      // Use existing game starter
      try {
        // Clear any existing state
        $("#path-container, #spot-container, #math-container, #screen").hide();
      } catch(e){}
      window.activeGame = null;
          document.getElementById("launcher").style.display = "none";
      if (typeof startGame === "function") {
        startGame(game, settings);
      } else {
        console.error("startGame is not defined");
      }
    });

    el.querySelector("#endBtn").addEventListener("click", () => {
      // Simulate the Escape key handler in main.js
      const esc = new KeyboardEvent("keyup", { key: "Escape" });
      document.dispatchEvent(esc);
    });
  }

  function injectStyles() {
    const css = `
      
          
          #launcher {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9999;
            font-family: "Segoe UI", Roboto, Arial, sans-serif;
            animation: fadeIn 0.4s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -48%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
          }
          .launcher-card {
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(8px);
            color: #fff;
            border: 1px solid rgba(0, 174, 255, 0.4);
            border-radius: 14px;
            padding: 16px;
            width: 300px;
            box-shadow: 0 4px 20px rgba(0, 174, 255, 0.2);
          }
          .launcher-title {
            font-weight: 700;
            font-size: 18px;
            margin-bottom: 10px;
            text-align: center;
            color: #00aeff;
          }
          .settings-block { 
            border-top: 1px solid rgba(255,255,255,0.08);
            margin-top: 8px; padding-top: 8px;
          }
          .launcher-row { 
            display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-items: center; margin: 6px 0;
          }
          .launcher-row label { opacity: 0.9; font-size: 12px; font-weight: 500; }
          .launcher-row input, .launcher-row select {
            width: 100%; padding: 6px 8px; border-radius: 8px;
            border: 1px solid rgba(0, 174, 255, 0.4); background:rgba(20,20,20,0.85);
            color:#fff; font-size: 13px; outline: none; transition: border 0.2s, box-shadow 0.2s;
          }
          .launcher-row input:focus, .launcher-row select:focus {
            border-color: #00aeff;
            box-shadow: 0 0 6px rgba(0,174,255,0.5);
          }
          .launcher-actions { display:flex; gap:8px; margin-top: 12px; }
          .launcher-actions button {
            flex:1; padding: 8px 10px; border-radius: 10px;
            border: none; background: linear-gradient(135deg, #00aeff, #0077aa);
            color:#fff; cursor:pointer; font-size: 14px; font-weight: 600;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .launcher-actions button:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 10px rgba(0,174,255,0.4);
          }
          .launcher-actions button:active {
            transform: translateY(0);
            box-shadow: none;
          }
          .launcher-hint { opacity: 0.75; font-size: 11px; margin-top: 10px; line-height: 1.3; text-align: center; color: #aaa; }


    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Initialize only for browser usage
  if (!isNUI) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => { injectStyles(); createLauncher(); });
    } else {
      injectStyles();
      createLauncher();
    }
  }
})();
