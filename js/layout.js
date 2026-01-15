export const SEAT_LAYOUT = [
    // Left Block - Top Group
    { id: 1, label: '1', col: 1, row: 1 },
    { id: 2, label: '2', col: 2, row: 1 },
    { id: 3, label: '3', col: 3, row: 1 },
    { id: 4, label: '4', col: 4, row: 1 },
    { id: 8, label: '8', col: 1, row: 2 },
    { id: 7, label: '7', col: 2, row: 2 },
    { id: 6, label: '6', col: 3, row: 2 },
    { id: 5, label: '5', col: 4, row: 2 },

    // Left Block - Middle Group
    { id: 9, label: '9', col: 1, row: 4 },
    { id: 10, label: '10', col: 2, row: 4 },
    { id: 11, label: '11', col: 3, row: 4 },
    { id: 12, label: '12', col: 4, row: 4 },
    { id: 13, label: '13', col: 1, row: 5 },
    { id: 14, label: '14', col: 2, row: 5 },
    { id: 15, label: '15', col: 3, row: 5 },
    { id: 16, label: '16', col: 4, row: 5 },

    // Left Block - Bottom Group
    { id: 17, label: '17', col: 1, row: 7 },
    { id: 18, label: '18', col: 2, row: 7 },
    { id: 19, label: '19', col: 3, row: 7 },
    { id: 20, label: '20', col: 4, row: 7 },
    { id: 24, label: '24', col: 1, row: 8 },
    { id: 23, label: '23', col: 2, row: 8 },
    { id: 22, label: '22', col: 3, row: 8 },
    { id: 21, label: '21', col: 4, row: 8 },

    // Middle Vertical Block
    { id: 25, label: '25', col: 6, row: 1 },
    { id: 32, label: '32', col: 7, row: 1 },
    { id: 26, label: '26', col: 6, row: 2 },
    { id: 31, label: '31', col: 7, row: 2 },
    { id: 27, label: '27', col: 6, row: 3 },
    { id: 30, label: '30', col: 7, row: 3 },
    { id: 28, label: '28', col: 6, row: 4 },
    { id: 29, label: '29', col: 7, row: 4 },

    // Right Vertical Block 1
    { id: 33, label: '33', col: 9, row: 1 },
    { id: 40, label: '40', col: 10, row: 1 },
    { id: 34, label: '34', col: 9, row: 2 },
    { id: 39, label: '39', col: 10, row: 2 },
    { id: 35, label: '35', col: 9, row: 3 },
    { id: 38, label: '38', col: 10, row: 3 },
    { id: 36, label: '36', col: 9, row: 4 },
    { id: 37, label: '37', col: 10, row: 4 },

    // Right Vertical Block 2
    { id: 41, label: '41', col: 12, row: 1 },
    { id: 45, label: '45', col: 13, row: 1 },
    { id: 42, label: '42', col: 12, row: 2 },
    { id: 46, label: '46', col: 13, row: 2 },
    { id: 43, label: '43', col: 12, row: 3 },
    { id: 47, label: '47', col: 13, row: 3 },
    { id: 44, label: '44', col: 12, row: 4 },
    { id: 48, label: '48', col: 13, row: 4 },
];

export const SPECIAL_ZONES = [
    {
        name: 'Kitchen Room',
        colStart: 6,
        colEnd: 14, // spans from 6 to 13
        rowStart: 6,
        rowEnd: 9, // spans from 6 to 8
        type: 'kitchen'
    }
];
