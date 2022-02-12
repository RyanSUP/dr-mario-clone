/**
 * Definitions:
 * Node - an object that takes a single space on the board. This could be a pillNode or a virus.
 * Pill - 2 pillNodes that are linked to each other
 */

/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
/* -------------------------------  CONSTANTS  ----------------------------------------- */
const TOTAL_ROWS = 16
const TOTAL_COLS = 8
const STARTING_POSITION_A = {row:0, col:3}
const STARTING_POSITION_B = {row:0, col:4}
const MOVE_DOWN = {row:1, col:0}
const MOVE_LEFT = {row:0, col:-1}
const MOVE_RIGHT = {row:0, col:1}

// These colors will determine color on the board when rendering, and also be used as symbols in the board data model
const PILL_COLORS = ['r', 'y', 'b']
const VIRUS_COLORS = ['R', 'Y', 'B']
const sqDivs = []
const boardModel = [];
/* -------------------------------  Variables  -------------------------------- */
let virusCount;
let playerPill;
/* ------------------------------- 🎮 Player Pill 💊 -------------------------------- */
class PlayerPill {

    constructor() {
        // Pills always start in the top center
        let nodeA = this.createPillNode(STARTING_POSITION_A)
        let nodeB = this.createPillNode(STARTING_POSITION_B)
        // Pills always start connected to their sibling
        nodeA.sibling = nodeB
        nodeB.sibling = nodeA

        this.nodes = [nodeA, nodeB]
        
        // Track horizontal and vertical state of the pill. This will be important for rotating.
        // -1 = HORIZONTAL
        //  1 = VERTICAL
        this.orientation = -1
    }

    createPillNode(startPosition) {
        let randomIdx = Math.floor(Math.random() * PILL_COLORS.length)
        return {
            color: PILL_COLORS[randomIdx],
            sibling: null,
            position: startPosition, 
        }
    }

    isLegalMove(positionOffset) {
        // To determine if a move is legal, grab both nodes and put them each through some tests. If one of the nodes fail, the move is not legal.
        for(const n of this.nodes) {
            let nextPosition = this.addPositions(n.position, positionOffset)
            // Prevent player from going off the board
            if(!this.isInBounds(nextPosition)) {
                return false
            }
            // Prevent player from moving into another node
            if(this.isColliding(n, nextPosition)) {
                return false
            }
        }
        // All checks passed
        return true
    }

    isColliding(node, position) {
        let npNode = getNodeFromBoardModelAt(position)
        return (npNode === null || npNode === node.sibling) ? false : true
    }

    // {row: 0, col: 1} <- sample data
    isInBounds(position) { 
        return (    
            (position.col < TOTAL_COLS) && 
            (position.col >= 0) &&
            (position.row >= 0) &&
            (position.row < TOTAL_ROWS)
        ) 
    }

    isDoneMoving() {

    }

    lastRowCheck() {
        if (nextPosition.row === TOTAL_ROWS) {
            console.log(this, "On the last row!")
        }
    }

    updatePlayerPillOnBoardModel() { this.nodes.forEach(n => addNodeToBoardModel(n)) }
    
    removePlayerPillFromBoardModel() { this.nodes.forEach(n => removeNodeFromBoardModel(n)) }

    // position offset is an object {row: y, col: x}
    move(positionOffset) {
        // Check if legal move
        if(this.isLegalMove(positionOffset)) {

            // Remove this pill from the board
            this.removePlayerPillFromBoardModel()
            // Change the pill coords
            this.nodes.forEach(n => n.position = this.addPositions(n.position, positionOffset))
            // Add the new coords to the board
            this.updatePlayerPillOnBoardModel()
        }
    }

    updateOrientation() { this.orientation *= -1 }

    rotateClockwise() {
        if(this.orientation === -1) {
            // If space above keyNode is null, rotate is legal
            let rotationOffset = {row: -1, col: 0}
            let boardSpaceAboveKeyNode = this.addPositions(this.nodes[0].position, rotationOffset)

            if(this.isInBounds(boardSpaceAboveKeyNode)) {
                if(getNodeFromBoardModelAt(boardSpaceAboveKeyNode) === null) {
                   // rotate
                    // Remove this pill from the board
                    this.removePlayerPillFromBoardModel()
                    // Change the pill coords
                    this.nodes[1].position = this.nodes[0].position
                    this.nodes[0].position = boardSpaceAboveKeyNode
                    // Add the new coords to the board
                    this.updatePlayerPillOnBoardModel()
                   // change key node
                    this.nodes.reverse()
                    this.updateOrientation()    
                }
            }
        }
    }

    rotateCounterClockwise() {
        console.log('counter clockwise')
    }

    addPositions(posObjA, posObjB) {
        return  {
            row: posObjA.row + posObjB.row,
            col: posObjA.col + posObjB.col
        }
    }
}
/* ------------------------------- 🦻 Event Listeners 📡 -------------------------------- */
document.addEventListener('keydown', handleKeyPress);

// ! After each move, if the player can't move the pill down or if the pill is on the last row, that pill gets placed on the board and a new pill is generated.
function handleKeyPress(evt) {
    if(evt.code === 'ArrowLeft') {
        playerPill.move(MOVE_LEFT)
    } else if(evt.code === 'ArrowRight') {
        playerPill.move(MOVE_RIGHT)
    } else if(evt.code === 'ArrowDown') {
        playerPill.move(MOVE_DOWN)
    } else if(evt.code === 'KeyZ') {
        playerPill.rotateCounterClockwise()
    } else if(evt.code === 'KeyX') {
        playerPill.rotateClockwise()
    }
    render()
}
/* ------------------------------- 🔌 Initializing 👍 -------------------------------- */
// ! After I implement the game loop player stuff will be in its own function that handles spawning a new pill
function init() {
    // Create the HTML (View) board
    initSqDivs()
    // Create player
    playerPill = new PlayerPill()
    // Create the empty model board
    initBoardModel()
    playerPill.updatePlayerPillOnBoardModel()
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
        boardModel[v.position.row][v.position.col] = v
    }
}

/* ------------------------------- 🖥 Render 🎁 -------------------------------- */
function render() {
    renderBoard()
    // render score
    // render message
    // render win screen
    // render lose screen
    // render controls
}

// Reset all the div.sq classes default, then add classes depending on what is at the position.
// Reseting the class is needed to properly display movement.
function renderBoard() {
    for(let row = 0; row < TOTAL_ROWS; row++) {
        for(let col = 0; col < TOTAL_COLS; col++) {
            sqDivs[row][col].className = 'sq'
            if(boardModel[row][col] !== null) {
                let node = boardModel[row][col]
                sqDivs[row][col].classList.add(node.color)
            }
        }
    }
    // This is for testing. print all the data to the log
    logBoard()
}

/* ------------------------------- 🦠 Node / Pill / Virus Functions 🧫 -------------------------------- */

function decouplePillNodes(node) {
    // Remove the node from its sibling
    node.sibling.sibling = null
    // Then remove the sibling from node
    node.sibling = null
}

// Setting the handicap ensures viruses will never be generated above the handicap row.
// This can be adjusted to increase difficulty
// TODO: Increase virus count and lower handicap as levels increase
// ! Viruses can spawn ontop of eachother and mess up the total! Need to fix!
function getRandomizedVirusNode(handicap) {
    // get random color. 
    // PILL_COLORS and VIRUS_COLORS will always be the same length, so it doesn't matter which I choose here.
    let randomIdx = Math.floor(Math.random() * PILL_COLORS.length)
    let randomRow = Math.floor(Math.random() * TOTAL_ROWS + handicap)
    randomRow = clampNum(randomRow, handicap, 15)
    let randomCol = Math.floor(Math.random() * TOTAL_COLS)

    return {
        color: VIRUS_COLORS[randomIdx],
        position: {row: randomRow, col: randomCol},
        sibling: null // Virus will never have a sibling, but I'll keep this property for now.
    }
}

/* -------------------------------  Helpers  -------------------------------- */
function addNodeToBoardModel(node) { boardModel[node.position.row][node.position.col] = node }

function removeNodeFromBoardModel(node) { boardModel[node.position.row][node.position.col] = null }

function clampNum(num, min, max) {
    if(num > max) { return max } 
    if (num < min) { return min }
    return num
}

function getNodeFromBoardModelAt(positionObj) { return boardModel[positionObj.row][positionObj.col] }

function logBoard() {
    console.log('=====================')
    boardModel.forEach(r => {
        let str = ''
        r.forEach(c => {
            str += (c === null) ? '- ' : c.color + ' '
        })
        console.log(str)
    })
    console.log('=====================')
}

/* -------------------------------  Main  -------------------------------- */
init()
render()