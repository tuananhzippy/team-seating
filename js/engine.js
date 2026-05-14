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
        { name: 'Left Bottom', seatIds: [17, 18, 19, 20, 21, 22, 23, 24] },
        { name: 'Middle', seatIds: [25, 26, 27, 28, 29, 30, 31, 32] },
        { name: 'Right 1', seatIds: [33, 34, 35, 36, 37, 38, 39, 40] },
        { name: 'Right 2', seatIds: [41, 42, 43, 44, 45, 46, 47, 48] },
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
 * @param {Array} members
 * @returns {Array} Length = total seats, indexed by seatId - 1
 */
export function randomizeSeats(members) {
    const zones = getZones();
    const totalSeats = zones.reduce((s, z) => s + z.seatIds.length, 0);
    const seatAssignment = new Array(totalSeats).fill(null);
    const ZONE_SIZE = zones[0].seatIds.length;

    // 1. Group by team and shuffle members within each team
    const teamGroups = {};
    members.forEach(m => {
        if (!teamGroups[m.teamId]) teamGroups[m.teamId] = [];
        teamGroups[m.teamId].push(m);
    });

    // 2. Build chunk list. Oversize teams are sliced into full-zone chunks + remainder.
    const chunks = [];
    Object.keys(teamGroups).forEach(teamId => {
        let remaining = shuffle(teamGroups[teamId]);
        while (remaining.length > ZONE_SIZE) {
            chunks.push({ teamId, members: remaining.slice(0, ZONE_SIZE) });
            remaining = remaining.slice(ZONE_SIZE);
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

    // 4. First-Fit-Decreasing into bins of ZONE_SIZE
    const bins = [];
    for (const chunk of chunks) {
        let placed = false;
        for (const bin of bins) {
            if (bin.remaining >= chunk.members.length) {
                bin.chunks.push(chunk);
                bin.remaining -= chunk.members.length;
                placed = true;
                break;
            }
        }
        if (!placed) {
            bins.push({ chunks: [chunk], remaining: ZONE_SIZE - chunk.members.length });
        }
    }

    // 5. Randomize zone assignment so the same team doesn't always end up in the same physical spot
    const shuffledBins = shuffle(bins);
    const shuffledZoneIndices = shuffle(zones.map((_, i) => i));

    shuffledBins.forEach((bin, i) => {
        if (i >= zones.length) return; // out of zones (shouldn't happen if members fit)
        const zone = zones[shuffledZoneIndices[i]];
        let offset = 0;
        // Shuffle chunk order within a bin so multi-team zones vary
        const chunkOrder = shuffle(bin.chunks);
        for (const chunk of chunkOrder) {
            for (const member of chunk.members) {
                const seatId = zone.seatIds[offset++];
                seatAssignment[seatId - 1] = member;
            }
        }
    });

    return seatAssignment;
}
