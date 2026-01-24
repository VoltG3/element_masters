// Secret-related trigger handlers (weather, messages)

export function handleWeatherTrigger({
  objDef,
  currentMeta,
  index,
  gameState,
  onStateUpdate,
  playShotSfx
}) {
  if (!objDef || objDef.type !== 'weather_trigger') return false;

  const weatherType = objDef.weatherType; // rain, snow, clouds, fog, thunder
  const action = objDef.weatherAction; // on, off, set
  let value = 0;

  if (action === 'set' || action === 'on') {
    value = currentMeta?.intensity !== undefined ? currentMeta.intensity : (action === 'on' ? 100 : 50);
  } else if (action === 'off') {
    value = 0;
  }

  if (!gameState.current.lastWeatherTrigger) {
    gameState.current.lastWeatherTrigger = {};
  }

  const lastVal = gameState.current.lastWeatherTrigger[index];
  if (lastVal !== value) {
    if (onStateUpdate) {
      onStateUpdate('updateWeather', { type: weatherType, value });
    }
    gameState.current.lastWeatherTrigger[index] = value;

    if (objDef.sfx) {
      try {
        playShotSfx(objDef.sfx, objDef.sfxVolume || 0.5);
      } catch {}
    }
  }
  return true;
}

export function handleMessageTrigger({
  objDef,
  currentMeta,
  index,
  gameState,
  onStateUpdate,
  playShotSfx,
  keys
}) {
  if (!objDef || objDef.type !== 'message_trigger') return false;

  const requiresActionKey = !!(objDef.requiresActionKey || objDef.interaction?.requiresKey);
  if (requiresActionKey && !keys?.e) {
    return false;
  }

  const message = currentMeta?.message;
  if (!message) return true;

  if (!gameState.current.lastMessageTrigger) {
    gameState.current.lastMessageTrigger = {};
  }

  const lastMsg = gameState.current.lastMessageTrigger[index];
  if (lastMsg !== message) {
    if (onStateUpdate) {
      onStateUpdate('showMessage', { text: message, duration: 8000 });
    }
    gameState.current.lastMessageTrigger[index] = message;

    if (objDef.sfx) {
      try {
        playShotSfx(objDef.sfx, objDef.sfxVolume || 0.5);
      } catch {}
    }
  }
  return true;
}

export default { handleWeatherTrigger, handleMessageTrigger };
