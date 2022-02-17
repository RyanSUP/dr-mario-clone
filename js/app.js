/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
const boardOverlay = document.querySelector('.board-overlay')
const startButton = document.querySelector('.start-btn')
const message = document.querySelector('.message')
const virusMessage = document.querySelector('.virus-message')
const levelMessage = document.querySelector('.level')

/* -------------------------------  CONSTANTS  ----------------------------------------- */
const TOTAL_ROWS = 16
const TOTAL_COLS = 8

// Nodes will always spawn here. If either is occupied when new nodes spawns, the player loses.
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

// Node orientations
const HORIZONTAL = -1
const VERTICAL = 1

// These colors will determine color on the board when rendering, and also be used as symbols in the board data model
const NODE_COLORS = ['r', 'y', 'b']
const VIRUS_COLORS = ['R', 'Y', 'B']

/* -------------------------------  Variables  -------------------------------- */
let sqDivs // The boardview
let boardModel // The board model
let virusCount
let playerNodes
let level = 0
let gameSpeed = 400
let gameState = 0 // 0 = playing, 1 = won (duh) -1 = lose
/* ------------------------------- 🎮 Player Nodes 💊 -------------------------------- */
class PlayerNodes {

    constructor() {
        // Nodes always start in the top center
        let nodeA = this.createNode(SPAWN_POSITION_A)
        let nodeB = this.createNode(SPAWN_POSITION_B)
        // Nodes always start connected to their sibling
        nodeA.sibling = nodeB
        nodeB.sibling = nodeA
        nodeA.border = [1,0,1,1]
        nodeB.border = [1,1,1,0]
        // The first element in this array will always be the hinge node.
        this.nodes = [nodeA, nodeB]
        // This is important for rotating.
        this.orientation = HORIZONTAL
    }

    createNode(startPosition) {
        let randomIdx = Math.floor(Math.random() * NODE_COLORS.length)
        return {
            color: NODE_COLORS[randomIdx],
            sibling: null,
            position: startPosition,
            border: [] // An array representing where the border should not show between the 2 nodes. [1,1,1,0] where 0 is no border.
        }
    }

    isColliding(node, position) {
        let npNode = getNodeAtPosition(position)
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

    placePlayerNodesOnBoardModel() { this.nodes.forEach(n => addNodeToBoardModel(n)) }

    removePlayerNodesFromBoardModel() { this.nodes.forEach(n => removeNodeFromBoardModel(n)) }

    // position offset is an object {row: y, col: x}
    move(positionOffset) {
        // Do nothing if the move is not legal
        for (let n of this.nodes) {
            let targetPosition = getAddedPositions(n.position, positionOffset)
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
        this.updateNodePosition(() => {
            this.nodes.forEach(n => n.position = getAddedPositions(n.position, positionOffset))
        })
        return true
    }

    updateOrientation() { this.orientation *= -1 }

    updateNodePosition(setNodePositions) {
        this.removePlayerNodesFromBoardModel()
        setNodePositions()
        this.placePlayerNodesOnBoardModel()
    }

    // If the player rotates the node while vertical and blocked on the right side, shift the node 1 space to the left and carry out rotation
    handleBlockedRotation(direction) {
        let positionRightOfHinge = getAddedPositions(this.nodes[0].position, RIGHT)
        let positionLeftOfHinge = getAddedPositions(this.nodes[0].position, LEFT)
        if (getNodeAtPosition(positionRightOfHinge) !== '-' &&
            getNodeAtPosition(positionLeftOfHinge) === '-'
        ) {
            if (direction === CLOCKWISE) {
                this.updateNodePosition(() => {
                    this.nodes[1].position = this.nodes[0].position
                    this.nodes[0].position = positionLeftOfHinge
                    this.updateOrientation()
                    this.updateNodeBorderClockwise()
                })
            } else {
                this.updateNodePosition(() => {
                    this.nodes[1].position = positionLeftOfHinge
                    this.nodes[0].position = this.nodes[0].position
                    this.nodes.reverse() // set new hinge
                    this.updateOrientation()
                    this.updateNodeBorderCounterClockwise()
                })
            }
        }
    }

    rotate(direction) {
        // Prevent player from rotating vertically on the top row.
        if(this.nodes[0].position.row === 0) {
            return
        }
        let rotationOffset = (this.orientation === HORIZONTAL) ? TOP : RIGHT
        let rotationTargetPosition = getAddedPositions(this.nodes[0].position, rotationOffset)
        // Prevent player from rotating into another node
        if (this.isColliding(this.nodes[0], rotationTargetPosition)) {
            if (this.orientation === VERTICAL) { this.handleBlockedRotation(direction) }
            return
        }
        (direction === CLOCKWISE) ? this.rotateClockwise(rotationTargetPosition) : this.rotateCounterClockwise(rotationTargetPosition)
    }

    rotateClockwise(rotationTargetPosition) {
        this.updateNodePosition(() => {
            if (this.orientation === HORIZONTAL) {
                this.nodes[1].position = this.nodes[0].position
                this.nodes[0].position = rotationTargetPosition
                // change the hinge node
                this.nodes.reverse()
            } else {
                this.nodes[1].position = getAddedPositions(this.nodes[1].position, BOTTOM_RIGHT)
            }
            this.updateOrientation()
            this.updateNodeBorderClockwise()
        })
    }

    rotateCounterClockwise(rotationTargetPosition) {
        this.updateNodePosition(() => {
            if (this.orientation === HORIZONTAL) {
                this.nodes[1].position = getAddedPositions(this.nodes[1].position, TOP_LEFT)
            } else {
                this.nodes[1].position = this.nodes[0].position
                this.nodes[0].position = rotationTargetPosition
                // change the hinge node
                this.nodes.reverse()
            }
            this.updateOrientation()
            this.updateNodeBorderCounterClockwise()
        })
    }

    updateNodeBorderClockwise() {
        this.nodes.forEach(node => {
            let val = node.border.pop()
            node.border.unshift(val)
        })

    }

    updateNodeBorderCounterClockwise() {
        this.nodes.forEach(node => {
            let val = node.border.shift()
            node.border.push(val)
        })
    }
}
/* ------------------------------- 🦻 Event Listeners 📡 -------------------------------- */

document.addEventListener('keydown', handleKeyPress);

function handleKeyPress(evt) {
    if(playerNodes !== null) {
        switch (evt.code) {
            case 'ArrowLeft':
                playerNodes.move(LEFT)
                break
            case 'ArrowRight':
                playerNodes.move(RIGHT)
                break
            case 'ArrowDown':
                playerNodes.move(BOTTOM)
                break
            case 'KeyZ':
                playerNodes.rotate(COUNTER_CLOCKWISE)
                break
            case 'KeyX':
                playerNodes.rotate(CLOCKWISE)
                break
        }
        render()
    }
}

startButton.addEventListener('click', evt => {
    hideBoardOverlay()
    init()
    runGameLoop()
})

/* ------------------------------- 🔌 Initializing 👍 -------------------------------- */
function init() {
    gameState = 0
    level++
    // Create the HTML (View) board 
    boardContainer.innerHTML = ''
    sqDivs = []
    initSqDivs()
    // Init board model to all nulls
    boardModel = []
    initBoardModel()
    // set starting viruses
    virusCount = (2 + level) * 4
    virusCount = clampNum(virusCount, 12, 96)
    initVirusesOnBoardModel()
    countRemainingVirusesOnBoardModel() // this is a bandaid around the issue where viruses can spawn on eachother and alter the visible count
    virusMessage.style.visibility = 'visible'
    levelMessage.style.visibility = 'visible'
    render()
}

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
        let v = getRandomizedVirusNode(5)
        boardModel[v.position.row][v.position.col] = v
    }
}

/* ------------------------------- 🖥 Render 🎁 -------------------------------- */
// TODO: Render Score
function render() {
    if(gameState === 0) {
        renderBoard()
        renderGameInfo()
    } else {
        message.textContent = (gameState === 1) ? 'Winner!' : 'Game Over'
        renderGameOverOverlay()
    }
    // render score
}

// Reset all the div.sq classes default, then add classes depending on what is at the position.
// Reseting the class is needed to reflect movement.
function renderBoard() {
    for (let row = 0; row < TOTAL_ROWS; row++) {
        for (let col = 0; col < TOTAL_COLS; col++) {
            sqDivs[row][col].className = 'sq'
            if (boardModel[row][col] !== '-') {
                let node = boardModel[row][col]
                let nodeBorderStyle = parseBorderArray(node)
                sqDivs[row][col].classList.add(node.color, nodeBorderStyle)
            }
        }
    }
}

function renderGameOverOverlay() {
    virusMessage.style.visibility = 'hidden'
    levelMessage.style.visibility = 'hidden'
    startButton.style.visibility = 'visible'
    boardOverlay.style.visibility = 'visible'
}

function renderGameInfo() {
    virusMessage.textContent = `${virusCount} viruses left`
    levelMessage.textContent = `Level ${level}`
}

function hideBoardOverlay() {
    message.textContent = ''
    startButton.style.visibility = 'hidden'
    boardOverlay.style.visibility = 'hidden'
}

/* ------------------------------- 🥩 Meat N Taters 🥔 -------------------------------- */
function spawnPlayerNodes() {
    playerNodes = new PlayerNodes()
    playerNodes.placePlayerNodesOnBoardModel()
}

async function runGameLoop() {
    while(gameState === 0) {
        if(isSpawnPositionBlocked()) {
            gameState = -1
        } else {
            spawnPlayerNodes()
            increaseSpeed()
            render()
            await movePlayerPieceUntilItsBlocked()
            while(removeMatchesFromBoard() > 0 && gameState === 0) {
                countRemainingVirusesOnBoardModel()
                if(virusCount === 0) {
                    gameState = 1
                    break;
                }
                let nodesAreFalling = true
                while(nodesAreFalling) {
                    nodesAreFalling = await moveAllFloatingNodesDownUntilBlocked()
                }
            }
        }
        render()
    }
    // Game is over
    playerNodes = null
    renderGameOverOverlay()
}

// This function runs from the entire boardModel ONE TIME and updates the floating nodes in each row.
function moveAllFloatingNodesDownUntilBlocked() {
    return new Promise((resolve, reject) => {
        let interval = setInterval(()=> {
            // (start on the second to last row)
            let currentRowIndex = TOTAL_ROWS - 2 
            let movedANode = false
            while(currentRowIndex > -1) {
                // Get all the nodes on the row
                let row = boardModel[currentRowIndex]
                let nodesInCurrentRow = []
                row.forEach(square => {
                    if(square !== '-') {
                        nodesInCurrentRow.push(square)
                    }
                })
                // Filter for floating nodes
                let floatingNodes = getFloatingNodes(nodesInCurrentRow)
                // Move all the floating nodes down 1 space
                if(floatingNodes.length > 0) {
                    movedANode = true
                    floatingNodes.forEach(node => {
                        removeNodeFromBoardModel(node)
                        node.position = getAddedPositions(node.position, BOTTOM)
                        addNodeToBoardModel(node)
                    })
                }
                currentRowIndex--;
            }
            render()
            if(movedANode) {
                clearInterval(interval)
                resolve(true)
            } else {
                resolve(false)
            }
        }, gameSpeed)
    })
}

function movePlayerPieceUntilItsBlocked() {
    return new Promise((resolve, reject) => {
        let playerMove = setInterval(() => {
            let moveResult = playerNodes.move(BOTTOM)
            if(moveResult === false) {
                clearInterval(playerMove)
                // Setting playerNodes to null here prevents players from moving pieces while falling nodes resolve.
                playerNodes = null
                resolve()
            }
            render()
        }, gameSpeed)
    })
}

// Returns 1 if anything was deleted, -1 if nothing was deleted
function removeMatchesFromBoard() {
    // find all the matches
    let rowMatches = getArrayOfMatchingPositionsFromRows()
    let colMatches = getArrayOfMatchingPositionsFromColumns()
    let allMatchingPositions = rowMatches.concat(colMatches)
    if(allMatchingPositions.length > 0) {
        let uniqueMatches = new Set()
        allMatchingPositions.forEach(position => uniqueMatches.add(getNodeAtPosition(position)))
        uniqueMatches.forEach(node => {
            if(node.sibling !== null) {
                decoupleSiblings(node)
            }
            removeNodeFromBoardModel(node)
        })
        // Matches found 
        return 1
    }
    // No matches found
    return -1
}

function increaseSpeed() {
    gameSpeed -= 5
}

/* ------------------------------- 🦠 Node Helpers 💊 -------------------------------- */
function decoupleSiblings(node) {
    // Remove the node from its sibling
    node.sibling.sibling = null
    // Then remove the sibling from node
    node.sibling = null
}

// Setting the handicap ensures viruses will never be generated above the handicap row.
// This can be adjusted to increase difficulty
function getRandomizedVirusNode(handicap) {
    let randomIdx = Math.floor(Math.random() * VIRUS_COLORS.length)
    let randomRow = Math.floor(Math.random() * TOTAL_ROWS + handicap)
    randomRow = clampNum(randomRow, handicap, 15)
    let randomCol = Math.floor(Math.random() * TOTAL_COLS)
    return {
        color: VIRUS_COLORS[randomIdx],
        position: { row: randomRow, col: randomCol },
        sibling: null,
        border: [],
    }
}

function addNodeToBoardModel(node) { boardModel[node.position.row][node.position.col] = node }

function removeNodeFromBoardModel(node) { boardModel[node.position.row][node.position.col] = '-' }

function getFloatingNodes(nodeArray) {
    let floatingNodes = nodeArray.filter((node) => {
        // Node is a virus, ignore it.
        if(VIRUS_COLORS.includes(node.color)) {
            return false
        }
        // space below is not empty, can't move down
        let target = getAddedPositions(node.position, BOTTOM)
        if(getNodeAtPosition(target) !== '-') {
            return false
        }
        // If the node has a sibling
        if(node.sibling !== null) {
            // and the sibling is on the same row
            if (node.sibling.position.row === node.position.row) {
                // and the sibling has a free space below it
                let siblingTarget = getAddedPositions(node.sibling.position, BOTTOM)
                if(getNodeAtPosition(siblingTarget) === '-') {
                    return true // this is a valid node to move
                }
                return false // the sibling is blocked from falling, invalid node
            }
            // The sibling is above the node so it will fall with it.
            return true // valid node
        }
        // No sibling and passes all other tests. Valid node
        return true
    })
    return floatingNodes
}

function countRemainingVirusesOnBoardModel() {
    let total = 0
    for(let row of boardModel) {
        for(let col of row) {
            if(VIRUS_COLORS.includes(col.color)) {
                total++
            }
        }
    }
    virusCount = total
}

function parseBorderArray(node){
    if(node.border.length === 0) {
        return 'dashed' // Virus
    }
    if(node.sibling === null) {
        return 'omit-none'
    }
    let zeroAt = node.border.findIndex(element => element === 0)
    switch (zeroAt) {
        case 0:
            return 'omit-top'
        case 1:
            return 'omit-right'
        case 2:
            return 'omit-bottom'
        case 3:
            return 'omit-left'
    }
}

/* ------------------------------- 👷‍♂️ Misc Helpers 🏗 -------------------------------- */
function clampNum(num, min, max) {
    if (num > max) { return max }
    if (num < min) { return min }
    return num
}

function getAddedPositions(posObjA, posObjB) {
    return {
        row: posObjA.row + posObjB.row,
        col: posObjA.col + posObjB.col
    }
}

function getNodeAtPosition(positionObj) { return boardModel[positionObj.row][positionObj.col] }

function isSpawnPositionBlocked() {
    if (
        getNodeAtPosition(SPAWN_POSITION_A) !== '-' || 
        getNodeAtPosition(SPAWN_POSITION_B) !== '-' 
    ) {
        return true
    }
    return false
}

function createPositionObj(row, col) { return { row: row, col: col } }

function getArrayOfMatchingPositionsFromRows() {
    let matchingPositions = []
    // Look for matches in each row of the model
    for(let i = 0; i < boardModel.length; i++) {
        let indexOfMatches = getIndexesOfRepeatingCharacters(boardModel[i])
        indexOfMatches.forEach(matchIdx => {
            // Convert matches into a position object
            matchingPositions.push(createPositionObj(i,matchIdx))
        })
    }
    return matchingPositions // {row: #, col: #}
}

function getArrayOfMatchingPositionsFromColumns() {
    // Rotating the board model puts the columns of the original board into a row array which is easier to work with.
    let rotatedBoardModel = getRotatedBoardModel()
    let matchingPositions = []
    // Look for matches in each row of the model
    for(let i = 0; i < rotatedBoardModel.length; i++) {
        let indexOfMatches = getIndexesOfRepeatingCharacters(rotatedBoardModel[i])
        indexOfMatches.forEach(matchIdx => {
            // Convert matches into a position object
            // Note rows and columns are swapped in createPositionObj, this is because this function uses a transformed boardModel
            matchingPositions.push(createPositionObj(matchIdx,i))
        })
    }
    return matchingPositions // {row: #, col: #}
}

// Search the array for any number of repeating characters
function getIndexesOfRepeatingCharacters(arr) {
    let colorMap = arr.map(e => (e === '-') ? '-' : e.color)
    let colorMapString = colorMap.join('')
    const searchRegExp = RegExp('y{4,}|r{4,}|b{4,}', 'gi')
    let result = searchRegExp.exec(colorMapString)
    let resultIndexes = []
    if(result !== null) {   
        let startingPos = result.index
        let matchLength = searchRegExp.lastIndex - result.index
        for(let i = 0; i < matchLength; i++) {
            resultIndexes.push(startingPos + i)
        }
    }
    // Return the indexes. Ok to return empty []
    return resultIndexes
}

// Flip the board sideways so I can check columns of a 2D array as if they were a single row.
// Helpful when looking for matches.
function getRotatedBoardModel() {
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


