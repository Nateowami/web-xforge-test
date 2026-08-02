import { Observable } from 'rxjs';

export interface TabMenuItem {
  type: string;
  text: string;
  icon?: string;
  svgIcon?: string;
  /** Whether the item is shown, but cannot be selected (e.g. the tab cannot be opened while offline). */
  disabled?: boolean;
}

export abstract class TabMenuService<TGroupId extends string> {
  abstract getMenuItems(groupId?: TGroupId): Observable<TabMenuItem[]>;
}
