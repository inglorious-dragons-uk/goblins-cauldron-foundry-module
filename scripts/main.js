// main.js
Hooks.once('ready', () => {
  // This code runs once when Foundry is ready
  console.log("This code runs once core initialization is ready and game data is available");
  
  // Listen for 'updateActor' events from the server
  game.socket.on('updateActor', async (data) => {
      // Get the actor
      let actor = game.actors.get(data.actorId);

      // Check if the actor exists
      if (!actor) {
          console.log(`Actor with id ${data.actorId} does not exist.`);
          return;
      }

      // Update the actor's name
      await actor.update({ "name": data.newName });

      let chatMessage = `Actor's name has been updated to ${data.newName}.`;

      ChatMessage.create({
        user: game.user._id,
        speaker: ChatMessage.getSpeaker(),
        content: chatMessage
      });

      console.log(chatMessage);

      console.log(`Actor's name has been updated to ${data.newName}.`);
  });
});
