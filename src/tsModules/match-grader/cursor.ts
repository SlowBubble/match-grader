
export class SheetCursor {
  constructor(
    public rowIdx = 0,
    public colIdx = 0,
  ) {}
  static deserialize(json: any) {
    return new SheetCursor(
      json.rowIdx,
      json.colIdx,
    );
  }
}