
// Don't store the model, just responsible for rendering the model
export class MatchSheetUi extends HTMLElement {
  private onCellClickFunc: Function = () => {};

  onCellClick(onCellClickFunc: Function) {
    this.onCellClickFunc = onCellClickFunc;
  }

  render(rowsOfCells: Cell[][]) {
    const table = createTable(rowsOfCells, this.onCellClickFunc);
    this.innerHTML = tableStyle;
    this.appendChild(table);

    rowsOfCells.forEach(row => row.forEach(cell => {
      if (cell.opts.setupFunc) cell.opts.setupFunc();
    }));
  }
}

export class Cell {
  constructor(
    public htmlContent = '',
    public opts: CellOpts = new CellOpts,
  ) {}
}

export class CellOpts {
  constructor(
    public setupFunc: Function | null = null,
    public selected = false,
    public alignRight = false,
    public alignCenter = false,
    public removeBottomBorder = false,
  ) {}
}

export function makeOpts({
  setupFunc = null,
  selected = false,
  alignRight = false,
  alignCenter = false,
  removeBottomBorder = false,
}: any = {}) {
  return new CellOpts(
    setupFunc,
    selected,
    alignRight,
    alignCenter,
    removeBottomBorder,
  );
}

export class CellLoc {
  constructor(
    public rowIdx = 0,
    public colIdx = 0,
  ) {}
}

function createTable(rowsOfCells: Cell[][], onCellClickFunc: Function) {
  var table = document.createElement('table');
  var tableBody = document.createElement('tbody');

  rowsOfCells.forEach((rowOfCells, rowIdx) => {
    var rowHtml = document.createElement('tr');

    rowOfCells.forEach(function(cell, colIdx) {
      var cellHtml = document.createElement('td');
      cellHtml.innerHTML = cell.htmlContent;
      if (cell.opts.selected) {
        cellHtml.classList.add('selected');
      }
      if (cell.opts.alignRight) {
        cellHtml.classList.add('align-right');
      }
      if (cell.opts.alignCenter) {
        cellHtml.classList.add('align-center');
      }
      if (cell.opts.removeBottomBorder) {
        cellHtml.classList.add('remove-bottom-border');
      }
      cellHtml.onclick = () => onCellClickFunc(new CellLoc(rowIdx, colIdx));
      rowHtml.appendChild(cellHtml);
    });

    tableBody.appendChild(rowHtml);
  });
  table.appendChild(tableBody);

  return table;
}

// .selected needs to be at the bottom to override other border removals
const tableStyle = `
<style>
table {
  width: 100%;
  border-collapse: collapse;
}

table, th, td {
  border-bottom: 1px solid;
  border-right: 1px solid;
}

.align-right {
  text-align: right;
}

.align-center {
  text-align: center;
}

.remove-bottom-border {
  border-bottom: 0px solid;
}

.selected {
  border: 4px solid;
}
</style>
`;

customElements.define('match-sheet-ui', MatchSheetUi);
