const gridSizeSelection = document.querySelector("#ruudukon-koko");
let gridSize = gridSizeSelection.value;
document.getElementById("maxNum").innerHTML = gridSize ** 2;

let currentNumber = 1;
const grid = document.getElementById('grid');
const status = document.getElementById('status');
const bestDisplay = document.getElementById('best');
const resetBtn = document.getElementById('resetBtn');
const undoBtn = document.getElementById('undoBtn');
const visualizationToggle = document.getElementById("visual-toggle");
const delayRange = document.getElementById("delay-range");
const delayLabel = document.getElementById("delay-label");
const attempts = document.getElementById("attempts");

const visualizationLabel = document.getElementById("visual-label");
let visualizationOn = true;

let delay = 10;

let algoAttempts = 0;
const cells = [];
let moves = {};
let longestPath = [];
let used = {};
let shouldBeHidden = false;

window.onkeydown = (event) => { if(event.key === "q") shouldBeHidden = !shouldBeHidden}

let bestScore = localStorage.getItem('numeropolkuBest') || 0;
if (bestScore > 0) {
    bestDisplay.textContent = `Paras tulos: ${bestScore}`;
}

function initGrid() {
    grid.innerHTML = '';
    cells.length = 0;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            grid.appendChild(cell);
            cells.push(cell);
        }
    }
}

let path = [];
let undoUsed = false;

function resetGame() {
    currentNumber = 1;
    path = [];
    moves = {};
    longestPath = [];
    undoUsed = false;
    status.textContent = "Seuraava luku: 1";
    initGrid();
}

function undoMove() {
    if (undoUsed || path.length === 0) return;
    const last = path.pop();
    const index = last.row * gridSize + last.col;
    const cell = cells[index];
    cell.textContent = '';
    cell.classList.remove('filled');
    currentNumber--;
    status.textContent = `Seuraava luku: ${currentNumber}`;
    undoUsed = true;
}

function findAvailableMoves(row, col, usedIndexes) {
    const directions = [
        { dx: 3, dy: 0 }, { dx: -3, dy: 0 },
        { dx: 0, dy: 3 }, { dx: 0, dy: -3 },
        { dx: 2, dy: 2 }, { dx: -2, dy: 2 },
        { dx: 2, dy: -2 }, { dx: -2, dy: -2 },
    ];

    let availableMoves = [];

    directions.forEach(d => {
        const newRow = row + d.dy;
        const newCol = col + d.dx;
        if (newRow < 0 || newRow >= gridSize || newCol < 0 || newCol >= gridSize)
            return false;
        const index = newRow * gridSize + newCol;
        let isFilled = usedIndexes[index];

        if (!isFilled) {
            availableMoves.push({ row: newRow, col: newCol });
            return true;
        }
        return false;
    });

    return availableMoves
}

async function recurseChoices(row, col, used, lPath) {
    algoAttempts++;
    console.log(`Recursing size ${lPath.length}`);
    let index = row * gridSize + col;

    if (!isValidMove(row, col, lPath)) {
        console.log(`Invalid move ${row} ${col} from ${path[path.length -1]?.col}`);
        return false;
    }

    if (visualizationOn) {
        await highlightCell(row, col, lPath);
        await new Promise(r => setTimeout(r, delay));
    }

    if (used[index]) {
        console.log("already used");
        return false;
    }

    if (lPath.length > gridSize ** 2) {
        console.warn("Backtrack length exceeded gridsize");
        return false;
    }

    used[index] = true;
    lPath.push({ row, col });

    if (lPath.length === gridSize ** 2) {
        longestPath = [...lPath];
        return true;
    }

    let moves = findAvailableMoves(row, col, used)
        .sort((a, b) => {
            const aMoves = findAvailableMoves(a.row, a.col, used).length;
            const bMoves = findAvailableMoves(b.row, b.col, used).length;
            return aMoves - bMoves;
        });

    if (moves.length === 0) {
        if (lPath.length > longestPath.length) {
            longestPath = [...lPath];
        }
    } else {
        for (let move of moves) {
            const result = await recurseChoices(move.row, move.col, used, lPath);
            if (result) return true;
        }
    }

    used[index] = false;
    lPath.pop();
    return false;
}


function hasValidMoves(row, col) {
    let availableMoves = findAvailableMoves(row, col, moves);

    return availableMoves.length > 0;
}

async function highlightCell(row, col, currentPath) {
    let active = document.getElementsByClassName("highlight")
    while(active.length) {
        active[0].classList.remove("highlight");
    }
    let longest = document.getElementsByClassName("longest")
    while(longest.length) {
        longest[0].classList.remove("longest");
    };

    currentPath.forEach(element => {
        let index = element.row * gridSize + element.col;
        cells[index].classList.add("longest");
    });

    attempts.textContent = `Total algorithm attempts: ${algoAttempts}`;
    let index = row * gridSize + col;
    cells[index].classList.add("highlight");
}

async function getAssist(row, col, used, path) {
    console.log("getting assist");
    longestPath = [];
    algoAttempts = 0;
    await recurseChoices(row, col, JSON.parse(JSON.stringify(used)), path.slice());

    let active = document.getElementsByClassName("active")
    while(active.length) {
        active[0].classList.remove("active");
    }

    let element = longestPath[path.length + 1];
    if (element && !shouldBeHidden) {
        let index = element.row * gridSize + element.col;
        cells[index].classList.add("active");
    }
}

async function completeGame() {
    await recurseChoices(0,0, {}, []).then(_ => {
        longestPath.forEach(element => {
            let index = element.row * gridSize + element.col;
            cells[index].click();
        })
    })

}

function checkGameOver() {
    if (path.length === 0) return;
    const last = path[path.length - 1];
    if (!hasValidMoves(last.row, last.col)) {
        status.textContent = "Ei enää mahdollisia siirtoja. Peli päättyi.";
        if (path.length > bestScore) {
            bestScore = path.length;
            localStorage.setItem('numeropolkuBest', bestScore);
            bestDisplay.textContent = `Paras tulos: ${bestScore}`;
        }
    }
}

gridSizeSelection.addEventListener('change', () => {
    gridSize = gridSizeSelection.value;
    grid.style.setProperty('--gridSize', gridSize);
    resetGame();
    document.getElementById("maxNum").innerHTML = gridSize ** 2;
    localStorage.setItem('numeropolkuBest', 0);
    bestDisplay.textContent = `Paras tulos: -`;
    resetGame();
});

grid.addEventListener('click', async (e) => {
    const cell = e.target;
    if (!cell.classList.contains('cell') || cell.classList.contains('filled')) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (isValidMove(row, col, path)) {
        await getAssist(row,col, moves, path);
        cell.textContent = currentNumber;
        cell.classList.add('filled');
        moves[row * gridSize + col] = true;
        path.push({ row, col, number: currentNumber });
        currentNumber++;
        if (currentNumber > gridSize ** 2) {
            status.textContent = "Peli päättyi! Kaikki numerot asetettu. Hienoa! Pyydä palkinto opelta :)";
            if (path.length > bestScore) {
                bestScore = path.length;
                localStorage.setItem('numeropolkuBest', bestScore);
                bestDisplay.textContent = `Paras tulos: ${bestScore}`;
            }
        } else {
            status.textContent = `Seuraava luku: ${currentNumber}`;
            checkGameOver();
        }
    } else {
        alert(`Virheellinen siirto! ${row}x${col}`);
    }
});

resetBtn.addEventListener('click', resetGame);
undoBtn.addEventListener('click', undoMove);
visualizationToggle.addEventListener("change", event => {
    visualizationOn = visualizationToggle.checked;
})
delayRange.oninput = function() {
    delay = this.value;
    delayLabel.textContent = `(${delay}ms)`
}

function isValidMove(row, col, path) {
    if (path.length === 0) return true;
    const last = path[path.length - 1];
    const dx = col - last.col;
    const dy = row - last.row;
    if (row === last.row && Math.abs(dx) === 3) return true;
    if (col === last.col && Math.abs(dy) === 3) return true;
    if (Math.abs(dx) === 2 && Math.abs(dy) === 2) return true;
    return false;
}

initGrid();