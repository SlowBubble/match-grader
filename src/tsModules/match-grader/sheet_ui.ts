import { SheetCursor } from "./cursor";

// Responsible for the cursor as well
export class SheetUi extends HTMLElement {
  private rowsOfCells: Cell[][] = [];
  private cursor: SheetCursor = new SheetCursor;
  private onCellClickFunc: Function = () => {};

  onCellClick(onCellClickFunc: Function) {
    this.onCellClickFunc = onCellClickFunc;
  }

  render(rowsOfCells: Cell[][]) {
    this.rowsOfCells = rowsOfCells;
    this._render();
  }

  private getMainCells() {
    return this.rowsOfCells.slice(1);
  }
  
  getSelectedCell() {
    const row = this.getMainCells()[this.cursor.rowIdx];
    if (!row) {
      return;
    }
    return row[this.cursor.colIdx];
  }

  getRowIdx() {
    return this.cursor.rowIdx;
  }
  getColIdx() {
    return this.cursor.colIdx;
  }
  setRowIdx(idx: number) {
    if (idx <= 0) {
      this.cursor.rowIdx = 0;
      return;
    }
    if (idx >= this.getMainCells().length) {
      this.cursor.rowIdx = this.getMainCells().length - 1;
      return;
    }
    this.cursor.rowIdx = idx;
  }
  moveRowIdx(num: number) {
    this.setRowIdx(this.cursor.rowIdx + num);
  }

  setColIdx(idx: number) {
    if (idx < 0 || this.rowsOfCells.length === 0) {
      this.cursor.colIdx = 0;
      return;
    }
    if (idx >= this.rowsOfCells[0].length) {
      this.cursor.colIdx = this.rowsOfCells[0].length - 1;
      return;
    }
    this.cursor.colIdx = idx;
  }
  moveColIdx(num: number) {
    this.setColIdx(this.cursor.colIdx + num);
  }

  private _render() {
    const table = this.createTable();
    this.innerHTML = tableStyle;
    this.appendChild(table);

    this.rowsOfCells.forEach(row => row.forEach(cell => {
      if (cell.opts.setupFunc) cell.opts.setupFunc();
    }));
  }

  private createTable() {
    const table = document.createElement('table');
    const tableBody = document.createElement('tbody');
    this.rowsOfCells.forEach((rowOfCells, rowIdxCountingHeader) => {
      const rowIdx = rowIdxCountingHeader - 1;
      const rowHtml = document.createElement('tr');
      rowOfCells.forEach((cell, colIdx) => {
        const cellHtml = document.createElement('td');
        cellHtml.innerHTML = cell.htmlContent;
        if (rowIdx === this.cursor.rowIdx && colIdx === this.cursor.colIdx) {
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
        cellHtml.onclick = () => this.onCellClickFunc(new CellLoc(rowIdx, colIdx));
        rowHtml.appendChild(cellHtml);
      });
  
      tableBody.appendChild(rowHtml);
    });
    table.appendChild(tableBody);
  
    return table;
  }
}

export class Cell {
  constructor(
    public htmlContent = '',
    public opts: CellOpts = new CellOpts,
    public data: any = null,
  ) {}
}

export class CellOpts {
  constructor(
    public setupFunc: Function | null = null,
    public alignRight = false,
    public alignCenter = false,
    public removeBottomBorder = false,
  ) {}
}

export function makeOpts({
  setupFunc = null,
  alignRight = false,
  alignCenter = false,
  removeBottomBorder = false,
}: any = {}) {
  return new CellOpts(
    setupFunc,
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
  background-color: #fed;
}
</style>
`;

customElements.define('sheet-ui', SheetUi);
