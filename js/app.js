/**
 * Definitions:
 * Node - an object that takes a single space on the board. This could be a pillNode or a virus.
 * Pill - 2 pillNodes that are linked to each other
 * hinge Node - Image a 2x2 box around a 1x2 pill, the hinge node is the bottom left corner of that box and all rotations pivot around it. That is the magique behind rotating.
 */

// TODO: Place a pill and get a new pill

/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
/* -------------------------------  CONSTANTS  ----------------------------------------- */
const TOTAL_ROWS = 16
const TOTAL_COLS = 8

// Pills will always spawn here. If one of these is taken when a pill spawns, the player loses.
const SPAWN_POSITION_A = { row: 0, col: 3 }
const SPAWN_POSITION_B = { row: 0, col: 4 }

// These are all of the possible positions around a spoce on the board
const TOP = { row: -1, col: 0 }
const TOP_LEFT = { row: -1, col: -1 }
const TOP_RIGHT = { row: -1, col: 1 }
const LEFT = { row: 0, col: -1 }
const RIGHT = { row: 0, col: 1 }
const BOTTOM = { row: 1, col: 0 }
const BOTTOM_LEFT = { row: 1, col: -1 }
const BOTTOM_RIGHT = { row: 1, col: 1 }

// Rotation
const COUNTER_CLOCKWISE = -1
const CLOCKWISE = 1

// Pill orientations
const HORIZONTAL = -1
const VERTICAL = 1

// These colors will determine color on the board when rendering, and also be used as symbols in the board data model
const PILL_COLORS = ['r', 'y', 'b']
const VIRUS_COLORS = ['R', 'Y', 'B']

const sqDivs = [] // The boardview
const boardModel = []; // The board model
/* -------------------------------  Variables  -------------------------------- */
let virusCount;
let playerPill;
let gameSpeed = 400;
/* ------------------------------- 🎮 Player Pill 💊 -------------------------------- */
class PlayerPill {

    constructor() {
        // Pills always start in the top center
        let nodeA = this.createPillNode(SPAWN_POSITION_A)
        let nodeB = this.createPillNode(SPAWN_POSITION_B)

        // Pills always start connected to their sibling
        nodeA.sibling = nodeB
        nodeB.sibling = nodeA

        // The first element in this array will always be the hinge node.
        this.nodes = [nodeA, nodeB]

        // This is important for rotating.
        this.orientation = HORIZONTAL
    }

    createPillNode(startPosition) {
        let randomIdx = Math.floor(Math.random() * PILL_COLORS.length)
        return {
            color: PILL_COLORS[randomIdx],
            sibling: null,
            position: startPosition,
        }
    }

    isColliding(node, position) {
        let npNode = getNodeFromBoardModelAt(position)
        return (npNode === '-' || npNode === node.sibling) ? false : true
    }

    isInBounds(position) {
        return (
            (position.col < TOTAL_COLS) &&
            (position.col >= 0) &&
            (position.row >= 0) &&
            (position.row < TOTAL_ROWS)
        )
    }

    lastRowCheck() {
        if (nextPosition.row === TOTAL_ROWS) {
            console.log(this, "On the last row!")
        }
    }

    placePlayerPillOnBoardModel() { this.nodes.forEach(n => addNodeToBoardModel(n)) }

    removePlayerPillFromBoardModel() { this.nodes.forEach(n => removeNodeFromBoardModel(n)) }

    // position offset is an object {row: y, col: x}
    move(positionOffset) {

        // Do nothing if the move is not legal
        for (let n of this.nodes) {
            let targetPosition = this.addPositions(n.position, positionOffset)
            // Prevent player from going off the board
            if (!this.isInBounds(targetPosition)) {
                return false
            }

            // Prevent player from moving into another node
            if (this.isColliding(n, targetPosition)) {
                return false
            }
        }
        // If the move is legal, updates the positon
        this.updatePillPosition(() => {
            this.nodes.forEach(n => n.position = this.addPositions(n.position, positionOffset))
        })
        return true
    }

    updateOrientation() { this.orientation *= -1 }

    updatePillPosition(setNodePositions) {
        this.removePlayerPillFromBoardModel()
        setNodePositions()
        this.placePlayerPillOnBoardModel()
        render() // for now. Should render when exiting the handler.
    }

    // If the player rotates the pill while vertical and blocked on the right side, shift the pill 1 space to the left and carry out rotation
    handleBlockedRotation(direction) {
        let positionRightOfHinge = this.addPositions(this.nodes[0].position, RIGHT)
        let positionLeftOfHinge = this.addPositions(this.nodes[0].position, LEFT)

        if (getNodeFromBoardModelAt(positionRightOfHinge) !== '-' &&
            getNodeFromBoardModelAt(positionLeftOfHinge) === '-'
        ) {
            if (direction === CLOCKWISE) {
                this.updatePillPosition(() => {
                    this.nodes[1].position = this.nodes[0].position
                    this.nodes[0].position = positionLeftOfHinge
                    this.updateOrientation()
                })
            } else {
                this.updatePillPosition(() => {
                    this.nodes[1].position = positionLeftOfHinge
                    this.nodes[0].position = this.nodes[0].position
                    this.nodes.reverse() // set new hinge
                    this.updateOrientation()
                })
            }
        }
    }
    // ! BUG
    // When trying to rotate on first tow there is an error because the target is out of bounds. Does not break game.
    rotate(direction) {

        let rotationOffset = (this.orientation === HORIZONTAL) ? TOP : RIGHT
        let rotationTargetPosition = this.addPositions(this.nodes[0].position, rotationOffset)

        // Prevent player from moving into another node
        if (this.isColliding(this.nodes[0], rotationTargetPosition)) {
            if (this.orientation === VERTICAL) { this.handleBlockedRotation(direction) }
            return
        }

        (direction === CLOCKWISE) ? this.rotateClockwise(rotationTargetPosition) : this.rotateCounterClockwise(rotationTargetPosition)
    }

    rotateClockwise(rotationTargetPosition) {
        this.updatePillPosition(() => {
            if (this.orientation === HORIZONTAL) {
                this.nodes[1].position = this.nodes[0].position
                this.nodes[0].position = rotationTargetPosition
                // change the hinge node
                this.nodes.reverse()
            } else {
                this.nodes[1].position = this.addPositions(this.nodes[1].position, BOTTOM_RIGHT)
            }
            this.updateOrientation()
        })
    }

    rotateCounterClockwise(rotationTargetPosition) {
        this.updatePillPosition(() => {
            if (this.orientation === HORIZONTAL) {
                this.nodes[1].position = this.addPositions(this.nodes[1].position, TOP_LEFT)
            } else {
                this.nodes[1].position = this.nodes[0].position
                this.nodes[0].position = rotationTargetPosition
                // change the hinge node
                this.nodes.reverse()
            }
            this.updateOrientation()
        })
    }

    addPositions(posObjA, posObjB) {
        return {
            row: posObjA.row + posObjB.row,
            col: posObjA.col + posObjB.col
        }
    }
}
/* ------------------------------- 🦻 Event Listeners 📡 -------------------------------- */
document.addEventListener('keydown', handleKeyPress);

// ! After each move, if the player can't move the pill down or if the pill is on the last row, that pill gets placed on the board and a new pill is generated.
function handleKeyPress(evt) {
    if (evt.code === 'ArrowLeft') {
        playerPill.move(LEFT)
    } else if (evt.code === 'ArrowRight') {
        playerPill.move(RIGHT)
    } else if (evt.code === 'ArrowDown') {
        playerPill.move(BOTTOM)
    } else if (evt.code === 'KeyZ') {
        playerPill.rotate(COUNTER_CLOCKWISE)
    } else if (evt.code === 'KeyX') {
        playerPill.rotate(CLOCKWISE)
    }
    // Check if pill can't move again


    render()
}
/* ------------------------------- 🔌 Initializing 👍 -------------------------------- */
// ! After I implement the game loop player stuff will be in its own function that handles spawning a new pill
function init() {
    // Create the HTML (View) board
    initSqDivs()
    // Init board model to all nulls
    initBoardModel()
    // set starting viruses
    virusCount = 180;
    initViruses()
    // * dont reset the score
    render()
}

// Creates div elements and appends them to boardContainer
// Pushes div elements into 2D sqDivs array to be used for rendering.
// The array is 2D because the data model is and this will make it easier to translate
// the model to the view
function initSqDivs() {
    for (let row = 0; row < TOTAL_ROWS; row++) {
        const divsInRow = []
        for (let col = 0; col < TOTAL_COLS; col++) {
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
    for (let row = 0; row < TOTAL_ROWS; row++) {
        const columnsInRow = []
        for (let col = 0; col < TOTAL_COLS; col++) {
            columnsInRow.push('-')
        }
        boardModel.push(columnsInRow)
    }
}

function initViruses() {
    for (let i = 0; i < virusCount; i++) {
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
    for (let row = 0; row < TOTAL_ROWS; row++) {
        for (let col = 0; col < TOTAL_COLS; col++) {
            sqDivs[row][col].className = 'sq'
            if (boardModel[row][col] !== '-') {
                let node = boardModel[row][col]
                sqDivs[row][col].classList.add(node.color)
            }
        }
    }
    // This is for testing. print all the data to the log
    // logBoard()
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
        position: { row: randomRow, col: randomCol },
        sibling: null // Virus will never have a sibling, but I'll keep this property for now.
    }
}

function spawnPlayerPill() {
    playerPill = new PlayerPill()
    playerPill.placePlayerPillOnBoardModel()
}

/* -------------------------------  Helpers  -------------------------------- */
function addNodeToBoardModel(node) { boardModel[node.position.row][node.position.col] = node }

function removeNodeFromBoardModel(node) { boardModel[node.position.row][node.position.col] = '-' }

function clampNum(num, min, max) {
    if (num > max) { return max }
    if (num < min) { return min }
    return num
}

function getNodeFromBoardModelAt(positionObj) { return boardModel[positionObj.row][positionObj.col] }

function logBoard() {
    console.log('=====================')
    boardModel.forEach(r => {
        let str = ''
        r.forEach(c => {
            str += (c === '-') ? '- ' : c.color + ' '
        })
        console.log(str)
    })
    console.log('=====================')
}

function isGameOver() {
    return (getNodeFromBoardModelAt(SPAWN_POSITION_A) !== '-' || 
            getNodeFromBoardModelAt(SPAWN_POSITION_B) !== '-' ) ? true : false 
}


// ! ---- BUG 
// TODO: fix bug that skips the first pill positions render.
function runGameLoop() {
    // check for game over
    if(isGameOver) {
        // spawn a pill
        playerPill = new PlayerPill()
        let gameLoop = setInterval(() => {
            // move the pill
            let moveResult = playerPill.move(BOTTOM)
            if(moveResult === false) {
                // Spawn a new pill
                playerPill = new PlayerPill()
            }
            // 1 check for connections
            // 2 clear connections (remember to decouple)
            // 3 drop floating nodes
            // Repeat 1 - 3 until there are no more connections
            render()
        }, gameSpeed)
    }
}

/* -------------------------------  Main  -------------------------------- */
init()

/* -------------------------------  Import from sandbox  ----------------------*/

function getAllMatchingPositionsOnBoard(array2D) {
    let matchingPositions = []
    // For each array in the 2d array, get character matches
    for(let i = 0; i < array2D.length; i++) {
        let indexOfMatches = getIndexesOfMatchingNodesFromArray(array2D[i])
        indexOfMatches.forEach(matchIdx => {
            // Convert matches into a position object
            matchingPositions.push(getPositionObj(i,matchIdx))
        })
    }
    return matchingPositions
}

function getAllMatchingPositionsOnBoardCol(array2D) {
    let matchingPositions = []
    // For each array in the 2d array, get character matches
    for(let i = 0; i < array2D.length; i++) {
        let indexOfMatches = getIndexesOfMatchingNodesFromArray(array2D[i])
        indexOfMatches.forEach(matchIdx => {
            // Convert matches into a position object
            matchingPositions.push(getPositionObj(matchIdx,i))
        })
    }
    return matchingPositions
}

function removeMatchesFromBoard() {
    // find all the matches
    let boardAsColumns = getBoardColumnsAs2DArray()
    let rowMatches = getAllMatchingPositionsOnBoard(boardModel)
    let colMatches = getAllMatchingPositionsOnBoardCol(boardAsColumns)
    let allMatches = rowMatches.concat(colMatches)
    console.log(allMatches)
    allMatches.forEach(matchPosition => {
        node = getNodeFromBoardModelAt(matchPosition)
        removeNodeFromBoardModel(node)
    })
    console.log(boardModel)
    console.log(countCapitalsOnBoard())
    render()
}

// Search the array for repeating characters
function getIndexesOfMatchingNodesFromArray(arr) {
    let colorMap = arr.map(e => {
        if(e === '-') {
            return '-'
        } else {
            return e.color
        }
    })
    let searchString = colorMap.join('')
    const searchRegExp = RegExp('y{4,}|r{4,}|b{4,}', 'gi');
    let searchResult = searchRegExp.exec(searchString)
    let resultIndexes = []
    if(searchResult !== null) {   
        let startingPos = searchResult.index
        let length = searchRegExp.lastIndex - searchResult.index
        for(let i = 0; i < length; i++) {
            resultIndexes.push(startingPos + i)
        }
    }
    // Return the indexes
    return resultIndexes

}

// Flip the board sideways so I can check columns of a 2D array as if they were a single row.
function getBoardColumnsAs2DArray() {
    let mappedArr = []
    for(let col = 0; col < boardModel[0].length; col++) {
        let colArray = []
        for(let row = 0; row < boardModel.length; row++) {
            colArray.push(boardModel[row][col])
        }
        mappedArr.push(colArray)
    }
    return mappedArr
}

function countCapitalsOnBoard() {
    const searchRegExp = RegExp('Y|R|B', 'g');
    let boardAsString = ''
    for(let row of boardModel) {
        let r = ''
        for(let col of row) {
            if(col !== '-') {
                r += col.color
            }
        }
        boardAsString += r
    }
    let searchResults = [...boardAsString.matchAll(searchRegExp)]
    // In the game this will update the remaining viruses
    console.log('Remaining Capitals', searchResults.length)
}

function getPositionObj(row, col) { return { row: row, col: col } }