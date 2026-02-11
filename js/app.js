import { TEAMS } from './data.js';
import { randomizeSeats } from './engine.js';
import { SEAT_LAYOUT, SPECIAL_ZONES } from './layout.js';

// ========================
// CONFIG
// ========================
const STORAGE_KEY = 'seat_randomizer_data';

// ========================
// DOM ELEMENTS
// ========================
const seatMapEl = document.getElementById('seat-map');
const btnRandom = document.getElementById('btn-random');
const teamSummaryEl = document.getElementById('team-summary');
const totalCountEl = document.getElementById('total-count');

// Manage Members
const btnManageMembers = document.getElementById('btn-manage-members');
const btnAddMember = document.getElementById('btn-add-member');
const btnSaveMember = document.getElementById('btn-save-member');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const membersTableBody = document.getElementById('members-table-body');
const manageTotalCount = document.getElementById('manage-total-count');
const searchMembersInput = document.getElementById('search-members');
const filterTeamSelect = document.getElementById('filter-team');

// Member Form
const memberIdInput = document.getElementById('member-id');
const memberNameInput = document.getElementById('member-name');
const memberTeamSelect = document.getElementById('member-team');
const memberModalLabel = document.getElementById('memberModalLabel');
const deleteMemberNameEl = document.getElementById('delete-member-name');

// Modal overlays
const memberModalOverlay = document.getElementById('memberModalOverlay');
const manageMembersOverlay = document.getElementById('manageMembersOverlay');
const deleteConfirmOverlay = document.getElementById('deleteConfirmOverlay');

// Close buttons
const btnCloseMemberModal = document.getElementById('btn-close-member-modal');
const btnCancelMember = document.getElementById('btn-cancel-member');
const btnCloseManageModal = document.getElementById('btn-close-manage-modal');
const btnCloseManage = document.getElementById('btn-close-manage');
const btnCloseDeleteModal = document.getElementById('btn-close-delete-modal');
const btnCancelDelete = document.getElementById('btn-cancel-delete');

// ========================
// STATE
// ========================
let currentMembers = [];
let deletingMemberId = null;

// ========================
// MODAL HELPERS (vanilla)
// ========================
function openModal(overlay) {
    overlay.classList.add('active');
}

function closeModal(overlay) {
    overlay.classList.remove('active');
}

function setupModalClose(overlay, ...closeBtns) {
    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay);
    });
    // Close on buttons
    closeBtns.forEach(btn => {
        if (btn) btn.addEventListener('click', () => closeModal(overlay));
    });
}

// ========================
// INITIALIZATION
// ========================
async function init() {
    // Populate team selects
    populateTeamSelects();

    // Setup modal close handlers
    setupModalClose(memberModalOverlay, btnCloseMemberModal, btnCancelMember);
    setupModalClose(manageMembersOverlay, btnCloseManageModal, btnCloseManage);
    setupModalClose(deleteConfirmOverlay, btnCloseDeleteModal, btnCancelDelete);

    // Load data: localStorage first, then fallback to members.json
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            currentMembers = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse localStorage data', e);
            await loadFromJson();
        }
    } else {
        await loadFromJson();
    }

    renderSidebar();
    renderSeatMap(currentMembers);

    // Event Listeners
    btnRandom.addEventListener('click', handleRandomize);
    btnManageMembers.addEventListener('click', openManageModal);
    btnAddMember.addEventListener('click', openAddMemberModal);
    btnSaveMember.addEventListener('click', handleSaveMember);
    btnConfirmDelete.addEventListener('click', handleConfirmDelete);
    searchMembersInput.addEventListener('input', renderMembersTable);
    filterTeamSelect.addEventListener('change', renderMembersTable);

    // ESC to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal(memberModalOverlay);
            closeModal(manageMembersOverlay);
            closeModal(deleteConfirmOverlay);
        }
        // Enter to save in member modal
        if (e.key === 'Enter' && memberModalOverlay.classList.contains('active')) {
            e.preventDefault();
            handleSaveMember();
        }
    });
}

async function loadFromJson() {
    try {
        const response = await fetch('members.json');
        const data = await response.json();
        currentMembers = data.map(m => {
            const teamKey = Object.keys(TEAMS).find(key => TEAMS[key].id === m.teamId);
            const color = teamKey ? TEAMS[teamKey].color : '#999';
            return { ...m, teamColor: color };
        });
        currentMembers.sort((a, b) => a.teamId.localeCompare(b.teamId));
        saveData();
    } catch (e) {
        console.error('Failed to load members.json', e);
    }
}

function populateTeamSelects() {
    const teamsArray = Object.values(TEAMS);

    memberTeamSelect.innerHTML = teamsArray.map(t =>
        `<option value="${t.id}">${t.name}</option>`
    ).join('');

    filterTeamSelect.innerHTML = '<option value="">All Teams</option>' +
        teamsArray.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// ========================
// DATA PERSISTENCE
// ========================
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentMembers));
}

function getNextId() {
    if (currentMembers.length === 0) return 1;
    return Math.max(...currentMembers.map(m => m.id)) + 1;
}

function getTeamColor(teamId) {
    const teamKey = Object.keys(TEAMS).find(key => TEAMS[key].id === teamId);
    return teamKey ? TEAMS[teamKey].color : '#999';
}

function getTeamName(teamId) {
    const teamKey = Object.keys(TEAMS).find(key => TEAMS[key].id === teamId);
    return teamKey ? TEAMS[teamKey].name : 'Unknown';
}

// ========================
// SIDEBAR RENDER
// ========================
function renderSidebar() {
    totalCountEl.textContent = currentMembers.length;

    const teamMembers = {};
    currentMembers.forEach(m => {
        if (!teamMembers[m.teamId]) teamMembers[m.teamId] = [];
        teamMembers[m.teamId].push(m);
    });

    let html = '';
    Object.values(TEAMS).forEach(team => {
        const members = teamMembers[team.id] || [];
        const count = members.length;

        const membersHtml = members.map(m => `
            <div class="team-member-item">${m.name}</div>
        `).join('');

        html += `
            <div class="team-card">
                <div class="team-card-header" data-team="${team.id}">
                    <div class="team-card-left">
                        <div class="team-color-dot" style="background-color: ${team.color}; box-shadow: 0 0 6px ${team.color}"></div>
                        <span class="team-card-name">${team.name}</span>
                    </div>
                    <span class="team-card-count">${count}</span>
                </div>
                <div class="team-card-body" id="team-list-${team.id}">
                    ${membersHtml}
                </div>
            </div>
        `;
    });

    teamSummaryEl.innerHTML = html;

    // Attach toggle listeners
    document.querySelectorAll('.team-card-header').forEach(header => {
        header.addEventListener('click', () => {
            const teamId = header.dataset.team;
            const body = document.getElementById(`team-list-${teamId}`);
            body.classList.toggle('open');
        });
    });
}

// ========================
// SEAT MAP RENDER
// ========================
function renderSeatMap(memberList) {
    seatMapEl.innerHTML = '';

    const sortedLayout = [...SEAT_LAYOUT].sort((a, b) => a.id - b.id);

    const gridEl = document.createElement('div');
    gridEl.className = 'seat-grid custom-layout';
    gridEl.style.gridTemplateColumns = 'repeat(13, 1fr)';
    gridEl.style.gridTemplateRows = 'repeat(8, 1fr)';

    sortedLayout.forEach((seat, index) => {
        const member = memberList[index];

        const seatItem = document.createElement('div');
        seatItem.className = 'seat-item';
        seatItem.style.gridColumn = seat.col;
        seatItem.style.gridRow = seat.row;
        seatItem.style.animation = `fadeIn 0.3s ease forwards ${index * 0.01}s`;
        seatItem.style.opacity = '0';

        const seatNumBadge = `<div class="seat-number-badge">${seat.label}</div>`;

        if (member) {
            seatItem.style.borderColor = member.teamColor;
            seatItem.style.background = `linear-gradient(135deg, #ffffff, ${member.teamColor}11)`;

            seatItem.innerHTML = `
                ${seatNumBadge}
                <div class="team-dot" style="background-color: ${member.teamColor}; box-shadow: 0 0 5px ${member.teamColor}"></div>
                <div class="member-name" style="font-size: 0.75rem;">${member.name}</div>
                <div class="member-role">${member.teamName}</div>
            `;
        } else {
            seatItem.classList.add('empty-seat');
            seatItem.innerHTML = `${seatNumBadge}<span class="text-muted" style="font-size:0.7em">Empty</span>`;
        }

        gridEl.appendChild(seatItem);
    });

    SPECIAL_ZONES.forEach(zone => {
        const zoneEl = document.createElement('div');
        zoneEl.className = 'special-zone';
        zoneEl.style.gridColumn = `${zone.colStart} / ${zone.colEnd}`;
        zoneEl.style.gridRow = `${zone.rowStart} / ${zone.rowEnd}`;
        zoneEl.innerHTML = `<span class="zone-label">☕ ${zone.name}</span>`;
        gridEl.appendChild(zoneEl);
    });

    seatMapEl.appendChild(gridEl);
}

// ========================
// RANDOMIZE
// ========================
function handleRandomize() {
    btnRandom.disabled = true;
    const origText = btnRandom.textContent;
    btnRandom.textContent = '⏳ Mixing...';

    setTimeout(() => {
        const randomizedList = randomizeSeats(currentMembers);
        renderSeatMap(randomizedList);
        btnRandom.disabled = false;
        btnRandom.textContent = origText;
    }, 600);
}

// ========================
// MANAGE MEMBERS MODAL
// ========================
function openManageModal() {
    renderMembersTable();
    openModal(manageMembersOverlay);
}

function renderMembersTable() {
    const searchTerm = searchMembersInput.value.toLowerCase().trim();
    const filterTeam = filterTeamSelect.value;

    let filtered = currentMembers;

    if (searchTerm) {
        filtered = filtered.filter(m => m.name.toLowerCase().includes(searchTerm));
    }
    if (filterTeam) {
        filtered = filtered.filter(m => m.teamId === filterTeam);
    }

    manageTotalCount.textContent = filtered.length;

    if (filtered.length === 0) {
        membersTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-msg">🔍 No members found</td>
            </tr>
        `;
        return;
    }

    membersTableBody.innerHTML = filtered.map((m, i) => {
        const teamColor = m.teamColor || getTeamColor(m.teamId);
        return `
            <tr>
                <td class="text-muted">${i + 1}</td>
                <td>
                    <div class="cell-name">
                        <div class="cell-dot" style="background-color: ${teamColor}"></div>
                        <span style="font-weight:500">${m.name}</span>
                    </div>
                </td>
                <td>
                    <span class="cell-badge" style="background:${teamColor}15; color:${teamColor}; border-color:${teamColor}40;">
                        ${m.teamName}
                    </span>
                </td>
                <td>
                    <div class="cell-actions">
                        <button class="btn-icon btn-icon-edit btn-edit-member" data-id="${m.id}" title="Edit">✏️</button>
                        <button class="btn-icon btn-icon-delete btn-delete-member" data-id="${m.id}" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Attach event listeners
    document.querySelectorAll('.btn-edit-member').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            openEditMemberModal(id);
        });
    });

    document.querySelectorAll('.btn-delete-member').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            openDeleteConfirm(id);
        });
    });
}

// ========================
// ADD / EDIT MEMBER
// ========================
function openAddMemberModal() {
    memberIdInput.value = '';
    memberNameInput.value = '';
    memberTeamSelect.value = Object.values(TEAMS)[0].id;
    memberModalLabel.textContent = '➕ Add Member';
    memberNameInput.classList.remove('is-invalid');
    openModal(memberModalOverlay);
    setTimeout(() => memberNameInput.focus(), 100);
}

function openEditMemberModal(id) {
    const member = currentMembers.find(m => m.id === id);
    if (!member) return;

    memberIdInput.value = member.id;
    memberNameInput.value = member.name;
    memberTeamSelect.value = member.teamId;
    memberModalLabel.textContent = '✏️ Edit Member';
    memberNameInput.classList.remove('is-invalid');
    openModal(memberModalOverlay);
    setTimeout(() => memberNameInput.focus(), 100);
}

function handleSaveMember() {
    const name = memberNameInput.value.trim();
    const teamId = memberTeamSelect.value;
    const editId = memberIdInput.value;

    if (!name) {
        memberNameInput.classList.add('is-invalid');
        memberNameInput.focus();
        return;
    }
    memberNameInput.classList.remove('is-invalid');

    const teamColor = getTeamColor(teamId);
    const teamName = getTeamName(teamId);

    if (editId) {
        // UPDATE
        const idx = currentMembers.findIndex(m => m.id === parseInt(editId));
        if (idx !== -1) {
            currentMembers[idx] = {
                ...currentMembers[idx],
                name,
                teamId,
                teamName,
                teamColor
            };
        }
    } else {
        // CREATE
        const newMember = {
            id: getNextId(),
            name,
            teamId,
            teamName,
            teamColor
        };
        currentMembers.push(newMember);
    }

    saveData();
    renderSidebar();
    renderSeatMap(currentMembers);
    renderMembersTable();
    closeModal(memberModalOverlay);

    showToast(editId ? 'Member updated successfully!' : 'Member added successfully!', 'success');
}

// ========================
// DELETE MEMBER
// ========================
function openDeleteConfirm(id) {
    const member = currentMembers.find(m => m.id === id);
    if (!member) return;

    deletingMemberId = id;
    deleteMemberNameEl.textContent = member.name;
    openModal(deleteConfirmOverlay);
}

function handleConfirmDelete() {
    if (deletingMemberId === null) return;

    currentMembers = currentMembers.filter(m => m.id !== deletingMemberId);
    deletingMemberId = null;

    saveData();
    renderSidebar();
    renderSeatMap(currentMembers);
    renderMembersTable();
    closeModal(deleteConfirmOverlay);

    showToast('Member deleted successfully!', 'danger');
}

// ========================
// TOAST NOTIFICATION
// ========================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);

    // Close on click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    });

    // Auto-remove after 3s
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// ========================
// RUN
// ========================
init();
