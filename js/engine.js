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
 * Each zone is a group of seats (physical desk cluster).
 * Seat IDs within each zone are ordered left-to-right, top-to-bottom.
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
 * Minimum number of members from a team allowed in any single zone.
 * If splitting a team across zones would leave fewer than this in either part,
 * skip the remaining seats and start the team in a fresh zone.
 * 
 * Example with MIN_IN_ZONE = 2:
 *  - 7 + 1 split → 1 < 2 → BAD, start new zone for the smaller team
 *  - 6 + 2 split → both >= 2 → OK, allow sharing
 *  - 4 + 4 split → both >= 2 → OK, allow sharing
 *  - Team of 1 person → fits entirely, no split needed → OK
 */
const MIN_IN_ZONE = 2;

/**
 * Organizes members into seats respecting zone boundaries with smart sharing.
 * 
 * Strategy:
 * 1. Group members by team, shuffle team order and internal order.
 * 2. Fill zones left-to-right:
 *    a. If a team fits entirely in the remaining zone space → place them,
 *       then check if the NEXT team can also use leftover space.
 *    b. If a team is larger than remaining space → check if splitting
 *       would leave at least MIN_IN_ZONE members on BOTH sides.
 *       - Yes → split (fill this zone, overflow to next)
 *       - No → leave remaining seats empty, start team in next zone
 * 3. This avoids isolated members (e.g. 7+1) while maximizing seat usage (e.g. 4+4).
 * 
 * @param {Array} members 
 * @param {Object} config (unused, kept for API compatibility)
 * @returns {Array} Array of length = total seats, indexed by seatId - 1
 */
export function randomizeSeats(members, config = { rows: 5, cols: 8 }) {
    const zones = getZones();
    const totalSeats = zones.reduce((sum, z) => sum + z.seatIds.length, 0);
    const seatAssignment = new Array(totalSeats).fill(null);

    // 1. Group by Team
    const teams = {};
    members.forEach(m => {
        if (!teams[m.teamId]) teams[m.teamId] = [];
        teams[m.teamId].push(m);
    });

    // 2. Shuffle team order & members within each team
    const shuffledKeys = shuffle(Object.keys(teams));

    // Build a queue of teams with their shuffled members
    const teamQueue = shuffledKeys.map(key => ({
        teamId: key,
        members: shuffle(teams[key])
    }));

    // 3. Fill zones with teams
    let teamIdx = 0;

    for (let zoneIdx = 0; zoneIdx < zones.length && teamIdx < teamQueue.length; zoneIdx++) {
        const zone = zones[zoneIdx];
        const zoneSize = zone.seatIds.length;
        let seatOffset = 0; // current position within this zone
        let zoneRemaining = zoneSize;

        // Try to fit one or more teams into this zone
        while (zoneRemaining > 0 && teamIdx < teamQueue.length) {
            const currentTeam = teamQueue[teamIdx];
            const teamMemberCount = currentTeam.members.length;

            if (teamMemberCount === 0) {
                teamIdx++;
                continue;
            }

            if (teamMemberCount <= zoneRemaining) {
                // ✅ Entire team fits in remaining zone space → place them all
                for (let i = 0; i < teamMemberCount; i++) {
                    const seatId = zone.seatIds[seatOffset];
                    seatAssignment[seatId - 1] = currentTeam.members.shift();
                    seatOffset++;
                }
                zoneRemaining -= teamMemberCount;
                teamIdx++; // Move to next team
                // Loop continues: next team might also fit in remaining space
            } else {
                // Team is bigger than remaining zone space → would need to split
                const inThisZone = zoneRemaining;
                const inNextZone = teamMemberCount - zoneRemaining;

                if (inThisZone >= MIN_IN_ZONE && inNextZone >= MIN_IN_ZONE) {
                    // ✅ Both parts are large enough → allow split
                    for (let i = 0; i < inThisZone; i++) {
                        const seatId = zone.seatIds[seatOffset];
                        seatAssignment[seatId - 1] = currentTeam.members.shift();
                        seatOffset++;
                    }
                    zoneRemaining = 0;
                    // Don't increment teamIdx — remaining members go to next zone
                } else {
                    // ❌ Would create a tiny fragment → skip remaining seats
                    // Leave them empty, this team starts fresh in next zone
                    zoneRemaining = 0;
                }
            }
        }
    }

    return seatAssignment;
}
