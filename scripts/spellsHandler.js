// ---------- Cast Spell ------------
export async function handleCastSpell(payload){
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
export async function handleExpendSpellSlot(payload) {
    const actor = game.actors.get(payload?.actorId);
    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }
    const spellCasting = getSpellCasting(actor)
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
export async function removeSpellFromSpellSlot(payload){
    const actor = game.actors.get(payload?.actorId);
    if (!actor) {
        console.log(`Actor with id ${payload?.actorId} does not exist.`);
        return;
    }
    const spellCasting = getSpellCasting(actor)
    const slotId = payload?.slotId
    const spellId = payload?.spellId
    const slotLevel = payload?.slotLevel

    // Expend a spell slot
    const preparedPath = `system.slots.slot${slotLevel}.prepared`;
    const prepared = foundry.utils.getProperty(spellCasting, preparedPath) || {};
    prepared[slotId] = {...prepared[slotId], id: spellId};

    if (spellCasting && spellCasting?.system?.slots && slotLevel > 0) {
        await spellCasting.update({
            [preparedPath]: prepared
        })
    } else {
        console.log('No spell slots available to expend.');
    }
}

function getSpellCasting(actor) {
    return actor?.spellcasting?.regular[0]
}

function escapeHtml(string) {
    const replacements = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;',
    }
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
        return replacements[s]
    })
}