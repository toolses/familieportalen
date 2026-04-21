import { Injectable, signal, computed } from '@angular/core';
import { PlanMetadata, SchoolEvent, SavedPlan, Child, FamilyState, BaseRotation, ResidencyOverrides } from '../../features/school-plan/models/school-plan.models';

const STORAGE_KEY = 'family_portal_data';
const ACTIVE_WEEK_KEY = 'family_portal_active_week';
const FAMILY_KEY = 'family_portal_family';

const CHILD_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export interface PortalSettings {
  parentLabels: { A: string; B: string };
}

@Injectable({ providedIn: 'root' })
export class SchoolDataService {
  // ── Family state ──────────────────────────────────────────
  readonly children = signal<Child[]>([]);
  readonly activeChildId = signal<string | null>(null);
  readonly householdLabel = signal<'Mamma' | 'Pappa' | null>(null);
  readonly plansMap = signal<{ [childId: string]: SavedPlan[] }>({});
  readonly baseRotation = signal<BaseRotation | null>(null);
  readonly residencyOverrides = signal<ResidencyOverrides>({});

  readonly activeChild = computed(() => {
    const id = this.activeChildId();
    return this.children().find((c) => c.id === id) ?? null;
  });

  readonly activePlan = computed<SavedPlan | null>(() => {
    const childId = this.activeChildId();
    if (!childId) return this.legacyActivePlan();
    const childPlans = this.plansMap()[childId] ?? [];
    const activeWeek = this.getActiveWeek();
    if (activeWeek) {
      const match = childPlans.find(
        (p) => p.metadata.uke === activeWeek.uke && p.metadata.aar === activeWeek.aar
      );
      if (match) return match;
    }
    return childPlans.length > 0 ? childPlans[childPlans.length - 1] : null;
  });

  /** Fallback for users who have plans but no children set up yet */
  private legacyActivePlan = signal<SavedPlan | null>(null);

  readonly activePlanEvents = computed(() => this.activePlan()?.events ?? []);
  readonly activePlanMetadata = computed(() => this.activePlan()?.metadata ?? null);

  readonly settings = computed<PortalSettings>(() => {
    const label = this.householdLabel();
    return {
      parentLabels: { A: 'Mamma', B: 'Pappa' },
    };
  });

  constructor() {
    this.loadFamily();
    this.loadLegacyActivePlan();
  }

  // ── Child management ─────────────────────────────────────

  addChild(name: string, grade: string, color?: string): Child {
    const child: Child = {
      id: crypto.randomUUID(),
      name,
      grade,
      color: color ?? CHILD_COLORS[this.children().length % CHILD_COLORS.length],
    };
    this.children.update((c) => [...c, child]);
    if (!this.activeChildId()) {
      this.activeChildId.set(child.id);
    }
    this.persistFamily();
    return child;
  }

  removeChild(id: string): void {
    this.children.update((c) => c.filter((child) => child.id !== id));
    this.plansMap.update((m) => {
      const copy = { ...m };
      delete copy[id];
      return copy;
    });
    if (this.activeChildId() === id) {
      const remaining = this.children();
      this.activeChildId.set(remaining.length > 0 ? remaining[0].id : null);
    }
    this.persistFamily();
  }

  setActiveChild(id: string): void {
    this.activeChildId.set(id);
    this.persistFamily();
  }

  setHouseholdLabel(label: 'Mamma' | 'Pappa' | null): void {
    this.householdLabel.set(label);
    this.persistFamily();
  }

  setBaseRotation(rotation: BaseRotation | null): void {
    this.baseRotation.set(rotation);
    this.persistFamily();
  }

  setResidencyOverride(date: string, label: 'Mamma' | 'Pappa' | null): void {
    this.residencyOverrides.update((o) => {
      const copy = { ...o };
      if (label === null) {
        delete copy[date];
      } else {
        copy[date] = label;
      }
      return copy;
    });
    this.persistFamily();
  }

  // ── Plan persistence ────────────────────────────────────────

  savePlanForChild(childId: string, metadata: PlanMetadata, events: SchoolEvent[], house?: 'A' | 'B', images?: { front: string; back?: string }): void {
    const entry: SavedPlan = {
      metadata,
      events,
      savedAt: new Date().toISOString(),
      house,
      images,
    };
    this.plansMap.update((m) => {
      const plans = [...(m[childId] ?? [])];
      const idx = plans.findIndex(
        (p) => p.metadata.uke === metadata.uke && p.metadata.aar === metadata.aar
      );
      if (idx >= 0) plans[idx] = entry;
      else plans.push(entry);
      return { ...m, [childId]: plans };
    });
    this.setActiveWeek(metadata.uke, metadata.aar);
    this.persistFamily();
  }

  /** Legacy method — saves for active child or as legacy plan */
  savePlan(metadata: PlanMetadata, events: SchoolEvent[], house?: 'A' | 'B', images?: { front: string; back?: string }): void {
    const childId = this.activeChildId();
    if (childId) {
      this.savePlanForChild(childId, metadata, events, house, images);
    } else {
      // Legacy: no children configured
      const plans = this.getPlans();
      const idx = plans.findIndex(
        (p) => p.metadata.uke === metadata.uke && p.metadata.aar === metadata.aar
      );
      const entry: SavedPlan = { metadata, events, savedAt: new Date().toISOString(), house, images };
      if (idx >= 0) plans[idx] = entry;
      else plans.push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
      this.setActiveWeek(metadata.uke, metadata.aar);
      this.legacyActivePlan.set(entry);
    }
  }

  getPlans(): SavedPlan[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  getPlansForChild(childId: string): SavedPlan[] {
    return this.plansMap()[childId] ?? [];
  }

  getPlanByWeek(uke: number, aar: number): SavedPlan | null {
    return this.getPlans().find((p) => p.metadata.uke === uke && p.metadata.aar === aar) ?? null;
  }

  // ── Active week ──────────────────────────────────────────────

  setActiveWeek(uke: number, aar: number): void {
    localStorage.setItem(ACTIVE_WEEK_KEY, JSON.stringify({ uke, aar }));
  }

  getActiveWeek(): { uke: number; aar: number } | null {
    const raw = localStorage.getItem(ACTIVE_WEEK_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  // ── Settings (kept for backward compat) ────────────────────

  saveSettings(s: PortalSettings): void {
    // parentLabels no longer used directly, but keep API
  }

  // ── Persistence ─────────────────────────────────────────────

  private persistFamily(): void {
    const state: FamilyState = {
      children: this.children(),
      activeChildId: this.activeChildId(),
      householdLabel: this.householdLabel(),
      plans: this.plansMap(),
      baseRotation: this.baseRotation(),
      residencyOverrides: this.residencyOverrides(),
    };
    localStorage.setItem(FAMILY_KEY, JSON.stringify(state));
  }

  private loadFamily(): void {
    const raw = localStorage.getItem(FAMILY_KEY);
    if (!raw) return;
    try {
      const state: FamilyState = JSON.parse(raw);
      this.children.set(state.children ?? []);
      this.activeChildId.set(state.activeChildId ?? null);
      this.householdLabel.set(state.householdLabel ?? null);
      this.plansMap.set(state.plans ?? {});
      this.baseRotation.set(state.baseRotation ?? null);
      this.residencyOverrides.set(state.residencyOverrides ?? {});
    } catch { /* keep defaults */ }
  }

  private loadLegacyActivePlan(): void {
    if (this.children().length > 0) return; // Family mode active
    const activeWeek = this.getActiveWeek();
    let plan: SavedPlan | null = null;
    if (activeWeek) {
      plan = this.getPlanByWeek(activeWeek.uke, activeWeek.aar);
    }
    if (!plan) {
      const plans = this.getPlans();
      if (plans.length > 0) plan = plans[plans.length - 1];
    }
    this.legacyActivePlan.set(plan);
  }
}
