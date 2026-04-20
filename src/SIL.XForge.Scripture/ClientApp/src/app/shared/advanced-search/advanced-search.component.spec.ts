import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ParsedSearchQuery, SearchFieldsDef } from './search-query-parser';
import { AdvancedSearchComponent } from './advanced-search.component';

/** Fields definition used across all tests */
const fieldsDef: SearchFieldsDef = {
  fields: [
    { id: 'name', label: 'Project name', type: 'text', description: 'The full name of the project' },
    { id: 'shortName', label: 'Short name', type: 'text' },
    { id: 'drafting', label: 'Drafting enabled', type: 'boolean' },
    { id: 'dateBefore', label: 'Submitted before', type: 'date' }
  ]
};

describe('AdvancedSearchComponent', () => {
  class TestEnvironment {
    readonly fixture: ComponentFixture<AdvancedSearchComponent>;
    readonly component: AdvancedSearchComponent;

    /** Queries emitted by the component during the test */
    readonly emittedQueries: ParsedSearchQuery[] = [];

    constructor({ startQuery = '' }: { startQuery?: string } = {}) {
      TestBed.configureTestingModule({
        imports: [AdvancedSearchComponent, NoopAnimationsModule]
      }).compileComponents();

      this.fixture = TestBed.createComponent(AdvancedSearchComponent);
      this.component = this.fixture.componentInstance;
      this.component.fieldsDef = fieldsDef;
      this.component.queryText = startQuery;

      this.component.searchChange.subscribe((q: ParsedSearchQuery) => {
        this.emittedQueries.push(q);
      });

      this.fixture.detectChanges();
    }

    get searchInput(): HTMLInputElement {
      return this.fixture.debugElement.query(By.css('#advanced-search-input')).nativeElement;
    }

    get toggleButton(): HTMLButtonElement {
      return this.fixture.debugElement.query(By.css('.field-reference-toggle')).nativeElement;
    }

    /** Simulate the user typing text into the search input and triggering ngModelChange. */
    setQuery(text: string): void {
      this.component.queryText = text;
      this.component.onQueryChange();
      this.fixture.detectChanges();
    }

    get fieldList(): HTMLElement | null {
      const el = this.fixture.debugElement.query(By.css('.field-list'));
      return el == null ? null : el.nativeElement;
    }

    get errorElements(): HTMLElement[] {
      return this.fixture.debugElement.queryAll(By.css('.search-error')).map(de => de.nativeElement);
    }

    get fieldItems(): HTMLElement[] {
      return this.fixture.debugElement.queryAll(By.css('.field-item')).map(de => de.nativeElement);
    }
  }

  it('should emit an empty valid query on initialization', () => {
    const env = new TestEnvironment();
    expect(env.emittedQueries.length).toBe(1);
    const initial: ParsedSearchQuery = env.emittedQueries[0];
    expect(initial.isValid).toBe(true);
    expect(initial.terms).toEqual([]);
  });

  it('should emit a parsed query when the user types', () => {
    const env = new TestEnvironment();
    env.setQuery('name:Foo');

    const latest: ParsedSearchQuery = env.emittedQueries[env.emittedQueries.length - 1];
    expect(latest.isValid).toBe(true);
    expect(latest.terms).toEqual([{ fieldId: 'name', value: 'Foo' }]);
  });

  it('should emit an invalid query when the user types an unknown field', () => {
    const env = new TestEnvironment();
    env.setQuery('badField:Foo');

    const latest: ParsedSearchQuery = env.emittedQueries[env.emittedQueries.length - 1];
    expect(latest.isValid).toBe(false);
  });

  it('should show an error message for an invalid query', () => {
    const env = new TestEnvironment();
    env.setQuery('badField:Foo');
    expect(env.errorElements.length).toBeGreaterThan(0);
  });

  it('should not show error messages for a valid query', () => {
    const env = new TestEnvironment();
    env.setQuery('name:Foo');
    expect(env.errorElements.length).toBe(0);
  });

  it('should not show the field list by default', () => {
    const env = new TestEnvironment();
    expect(env.fieldList).toBeNull();
  });

  it('should show the field list after clicking the toggle button', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    expect(env.fieldList).not.toBeNull();
  });

  it('should hide the field list again after clicking the toggle button a second time', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    env.toggleButton.click();
    env.fixture.detectChanges();
    expect(env.fieldList).toBeNull();
  });

  it('should show one list item for each field when expanded', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    expect(env.fieldItems.length).toBe(fieldsDef.fields.length);
  });

  it('should show the field IDs preview when the reference panel is collapsed', () => {
    const env = new TestEnvironment();
    const preview = env.fixture.debugElement.query(By.css('.field-ids-preview'));
    expect(preview).not.toBeNull();
    expect(preview.nativeElement.textContent).toContain('name');
    expect(preview.nativeElement.textContent).toContain('shortName');
    expect(preview.nativeElement.textContent).toContain('drafting');
  });

  it('should hide the field IDs preview when the reference panel is expanded', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    const preview = env.fixture.debugElement.query(By.css('.field-ids-preview'));
    expect(preview).toBeNull();
  });

  it('should display each field label in the expanded list', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    const listText: string = env.fieldList!.textContent ?? '';
    expect(listText).toContain('Project name');
    expect(listText).toContain('Short name');
    expect(listText).toContain('Drafting enabled');
  });

  it('should display an example for each field in the expanded list', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    const listText: string = env.fieldList!.textContent ?? '';
    // Text field example uses quotes.
    expect(listText).toContain('name:"example value"');
    // Boolean field example uses a literal.
    expect(listText).toContain('drafting:true');
  });

  it('should display the description for fields that have one', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    const listText: string = env.fieldList!.textContent ?? '';
    expect(listText).toContain('The full name of the project');
  });

  it('should not display a description element for fields without a description', () => {
    const env = new TestEnvironment();
    env.toggleButton.click();
    env.fixture.detectChanges();
    const descriptions = env.fixture.debugElement.queryAll(By.css('.field-description'));
    // Only the 'name' field has a description, so only one description element.
    expect(descriptions.length).toBe(1);
  });

  it('should return the correct example for a boolean field', () => {
    const env = new TestEnvironment();
    expect(env.component.exampleFor('drafting')).toBe('drafting:true');
  });

  it('should return the correct example for a text field', () => {
    const env = new TestEnvironment();
    expect(env.component.exampleFor('name')).toBe('name:"example value"');
  });

  it('should return the correct example for a date field', () => {
    const env = new TestEnvironment();
    expect(env.component.exampleFor('dateBefore')).toBe('dateBefore:2025-01-15');
  });

  it('should return an empty string for an unknown field id', () => {
    const env = new TestEnvironment();
    expect(env.component.exampleFor('doesNotExist')).toBe('');
  });

  it('should provide the fieldIdsPreview property', () => {
    const env = new TestEnvironment();
    expect(env.component.fieldIdsPreview).toBe('name, shortName, drafting, dateBefore');
  });

  it('should emit the initial query when started with a non-empty queryText', () => {
    const env = new TestEnvironment({ startQuery: 'name:Test' });
    const initial: ParsedSearchQuery = env.emittedQueries[0];
    expect(initial.terms).toEqual([{ fieldId: 'name', value: 'Test' }]);
  });

  it('should emit multiple times as the query changes', () => {
    const env = new TestEnvironment();
    env.setQuery('name:A');
    env.setQuery('name:B');
    env.setQuery('name:C');
    expect(env.emittedQueries.length).toBe(4); // 1 initial + 3 changes
  });
});
