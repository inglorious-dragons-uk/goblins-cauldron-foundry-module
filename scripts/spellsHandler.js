// ---------- Cast Spell ------------
export const handleCastSpell = async (payload) => {
    const spellId = payload?.spellId
    const actor = game.actors.get(payload?.actorId);
    const dataEmbeddedItem = `data-embedded-item="${escapeHtml(JSON.stringify(item.toObject(false)))}"`

    const item = actor?.items?.get(spellId)
    const dataItemId = `data-item-id="${item.id}"`
    item.system.location.value = spellCasting.id
    item.isFromConsumable = true // to make it embed data

    const spellCasting = getSpellCasting(actor)
    Object.defineProperty(item, 'spellcasting', {
        value: spellCasting,
        configurable: true,
    })

    const chatMessage = await item.toMessage(null, {create: false})
    chatMessage.content = chatMessage.content.replace(dataItemId, `${dataItemId} ${dataEmbeddedItem}`)
    chatMessage.flags.pf2e.casting.embeddedSpell = item.toObject()
    chatMessage._source.flags.pf2e.casting.embeddedSpell = item.toObject()
    return ChatMessage.create(chatMessage)
}

// ---------- Expend Spell ------------
export const handleExpendSpellSlot = async (payload) => {
    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }

    const actor = game.actors.get(payload?.actorId);
    const slotId = payload?.slotId
    const slotLevel = payload?.slotLevel
    const isExpend = payload?.isExpend

    // Expend a spell slot
    const preparedPath = `system.slots.slot${slotLevel}.prepared`;
    const prepared = foundry.utils.getProperty(spellCasting, preparedPath) || {};
    prepared[slotId] = {...prepared[slotId], expended: isExpend};

    if (spellCasting && spellCasting?.system?.slots && slotLevel > 0) {
        await spellCasting.update({
            [preparedPath]: prepared
        })
    } else {
        console.log('No spell slots available to expend.');
    }
}

// ---------- Remove Spell ------------
const removeSpellFromSpellSlot = async (slotLevel, spellCasting, slotId, spellId, isExpend) => {
    // Get the prepared slots object
    const preparedPath = `system.slots.slot${slotLevel}.prepared`;
    const prepared = foundry.utils.getProperty(spellCasting, preparedPath) || {};
    const currentSlot = prepared[slotId] || {};

    // Only update if something changed
    const needsUpdate =
        currentSlot.expended !== isExpend ||
        (spellId !== undefined && currentSlot.id !== spellId);

    if (needsUpdate) {
        prepared[slotId] = {
            ...currentSlot,
            expended: isExpend,
            ...(spellId !== undefined ? { id: spellId } : {})
        };

        if (spellCasting && spellCasting?.system?.slots && slotLevel > 0) {
            await spellCasting.update({
                [preparedPath]: prepared
            });
        } else {
            console.log('No spell slots available to expend.');
        }
    }
}