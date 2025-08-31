import { ChildUser, Family, ParentUser } from './types';
import { Chore, Completion } from './chores.types';
import { LedgerEntry } from './bank.types';
import { SaverItem } from './savers.types';

export interface UsersRepository {
  getParentByEmail(email: string): Promise<ParentUser | undefined>;
  getParentById(id: string): Promise<ParentUser | undefined>;
  upsertParent(user: ParentUser): Promise<ParentUser>; // for Google sign-in

  getChildByUsername(username: string): Promise<ChildUser | undefined>;
  getChildById(id: string): Promise<ChildUser | undefined>;
  createChild(child: ChildUser): Promise<ChildUser>;
  updateChild(id: string, update: Partial<Pick<ChildUser, 'username' | 'passwordHash' | 'displayName'>>): Promise<ChildUser | undefined>;
  deleteChild(id: string): Promise<void>;
}

export interface FamiliesRepository {
  createFamily(family: Family): Promise<Family>;
  getFamilyById(id: string): Promise<Family | undefined>;
  updateFamily(family: Family): Promise<Family>;
  removeParentFromFamily(familyId: string, parentId: string): Promise<void>;
}

export interface ChoresRepository {
  createChore(chore: Chore): Promise<Chore>;
  updateChore(chore: Chore): Promise<Chore>;
  deleteChore(id: string): Promise<void>;
  getChoreById(id: string): Promise<Chore | undefined>;
  listChoresByFamily(familyId: string): Promise<Chore[]>;

  createCompletion(c: Completion): Promise<Completion>;
  deleteCompletion(id: string): Promise<void>;
  listPendingCompletionsByFamily(familyId: string): Promise<Completion[]>;
  listCompletionsForChildInRange(childId: string, start: string, end: string): Promise<Completion[]>;
}

export interface BankRepository {
  addLedgerEntry(entry: LedgerEntry): Promise<LedgerEntry>;
  getLedgerByChild(childId: string): Promise<LedgerEntry[]>;
  getBalance(childId: string): Promise<{ available: number; reserved: number }>;
  findPayoutForWeek(childId: string, familyId: string, weekStart: string): Promise<LedgerEntry | undefined>;
}

export interface SaversRepository {
  createSaver(item: SaverItem): Promise<SaverItem>;
  listSaversByChild(childId: string): Promise<SaverItem[]>;
  updateSaver(item: SaverItem): Promise<SaverItem>;
  getSaverById(id: string): Promise<SaverItem | undefined>;
  deleteSaver(id: string): Promise<void>;
}

export class InMemoryRepos implements UsersRepository, FamiliesRepository, ChoresRepository, BankRepository, SaversRepository {
  private parents = new Map<string, ParentUser>();
  private children = new Map<string, ChildUser>();
  private families = new Map<string, Family>();
  private chores = new Map<string, Chore>();
  private completions = new Map<string, Completion>();
  private ledger = new Map<string, LedgerEntry[]>(); // key: childId
  private savers = new Map<string, SaverItem>(); // key: saverId

  async getParentByEmail(email: string) {
    for (const p of this.parents.values()) if (p.email === email) return p;
    return undefined;
  }
  async getParentById(id: string) {
    return this.parents.get(id);
  }
  async upsertParent(user: ParentUser) {
    this.parents.set(user.id, user);
    return user;
  }

  async getChildByUsername(username: string) {
    for (const c of this.children.values()) if (c.username === username) return c;
    return undefined;
  }
  async getChildById(id: string) {
    return this.children.get(id);
  }
  async createChild(child: ChildUser) {
    // global username uniqueness
    for (const c of this.children.values()) if (c.username === child.username) {
      const err: any = new Error('username taken');
      err.code = 409;
      throw err;
    }
    this.children.set(child.id, child);
    const fam = this.families.get(child.familyId);
    if (fam && !fam.childIds.includes(child.id)) {
      fam.childIds.push(child.id);
      this.families.set(fam.id, fam);
    }
    return child;
  }

  async updateChild(id: string, update: Partial<Pick<ChildUser, 'username' | 'passwordHash' | 'displayName'>>) {
    const cur = this.children.get(id);
    if (!cur) return undefined;
    if (update.username && update.username !== cur.username) {
      // uniqueness per family
      for (const c of this.children.values()) {
        if (c.familyId === cur.familyId && c.username === update.username) {
          throw Object.assign(new Error('username taken'), { code: 409 });
        }
      }
    }
    const next = { ...cur, ...update } as ChildUser;
    this.children.set(id, next);
    return next;
  }

  async deleteChild(id: string) {
    const cur = this.children.get(id);
    if (cur) {
      const fam = this.families.get(cur.familyId);
      if (fam) {
        fam.childIds = fam.childIds.filter((cid) => cid !== id);
        this.families.set(fam.id, fam);
      }
    }
    this.children.delete(id);
  }

  async createFamily(family: Family) {
    this.families.set(family.id, family);
    return family;
  }
  async getFamilyById(id: string) {
    return this.families.get(id);
  }
  async updateFamily(family: Family) {
    this.families.set(family.id, family);
    return family;
  }

  async removeParentFromFamily(familyId: string, parentId: string) {
    const fam = this.families.get(familyId);
    if (fam) {
      fam.parentIds = fam.parentIds.filter((id) => id !== parentId);
      this.families.set(fam.id, fam);
    }
    const parent = this.parents.get(parentId);
    if (parent) {
      parent.families = parent.families.filter((fid) => fid !== familyId);
      this.parents.set(parentId, parent);
    }
  }

  // ChoresRepository
  async createChore(chore: Chore) {
    this.chores.set(chore.id, chore);
    return chore;
  }
  async updateChore(chore: Chore) {
    this.chores.set(chore.id, chore);
    return chore;
  }
  async deleteChore(id: string) {
    this.chores.delete(id);
  }
  async getChoreById(id: string) {
    return this.chores.get(id);
  }
  async listChoresByFamily(familyId: string) {
    return Array.from(this.chores.values()).filter((c) => c.familyId === familyId);
  }

  async createCompletion(c: Completion) {
    this.completions.set(c.id, c);
    return c;
  }
  async deleteCompletion(id: string) {
    this.completions.delete(id);
  }
  async listPendingCompletionsByFamily(familyId: string) {
    const childIds = (this.families.get(familyId)?.childIds || []);
    const choreIds = Array.from(this.chores.values()).filter((x) => x.familyId === familyId).map((x) => x.id);
    return Array.from(this.completions.values()).filter((c) => c.status === 'pending' && childIds.includes(c.childId) && choreIds.includes(c.choreId));
  }
  async listCompletionsForChildInRange(childId: string, start: string, end: string) {
    return Array.from(this.completions.values()).filter((c) => c.childId === childId && c.date >= start && c.date <= end);
  }

  // BankRepository
  async addLedgerEntry(entry: LedgerEntry) {
    const list = this.ledger.get(entry.childId) || [];
    list.push(entry);
    // keep newest first for convenience
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    this.ledger.set(entry.childId, list);
    return entry;
  }
  async getLedgerByChild(childId: string) {
    return (this.ledger.get(childId) || []).slice();
  }
  async getBalance(childId: string) {
    const entries = this.ledger.get(childId) || [];
    const available = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
    return { available, reserved: 0 };
  }
  async findPayoutForWeek(childId: string, familyId: string, weekStart: string) {
    const entries = this.ledger.get(childId) || [];
    return entries.find((e) => e.type === 'payout' && e.meta?.familyId === familyId && e.meta?.weekStart === weekStart);
  }

  // SaversRepository
  async createSaver(item: SaverItem) {
    this.savers.set(item.id, item);
    return item;
  }
  async listSaversByChild(childId: string) {
    return Array.from(this.savers.values()).filter((s) => s.childId === childId);
  }
  async updateSaver(item: SaverItem) {
    this.savers.set(item.id, item);
    return item;
  }
  async getSaverById(id: string) {
    return this.savers.get(id);
  }
  async deleteSaver(id: string) {
    this.savers.delete(id);
  }
}
