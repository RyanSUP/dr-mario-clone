/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
const boardOverlay = document.querySelector('.board-overlay')
const startButton = document.querySelector('.start-btn')
const message = document.querySelector('.message')
const virusMessage = document.querySelector('.virus-message')
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

/* -------------------------------  Variables  -------------------------------- */
let sqDivs // The boardview
let boardModel // The board model
let virusCount
let playerPill
let level
let difficulty
let gameSpeed = 400
let gameState = 0 // 0 = playing, 1 = won (duh) -1 = lose
/* ------------------------------- 🎮 Player Pill 💊 -------------------------------- */
// TODO: REFACTOR
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

    placePlayerPillOnBoardModel() { this.nodes.forEach(n => addNodeToBoardModel(n)) }

    removePlayerPillFromBoardModel() { this.nodes.forEach(n => removeNodeFromBoardModel(n)) }

    // position offset is an object {row: y, col: x}
    move(positionOffset) {

        // Do nothing if the move is not legal
        for (let n of this.nodes) {
            let targetPosition = this.getAddedPositions(n.position, positionOffset)
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
            this.nodes.forEach(n => n.position = this.getAddedPositions(n.position, positionOffset))
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
        let positionRightOfHinge = this.getAddedPositions(this.nodes[0].position, RIGHT)
        let positionLeftOfHinge = this.getAddedPositions(this.nodes[0].position, LEFT)

        if (getNodeAtPosition(positionRightOfHinge) !== '-' &&
            getNodeAtPosition(positionLeftOfHinge) === '-'
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
        let rotationTargetPosition = this.getAddedPositions(this.nodes[0].position, rotationOffset)

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
                this.nodes[1].position = this.getAddedPositions(this.nodes[1].position, BOTTOM_RIGHT)
            }
            this.updateOrientation()
        })
    }

    rotateCounterClockwise(rotationTargetPosition) {
        this.updatePillPosition(() => {
            if (this.orientation === HORIZONTAL) {
                this.nodes[1].position = this.getAddedPositions(this.nodes[1].position, TOP_LEFT)
            } else {
                this.nodes[1].position = this.nodes[0].position
                this.nodes[0].position = rotationTargetPosition
                // change the hinge node
                this.nodes.reverse()
            }
            this.updateOrientation()
        })
    }

    getAddedPositions(posObjA, posObjB) {
        return {
            row: posObjA.row + posObjB.row,
            col: posObjA.col + posObjB.col
        }
    }
}
/* ------------------------------- 🦻 Event Listeners 📡 -------------------------------- */
// TODO: REFACTOR
document.addEventListener('keydown', handleKeyPress);
// TODO: REFACTOR
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
// TODO: REFACTOR
startButton.addEventListener('click', evt => {
    message.textContent = ''
    startButton.style.visibility = 'hidden'
    
    setOverlayOpacity(0)
    init()
    runGameLoop()
})

/* ------------------------------- 🔌 Initializing 👍 -------------------------------- */
// TODO: REFACTOR
function init() {
    gameState = 0
    // Create the HTML (View) board 
    boardContainer.innerHTML = ''
    sqDivs = []
    initSqDivs()
    // Init board model to all nulls
    boardModel = []
    initBoardModel()
    // set starting viruses
    virusCount = 1 
    initVirusesOnBoardModel()
    countRemainingVirusesOnBoardModel() // this is a hack around the issue where viruses can spawn on eachother and alter the visible count
    virusMessage.style.visibility = 'visible'
    // * dont reset the score
    render()
}
// TODO: REFACTOR
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
// TODO: REFACTOR
function initBoardModel() {
    for (let row = 0; row < TOTAL_ROWS; row++) {
        const columnsInRow = []
        for (let col = 0; col < TOTAL_COLS; col++) {
            columnsInRow.push('-')
        }
        boardModel.push(columnsInRow)
    }
}
// TODO: REFACTOR
function initVirusesOnBoardModel() {
    for (let i = 0; i < virusCount; i++) {
        let v = getRandomizedVirusNode(8)
        boardModel[v.position.row][v.position.col] = v
    }
}

/* ------------------------------- 🖥 Render 🎁 -------------------------------- */
// TODO: Render Score
function render() {
    if(gameState === 0) {
        renderBoard()
        renderVirusCount()
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
                sqDivs[row][col].classList.add(node.color)
            }
        }
    }
}

// TODO: MOVE - render
function renderGameOverOverlay() {
    virusMessage.style.visibility = 'hidden'
    startButton.style.visibility = 'visible'
    setOverlayOpacity(80)
}
// TODO MOVE - render
function renderVirusCount() {
    virusMessage.textContent = `${virusCount} viruses left`
}



/* -------------------------------  Meat N Taters  -------------------------------- */
function spawnPlayerPill() {
    playerPill = new PlayerPill()
    playerPill.placePlayerPillOnBoardModel()
}

// TODO: Move - meat n taters
async function runGameLoop() {
    while(gameState === 0) {
        if(isSpawnPositionBlocked()) {
            gameState = -1
        } else {
            spawnPlayerPill()
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
    playerPill = null
    renderGameOverOverlay()
}

// TODO: Move - meat n taters
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

// TODO: Move - Meat and taters
function movePlayerPieceUntilItsBlocked() {
    return new Promise((resolve, reject) => {
        let playerMove = setInterval(() => {
            let moveResult = playerPill.move(BOTTOM)
            if(moveResult === false) {
                clearInterval(playerMove)
                // Setting playerPill to null here prevents players from moving pieces while falling nodes resolve.
                playerPill = null
                resolve()
            }
            render()
        }, gameSpeed)
    })
}

// TODO: Move - meat and taters
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

/* ------------------------------- 🦠 Node Functions 🧫 -------------------------------- */
// TODO: REFACTOR
function decoupleSiblings(node) {
    // Remove the node from its sibling
    node.sibling.sibling = null
    // Then remove the sibling from node
    node.sibling = null
}
// TODO: REFACTOR
// Setting the handicap ensures viruses will never be generated above the handicap row.
// This can be adjusted to increase difficulty
// TODO: Increase virus count and lower handicap as levels increase
// ! Viruses can spawn ontop of eachother and mess up the total! Need to fix!
// ! Viruses can spawn in a matched pattern
function getRandomizedVirusNode(handicap) {
    let randomIdx = Math.floor(Math.random() * VIRUS_COLORS.length)
    let randomRow = Math.floor(Math.random() * TOTAL_ROWS + handicap)
    randomRow = clampNum(randomRow, handicap, 15)
    let randomCol = Math.floor(Math.random() * TOTAL_COLS)

    return {
        color: VIRUS_COLORS[randomIdx],
        position: { row: randomRow, col: randomCol },
        sibling: null
    }
}
// TODO: move - node
function addNodeToBoardModel(node) { boardModel[node.position.row][node.position.col] = node }
// TODO: move - node 
function removeNodeFromBoardModel(node) { boardModel[node.position.row][node.position.col] = '-' }

// Todo: move - Nodes
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
// TODO: move - Nodes
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
/* -------------------------------  Misc Helpers  -------------------------------- */

// TODO: move - helper
function clampNum(num, min, max) {
    if (num > max) { return max }
    if (num < min) { return min }
    return num
}
// TODO: move - helper
function getAddedPositions(posObjA, posObjB) {
    return {
        row: posObjA.row + posObjB.row,
        col: posObjA.col + posObjB.col
    }
}
// TODO: move - helper
function getNodeAtPosition(positionObj) { return boardModel[positionObj.row][positionObj.col] }

// TODO: move - helper
function isSpawnPositionBlocked() {
    if (
        getNodeAtPosition(SPAWN_POSITION_A) !== '-' || 
        getNodeAtPosition(SPAWN_POSITION_B) !== '-' 
    ) {
        return true
    }
    return false
}



// TODO: Move - helper
function createPositionObj(row, col) { return { row: row, col: col } }


// TODO: Move - helper
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

// TODO: Move - helper
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


// TODO: Move - Helper
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

// TODO: MOVE - helper
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
// TODO: MOVE - helper
function setOverlayOpacity(percent) {
    boardOverlay.style.opacity = `${percent}%`
}
