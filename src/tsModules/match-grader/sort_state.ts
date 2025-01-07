import { ColumnName } from "./gradebook_ui_config";

export class SortState {
  constructor(
    public columns: SortColumn[] = [],
  ) {}
}

export class SortColumn {
  constructor(
    public name = ColumnName.START_TIME,
    public direction = SortDirection.DSC,
  ) {}
}

export enum SortDirection {
  ASC = 'ASC',
  DSC = 'DSC',
}

export const defaultSortState = new SortState([new SortColumn()]);
