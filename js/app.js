import { MEMBERS, TEAMS } from './data.js';
import { randomizeSeats } from './engine.js';

// Config
const STORAGE_KEY = 'seat_randomizer_data';

// DOM Elements
const seatMapEl = document.getElementById('seat-map');
const btnRandom = document.getElementById('btn-random');
const teamSummaryEl = document.getElementById('team-summary');
const totalCountEl = document.getElementById('total-count');

// Data Features DOM
const btnExport = document.getElementById('btn-export');
const btnImportTrigger = document.getElementById('btn-import-trigger');
const fileImportInput = document.getElementById('file-import');

// State
let currentMembers = [...MEMBERS];

// Initialize
// Initialize
async function init() {
    // Try to load from local storage first, if not exist, fetch from JSON
    const hasLocalParams = localStorage.getItem(STORAGE_KEY);

    // We will favor the members.json source if storage is empty
    // OR if we want to force valid initial state, but typically storage wins if present.
    // However, if storage has OLD data structure (e.g. from previous random generator),
    // it might be safer to verify or allow reset.
    // For now: Storage wins. If user wants factory reset -> they use button (which we need to handle).

    if (hasLocalParams) {
        loadData();
    } else {
        try {
            const response = await fetch('members.json');
            const data = await response.json();
            // Map colors from TEAMS config
            currentMembers = data.map(m => {
                // Find team color
                const teamKey = Object.keys(TEAMS).find(key => TEAMS[key].id === m.teamId);
                const color = teamKey ? TEAMS[teamKey].color : '#999';
                return { ...m, teamColor: color };
            });

            // Sort by Team ID to ensure grouped initial state
            currentMembers.sort((a, b) => a.teamId.localeCompare(b.teamId));

            saveData(); // Save to local storage for persistence
        } catch (e) {
            console.error('Failed to load members.json', e);
        }
    }

    renderSidebar();
    renderSeatMap(currentMembers);

    // Event Listeners
    btnRandom.addEventListener('click', handleRandomize);

    // Data Listeners
    if (btnExport) btnExport.addEventListener('click', handleExport);
    if (btnImportTrigger) btnImportTrigger.addEventListener('click', () => fileImportInput.click());
    if (fileImportInput) fileImportInput.addEventListener('change', handleImport);
}







function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            currentMembers = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load storage', e);
            currentMembers = [...MEMBERS];
        }
    } else {
        currentMembers = [...MEMBERS];
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentMembers));
}

function renderSidebar() {
    totalCountEl.textContent = currentMembers.length;

    // Group members by team for displaying
    const teamMembers = {};
    currentMembers.forEach(m => {
        if (!teamMembers[m.teamId]) teamMembers[m.teamId] = [];
        teamMembers[m.teamId].push(m);
    });

    let html = '';
    const sortedTeamKeys = Object.keys(TEAMS).filter(key => teamMembers[TEAMS[key].id] && teamMembers[TEAMS[key].id].length > 0);

    // Also include empty teams if needed, but let's stick to existing logic of TEAMS config
    Object.values(TEAMS).forEach(team => {
        const members = teamMembers[team.id] || [];
        const count = members.length;

        // Members list HTML
        const membersHtml = members.map(m => `
            <div class="d-flex align-items-center mb-2 ms-4">
                <small class="text-secondary">${m.name}</small>
            </div>
        `).join('');

        html += `
            <div class="mb-3 rounded border border-dark-subtle" style="background: rgba(255,255,255,0.4); border: 1px solid rgba(0,0,0,0.05);">
                <div class="d-flex align-items-center justify-content-between p-2 cursor-pointer" 
                     onclick="document.getElementById('team-list-${team.id}').classList.toggle('d-none');">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle me-3" style="width: 12px; height: 12px; background-color: ${team.color}; box-shadow: 0 0 5px ${team.color}"></div>
                        <span class="fw-medium">${team.name}</span>
                    </div>
                    <span class="badge bg-secondary text-white">${count}</span>
                </div>
                <div id="team-list-${team.id}" class="d-none pb-2 border-top border-secondary-subtle pt-2 transition-all">
                    ${membersHtml}
                </div>
            </div>
        `;
    });

    teamSummaryEl.innerHTML = html;
}

import { SEAT_LAYOUT, SPECIAL_ZONES } from './layout.js';

function renderSeatMap(memberList) {
    seatMapEl.innerHTML = '';

    // We need to map members to the layout order. 
    // memberList is a flat array already randomized.
    // We will simple take memberList[i] and place it in SEAT_LAYOUT[i] (sorted by id).
    // First, let's sort layout by ID to match the concept of "Position 1, Position 2..."
    // actually, the randomizer fills a linear array. 
    // If the randomizer result has 40 people, they go into slots 1..40.

    // Let's ensure SEAT_LAYOUT is sorted by ID 1..48
    const sortedLayout = [...SEAT_LAYOUT].sort((a, b) => a.id - b.id);

    const gridEl = document.createElement('div');
    gridEl.className = 'seat-grid custom-layout';
    // Max cols is 13 based on layout.js
    gridEl.style.gridTemplateColumns = `repeat(13, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(8, 1fr)`;

    // Render Seats
    sortedLayout.forEach((seat, index) => {
        const member = memberList[index]; // simple 1-to-1 mapping

        const seatItem = document.createElement('div');
        seatItem.className = 'seat-item';
        seatItem.style.gridColumn = seat.col;
        seatItem.style.gridRow = seat.row;

        // Stagger animation
        seatItem.style.animation = `fadeIn 0.3s ease forwards ${index * 0.01}s`;
        seatItem.style.opacity = '0';

        // Add Seat Number Badge
        const seatNumBadge = `<div class="seat-number-badge">${seat.label}</div>`;

        if (member) {
            seatItem.style.borderColor = member.teamColor;
            // Lighter gradient for seats
            seatItem.style.background = `linear-gradient(135deg, #ffffff, ${member.teamColor}11)`;

            // Always use dark text for light theme, unless background is very dark (which it isn't here)
            const textColorClass = 'text-dark';

            seatItem.innerHTML = `
                ${seatNumBadge}
                <div class="team-dot" style="background-color: ${member.teamColor};box-shadow: 0 0 5px ${member.teamColor}"></div>
                <div class="member-name ${textColorClass}" style="font-size: 0.75rem;">${member.name}</div>
                <div class="member-role text-secondary">${member.teamName}</div>
            `;
        } else {
            seatItem.classList.add('empty-seat');
            seatItem.innerHTML = `${seatNumBadge}<span class="text-muted" style="font-size:0.7em">Empty</span>`;
        }

        gridEl.appendChild(seatItem);
    });

    // Render Special Zones (Kitchen)
    SPECIAL_ZONES.forEach(zone => {
        const zoneEl = document.createElement('div');
        zoneEl.className = 'special-zone';
        zoneEl.style.gridColumn = `${zone.colStart} / ${zone.colEnd}`;
        zoneEl.style.gridRow = `${zone.rowStart} / ${zone.rowEnd}`;
        zoneEl.innerHTML = `<span class="zone-label"><i class="bi bi-cup-hot me-2"></i>${zone.name}</span>`;
        gridEl.appendChild(zoneEl);
    });

    // Add global keyframes if not exists
    if (!document.getElementById('anim-styles')) {
        const style = document.createElement('style');
        style.id = 'anim-styles';
        style.innerHTML = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px) scale(0.9); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    seatMapEl.appendChild(gridEl);
}

function handleRandomize() {
    // Add a small delay or loading state if needed for effect
    btnRandom.disabled = true;
    btnRandom.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Mixing...';

    setTimeout(() => {
        const randomizedList = randomizeSeats(currentMembers);
        renderSeatMap(randomizedList);
        btnRandom.disabled = false;
        btnRandom.innerHTML = 'Randomize Seats ✨';
    }, 600); // Artificial delay to feel like "work" is being done
}



function handleExport() {
    const dataStr = JSON.stringify(currentMembers, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `seating-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            if (Array.isArray(json)) {
                currentMembers = json;
                saveData(); // Persist
                renderSidebar(); // Update counts
                renderSeatMap(currentMembers); // Update map
                alert('Import successful!');
            } else {
                alert('Invalid JSON format: Expected an array.');
            }
        } catch (error) {
            console.error(error);
            alert('Error parsing JSON file.');
        }
        // Reset input so same file can be selected again if needed
        event.target.value = '';
    };
    reader.readAsText(file);
}



// Run
init();
