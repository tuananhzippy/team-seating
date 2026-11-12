// Core Engine Logic

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array
 * @returns {Array} Shuffled array
 */
export function shuffle(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

/**
 * Defines the zone structure for the seat layout.
 * Each zone is a physical desk cluster. Seat IDs ordered left-to-right, top-to-bottom.
 */
function getZones() {
    return [
        { name: 'Left Top', seatIds: [1, 2, 3, 4, 5, 6, 7, 8] },
        { name: 'Left Middle', seatIds: [9, 10, 11, 12, 13, 14, 15, 16] },
        { name: 'Left Bottom', seatIds: [17, 18, 19, 20] },
        { name: 'Middle', seatIds: [25, 26, 27, 28, 29, 30, 31, 32] },
        { name: 'Right 1', seatIds: [33, 34, 35, 36, 37, 38, 39, 40] },
    ];
}

/**
 * Assigns members to seats keeping teams clustered.
 *
 * Strategy:
 * 1. Group members by team, shuffle internal order.
 * 2. For teams larger than a zone, peel off full-zone chunks first.
 * 3. Sort the resulting "team chunks" by size DESC.
 * 4. First-Fit-Decreasing bin-packing — pack chunks into zone-sized bins.
 *    Small teams (e.g. 4+4 or 2+2+4) end up sharing one zone.
 * 5. Assign filled bins to physical zones (zone order randomized for variety).
 *
 * Result: each zone is dominated by one team; sharing only happens when teams
 * are small enough to fit together cleanly. No isolated singletons.
 *
 * Locked seats keep their member: the seat is removed from its zone's capacity
 * and the member is removed from the shuffle pool. Teams that already have a
 * locked member in a zone prefer to be packed into that same zone.
 *
 * @param {Array} members
 * @param {Object} locks Map seatId -> memberId of seats that must not change
 * @returns {Array} Length = total seats, indexed by seatId - 1
 */
export function randomizeSeats(members, locks = {}) {
    const allZones = getZones();
    const maxSeatId = Math.max(...allZones.flatMap(z => z.seatIds));
    const seatAssignment = new Array(maxSeatId).fill(null);

    // 0. Pin locked members to their seats; drop locks whose member no longer exists
    const memberById = new Map(members.map(m => [m.id, m]));
    const lockedMemberIds = new Set();
    const lockedSeatIds = new Set();
    Object.entries(locks).forEach(([seatId, memberId]) => {
        const member = memberById.get(memberId);
        const sid = Number(seatId);
        if (member && sid >= 1 && sid <= maxSeatId && !lockedMemberIds.has(memberId)) {
            seatAssignment[sid - 1] = member;
            lockedMemberIds.add(memberId);
            lockedSeatIds.add(sid);
        }
    });

    // Zones shrink to their free seats; remember which teams are already pinned there
    const zones = allZones.map(z => ({
        ...z,
        seatIds: z.seatIds.filter(id => !lockedSeatIds.has(id)),
        lockedTeams: new Set(
            z.seatIds.filter(id => lockedSeatIds.has(id)).map(id => seatAssignment[id - 1].teamId)
        ),
    }));
    const freeMembers = members.filter(m => !lockedMemberIds.has(m.id));
    const MAX_ZONE_SIZE = Math.max(1, ...zones.map(z => z.seatIds.length));

    // 1. Group by team and shuffle members within each team
    const teamGroups = {};
    freeMembers.forEach(m => {
        if (!teamGroups[m.teamId]) teamGroups[m.teamId] = [];
        teamGroups[m.teamId].push(m);
    });

    // 2. Build chunk list. Oversize teams are sliced into full-zone chunks + remainder.
    const chunks = [];
    Object.keys(teamGroups).forEach(teamId => {
        let remaining = shuffle(teamGroups[teamId]);
        while (remaining.length > MAX_ZONE_SIZE) {
            chunks.push({ teamId, members: remaining.slice(0, MAX_ZONE_SIZE) });
            remaining = remaining.slice(MAX_ZONE_SIZE);
        }
        if (remaining.length > 0) {
            chunks.push({ teamId, members: remaining });
        }
    });

    // 3. Sort chunks by size DESC; randomize ties for variety
    chunks.sort((a, b) => {
        if (b.members.length !== a.members.length) return b.members.length - a.members.length;
        return Math.random() - 0.5;
    });

    // 4. First-Fit-Decreasing into one bin per zone.
    //    Zones can differ in size, so each bin carries its own capacity.
    //    Shuffle first (so the same team doesn't always land in the same physical spot),
    //    then sort by capacity DESC — big chunks meet big zones first.
    const bins = shuffle(zones.map(z => ({ zone: z, chunks: [], remaining: z.seatIds.length })))
        .sort((a, b) => b.remaining - a.remaining);

    const overflow = [];
    for (const chunk of chunks) {
        const fits = b => b.remaining >= chunk.members.length;
        const bin = bins.find(b => fits(b) && b.zone.lockedTeams.has(chunk.teamId))
            || bins.find(fits);
        if (bin) {
            bin.chunks.push(chunk);
            bin.remaining -= chunk.members.length;
        } else {
            overflow.push(chunk);
        }
    }

    // 4b. Chunks too big for any leftover gap get split across whatever space is left.
    for (const chunk of overflow) {
        let rest = chunk.members;
        for (const bin of bins) {
            if (!rest.length) break;
            if (bin.remaining <= 0) continue;
            const take = rest.slice(0, bin.remaining);
            bin.chunks.push({ teamId: chunk.teamId, members: take });
            bin.remaining -= take.length;
            rest = rest.slice(take.length);
        }
        // rest.length > 0 means more members than seats — those stay unseated
    }

    // 5. Fill seats zone by zone
    bins.forEach(bin => {
        let offset = 0;
        // Shuffle chunk order within a bin so multi-team zones vary
        const chunkOrder = shuffle(bin.chunks);
        for (const chunk of chunkOrder) {
            for (const member of chunk.members) {
                const seatId = bin.zone.seatIds[offset++];
                seatAssignment[seatId - 1] = member;
            }
        }
    });

    return seatAssignment;
}
