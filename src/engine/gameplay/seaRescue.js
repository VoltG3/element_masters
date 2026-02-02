export function updateSeaRescue(ctx, deltaMs) {
  const {
    mapData,
    input,
    refs,
    constants,
    helpers,
    actions,
    registryItems
  } = ctx;

  const { gameState, projectilesRef, projectileIdRef, objectMetadata: objMetaRef } = refs;
  const { TILE_SIZE } = constants;
  const { isSolidAtPixel, findItemById } = helpers;
  const { playSfx, onStateUpdate } = actions;
  
  const objectMetadata = objMetaRef?.current || mapData.meta?.objectMetadata || {};
  
  const activeId = mapData.meta?.activeMapId || mapData.meta?.activeMap || 'main';
  const activeMap = mapData.maps ? mapData.maps[activeId] : mapData;
  if (activeMap.type !== 'sea_rescue') return;

  const keys = input.current;
  const mousePos = keys.mousePos;
  const isMouseDown = keys.mouseLeft;

  // We need a way to track the currently dragged box
  if (!refs.seaRescueRef) {
    refs.seaRescueRef = {
      draggedBox: null, // { index, startX, startY }
      points: 0
    };
  }
  const sr = refs.seaRescueRef;

  // World mouse position
  // Note: We need to account for camera scroll
  // In updateFrame, camera scroll isn't directly passed, but we can infer it or pass it.
  // PixiStage uses cameraScrollX/Y.
  
  const cameraX = ctx.cameraX || refs.cameraRef?.x || 0;
  const cameraY = ctx.cameraY || refs.cameraRef?.y || 0;
  
  const worldMouseX = refs.mouseWorldPos?.x || (mousePos.x + cameraX);
  const worldMouseY = refs.mouseWorldPos?.y || (mousePos.y + cameraY);

  const objectData = ctx.objectData || activeMap.layers?.find(l => l.name === 'objects' || l.name === 'entities' || l.type === 'object')?.data || [];
  const mapWidth = activeMap.width || mapData.meta?.width || 20;

  // Load physics settings
  const settings = findItemById('sea_rescue_settings')?.physics || {};
  const G = settings.gravity || 1600;
  const POWER = settings.power || 6;
  const MAX_DRAG = settings.maxDrag || 140;

  if (isMouseDown) {
    if (!sr.draggedBox) {
      // Try to find a box under the mouse
      const gx = Math.floor(worldMouseX / TILE_SIZE);
      const gy = Math.floor(worldMouseY / TILE_SIZE);
      let index = gy * mapWidth + gx;
      let objId = objectData[index];
      
      // Ja tiešā flīzē nekā nav, meklējam lielus objektus (meta data vai root flīzes), kas varētu pārklāt šo flīzi
      if (!objId) {
        // 1. Meklējam metadata (ja tāda ir)
        for (const [idxStr, meta] of Object.entries(objectMetadata)) {
          const idx = parseInt(idxStr, 10);
          const w = meta.width || 1;
          const h = meta.height || 1;
          if (w <= 1 && h <= 1) continue;
          
          const ox = idx % mapWidth;
          const oy = Math.floor(idx / mapWidth);
          if (gx >= ox && gx < ox + w && gy >= oy && gy < oy + h) {
            objId = objectData[idx];
            index = idx;
            break;
          }
        }

        // 2. Ja joprojām nekā nav, meklējam root flīzes apkārtnē (jo kastes ir 3x2)
        if (!objId) {
          for (let dy = 0; dy <= 2; dy++) {
            for (let dx = 0; dx <= 3; dx++) {
              const rx = gx - dx;
              const ry = gy - dy;
              if (rx < 0 || ry < 0) continue;
              const rIdx = ry * mapWidth + rx;
              const rId = objectData[rIdx];
              if (rId && rId.startsWith('minispill_sea_rescue_box')) {
                const def = findItemById(rId);
                const w = def?.width || 3;
                const h = def?.height || 2;
                if (gx >= rx && gx < rx + w && gy >= ry && gy < ry + h) {
                  objId = rId;
                  index = rIdx;
                  break;
                }
              }
            }
            if (objId) break;
          }
        }
      }

      if (objId && objId.startsWith('minispill_sea_rescue_box')) {
        const def = findItemById(objId);
        const meta = objectMetadata[index] || {};
        const w = meta.width || def?.width || 1;
        const h = meta.height || def?.height || 1;
        
        // Calculate object center
        const ox = index % mapWidth;
        const oy = Math.floor(index / mapWidth);
        
        sr.draggedBox = {
          index,
          startX: (ox + w / 2) * TILE_SIZE,
          startY: (oy + h / 2) * TILE_SIZE,
          objId
        };
      }
    }
  } else {
    if (sr.draggedBox) {
      // Launch!
      const { startX, startY, index, objId } = sr.draggedBox;
      const driftY = refs.driftY || ctx.driftY || 0;
      const currentStartY = startY + driftY;
      
      const dragX = startX - worldMouseX;
      const dragY = currentStartY - worldMouseY;
      const dist = Math.sqrt(dragX * dragX + dragY * dragY);
      const limitedDist = Math.min(dist, MAX_DRAG);
      const ratio = limitedDist / (dist || 1);
      
      const vx = dragX * ratio * POWER;
      const vy = dragY * ratio * POWER;
      
      // Spawn a special projectile that looks like the box
      const id = projectileIdRef.current++;
      
      const def = findItemById(objId);
      const meta = objectMetadata[index] || {};
      const w = (meta.width || def?.width || 1) * TILE_SIZE;
      const h = (meta.height || def?.height || 1) * TILE_SIZE;
      const frameIndex = meta.frameIndex !== undefined ? meta.frameIndex : (def?.spriteSheet?.frameIndex || 0);

      const proj = {
        id,
        ownerId: 'player',
        x: startX,
        y: currentStartY,
        vx,
        vy,
        dir: vx >= 0 ? 1 : -1,
        w: w,
        h: h,
        life: 30000,
        defId: objId,
        isSeaRescueBox: true,
        frameIndex: frameIndex,
        gravity: G, // px/s^2
        useSimplePhysics: true // Flag for updateProjectiles
      };
      
      projectilesRef.current.push(proj);
      
      // Remove box from map via state update (avoid direct modification of read-only objectData)
      if (typeof onStateUpdate === 'function') {
        onStateUpdate('collectItem', { index });
      }
      
      sr.draggedBox = null;

      // Effects and Sounds
      if (typeof playSfx === 'function') {
        const outSound = def?.sounds?.water_out || "/assets/sound/sfx/water/in_fish-splashing-release-1-96870.ogg";
        playSfx(outSound, 0.6);
      }
      if (refs.fx?.triggerSplash) {
        refs.fx.triggerSplash(startX, currentStartY);
      }
    }
  }
}

export function drawSeaRescueTrajectory(ctx, graphics) {
  const sr = ctx.refs.seaRescueRef;
  if (!sr || !sr.draggedBox) return;
  
  const { startX, startY } = sr.draggedBox;
  const driftY = ctx.driftY || 0;
  const currentStartY = startY + driftY;
  
  const { mousePos } = ctx.input.current;
  const cameraX = ctx.cameraX || ctx.refs?.cameraRef?.x || 0;
  const cameraY = ctx.cameraY || ctx.refs?.cameraRef?.y || 0;
  
  const worldMouseX = ctx.refs?.mouseWorldPos?.x || (mousePos.x + cameraX);
  const worldMouseY = ctx.refs?.mouseWorldPos?.y || (mousePos.y + cameraY);
  
  // Load physics settings
  const findItemById = ctx.helpers?.findItemById || ((id) => null);
  const settings = findItemById('sea_rescue_settings')?.physics || {};
  const G = settings.gravity || 1600;
  const POWER = settings.power || 6;
  const MAX_DRAG = settings.maxDrag || 140;
  const STEPS = settings.trajectorySteps || 35;
  const DT = settings.dt || 0.06;
  
  const dragX = startX - worldMouseX;
  const dragY = currentStartY - worldMouseY;
  const dist = Math.sqrt(dragX * dragX + dragY * dragY);
  const limitedDist = Math.min(dist, MAX_DRAG);
  const ratio = limitedDist / (dist || 1);
  
  const vx = dragX * ratio * POWER;
  const vy = dragY * ratio * POWER;
  
  graphics.clear();
  graphics.beginFill(0xffffff, 0.8);
  
  // Get map bounds to stop trajectory
  const activeId = ctx.mapData.meta?.activeMapId || ctx.mapData.meta?.activeMap || 'main';
  const activeMap = ctx.mapData.maps ? ctx.mapData.maps[activeId] : ctx.mapData;
  const ts = ctx.tileSize || 32;
  const mapWidthPx = (activeMap.width || 20) * ts;
  const mapHeightPx = (activeMap.height || 20) * ts;

  for (let i = 1; i <= STEPS; i++) {
    const t = i * DT;
    const px = startX + vx * t;
    const py = currentStartY + vy * t + 0.5 * G * t * t;
    
    // Stop if out of bounds
    if (px < 0 || px > mapWidthPx || py > mapHeightPx) break;
    
    // Draw dot
    graphics.drawCircle(px, py, 3);
  }
  graphics.endFill();
}
