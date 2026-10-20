import { AfterViewInit, Component, DestroyRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { combineLatest, EMPTY, startWith, Subject, switchMap } from 'rxjs';
import { FontService } from 'xforge-common/font.service';
import { quietTakeUntilDestroyed } from 'xforge-common/util/rxjs-util';
import { SFProjectProfileDoc } from '../../../core/models/sf-project-profile-doc';
import { SFProjectService } from '../../../core/sf-project.service';
import { TextComponent } from '../../../shared/text/text.component';
import { formatFontSizeToRems } from '../../../shared/utils';
import { CopyrightBannerComponent } from '../../../shared/copyright-banner/copyright-banner.component';
import { TextDocIdPipe } from '../../../shared/text/text-doc-id.pipe';
@Component({
  selector: 'app-editor-resource',
  templateUrl: './editor-resource.component.html',
  styleUrl: '../editor.component.scss',
  imports: [CopyrightBannerComponent, TextComponent, TextDocIdPipe]
})
export class EditorResourceComponent implements AfterViewInit, OnChanges {
  @Input() projectId?: string;
  @Input() bookNum?: number;
  @Input() chapter?: number;
  @Input() segmentRef?: string;
  @Input() highlightSegment?: boolean;

  @ViewChild(TextComponent) resourceText!: TextComponent;

  isRightToLeft = false;
  fontSize?: string;
  font?: string;
  hasCopyrightBanner: boolean = false;
  copyrightBanner?: string;
  copyrightNotice?: string;

  inputChanged$ = new Subject<void>();

  constructor(
    private readonly destroyRef: DestroyRef,
    private readonly projectService: SFProjectService,
    private readonly fontService: FontService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.inputChanged$.next();
    // When the target regains focus without moving to another verse, the resource text keeps its segment and does not
    // emit segmentRefChange
    if (changes.highlightSegment?.currentValue === true && changes.segmentRef == null) {
      this.scrollToSegment();
    }
  }

  scrollToSegment(): void {
    const segmentRef: string | undefined = this.resourceText?.segment?.ref;
    if (this.highlightSegment && segmentRef != null) {
      this.resourceText.scrollSegmentIntoView(segmentRef);
    }
  }

  ngAfterViewInit(): void {
    this.initProjectDetails();
  }

  private initProjectDetails(): void {
    combineLatest([this.resourceText.editorCreated, this.inputChanged$.pipe(startWith(undefined))])
      .pipe(
        quietTakeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          if (this.projectId == null || this.bookNum == null || this.chapter == null) {
            return EMPTY;
          }

          return this.projectService.getProfile(this.projectId);
        })
      )
      .subscribe((projectDoc: SFProjectProfileDoc) => {
        this.hasCopyrightBanner = projectDoc.data?.copyrightBanner != null;
        this.copyrightBanner = projectDoc.data?.copyrightBanner ?? '';
        this.copyrightNotice = projectDoc.data?.copyrightNotice;
        this.isRightToLeft = projectDoc.data?.isRightToLeft ?? false;
        this.fontSize = formatFontSizeToRems(projectDoc.data?.defaultFontSize);
        this.font = this.fontService.getFontFamilyFromProject(projectDoc);
      });
  }
}
