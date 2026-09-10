import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense } from '@/types/expense';

export async function exportExpensesCSV(expenses: Expense[]): Promise<boolean> {
  try {
    const headers = 'ID,Date,Category,Description,Amount\n';
    const rows = expenses
      .map((exp) => {
        const date = exp.expense_date || exp.created_at || new Date().toISOString();
        const category = exp.categories?.name || 'Other';
        const description = (exp.description || '').replace(/"/g, '""');
        const amount = exp.amount.toFixed(2);
        return `"${exp.id}","${date}","${category}","${description}",${amount}`;
      })
      .join('\n');

    const csvContent = headers + rows;
    const fileUri = `${FileSystem.documentDirectory}pennyflow-expenses.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export PennyFlow Transactions',
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error exporting CSV:', err);
    return false;
  }
}
