import { Injectable } from '@angular/core';
import { DeltaOperation } from 'rich-text';
import { isString } from '../../../../../../type-utils';
import { EditorSegmentService } from '../base-services/editor-segment.service';
import { LynxInsightRange } from '../lynx-insight';

@Injectable({
  providedIn: 'root'
})
export class QuillEditorSegmentService extends EditorSegmentService {
  /**
   * Parses ops to get a map of segment name -> segment range.
   * A segment range spans from the start of its first op to the end of its last op, so embeds within the
   * segment (notes, figures, or the blank of an empty segment) are included in the segment's range.
   */
  parseSegments(ops: DeltaOperation[]): Map<string, LynxInsightRange> {
    const segmentMap = new Map<string, LynxInsightRange>();
    let currentIndex = 0;

    for (const op of ops) {
      if (op.insert != null) {
        const length: number = isString(op.insert) ? op.insert.length : 1; // Embeds have a length of 1
        const segment: string | undefined = op.attributes?.segment as string | undefined;

        if (isString(segment)) {
          const existingRange: LynxInsightRange | undefined = segmentMap.get(segment);

          if (existingRange == null) {
            segmentMap.set(segment, { index: currentIndex, length });
          } else {
            existingRange.length = currentIndex + length - existingRange.index;
          }
        }

        currentIndex += length;
      }
    }

    return segmentMap;
  }

  /**
   * Get all segment references that intersect the given range.
   * @param range The range to check.
   * @param segments A map of segment name -> segment range.
   * @returns An array of the intersecting segment refs.
   */
  getSegmentRefs(range: LynxInsightRange, segments: Map<string, LynxInsightRange>): string[] {
    const segmentRefs: string[] = [];

    if (range != null) {
      const rangeEnd: number = range.index + range.length;

      for (const [ref, segmentRange] of segments) {
        const segEnd: number = segmentRange.index + segmentRange.length;

        if (range.index < segEnd) {
          if (rangeEnd > segmentRange.index) {
            segmentRefs.push(ref);
          }
        }
      }
    }

    return segmentRefs;
  }
}
