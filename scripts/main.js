// main.js
Hooks.once('ready', () => {
  // This code runs once when Foundry is ready
  console.log("This code runs once core initialization is ready and game data is available");

  function handleSocketEvent({ eventType, payload }) {
    console.log('eventType ', eventType, ' payload ', payload);

    switch (eventType) {
      case "UPDATE_CHARACTER": {
        handleUpdateCharacterSheet(payload);
      }
      default:
        throw new Error('unknown event type');
    }
  }
  
  // Listen for 'updateActor' events from the server
  function handleUpdateCharacterSheet(payload) {
    // // Get the actor
    let actor = game.actors.get(payload.actorId);

    // Check if the actor exists
    if (!actor) {
      console.log(`Actor with id ${payload.actorId} does not exist.`);
      return;
    }

    // Update the actor's name
    actor.update({ "name": payload.characterData.name, "system.details.age.value": payload.characterData.age});

    let chatMessage = `Actor's name has been updated to ${payload.characterData.name}.`;

    ChatMessage.create({
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: chatMessage
    });

    console.log('name ', payload.characterData.name, ' actorId ', payload.actorId, ' actor ', actor);
  }

  game.socket.on('module.goblins-cauldron-foundry-module', handleSocketEvent);

});
