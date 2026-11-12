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
 * Physical desk clusters. Used to prefer team pieces that stay inside one cluster.
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
 * Blocks = clusters that sit right next to each other and form one continuous strip.
 * Seat IDs walk the strip as a snake, so consecutive seats are always physically adjacent:
 *  - Left: row 1 L→R (1-4), row 2 R→L (5-8), row 4 L→R (9-12), row 5 R→L (16-13), row 7 L→R (17-20)
 *  - Right: middle column down (25-28) then up (29-32), right column down (33-36) then up (37-40)
 * A team takes a consecutive run of seats on one strip, so it always sits together.
 */
function getBlocks() {
    return [
        { name: 'Left', seatIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 15, 14, 13, 17, 18, 19, 20] },
        { name: 'Right', seatIds: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40] },
    ];
}

const MAX_ASSIGNMENTS = 50000; // block-assignment enumeration limit (k^teams)
const MAX_ORDER_PIECES = 7;    // permutation search limit inside one block (7! = 5040)
const MAX_FILL_EVALS = 200000; // anchor splits x orders tried per block

function factorial(n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * Pick which block each team goes to.
 * Enumerates every team→block assignment and keeps the best:
 *   1. fewest locked members whose team is placed in a different block
 *      (a team always follows its locked members, so nobody is left sitting alone),
 *   2. least overflow (members that must be split off to another block).
 * Ties are broken randomly so each randomize gives a different layout.
 */
function chooseBlocks(teams, blocks) {
    const k = blocks.length;
    const n = teams.length;
    let best = [];
    let bestKey = null;

    const evaluate = (assign) => {
        const loads = new Array(k).fill(0);
        let lockPenalty = 0;
        teams.forEach((t, i) => {
            loads[assign[i]] += t.members.length;
            t.lockedPerBlock.forEach((count, b) => {
                if (b !== assign[i]) lockPenalty += count;
            });
        });
        const overflow = loads.reduce((sum, load, b) => sum + Math.max(0, load - blocks[b].free.length), 0);
        const key = [lockPenalty, overflow];
        const cmp = bestKey === null ? -1
            : (key[0] - bestKey[0]) || (key[1] - bestKey[1]);
        if (cmp < 0) {
            bestKey = key;
            best = [[...assign]];
        } else if (cmp === 0) {
            best.push([...assign]);
        }
    };

    if (Math.pow(k, n) <= MAX_ASSIGNMENTS) {
        const assign = new Array(n).fill(0);
        for (;;) {
            evaluate(assign);
            let i = 0;
            while (i < n && ++assign[i] === k) assign[i++] = 0;
            if (i === n) break;
        }
        return best[Math.floor(Math.random() * best.length)];
    }

    // Too many teams to enumerate: greedy, biggest team into the block with most room
    const room = blocks.map(b => b.free.length);
    const assign = new Array(n).fill(0);
    teams.map((t, i) => i)
        .sort((a, b) => teams[b].members.length - teams[a].members.length)
        .forEach(i => {
            const b = room.indexOf(Math.max(...room));
            assign[i] = b;
            room[b] -= teams[i].members.length;
        });
    return assign;
}

function permutations(items) {
    if (items.length <= 1) return [items];
    const out = [];
    items.forEach((item, i) => {
        const rest = [...items.slice(0, i), ...items.slice(i + 1)];
        permutations(rest).forEach(p => out.push([item, ...p]));
    });
    return out;
}

/**
 * Fill one block's free seats (in strip order) with the team pieces.
 *
 * Teams that have a locked member in this block are anchored first: a run of their
 * members wraps the locked seat (x members before it, the rest after), so the locked
 * member sits next to teammates. The other teams then fill the remaining free seats
 * one after another.
 *
 * Every anchor split and every order of the other teams is tried; the winner has
 * (1) fewest locked members without a teammate beside them, (2) fewest teams cut
 * into more than one run, (3) fewest teams spread over two desk clusters.
 * If anchors collide (locks close together), anchored teams may also be cut:
 * part wraps the lock, the rest sits further along. Ties are picked at random.
 */
function fillBlock(block, pieces, zoneOf, lockedByTeam, seatAssignment) {
    const posOf = new Map(block.seatIds.map((id, i) => [id, i]));
    const freeIdx = new Map(block.free.map((id, i) => [id, i]));
    const lockedSeatsHere = [...lockedByTeam.entries()]
        .flatMap(([teamId, seats]) => seats.filter(sid => posOf.has(sid)).map(sid => ({ teamId, sid })));

    const anchored = [];
    const others = [];
    for (const piece of pieces) {
        const lockedHere = lockedSeatsHere
            .filter(l => l.teamId === piece.teamId)
            .map(l => l.sid)
            .sort((a, b) => posOf.get(a) - posOf.get(b));
        if (lockedHere.length) {
            const lockPos = posOf.get(lockedHere[0]);
            const before = block.free.filter(id => posOf.get(id) < lockPos).length;
            anchored.push({ piece, before });
        } else {
            others.push(piece);
        }
    }

    const score = (placed) => {
        const teamAt = new Map(lockedSeatsHere.map(l => [l.sid, l.teamId]));
        const seatsByTeam = new Map();
        for (const { piece, seats } of placed) {
            seats.forEach(id => teamAt.set(id, piece.teamId));
            if (!seatsByTeam.has(piece.teamId)) seatsByTeam.set(piece.teamId, []);
            seatsByTeam.get(piece.teamId).push(...seats);
        }
        let lonely = 0;
        for (const { teamId, sid } of lockedSeatsHere) {
            const p = posOf.get(sid);
            const near = [block.seatIds[p - 1], block.seatIds[p + 1]];
            if (!near.some(id => id !== undefined && teamAt.get(id) === teamId)) lonely++;
        }
        let cuts = 0;
        let crossings = 0;
        for (const seats of seatsByTeam.values()) {
            if (!seats.length) continue;
            const idx = seats.map(id => freeIdx.get(id)).sort((a, b) => a - b);
            for (let i = 1; i < idx.length; i++) if (idx[i] !== idx[i - 1] + 1) cuts++;
            crossings += new Set(seats.map(id => zoneOf.get(id))).size - 1;
        }
        return [lonely, cuts, crossings];
    };

    const layoutSequential = (order, seatList) => {
        const placed = [];
        let offset = 0;
        for (const piece of order) {
            placed.push({ piece, seats: seatList.slice(offset, offset + piece.members.length) });
            offset += piece.members.length;
        }
        return placed;
    };

    // Best layout, random among ties (reservoir sampling)
    let chosen = null;
    let bestKey = null;
    let ties = 0;
    const consider = (placed) => {
        const key = score(placed);
        let cmp = bestKey === null ? -1 : 0;
        for (let i = 0; cmp === 0 && i < key.length; i++) cmp = key[i] - bestKey[i];
        if (cmp < 0) {
            bestKey = key;
            chosen = placed;
            ties = 1;
        } else if (cmp === 0 && Math.random() < 1 / ++ties) {
            chosen = placed;
        }
    };

    // allowCut=false: anchored teams sit whole around their lock.
    // allowCut=true: only k of them wrap the lock, the rest joins the other teams.
    const search = (allowCut) => {
        const options = anchored.map(a => {
            const len = a.piece.members.length;
            const list = [];
            for (let k = allowCut ? 1 : len; k <= len; k++) {
                for (let x = 0; x <= k; x++) list.push([k, x]);
            }
            return list;
        });
        const combos = options.reduce((n, list) => n * list.length, 1);
        const pick = new Array(anchored.length).fill(0);
        for (;;) {
            const taken = new Set();
            const placedAnchors = [];
            const pool = [...others];
            let ok = true;
            anchored.forEach((a, i) => {
                if (!ok) return;
                const [k, x] = options[i][pick[i]];
                const startIdx = a.before - x;
                const seats = block.free.slice(startIdx, startIdx + k);
                if (startIdx < 0 || seats.length !== k || seats.some(id => taken.has(id))) {
                    ok = false;
                    return;
                }
                seats.forEach(id => taken.add(id));
                placedAnchors.push({ piece: { teamId: a.piece.teamId, members: a.piece.members.slice(0, k) }, seats });
                if (k < a.piece.members.length) {
                    pool.push({ teamId: a.piece.teamId, members: a.piece.members.slice(k) });
                }
            });
            if (ok) {
                const rest = block.free.filter(id => !taken.has(id));
                const fullSearch = pool.length <= MAX_ORDER_PIECES
                    && combos * factorial(pool.length) <= MAX_FILL_EVALS;
                const orders = fullSearch
                    ? permutations(pool)
                    : Array.from({ length: Math.max(1, Math.min(50, Math.floor(MAX_FILL_EVALS / combos))) },
                        () => shuffle(pool));
                for (const order of orders) consider([...placedAnchors, ...layoutSequential(order, rest)]);
            }
            let i = 0;
            while (i < pick.length && ++pick[i] === options[i].length) pick[i++] = 0;
            if (i === pick.length) break;
        }
    };

    search(false);
    if (!chosen || bestKey[0] > 0) search(true);
    if (!chosen) chosen = layoutSequential(shuffle(pieces), block.free);

    for (const { piece, seats } of chosen) {
        seats.forEach((seatId, i) => {
            seatAssignment[seatId - 1] = piece.members[i];
        });
    }
}

/**
 * Assigns members to seats keeping each team together.
 *
 * Strategy:
 * 1. Locked seats keep their member; blocked seats stay empty. Both are taken out
 *    of the free seats.
 * 2. Every team goes whole into one block (continuous strip of adjacent clusters).
 *    A team always goes to the block of its locked members; among those combinations
 *    the one needing the fewest members split off wins (usually zero).
 * 3. If a block still overflows, its largest team without a locked member there gives
 *    the extra members to the block with most free room, as one consecutive piece.
 * 4. Inside a block, teams with a locked member wrap around the locked seat; the
 *    other teams take consecutive seats along the strip in the order that cuts the
 *    fewest teams and keeps them inside one cluster.
 *
 * @param {Array} members
 * @param {Object} locks Map seatId -> memberId of seats that must not change
 * @param {Array} blocked Seat IDs that must stay empty
 * @returns {Array} Length = total seats, indexed by seatId - 1
 */
export function randomizeSeats(members, locks = {}, blocked = []) {
    const zoneOf = new Map();
    getZones().forEach((z, i) => z.seatIds.forEach(id => zoneOf.set(id, i)));
    const maxSeatId = Math.max(...zoneOf.keys());
    const seatAssignment = new Array(maxSeatId).fill(null);
    const blockedSeatIds = new Set(blocked.map(Number));

    // 1. Pin locked members to their seats; drop locks whose member no longer exists
    const memberById = new Map(members.map(m => [m.id, m]));
    const lockedMemberIds = new Set();
    const lockedSeatIds = new Set();
    const lockedByTeam = new Map(); // teamId -> [seatId]
    Object.entries(locks).forEach(([seatId, memberId]) => {
        const member = memberById.get(memberId);
        const sid = Number(seatId);
        if (member && zoneOf.has(sid) && !blockedSeatIds.has(sid) && !lockedMemberIds.has(memberId)) {
            seatAssignment[sid - 1] = member;
            lockedMemberIds.add(memberId);
            lockedSeatIds.add(sid);
            if (!lockedByTeam.has(member.teamId)) lockedByTeam.set(member.teamId, []);
            lockedByTeam.get(member.teamId).push(sid);
        }
    });

    const blocks = getBlocks().map(b => ({
        ...b,
        free: b.seatIds.filter(id => !lockedSeatIds.has(id) && !blockedSeatIds.has(id)),
    }));
    const blockOf = new Map();
    blocks.forEach((b, i) => b.seatIds.forEach(id => blockOf.set(id, i)));

    // Team list with shuffled members and count of locked members per block
    const teamGroups = new Map();
    members.filter(m => !lockedMemberIds.has(m.id)).forEach(m => {
        if (!teamGroups.has(m.teamId)) teamGroups.set(m.teamId, []);
        teamGroups.get(m.teamId).push(m);
    });
    const teams = shuffle([...teamGroups.entries()]).map(([teamId, list]) => {
        const lockedPerBlock = new Map();
        (lockedByTeam.get(teamId) || []).forEach(sid => {
            const b = blockOf.get(sid);
            lockedPerBlock.set(b, (lockedPerBlock.get(b) || 0) + 1);
        });
        return { teamId, members: shuffle(list), lockedPerBlock };
    });

    // 2. Team → block
    const assign = chooseBlocks(teams, blocks);
    const pieces = blocks.map(() => []);
    teams.forEach((t, i) => pieces[assign[i]].push({ teamId: t.teamId, members: [...t.members] }));

    // 3. Overflow: largest team in an over-full block hands its extra members to the roomiest block.
    //    Teams with a locked member in this block give last, so the locked member keeps company.
    const loadOf = b => pieces[b].reduce((sum, p) => sum + p.members.length, 0);
    const pickDonor = b => {
        const hasLockHere = p => (lockedByTeam.get(p.teamId) || []).some(sid => blockOf.get(sid) === b);
        const free = pieces[b].filter(p => !hasLockHere(p));
        const pool = free.length ? free : pieces[b];
        return pool.reduce((a, p) => (p.members.length > a.members.length ? p : a));
    };
    blocks.forEach((block, b) => {
        let excess = loadOf(b) - block.free.length;
        while (excess > 0) {
            const donor = pickDonor(b);
            const room = blocks.map((other, o) => (o === b ? 0 : other.free.length - loadOf(o)));
            const target = room.indexOf(Math.max(...room));
            const take = Math.min(excess, donor.members.length, Math.max(0, room[target]));
            if (take <= 0) break; // more members than seats: the rest stay unseated
            const moved = donor.members.splice(donor.members.length - take, take);
            const existing = pieces[target].find(p => p.teamId === donor.teamId);
            if (existing) existing.members.push(...moved);
            else pieces[target].push({ teamId: donor.teamId, members: moved });
            if (!donor.members.length) pieces[b].splice(pieces[b].indexOf(donor), 1);
            excess -= take;
        }
        // Still too many (no room anywhere): drop the tail so the block fits
        while (loadOf(b) > block.free.length) {
            const donor = pieces[b].reduce((a, p) => (p.members.length > a.members.length ? p : a));
            donor.members.pop();
            if (!donor.members.length) pieces[b].splice(pieces[b].indexOf(donor), 1);
        }
    });

    // 4. Fill each block along its strip
    blocks.forEach((block, b) => fillBlock(block, pieces[b], zoneOf, lockedByTeam, seatAssignment));

    return seatAssignment;
}
