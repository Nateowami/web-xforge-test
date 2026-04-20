import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { ParsedSearchQuery, parseSearchQuery, SearchFieldsDef } from './search-query-parser';

/**
 * A general-purpose advanced search component that parses a GitHub-style "field:value" query
 * string into structured terms that can be used to filter a realtime server query.
 *
 * Usage:
 *   <app-advanced-search [fieldsDef]="myFieldsDef" (searchChange)="onSearch($event)" />
 *
 * The caller provides a definition of available fields and receives a ParsedSearchQuery on every
 * keystroke. Each term in the result carries a fieldId and a typed value (string or boolean) so
 * the caller can map fieldIds to database paths and construct a QueryFilter.
 */
@Component({
  selector: 'app-advanced-search',
  templateUrl: './advanced-search.component.html',
  styleUrls: ['./advanced-search.component.scss'],
  imports: [FormsModule, MatFormField, MatLabel, MatInput, MatSuffix, MatIcon, MatButton]
})
export class AdvancedSearchComponent implements OnInit {
  /** Definition of the fields that can be searched. */
  @Input() fieldsDef: SearchFieldsDef = { fields: [] };

  /** Emitted on every change to the search input with the current parsed query. */
  @Output() searchChange = new EventEmitter<ParsedSearchQuery>();

  /** The raw query string bound to the text input. */
  queryText: string = '';

  /** The current parsed result, updated on every input change. */
  parsedQuery: ParsedSearchQuery = { terms: [], isValid: true, errors: [] };

  /** Controls whether the full field reference is visible. */
  fieldReferenceExpanded: boolean = false;

  ngOnInit(): void {
    // Emit the initial (empty) query so that consumers get a signal on load.
    this.parsedQuery = parseSearchQuery(this.queryText, this.fieldsDef);
    this.searchChange.emit(this.parsedQuery);
  }

  /** Called on every keystroke in the search input. */
  onQueryChange(): void {
    this.parsedQuery = parseSearchQuery(this.queryText, this.fieldsDef);
    this.searchChange.emit(this.parsedQuery);
  }

  /** Toggles the field reference panel. */
  toggleFieldReference(): void {
    this.fieldReferenceExpanded = !this.fieldReferenceExpanded;
  }

  /** A comma-separated preview of available field IDs, shown when the reference panel is collapsed. */
  get fieldIdsPreview(): string {
    return this.fieldsDef.fields.map(f => f.id).join(', ');
  }

  /**
   * Returns an example query string for the given field so users know how to specify it.
   * Text fields show a quoted-value example; boolean fields show a true/false example.
   */
  exampleFor(fieldId: string): string {
    const field = this.fieldsDef.fields.find(f => f.id === fieldId);
    if (field == null) return '';
    if (field.type === 'boolean') {
      return `${fieldId}:true`;
    }
    return `${fieldId}:"example value"`;
  }
}
