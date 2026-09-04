export type ItemDraft = {
  expireDate: string;
  copies: number | '';
};

export type SelectedLine = {
  lineId: string;
  itemcode: string;
  itemname: string;
  copies: number | '';
  refillCap: number;
  expireDate: string;
  lotNo?: string;
};

export const DEFAULT_ITEM_DRAFT: ItemDraft = { expireDate: '', copies: '' };
