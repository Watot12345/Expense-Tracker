export interface ConnectedAccount {
  id: string;
  user_id?: string;
  provider: 'plaid' | 'teller' | 'openbanking' | 'sandbox';
  institution_name: string;
  institution_logo?: string;
  account_name: string;
  account_mask?: string;
  account_type: 'checking' | 'savings' | 'credit' | 'other';
  balance: number;
  currency?: string;
  sync_cursor?: string | null;
  last_synced_at?: string | null;
  status: 'active' | 'error' | 'disconnected';
  created_at?: string;
}

export interface ExternalSyncTransaction {
  external_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  merchant?: string;
}

export interface ExternalSyncResult {
  importedCount: number;
  skippedDuplicates: number;
  accountName: string;
  source: string;
  latestTransactions: ExternalSyncTransaction[];
}
