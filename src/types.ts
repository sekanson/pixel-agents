import type * as vscode from 'vscode';

export interface UsageData {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	model: string | null;
}

export interface AgentState {
	id: number;
	name: string;
	terminalRef: vscode.Terminal;
	projectDir: string;
	jsonlFile: string;
	fileOffset: number;
	lineBuffer: string;
	activeToolIds: Set<string>;
	activeToolStatuses: Map<string, string>;
	activeToolNames: Map<string, string>;
	activeSubagentToolIds: Map<string, Set<string>>; // parentToolId → active sub-tool IDs
	activeSubagentToolNames: Map<string, Map<string, string>>; // parentToolId → (subToolId → toolName)
	earlyCompletionToolIds: Set<string>;
	isWaiting: boolean;
	permissionSent: boolean;
	hadToolsInTurn: boolean;
	usage: UsageData;
}

export interface PersistedAgent {
	id: number;
	name: string;
	terminalName: string;
	jsonlFile: string;
	projectDir: string;
}
