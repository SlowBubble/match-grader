
export class StatUi extends HTMLElement {
  private root: ShadowRoot;
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }
  render(rowsOfCells: StatCell[][]) {
    const table = this.createTable(rowsOfCells);
    this.root.innerHTML = tableStyle;
    this.root.appendChild(table);
  }

  private createTable(rowsOfCells: StatCell[][]) {
    const table = document.createElement('table');
    const tableBody = document.createElement('tbody');
    rowsOfCells.forEach((rowOfCells) => {
      const rowHtml = document.createElement('tr');
      rowOfCells.forEach((cell) => {
        const cellHtml = document.createElement('td');
        cellHtml.innerHTML = cell.htmlContent;
        if (cell.opts.alignRight) {
          cellHtml.classList.add('align-right');
        }
        if (cell.opts.alignCenter) {
          cellHtml.classList.add('align-center');
        }
        rowHtml.appendChild(cellHtml);
      });
  
      tableBody.appendChild(rowHtml);
    });
    table.appendChild(tableBody);
  
    return table;
  }
}

export class StatCell {
  constructor(
    public htmlContent = '',
    public opts: StatCellOpts = new StatCellOpts,
    public data: any = null,
  ) {}
}

export class StatCellOpts {
  constructor(
    public alignRight = false,
    public alignCenter = false,
  ) {}
}

export function makeStatCellOpts({
  alignRight = false,
  alignCenter = false,
}: any = {}) {
  return new StatCellOpts(
    alignRight,
    alignCenter,
  );
}

// .selected needs to be at the bottom to override other border removals
const tableStyle = `
<style>
td {
  border-right: 1px solid;
  border-bottom: 1px solid;
  font-size: 22px;
}

.align-right {
  text-align: right;
}

.align-center {
  text-align: center;
}

</style>
`;

customElements.define('stat-ui', StatUi);
