import { describe, it, expect } from 'vitest';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import { TestBed } from '@angular/core/testing';
import { EventEditSheetComponent } from './event-edit-sheet.component';
import { SchoolEvent } from '../../features/school-plan/models/school-plan.models';

function makeEvent(overrides: Partial<SchoolEvent> = {}): SchoolEvent {
  return {
    date: '2026-04-22',
    title: 'Les side 12',
    description: '',
    category: 'homework',
    ...overrides,
  };
}

describe('EventEditSheetComponent', () => {
  setupTestBed({ imports: [EventEditSheetComponent] });

  function create(event: SchoolEvent) {
    const fixture = TestBed.createComponent(EventEditSheetComponent);
    fixture.componentRef.setInput('event', event);
    fixture.detectChanges();
    return fixture;
  }

  function getButtonTexts(fixture: ReturnType<typeof create>): string[] {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    return Array.from(buttons).map((b) => b.textContent?.trim().replace(/\s+/g, ' ') ?? '');
  }

  // ── initialisering ──────────────────────────────────────────────────────────

  describe('initialisering av completed', () => {
    it('setter completed til false når hendelsen mangler completed-flag', () => {
      const fixture = create(makeEvent());
      expect(fixture.componentInstance.completed).toBe(false);
    });

    it('setter completed til true når hendelsen har completed: true', () => {
      const fixture = create(makeEvent({ completed: true }));
      expect(fixture.componentInstance.completed).toBe(true);
    });

    it('initialiserer tittel, beskrivelse og kategori fra hendelsen', () => {
      const fixture = create(makeEvent({ title: 'Matte kap 4', description: 'Oppgave 1–5', category: 'homework' }));
      const comp = fixture.componentInstance;
      expect(comp.title).toBe('Matte kap 4');
      expect(comp.description).toBe('Oppgave 1–5');
      expect(comp.category).toBe('homework');
    });
  });

  // ── onSave ──────────────────────────────────────────────────────────────────

  describe('onSave', () => {
    it('emitterer hendelse uten completed når completed er false', () => {
      const fixture = create(makeEvent());
      const emitted: SchoolEvent[] = [];
      fixture.componentInstance.saved.subscribe((e) => emitted.push(e));

      fixture.componentInstance.onSave();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].completed).toBeUndefined();
    });

    it('emitterer hendelse med completed: true når completed er satt til true', () => {
      const fixture = create(makeEvent());
      const emitted: SchoolEvent[] = [];
      fixture.componentInstance.saved.subscribe((e) => emitted.push(e));

      fixture.componentInstance.completed = true;
      fixture.componentInstance.onSave();

      expect(emitted[0].completed).toBe(true);
    });

    it('trimmer tittel og beskrivelse i emittert hendelse', () => {
      const fixture = create(makeEvent({ title: '  Norsk  ', description: '  side 3  ' }));
      const emitted: SchoolEvent[] = [];
      fixture.componentInstance.saved.subscribe((e) => emitted.push(e));

      fixture.componentInstance.onSave();

      expect(emitted[0].title).toBe('Norsk');
      expect(emitted[0].description).toBe('side 3');
    });

    it('emitterer ikke når tittel er tom', () => {
      const fixture = create(makeEvent({ title: '' }));
      const comp = fixture.componentInstance;
      comp.title = '';
      const emitted: SchoolEvent[] = [];
      comp.saved.subscribe((e: SchoolEvent) => emitted.push(e));

      comp.onSave();

      expect(emitted).toHaveLength(0);
    });
  });

  // ── onToggleComplete ────────────────────────────────────────────────────────

  describe('onToggleComplete', () => {
    it('setter completed til true og emitterer lagret hendelse', () => {
      const fixture = create(makeEvent());
      const emitted: SchoolEvent[] = [];
      fixture.componentInstance.saved.subscribe((e) => emitted.push(e));

      fixture.componentInstance.onToggleComplete();

      expect(fixture.componentInstance.completed).toBe(true);
      expect(emitted).toHaveLength(1);
      expect(emitted[0].completed).toBe(true);
    });

    it('reverserer completed fra true til false og emitterer uten completed-flagg', () => {
      const fixture = create(makeEvent({ completed: true }));
      const emitted: SchoolEvent[] = [];
      fixture.componentInstance.saved.subscribe((e) => emitted.push(e));

      fixture.componentInstance.onToggleComplete();

      expect(fixture.componentInstance.completed).toBe(false);
      expect(emitted[0].completed).toBeUndefined();
    });

    it('bevarer tittel og beskrivelse fra form state i emittert hendelse', () => {
      const fixture = create(makeEvent({ title: 'Matte side 5', description: 'Alle oppgavene' }));
      const emitted: SchoolEvent[] = [];
      fixture.componentInstance.saved.subscribe((e) => emitted.push(e));

      fixture.componentInstance.onToggleComplete();

      expect(emitted[0].title).toBe('Matte side 5');
      expect(emitted[0].description).toBe('Alle oppgavene');
    });

    it('kan togle frem og tilbake uten bruk av input', () => {
      const fixture = create(makeEvent());
      const comp = fixture.componentInstance;

      comp.onToggleComplete(); // false → true
      expect(comp.completed).toBe(true);

      comp.onToggleComplete(); // true → false
      expect(comp.completed).toBe(false);
    });
  });

  // ── Fullfør-knapp synlighet ─────────────────────────────────────────────────

  describe('Fullfør-knapp', () => {
    it('er synlig for homework-kategori', () => {
      const fixture = create(makeEvent({ category: 'homework' }));
      const texts = getButtonTexts(fixture);
      expect(texts.some((t) => t.includes('Fullfør'))).toBe(true);
    });

    it('er ikke synlig for reminder-kategori', () => {
      const fixture = create(makeEvent({ category: 'reminder' }));
      const texts = getButtonTexts(fixture);
      expect(texts.some((t) => t.includes('Fullfør') || t.includes('ufullført'))).toBe(false);
    });

    it('er ikke synlig for information-kategori', () => {
      const fixture = create(makeEvent({ category: 'information' }));
      const texts = getButtonTexts(fixture);
      expect(texts.some((t) => t.includes('Fullfør') || t.includes('ufullført'))).toBe(false);
    });

    it('viser "Marker som ufullført" når leksen allerede er fullført', () => {
      const fixture = create(makeEvent({ completed: true }));
      const texts = getButtonTexts(fixture);
      expect(texts.some((t) => t.includes('Marker som ufullført'))).toBe(true);
    });

    it('viser "Fullfør" når leksen ikke er fullført', () => {
      const fixture = create(makeEvent({ completed: false }));
      const texts = getButtonTexts(fixture);
      expect(texts.some((t) => t.includes('Fullfør') && !t.includes('ufullført'))).toBe(true);
    });
  });
});
