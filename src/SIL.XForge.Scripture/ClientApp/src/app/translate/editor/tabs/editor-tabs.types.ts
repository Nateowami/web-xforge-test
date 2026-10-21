import { EditorTabType } from 'realtime-server/lib/esm/scriptureforge/models/editor-tab';
import { TabInfo } from '../../../shared/sf-tab-group';
import { HistoryTabState } from '../editor-history/history-chooser/history-chooser.component';

export interface EditorTabInfo extends TabInfo<EditorTabType> {
  /**
   * If set, only a single instance of this tab is allowed with uniqueness determined by tab type and projectId.
   */
  unique?: boolean;

  /**
   * Whether to persist tab.
   */
  persist?: boolean;

  /**
   * The SF project id if tab is a project/resource tab.
   */
  projectId?: string;

  /**
   * The state of a history tab, so it can be restored if the tab's components are recreated (e.g. when the tab is
   * moved to another tab group).
   */
  historyState?: HistoryTabState;
}
