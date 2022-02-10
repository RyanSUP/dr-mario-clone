/* -------------------------------  CONSTANTS  ----------------------------------------- */
const TOTAL_ROWS = 16
const TOTAL_COLS = 8
const sqDivs = []
/* -------------------------------  CACHED REFERENCES  -------------------------------- */
const boardContainer = document.querySelector('.board-container')
/* -------------------------------  Variables  -------------------------------- */
let boardModel;
/* -------------------------------  Main  -------------------------------- */
init()
/* -------------------------------  Functions  -------------------------------- */
function init() {
    // Create the HTML (View) board
    initBoardDivs()
    // Create the model board
    boardModel = getInitialBoardModel()
    // set starting viruses
    // * dont reset the score
}

// Creates div elements and appends them to boardContainer
// Pushes div elements into 2D sqDivs array to be used for rendering.
// The array is 2D because the data model is and this will make it easier to translate
// the model to the view
function initBoardDivs() {
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

function getInitialBoardModel() {
    let model = []
    for(let row = 0; row < TOTAL_ROWS; row++) {
        const columnsInRow = []
        for(let col = 0; col < TOTAL_COLS; col++) {
            columnsInRow.push(null)
        }
        model.push(columnsInRow) 
    }
    return model
}

