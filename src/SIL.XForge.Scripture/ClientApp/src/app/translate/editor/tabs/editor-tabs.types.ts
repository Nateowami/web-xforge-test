import { EditorTabType } from 'realtime-server/lib/esm/scriptureforge/models/editor-tab';
import { Revision } from '../../../core/paratext.service';
import { TabInfo } from '../../../shared/sf-tab-group';

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
   * The revision selected in a history tab, so the selection can be restored if the tab is recreated (e.g. when it is
   * moved to another tab group).
   */
  historyRevision?: Revision;
}
