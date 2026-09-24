import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Calendar, Download, Printer, TrendingUp, DollarSign, Tag, ListFilter, 
  FileSpreadsheet, Trash2, Upload, AlertTriangle, CheckCircle2, XCircle, FileText, Database 
} from 'lucide-react';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

const Reports = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [salesData, setSalesData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excelLoading, setExcelLoading] = useState(false);
  
  // Delete record confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrderToDelete, setSelectedOrderToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Delete all imported test data state
  const [deleteImportedModalOpen, setDeleteImportedModalOpen] = useState(false);
  const [deleteImportedLoading, setDeleteImportedLoading] = useState(false);

  // Excel Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importStep, setImportStep] = useState('reading'); // 'reading', 'preview'
  const [importLoading, setImportLoading] = useState(false);
  const [previewData, setPreviewData] = useState({
    totalRows: 0,
    validRows: [],
    errors: [],
  });

  // Settings
  const [currency, setCurrency] = useState('₹');

  // Filter params
  const [preset, setPreset] = useState('month'); // 'today', 'yesterday', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [statusFilter, setStatusFilter] = useState('Completed');

  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
  };

  const handleToastClose = () => setToastMsg(null);

  useEffect(() => {
    applyPresetRange(preset);
  }, [preset]);

  useEffect(() => {
    fetchReportData();
    fetchSettings();
  }, [startDate, endDate, paymentMethod, statusFilter]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success && response.data.data) {
        setCurrency(response.data.data.currency || '₹');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportData = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const response = await api.get('/reports/sales', {
        params: {
          startDate,
          endDate,
          paymentMethod,
          status: statusFilter,
        },
      });

      if (response.data.success) {
        setSalesData(response.data.data);
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating sales reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Convert preset buttons to dates
  const applyPresetRange = (selectedPreset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedPreset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(today.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(today.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        return;
      default:
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // Excel Report Exporter Handler (Admin Only)
  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      const response = await api.get('/reports/export/excel', {
        params: {
          startDate,
          endDate,
          paymentMethod,
          status: statusFilter,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const todayIso = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `LumeBills_Report_${todayIso}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Excel report downloaded successfully!');
    } catch (err) {
      console.error(err);
      const msg = err.response?.status === 403 
        ? 'Access denied: Admin permission required to export Excel reports.'
        : 'Error generating Excel report.';
      showToast(msg, 'error');
    } finally {
      setExcelLoading(false);
    }
  };

  // CSV Exporter Utility
  const handleExportCSV = () => {
    if (salesData.length === 0) {
      showToast('No transaction data to export.', 'error');
      return;
    }

    const headers = ['Order Number', 'Date', 'Customer Name', 'Customer Contact', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Payment Mode', 'Cashier', 'Source', 'Status'];
    const rows = salesData.map(order => [
      order.orderNumber,
      new Date(order.date || order.createdAt).toLocaleDateString('en-IN'),
      order.customerDetails?.name || 'Walk-in Customer',
      order.customerDetails?.phone || '',
      order.items.reduce((s, i) => s + i.quantity, 0),
      order.subtotal.toFixed(2),
      order.discount.toFixed(2),
      order.tax.toFixed(2),
      order.grandTotal.toFixed(2),
      order.paymentMethod,
      order.cashierName || 'Staff',
      order.source === 'excel_import' ? 'Excel Import' : 'Billing',
      order.status,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lumebills_sales_report_${preset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Excel Import Handlers (Admin Only)
  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      showToast('Please upload a valid Excel file.', 'error');
      return;
    }

    setImportFileName(file.name);
    setImportStep('reading');
    setImportModalOpen(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          showToast('Please upload a valid Excel file.', 'error');
          setImportModalOpen(false);
          return;
        }
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (rawJson.length === 0) {
          showToast('The uploaded Excel file contains no data rows.', 'error');
          setImportModalOpen(false);
          return;
        }

        processExcelRows(file.name, rawJson);
      } catch (err) {
        console.error('Excel parse error:', err);
        showToast('Please upload a valid Excel file.', 'error');
        setImportModalOpen(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const findColumnValue = (rowObj, possibleNames) => {
    const keys = Object.keys(rowObj);
    for (const name of possibleNames) {
      const matchKey = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
      if (matchKey !== undefined && rowObj[matchKey] !== null && rowObj[matchKey] !== '') {
        return rowObj[matchKey];
      }
    }
    return undefined;
  };

  const processExcelRows = (filename, rawRows) => {
    const validItems = [];
    const errorList = [];

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // Row 1 is header
      const rowErrors = [];

      const rawDate = findColumnValue(row, ['date', 'sales date', 'transaction date', 'order date']);
      const rawTime = findColumnValue(row, ['time', 'sales time', 'order time']);
      const rawProduct = findColumnValue(row, ['product name', 'product', 'item name', 'item']);
      const rawQty = findColumnValue(row, ['quantity', 'qty', 'count']);
      const rawPrice = findColumnValue(row, ['selling price', 'price', 'unit price', 'rate']);
      const rawTotal = findColumnValue(row, ['total amount', 'total', 'amount', 'subtotal']);
      const rawBillNo = findColumnValue(row, ['bill number', 'bill no', 'invoice no', 'order no', 'bill #']);
      const rawCategory = findColumnValue(row, ['category', 'product category']);
      const rawPayment = findColumnValue(row, ['payment method', 'payment mode', 'payment type']);
      const rawCustomer = findColumnValue(row, ['customer name', 'customer', 'client']);

      // 1. Date validation
      let formattedDate = '';
      if (!rawDate) {
        rowErrors.push('Invalid Date');
      } else if (rawDate instanceof Date) {
        formattedDate = rawDate.toISOString().split('T')[0];
      } else {
        formattedDate = String(rawDate).trim();
      }

      // 2. Product Name validation
      if (!rawProduct || String(rawProduct).trim() === '') {
        rowErrors.push('Product Name is missing');
      }

      // 3. Quantity validation
      const qtyNum = parseFloat(rawQty);
      if (rawQty === undefined || rawQty === '' || isNaN(qtyNum) || qtyNum <= 0) {
        rowErrors.push('Quantity is missing or invalid');
      }

      // 4. Selling Price validation
      const priceNum = parseFloat(rawPrice);
      if (rawPrice === undefined || rawPrice === '' || isNaN(priceNum) || priceNum < 0) {
        rowErrors.push('Selling Price is missing or invalid');
      }

      // 5. Total Amount
      let totalNum = parseFloat(rawTotal);
      if (isNaN(totalNum) || totalNum < 0) {
        if (!isNaN(qtyNum) && !isNaN(priceNum)) {
          totalNum = qtyNum * priceNum;
        } else {
          rowErrors.push('Total Amount is missing or invalid');
        }
      }

      if (rowErrors.length > 0) {
        errorList.push({
          rowNumber: rowNum,
          reason: rowErrors.join(', '),
        });
      } else {
        validItems.push({
          date: formattedDate,
          time: rawTime ? String(rawTime).trim() : '12:00',
          productName: String(rawProduct).trim(),
          quantity: qtyNum,
          sellingPrice: priceNum,
          totalAmount: totalNum,
          billNumber: rawBillNo ? String(rawBillNo).trim() : '',
          category: rawCategory ? String(rawCategory).trim() : '',
          paymentMethod: rawPayment ? String(rawPayment).trim() : 'Cash',
          customerName: rawCustomer ? String(rawCustomer).trim() : 'Walk-in Customer',
        });
      }
    });

    setPreviewData({
      totalRows: rawRows.length,
      validRows: validItems,
      errors: errorList,
    });
    setImportStep('preview');
  };

  const handleConfirmImport = async () => {
    if (!previewData.validRows || previewData.validRows.length === 0) {
      showToast('No valid rows to import.', 'error');
      return;
    }

    setImportLoading(true);
    try {
      const response = await api.post('/reports/import', {
        fileName: importFileName,
        rows: previewData.validRows,
        totalRows: previewData.totalRows,
        validRows: previewData.validRows.length,
        invalidRows: previewData.errors.length,
      });

      if (response.data.success) {
        showToast(response.data.message || `Imported ${previewData.validRows.length} sales records successfully!`);
        setImportModalOpen(false);
        fetchReportData();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.status === 403 
        ? 'Access denied: Admin role required to import Excel reports.'
        : (err.response?.data?.message || 'Error importing Excel data.');
      showToast(msg, 'error');
    } finally {
      setImportLoading(false);
    }
  };

  // Delete Order Record Handler (Admin Only)
  const handleDeleteClick = (order) => {
    setSelectedOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrderToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await api.delete(`/reports/orders/${selectedOrderToDelete._id}`);
      if (response.data.success) {
        showToast(`Report record #${selectedOrderToDelete.orderNumber} deleted successfully.`);
        fetchReportData();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.status === 403 
        ? 'Access denied: Admin permission required to delete report records.' 
        : (err.response?.data?.message || 'Error deleting report record.');
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
      setSelectedOrderToDelete(null);
    }
  };

  // Delete All Imported Test Data Handlers (Admin Only)
  const handleDeleteImportedClick = () => {
    setDeleteImportedModalOpen(true);
  };

  const handleConfirmDeleteImported = async () => {
    setDeleteImportedLoading(true);
    try {
      const response = await api.delete('/reports/imported-data');
      if (response.data.success) {
        showToast(response.data.message || 'Imported test data deleted successfully.');
        fetchReportData();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.status === 403 
        ? 'Access denied: Admin permission required.' 
        : (err.response?.data?.message || 'Error deleting imported data.');
      showToast(msg, 'error');
    } finally {
      setDeleteImportedLoading(false);
      setDeleteImportedModalOpen(false);
    }
  };

  // Print Summary Page
  const handlePrintSummary = () => {
    window.print();
  };

  // Compile daily sales trend for chart
  const getChartData = () => {
    const trendMap = {};
    salesData.forEach(order => {
      const dateStr = new Date(order.date || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
      if (trendMap[dateStr]) {
        trendMap[dateStr].total += order.grandTotal;
      } else {
        trendMap[dateStr] = { name: dateStr, total: order.grandTotal };
      }
    });

    return Object.values(trendMap).reverse();
  };

  const chartData = getChartData();
  const hasImportedData = salesData.some((o) => o.source === 'excel_import');

  return (
    <div className="space-y-6 font-sans print:p-0">
      {toastMsg && <Toast message={toastMsg} type={toastType} onClose={handleToastClose} />}

      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx, .xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Confirmation Dialog for Deleting Single Report Record */}
      <ConfirmDialog
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedOrderToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="⚠ Delete Report Record?"
        message={`Are you sure you want to delete report record #${selectedOrderToDelete?.orderNumber}? This action will permanently remove the record from reports and cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />

      {/* Confirmation Dialog for Deleting All Imported Test Data */}
      <ConfirmDialog
        isOpen={deleteImportedModalOpen}
        onClose={() => setDeleteImportedModalOpen(false)}
        onConfirm={handleConfirmDeleteImported}
        title="⚠ Delete Imported Test Data?"
        message="This will delete only the selected imported Excel test data. Real billing data will NOT be deleted."
        confirmText="Delete"
        type="danger"
      />

      {/* Modal Dialog for Excel Import Preview */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 border border-brand/20 rounded-2xl text-brand">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 font-display">Excel Sales Data Import</h3>
                  <p className="text-xs text-gray-500 font-medium">{importFileName}</p>
                </div>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {importStep === 'reading' ? (
              <div className="py-12 text-center space-y-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mx-auto"></div>
                <p className="text-sm font-bold text-gray-700">Reading Excel Data & Validating Rows...</p>
                <p className="text-xs text-gray-400">Inspecting columns: Date, Time, Product Name, Quantity, Selling Price, Total Amount</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Summary Row Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Rows</span>
                    <span className="text-xl font-black text-gray-900 font-display mt-1 block">{previewData.totalRows}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Valid Rows</span>
                    <span className="text-xl font-black text-emerald-700 font-display mt-1 block">{previewData.validRows.length}</span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Invalid Rows</span>
                    <span className="text-xl font-black text-red-600 font-display mt-1 block">{previewData.errors.length}</span>
                  </div>
                </div>

                {/* Valid Data Preview Table */}
                {previewData.validRows.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">Import Preview (First 5 Rows)</h4>
                    <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-left">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Product Name</th>
                            <th className="px-4 py-2.5 text-center">Qty</th>
                            <th className="px-4 py-2.5 text-right">Price</th>
                            <th className="px-4 py-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                          {previewData.validRows.slice(0, 5).map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-gray-500">{row.date}</td>
                              <td className="px-4 py-2 font-bold text-gray-900">{row.productName}</td>
                              <td className="px-4 py-2 text-center">{row.quantity}</td>
                              <td className="px-4 py-2 text-right">{currency}{row.sellingPrice.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-black text-gray-900">{currency}{row.totalAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Error List */}
                {previewData.errors.length > 0 && (
                  <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 space-y-2 max-h-40 overflow-y-auto">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{previewData.errors.length} invalid rows found and will be skipped:</span>
                    </div>
                    <ul className="text-xs text-red-600 space-y-1 pl-6 list-disc">
                      {previewData.errors.map((err, idx) => (
                        <li key={idx}>
                          <strong>Row {err.rowNumber}:</strong> {err.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-5 py-2.5 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importLoading || previewData.validRows.length === 0}
                    className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-bold text-xs rounded-xl shadow-lg shadow-brand/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {importLoading ? 'Importing Data...' : `Confirm Import (${previewData.validRows.length} Rows)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight font-display">
            Business Reports
          </h2>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            Evaluate store sales metrics, profit trends, and export billing spreadsheets
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user?.role === 'admin' && (
            <>
              <button
                onClick={handleImportExcelClick}
                className="flex items-center gap-1.5 px-4 py-2 border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                title="Import historical Excel sales report data"
              >
                <Upload className="w-4 h-4 text-brand" />
                Import Excel
              </button>
              <button
                onClick={handleExportExcel}
                disabled={excelLoading}
                className="flex items-center gap-1.5 px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                {excelLoading ? 'Exporting...' : 'Export Excel'}
              </button>
              {hasImportedData && (
                <button
                  onClick={handleDeleteImportedClick}
                  className="flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                  title="Delete all imported Excel test data safely"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  Delete Imported Data
                </button>
              )}
            </>
          )}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handlePrintSummary}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-dark text-white text-xs font-bold rounded-xl shadow-lg shadow-brand/10 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Print-only title */}
      <div className="hidden print:block text-center border-b border-black pb-4 mb-6">
        <h1 className="text-xl font-extrabold font-display">LUMEBILLS SALES PERFORMANCE REPORT</h1>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Scope: {new Date(startDate).toLocaleDateString('en-IN')} to {new Date(endDate).toLocaleDateString('en-IN')}
        </p>
      </div>

      {/* Date preset selector (print:hidden) */}
      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
          {[
            { key: 'today', name: "Today's Sales" },
            { key: 'yesterday', name: "Yesterday" },
            { key: 'week', name: 'Last 7 Days' },
            { key: 'month', name: 'This Month' },
            { key: 'custom', name: 'Custom Range' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                preset === p.key
                  ? 'bg-brand border-brand text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-brand hover:text-brand'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Input Dates parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <div className="relative">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</span>
            <input
              type="date"
              disabled={preset !== 'custom'}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
            />
          </div>

          <div className="relative">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</span>
            <input
              type="date"
              disabled={preset !== 'custom'}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-70"
            />
          </div>

          <div className="relative">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Payment Method</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
            >
              <option value="">All Payment Types</option>
              <option value="Cash">Cash Only</option>
              <option value="UPI">UPI Payment</option>
              <option value="Card">Credit/Debit Card</option>
            </select>
          </div>

          <div className="relative">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
            >
              <option value="Completed">Completed Sales Only</option>
              <option value="Cancelled">Cancelled Sales</option>
              <option value="Refunded">Refunded Returns</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-level metrics summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: 'Gross Revenue', val: stats?.totalSales || 0, icon: <DollarSign className="w-4 h-4 text-emerald-600" />, style: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
          { title: 'Total Orders', val: stats?.numberOrders || 0, isCurrency: false, icon: <ListFilter className="w-4 h-4 text-blue-600" />, style: 'bg-blue-50 border-blue-100 text-blue-600' },
          { title: 'Avg Order Value', val: stats?.averageOrderValue || 0, icon: <TrendingUp className="w-4 h-4 text-indigo-600" />, style: 'bg-indigo-50 border-indigo-100 text-indigo-600' },
          { title: 'Total Tax Collected', val: stats?.totalTax || 0, icon: <Tag className="w-4 h-4 text-amber-600" />, style: 'bg-amber-50 border-amber-100 text-amber-600' },
          { title: 'Discounts Issued', val: stats?.totalDiscount || 0, icon: <DollarSign className="w-4 h-4 text-rose-600" />, style: 'bg-rose-50 border-rose-100 text-rose-600' },
          { title: 'Net Sales Volume', val: stats?.netSales || 0, icon: <DollarSign className="w-4 h-4 text-teal-600" />, style: 'bg-teal-50 border-teal-100 text-teal-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center md:text-left flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">{card.title}</span>
              <div className={`p-1.5 rounded-lg border ${card.style}`}>{card.icon}</div>
            </div>
            <span className="text-lg font-black text-gray-900 font-display mt-2 block leading-none">
              {card.isCurrency === false ? card.val : `${currency}${(card.val || 0).toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>

      {/* Sales trend chart (print:hidden) */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col print:hidden">
          <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 font-display">Sales History Trend</h4>
            <p className="text-xs text-gray-400 font-medium">Visual daily aggregate sales levels</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -15, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} fontWeight={500} />
                <YAxis stroke="#9CA3AF" fontSize={10} fontWeight={500} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                  formatter={(value) => [`${currency}${value.toFixed(2)}`, 'Sales']}
                />
                <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed tabular log */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <h4 className="text-sm font-bold text-gray-900 font-display">Orders Spreadsheet Details</h4>
            {hasImportedData && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                Contains Imported Test Data
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-gray-400">{salesData.length} records matching filters</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4 text-right">Subtotal</th>
                <th className="px-6 py-4 text-right">Discount</th>
                <th className="px-6 py-4 text-right">Tax</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
                <th className="px-6 py-4 text-center">Payment Mode</th>
                <th className="px-6 py-4 text-center">Status</th>
                {user?.role === 'admin' && (
                  <th className="px-6 py-4 text-center print:hidden">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 10 : 9} className="text-center py-10 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
                  </td>
                </tr>
              ) : salesData.length > 0 ? (
                salesData.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-bold text-gray-900 flex items-center gap-2">
                      <span>{order.orderNumber}</span>
                      {order.source === 'excel_import' && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                          Excel Import
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(order.date || order.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold">{order.customerDetails?.name || 'Walk-in Customer'}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{currency}{order.subtotal.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-red-500 font-semibold">-{currency}{order.discount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{currency}{order.tax.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-gray-950 font-black">{currency}{order.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center font-bold text-gray-500">{order.paymentMethod}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
                        order.status === 'Completed' ? 'bg-green-100 text-brand' : 'bg-red-100 text-red-500'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(order)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Report Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 10 : 9} className="text-center py-12 text-gray-400 font-semibold">
                    No orders matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
