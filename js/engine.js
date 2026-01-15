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
 * Organizes members into a grid with grouping preference.
 * Strategy:
 * 1. Group members by team.
 * 2. Shuffle the order of teams.
 * 3. Shuffle members within each team (optional, for internal variety).
 * 4. Place them onto the grid in a "snake" pattern or simple row-major order
 *    to ensure members of the same list defined in step 1 stay adjacent.
 * 
 * @param {Array} members 
 * @param {Object} config { rows: 5, cols: 8 }
 * @returns {Array} 2D Array or 1D Array representing the grid
 */
export function randomizeSeats(members, config = { rows: 5, cols: 8 }) {
    // 1. Group by Team
    const teams = {};
    members.forEach(m => {
        if (!teams[m.teamId]) teams[m.teamId] = [];
        teams[m.teamId].push(m);
    });

    // 2. Shuffle Teams Order
    const teamKeys = Object.keys(teams);
    const shuffledTeamKeys = shuffle(teamKeys);

    // 3. Flatten into a single list, ensuring team members are adjacent
    let organizedList = [];
    shuffledTeamKeys.forEach(key => {
        // Shuffle members within the team so they don't always sit in same relative order
        const teamMembers = shuffle(teams[key]);
        organizedList = organizedList.concat(teamMembers);
    });

    // 4. Map to Grid
    // Just returning the flat list for now, the UI will render it into a grid.
    // If we have more cells than members, we can add nulls or "Empty" slots.

    const totalSlots = config.rows * config.cols;
    if (organizedList.length < totalSlots) {
        // Fill remaining with nulls
        const emptyCount = totalSlots - organizedList.length;
        for (let i = 0; i < emptyCount; i++) {
            organizedList.push(null);
        }
    }

    // Optional: If we want to strictly enforce clustering on a 2D grid, 
    // a simple linear fill (row by row) usually keeps them together enough 
    // if the grid width isn't too large compared to team size.
    // With 40 people and 8 cols, a team of 8 fills exactly one row. 
    // A team of 4 fills half a row. They will always be adjacent linearly.

    return organizedList;
}
