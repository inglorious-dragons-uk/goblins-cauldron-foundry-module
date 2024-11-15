Hooks.once('init', () => {
  console.log("This code runs once on initialization");
})

Hooks.once('ready', () => {
  // This code runs once when Foundry is ready
  console.log("This code runs once core initialization is ready and game data is available");
  game?.socket.on('module.goblins-cauldron-foundry-module', handleSocketEvent);
});


function handleSocketEvent({ eventType, payload }) {
  console.log('eventType ', eventType, ' payload ', payload);

  switch (eventType) {
    case "UPDATE_CHARACTER": {
      handleUpdateCharacterSheet(payload);
      break
    }
    case "SEND_TO_CHAT": {
      handleSendToChat(payload);
      break
    }
    case "ROLL_DICE": {
      handleDiceRoll(payload);
      break
    }
    default:
      //throw new Error('unknown event type');
      console.log('unknown event type')
  }
}

// Listen for 'updateActor' events from the server
function handleUpdateCharacterSheet(payload) {
  
  // Get the actor
  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  // Update the actor data
  actor.update(payload.data);

  console.log('Actor ', actor?.name, ' - with ID ', actor?._id, ' successfully updated!');
}

function handleSendToChat(payload) {
  const actor = game.actors.get(payload?.actorId);

  if (!actor) {
    console.log(`Actor with id ${payload?.actorId} does not exist.`);
    return;
  }

  ChatMessage.create({
    user: payload?.actorId,
    speaker: ChatMessage.getSpeaker(),
    content: payload.chatMessage
  });
}

function handleDiceRoll(payload) {
  console.log(`Rolling ${payload.count}d${payload.diceType}`);

  const formula = payload.count + "d" + payload.diceType;
  const roll = new Roll(formula);

  roll.toMessage({
    user: payload?.actorId
  }, 'publicroll', true)
}