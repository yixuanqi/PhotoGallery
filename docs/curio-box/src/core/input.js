(() => {
  const CB = window.CB;
  const game = CB.game;

  function initInput(canvas, onQuickKey) {
    const keys = game.input;

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') keys.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keys.right = true;
      if (code === 'Space') {
        e.preventDefault();
        keys.dashPressed = true;
      }
      if (onQuickKey) onQuickKey(code);
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') keys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') keys.right = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      keys.mouseScreenX = e.clientX;
      keys.mouseScreenY = e.clientY;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) keys.fireHeld = true;
      if (e.button === 2) keys.dashPressed = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) keys.fireHeld = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('blur', () => {
      keys.up = keys.down = keys.left = keys.right = false;
      keys.fireHeld = false;
    });
  }

  function syncMouseWorld() {
    const { input, camera, viewW, viewH } = game;
    const z = camera.zoom || 1;
    input.mouseWorldX = (input.mouseScreenX - viewW / 2) / z + camera.x;
    input.mouseWorldY = (input.mouseScreenY - viewH / 2) / z + camera.y;
  }

  CB.input = { initInput, syncMouseWorld };
})();
