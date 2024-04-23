Hooks.once('init', () => {
  console.log("This code runs once on initialization");
})

Hooks.once('ready', () => {
  // This code runs once when Foundry is ready
  console.log("This code runs once core initialization is ready and game data is available");
  game.socket.on('module.goblins-cauldron-foundry-module', handleSocketEvent);
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
    default:
      //throw new Error('unknown event type');
      console.log('unknown event type')
  }
}

// Listen for 'updateActor' events from the server
function handleUpdateCharacterSheet(payload) {
  
  // Get the actor
  const actor = [...game.actors.keys()].map((key) => {
    return game.actors.get(key)
  }).find((x) => {
    return x.name === payload.actorName
  })

  if (!actor) {
    console.log(`Actor with id ${actor._id} does not exist.`);
    return;
  }

  // Update the actor data
  actor.update(payload.data);

  console.log('Actor ', payload.data.name, ' - with ID ', actor._id, ' successfully updated!');
}

function handleSendToChat(payload) {
  const actor = [...game.actors.keys()].map((key) => {
    return game.actors.get(key)
  }).find((x) => {
    return x.name === payload.actorName
  })

  if (!actor) {
    console.log(`Actor with id ${actor._id} does not exist.`);
    return;
  }

  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker(),
    content: payload.chatMessage
  });
}