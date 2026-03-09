import type * as vscode from 'vscode';
import { GLOBAL_KEY_ACHIEVEMENTS } from './constants.js';

export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	target: number;
}

export interface AchievementProgress {
	unlocked: boolean;
	unlockedAt?: number;
	current: number;
}

export type AchievementStore = Record<string, AchievementProgress>;

export const ACHIEVEMENTS: AchievementDef[] = [
	{ id: 'first_agent', name: 'First Agent', description: 'Create your first agent', target: 1 },
	{ id: 'team_player', name: 'Team Player', description: '5 agents running at once', target: 5 },
	{ id: 'token_millionaire', name: 'Token Millionaire', description: 'Use 1M total tokens', target: 1_000_000 },
	{ id: 'night_owl', name: 'Night Owl', description: 'Use a tool at 3 AM', target: 1 },
	{ id: 'bug_squasher', name: 'Bug Squasher', description: '10 error tool results', target: 10 },
	{ id: 'architect', name: 'Architect', description: 'Edit 50 unique files', target: 50 },
	{ id: 'marathon', name: 'Marathon Runner', description: 'Complete 100 turns', target: 100 },
	{ id: 'decorator', name: 'Interior Decorator', description: 'Place 20 furniture items', target: 20 },
];

export class AchievementManager {
	private store: AchievementStore = {};
	private editedFiles = new Set<string>();

	constructor(private readonly context: vscode.ExtensionContext) {
		this.load();
	}

	private load(): void {
		const saved = this.context.globalState.get<AchievementStore>(GLOBAL_KEY_ACHIEVEMENTS);
		if (saved) {
			this.store = saved;
		}
	}

	private save(): void {
		this.context.globalState.update(GLOBAL_KEY_ACHIEVEMENTS, this.store);
	}

	private getProgress(id: string): AchievementProgress {
		if (!this.store[id]) {
			this.store[id] = { unlocked: false, current: 0 };
		}
		return this.store[id];
	}

	/** Increment progress and return newly unlocked achievement ID or null */
	increment(id: string, amount = 1): string | null {
		const def = ACHIEVEMENTS.find(a => a.id === id);
		if (!def) {return null;}
		const progress = this.getProgress(id);
		if (progress.unlocked) {return null;}
		progress.current = Math.min(progress.current + amount, def.target);
		if (progress.current >= def.target) {
			progress.unlocked = true;
			progress.unlockedAt = Date.now();
			this.save();
			return id;
		}
		this.save();
		return null;
	}

	/** Set progress to an absolute value (for counters like concurrent agents) */
	setMax(id: string, value: number): string | null {
		const def = ACHIEVEMENTS.find(a => a.id === id);
		if (!def) {return null;}
		const progress = this.getProgress(id);
		if (progress.unlocked) {return null;}
		if (value > progress.current) {
			progress.current = Math.min(value, def.target);
		}
		if (progress.current >= def.target) {
			progress.unlocked = true;
			progress.unlockedAt = Date.now();
			this.save();
			return id;
		}
		this.save();
		return null;
	}

	/** Track a unique file edit */
	trackFileEdit(filePath: string): string | null {
		this.editedFiles.add(filePath);
		return this.setMax('architect', this.editedFiles.size);
	}

	/** Check night owl: is current hour 3 AM? */
	checkNightOwl(): string | null {
		const hour = new Date().getHours();
		if (hour === 3) {
			return this.increment('night_owl');
		}
		return null;
	}

	/** Get all achievements with their progress for the gallery */
	getAllProgress(): Array<AchievementDef & AchievementProgress> {
		return ACHIEVEMENTS.map(def => {
			const progress = this.store[def.id] || { unlocked: false, current: 0 };
			return { ...def, ...progress };
		});
	}
}
