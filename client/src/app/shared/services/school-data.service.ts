import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { PlanMetadata, SchoolEvent, SavedPlan, Child, FamilyState, BaseRotation, ResidencyOverrides } from '../../features/school-plan/models/school-plan.models';
import { AuthService } from './auth.service';

const CHILD_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export interface PortalSettings {
  parentLabels: { A: string; B: string };
}

@Injectable({ providedIn: 'root' })
export class SchoolDataService {
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private db = getFirestore();
  private unsubFirestore: Unsubscribe | null = null;
  private unsubSharedConfig: Unsubscribe | null = null;

  // ── Family state ──────────────────────────────────────────
  readonly children = signal<Child[]>([]);
  readonly activeChildId = signal<string | null>(null);
  readonly householdLabel = signal<'Mamma' | 'Pappa' | null>(null);
  readonly plansMap = signal<{ [childId: string]: SavedPlan[] }>({});
  readonly baseRotation = signal<BaseRotation | null>(null);
  readonly residencyOverrides = signal<ResidencyOverrides>({});
  readonly activeWeek = signal<{ uke: number; aar: number } | null>(null);
  readonly googleCalendarId = signal<string | null>(null);

  readonly activeChild = computed(() => {
    const id = this.activeChildId();
    return this.children().find((c) => c.id === id) ?? null;
  });

  readonly activePlan = computed<SavedPlan | null>(() => {
    const childId = this.activeChildId();
    if (!childId) return null;
    const childPlans = this.plansMap()[childId] ?? [];
    const week = this.activeWeek();
    if (week) {
      const match = childPlans.find(
        (p) => p.metadata.uke === week.uke && p.metadata.aar === week.aar
      );
      if (match) return match;
    }
    return childPlans.length > 0 ? childPlans[childPlans.length - 1] : null;
  });

  readonly activePlanEvents = computed(() => this.activePlan()?.events ?? []);
  readonly activePlanMetadata = computed(() => this.activePlan()?.metadata ?? null);

  readonly settings = computed<PortalSettings>(() => ({
    parentLabels: { A: 'Mamma', B: 'Pappa' },
  }));

  constructor() {
    // Subscribe to Firestore when user is logged in
    // Use an effect-like pattern: check auth state periodically
    const checkAuth = setInterval(() => {
      if (!this.auth.loading()) {
        clearInterval(checkAuth);
        if (this.auth.isLoggedIn()) {
          this.subscribeToFirestore();
          this.subscribeToSharedConfig();
        }
      }
    }, 100);

    this.destroyRef.onDestroy(() => {
      this.unsubFirestore?.();
      this.unsubSharedConfig?.();
    });
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
    this.persist();
    return child;
  }

  updateChild(id: string, name: string, grade: string, color: string): void {
    this.children.update((c) =>
      c.map((child) => (child.id === id ? { ...child, name, grade, color } : child))
    );
    this.persist();
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
    this.persist();
  }

  setActiveChild(id: string): void {
    this.activeChildId.set(id);
    this.persist();
  }

  setHouseholdLabel(label: 'Mamma' | 'Pappa' | null): void {
    this.householdLabel.set(label);
    this.persist();
  }

  setBaseRotation(rotation: BaseRotation | null): void {
    this.baseRotation.set(rotation);
    this.persist();
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
    this.persist();
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
    this.persist();
  }

  savePlan(metadata: PlanMetadata, events: SchoolEvent[], house?: 'A' | 'B', images?: { front: string; back?: string }): void {
    const childId = this.activeChildId();
    if (childId) {
      this.savePlanForChild(childId, metadata, events, house, images);
    }
  }

  updateEventInActivePlan(target: SchoolEvent, updated: SchoolEvent): void {
    const childId = this.activeChildId();
    const plan = this.activePlan();
    if (!childId || !plan) return;
    const newEvents = plan.events.map((e) => (e === target ? updated : e));
    this.savePlanForChild(childId, plan.metadata, newEvents, plan.house, plan.images);
  }

  deleteEventFromActivePlan(target: SchoolEvent): void {
    const childId = this.activeChildId();
    const plan = this.activePlan();
    if (!childId || !plan) return;
    const newEvents = plan.events.filter((e) => e !== target);
    this.savePlanForChild(childId, plan.metadata, newEvents, plan.house, plan.images);
  }

  getPlansForChild(childId: string): SavedPlan[] {
    return this.plansMap()[childId] ?? [];
  }

  // ── Active week ──────────────────────────────────────────────

  setActiveWeek(uke: number, aar: number): void {
    this.activeWeek.set({ uke, aar });
    this.persist();
  }

  getActiveWeek(): { uke: number; aar: number } | null {
    return this.activeWeek();
  }

  // ── Settings ────────────────────────────────────────────────

  saveSettings(s: PortalSettings): void {
    // parentLabels no longer used directly, but keep API
  }

  setGoogleCalendarId(id: string | null): void {
    this.googleCalendarId.set(id);
    const data = JSON.parse(JSON.stringify({ googleCalendarId: id ?? null }));
    setDoc(doc(this.db, 'config', 'shared'), data, { merge: true }).catch((err) =>
      console.error('Firestore shared config write failed:', err)
    );
  }

  // ── Clear all data ──────────────────────────────────────────

  async clearAllData(): Promise<void> {
    this.children.set([]);
    this.activeChildId.set(null);
    this.householdLabel.set(null);
    this.plansMap.set({});
    this.baseRotation.set(null);
    this.residencyOverrides.set({});
    this.activeWeek.set(null);
    this.googleCalendarId.set(null);
    setDoc(doc(this.db, 'config', 'shared'), { googleCalendarId: null }, { merge: true }).catch(() => {});
    await this.persistToFirestore();
  }

  // ── Persistence ─────────────────────────────────────────────

  private getState(): FamilyState {
    return {
      children: this.children(),
      activeChildId: this.activeChildId(),
      householdLabel: this.householdLabel(),
      plans: this.plansMap(),
      baseRotation: this.baseRotation(),
      residencyOverrides: this.residencyOverrides(),
    };
  }

  private persist(): void {
    this.persistToFirestore();
  }

  private async persistToFirestore(): Promise<void> {
    const uid = this.auth.user()?.uid;
    if (!uid) return;

    const state = this.getState();
    const raw = { ...state, activeWeek: this.activeWeek(), updatedAt: new Date().toISOString() };
    // Strip undefined values — Firestore rejects them
    const data = JSON.parse(JSON.stringify(raw));

    try {
      await setDoc(doc(this.db, 'users', uid), data);
    } catch (err) {
      console.error('Firestore write failed:', err);
    }
  }

  private subscribeToFirestore(): void {
    const uid = this.auth.user()?.uid;
    if (!uid) return;

    this.unsubFirestore?.();
    this.unsubFirestore = onSnapshot(doc(this.db, 'users', uid), (snap) => {
      if (!snap.exists()) return;
      const state = snap.data() as FamilyState & { activeWeek?: { uke: number; aar: number } | null };
      this.applyState(state);
    });
  }

  private applyState(state: FamilyState & { activeWeek?: { uke: number; aar: number } | null }): void {
    this.children.set(state.children ?? []);
    this.activeChildId.set(state.activeChildId ?? null);
    this.householdLabel.set(state.householdLabel ?? null);
    this.plansMap.set(state.plans ?? {});
    this.baseRotation.set(state.baseRotation ?? null);
    this.residencyOverrides.set(state.residencyOverrides ?? {});
    if (state.activeWeek) {
      this.activeWeek.set(state.activeWeek);
    }
  }

  private subscribeToSharedConfig(): void {
    this.unsubSharedConfig?.();
    this.unsubSharedConfig = onSnapshot(doc(this.db, 'config', 'shared'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { googleCalendarId?: string | null };
      if (data.googleCalendarId !== undefined) {
        this.googleCalendarId.set(data.googleCalendarId);
      }
    });
  }
}
