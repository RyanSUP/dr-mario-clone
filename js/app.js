/**
 * Definitions:
 * Node - an object that takes a single space on the board. This could be a pillNode or a virus.
 * Pill - 2 pillNodes that are linked to each other
 * hinge Node - Image a 2x2 box around a 1x2 pill, the hinge node is the bottom left corner of that box and all rotations pivot around it. That is the magique behind rotating.
 */


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

// Board stuff
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
    // When trying to rotate on first row there is an error because the target is out of bounds. Does not break game.
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

function handleKeyPress(evt) {
    if(playerPill !== null) {
        switch (evt.code) {
            case 'ArrowLeft':
                playerPill.move(LEFT)
                break
            case 'ArrowRight':
                playerPill.move(RIGHT)
                break
            case 'ArrowDown':
                playerPill.move(BOTTOM)
                break
            case 'KeyZ':
                playerPill.rotate(COUNTER_CLOCKWISE)
                break
            case 'KeyX':
                playerPill.rotate(CLOCKWISE)
                break
        }
        render()
    }
}

/* ------------------------------- 🔌 Initializing 👍 -------------------------------- */
function init() {
    // Create the HTML (View) board
    initSqDivs()
    // Init board model to all nulls
    initBoardModel()
    // set starting viruses
    virusCount = 18;
    initVirusesOnBoardModel()
    // * dont reset the score
    // spawnPlayerPill()

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

function initVirusesOnBoardModel() {
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
// ! Viruses can spawn in a matched pattern
function getRandomizedVirusNode(handicap) {
    // get random color. 
    // PILL_COLORS and VIRUS_COLORS will always be the same length, so it doesn't matter which I choose here.
    let randomIdx = Math.floor(Math.random() * VIRUS_COLORS.length)
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


async function asyncGameLoop() {
    spawnPlayerPill()
    render()
    let x = 0
    while(x < 10) {
        await asyncPlayerMove()
        let deleteCount = removeMatchesFromBoard()
        if(deleteCount > 0) {
            console.log('delete pills')
        } else {
            console.log('nothing to delete')
        }
        spawnPlayerPill()
        x++
    }
    playerPill = null
    console.log('game over')
}

function asyncPlayerMove() {
    return new Promise((resolve, reject) => {
        let playerMove = setInterval(() => {
            let moveResult = playerPill.move(BOTTOM)
            if(moveResult === false) {
                clearInterval(playerMove)
                resolve('move done')
            }
            render()
        }, gameSpeed)
    })
}

function countCapitalsOnBoardModel() {
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

/* -------------------------------  Finding Matches  ----------------------*/

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

// Returns 1 if anything was deleted, -1 if nothing was deleted
function removeMatchesFromBoard() {
    // find all the matches
    let boardAsColumns = getBoardColumnsAs2DArray()
    let matchingPositionsInRows = getAllMatchingPositionsOnBoard(boardModel)
    let matchingPositionsInCols = getAllMatchingPositionsOnBoardCol(boardAsColumns)
    let allMatchingPositions = matchingPositionsInRows.concat(matchingPositionsInCols)

    if(allMatchingPositions.length > 0) {
        let uniqueMatches = new Set()
        allMatchingPositions.forEach(position => uniqueMatches.add(getNodeFromBoardModelAt(position)))
        console.log(uniqueMatches)
    
        uniqueMatches.forEach(node => {
            console.log('removing',node)
            if(node.sibling !== null) {
                decouplePillNodes(node)
            }
            removeNodeFromBoardModel(node)
            console.log('Success!')
        })
        return 1
    }
    return -1
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
    const searchRegExp = RegExp('y{4,}|r{4,}|b{4,}', 'gi')
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



/* -------------------------------  Main  -------------------------------- */
init()