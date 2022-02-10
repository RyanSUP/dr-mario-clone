/* -------------------------------  CONSTANTS  ----------------------------------------- */
const TOTAL_ROWS = 16
const TOTAL_COLS = 8
/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
/* -------------------------------  Variables  -------------------------------- */
const sqDivs = []

function init() {
    sqDivs = initBoardDivs()
    // Create the board
    // set starting viruses
    // * dont reset the score
}

// Create element and append to boardContainer / Also push div elements into sqDivs array
function initBoardDivs() {
    const numberOfTiles = TOTAL_COLS * TOTAL_ROWS
    for(let i = 0; i < numberOfTiles; i++) {
        const div = document.createElement('div')
        div.className = 'sq'
        // looks like this -->  <div class="sq"></div>
        boardContainer.append(div)
        sqDivs.push(div)
    }

}
