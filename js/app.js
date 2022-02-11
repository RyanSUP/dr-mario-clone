/**
 * Definitions:
 * Node - an object that takes a single space on the board. This could be a pillNode or a virus.
 * Pill - 2 pillNodes that are linked to each other
 */

/* -------------------------------  CONSTANTS  ----------------------------------------- */
const TOTAL_ROWS = 16
const TOTAL_COLS = 8
// These colors will determine color on the board when rendering, and also be used as symbols in the board data model
const PILL_COLORS = ['r', 'y', 'b']
const VIRUS_COLORS = ['R', 'Y', 'B']
const sqDivs = []
const boardModel = [];
/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
/* -------------------------------  Variables  -------------------------------- */
let virusCount;
let playerPill;

/* -------------------------------  Player Pill  -------------------------------- */
class PlayerPill {
    constructor() {
        this.pillNodeA = this.createPillNode(3)
        this.pillNodeB = this.createPillNode(4)
        this.couplePillNodes()
    }

    createPillNode(startingColumn) {
        let randomIdx = Math.floor(Math.random() * PILL_COLORS.length)
        return {
            color: PILL_COLORS[randomIdx],
            row: 0,
            col: startingColumn,
            sibling: null,
            prevRow: 0,
            prevCol: startingColumn,
        }
    }

    couplePillNodes() {
        this.pillNodeA.sibling = this.pillNodeB
        this.pillNodeB.sibling = this.pillNodeA
    }

    addThisToBoardModel() {
        addNodeToBoardModel(this.pillNodeA)
        addNodeToBoardModel(this.pillNodeB)
    }

    move(rowDirection, colDirection) {
        this.removeThisFromBoardModel()

        this.pillNodeA.row += rowDirection
        this.pillNodeB.row += rowDirection
        this.pillNodeA.col += colDirection
        this.pillNodeB.col += colDirection
        this.addThisToBoardModel()

    }
    removeThisFromBoardModel() {
        removeNodeFromBoardModel(this.pillNodeA)
        removeNodeFromBoardModel(this.pillNodeB)
    }
    moveDown() {
        this.removeThisFromBoardModel()
        this.pillNodeA.row += 1
        this.pillNodeB.row += 1
        this.addThisToBoardModel
        this.addThisToBoardModel()
    }

    /**
     * if it moves down, the 2 columns above go null.
     * if it moves left, column to the right of B is null
     * if it moces right, column to the left of a is null
     */
}

/* -------------------------------  Event Listeners  -------------------------------- */
document.addEventListener('keydown', handleKeyPress);

function handleKeyPress(evt) {
    if(evt.code === 'ArrowLeft') {
        console.log('LEFT')
        playerPill.move(0, -1)
    } else if(evt.code === 'ArrowRight') {
        console.log('RIGHT')
        playerPill.move(0, 1)
    } else if(evt.code === 'ArrowDown') {
        console.log('DOWN')
        playerPill.move(1, 0)
    } else if(evt.code === 'KeyZ') {
        console.log('Z')
    } else if(evt.code === 'KeyX') {
        console.log('X')
    }
    render()
}
/**
ArrowRight
app.js:56  ArrowLeft
app.js:56  ArrowDown
app.js:56  KeyZ
app.js:56  KeyX
 */
/* -------------------------------  Initializing  -------------------------------- */
function init() {
    // Create the HTML (View) board
    initSqDivs()
    // Create player
    playerPill = new PlayerPill()
    // Create the empty model board
    initBoardModel()
    playerPill.addThisToBoardModel()
    // set starting viruses
    virusCount = 4;
    initViruses()
    // * dont reset the score
}

// Creates div elements and appends them to boardContainer
// Pushes div elements into 2D sqDivs array to be used for rendering.
// The array is 2D because the data model is and this will make it easier to translate
// the model to the view
function initSqDivs() {
    for(let row = 0; row < TOTAL_ROWS; row++) {
        const divsInRow = []
        for(let col = 0; col < TOTAL_COLS; col++) {
            const div = document.createElement('div')
            div.className = 'sq'
            // ^ looks like this -->  <div class="sq"></div>
            boardContainer.append(div)
            divsInRow.push(div)
        }
        sqDivs.push(divsInRow) 
    }
}

function initBoardModel() {
    for(let row = 0; row < TOTAL_ROWS; row++) {
        const columnsInRow = []
        for(let col = 0; col < TOTAL_COLS; col++) {
            columnsInRow.push(null)
        }
        boardModel.push(columnsInRow) 
    }
}

function initViruses() {
    for(let i = 0; i < virusCount; i++) {
        let v = getRandomizedVirusNode(8)
        boardModel[v.row][v.col] = v
    }
}

/* -------------------------------  Render  -------------------------------- */
function render() {
    renderBoard()
}

function renderBoard() {
    for(let row = 0; row < TOTAL_ROWS; row++) {
        for(let col = 0; col < TOTAL_COLS; col++) {
            if(boardModel[row][col] !== null) {
                let node = boardModel[row][col]
                sqDivs[row][col].classList.add(node.color)
            } else {
                sqDivs[row][col].className = 'sq'
            }
        }
    }
}

/* -------------------------------  Node / Pill / Virus Functions  -------------------------------- */

function decouplePillNode(node) {
    // Remove the node from its sibling
    node.sibling.sibling = null
    // Then remove the sibling node
    node.sibling = null
}

// Setting the handicap ensures viruses will never be generated above that row.
// Just keep in min 0 is at the top and 16 is at the bottom
function getRandomizedVirusNode(handicap) {
    // get random color. 
    // PILL_COLORS and VIRUS_COLORS will always be the same length, so it doesn't matter which I choose here.
    let randomIdx = Math.floor(Math.random() * PILL_COLORS.length)
    let randomRow = Math.floor(Math.random() * TOTAL_ROWS + handicap)
    randomRow = clampNum(randomRow, handicap, 15)
    let randomCol = Math.floor(Math.random() * TOTAL_COLS)

    return {
        color: VIRUS_COLORS[randomIdx],
        row: randomRow,
        col: randomCol,
        sibling: null // Virus will never have a sibling, but I'll keep this property for now.
    }
}

/* -------------------------------  Board  -------------------------------- */
function addNodeToBoardModel(node) {
    boardModel[node.row][node.col] = node
}
function removeNodeFromBoardModel(node) {
    boardModel[node.row][node.col] = null
}
/* -------------------------------  Helpers  -------------------------------- */

function clampNum(num, min, max) {
    if(num > max) {
        return max
    } else if (num < min) {
        return min
    } else {
        return num
    }
}


/* -------------------------------  Main  -------------------------------- */
init()
render()